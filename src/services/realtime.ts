import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TaskInstance } from '@/types';

/**
 * Live het hof zien bewegen.
 *
 * Supabase pushes row changes over a websocket, so when someone else finishes
 * a quest or grabs a bounty you see it happen instead of finding out on your
 * next refresh. That is the difference between a shared list and a shared
 * house.
 *
 * Requires 007_realtime.sql. If that has not been run the subscription simply
 * never fires — no error, no broken screen — so unlike the bounty board and
 * the hoard this needs no capability probe.
 */

export type HouseEvent =
  | { kind: 'completed'; who: string; isMe: boolean; taskName: string; icon: string; points: number }
  | { kind: 'claimed'; who: string; isMe: boolean; taskName: string; icon: string }
  | { kind: 'released'; who: string; isMe: boolean; taskName: string; icon: string };

type Enriched = {
  taskName: string;
  icon: string;
  ownerId: string | null;
};

type EnrichRow = {
  task_schedules: {
    task_templates: { name: string; icon: string; user_id: string | null } | null;
  } | null;
};

/**
 * The realtime payload carries the changed row and nothing else — no joins.
 * Quest names live two tables away, so they are fetched per event. Household
 * events are rare enough that one small query each is the right trade against
 * keeping a cache in sync.
 */
async function enrich(instanceId: string): Promise<Enriched | null> {
  const { data } = await supabase
    .from('task_instances')
    .select('task_schedules!schedule_id(task_templates!task_template_id(name, icon, user_id))')
    .eq('id', instanceId)
    .maybeSingle();

  const template = (data as unknown as EnrichRow | null)?.task_schedules?.task_templates;
  if (!template) return null;

  return { taskName: template.name, icon: template.icon, ownerId: template.user_id };
}

const nameCache = new Map<string, string>();

async function displayName(userId: string | null): Promise<string> {
  if (!userId) return 'Iemand';
  const hit = nameCache.get(userId);
  if (hit) return hit;

  const { data } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .maybeSingle();

  const name = data?.display_name ?? data?.email?.split('@')[0] ?? 'Een hoflid';
  nameCache.set(userId, name);
  return name;
}

/**
 * Subscribe to household activity. Returns an unsubscribe function.
 *
 * `onEvent` receives every event including the current member's own, with
 * `isMe` set — the caller decides what to show. Your own completion already
 * gets a full celebration overlay, so a toast on top of it would be noise.
 */
export function subscribeHousehold(
  currentUserId: string,
  onEvent: (event: HouseEvent) => void
): () => void {
  let channel: RealtimeChannel | null = null;

  channel = supabase
    .channel('hof-activiteit')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'task_instances' },
      (payload) => {
        const next = payload.new as Partial<TaskInstance> | null;
        const prev = payload.old as Partial<TaskInstance> | null;
        if (!next?.id) return;

        // Only the transitions matter, not every write to the row. This is why
        // 007 sets REPLICA IDENTITY FULL: without it `old` is just the id and
        // none of these comparisons can be made.
        const justCompleted = !prev?.completed_at && !!next.completed_at;
        const justClaimed = !prev?.claimed_by && !!next.claimed_by;
        const justReleased = !!prev?.claimed_by && !next.claimed_by && !next.completed_at;

        if (!justCompleted && !justClaimed && !justReleased) return;

        void (async () => {
          const info = await enrich(next.id!);
          if (!info) return;

          // A claimed bounty belongs to the claimer; anything else to the
          // template's owner.
          const actorId = next.claimed_by ?? prev?.claimed_by ?? info.ownerId;
          const who = await displayName(actorId ?? null);
          const isMe = actorId === currentUserId;

          if (justCompleted) {
            onEvent({
              kind: 'completed',
              who,
              isMe,
              taskName: info.taskName,
              icon: info.icon,
              points: next.points_earned ?? 0,
            });
          } else if (justClaimed) {
            onEvent({ kind: 'claimed', who, isMe, taskName: info.taskName, icon: info.icon });
          } else {
            onEvent({ kind: 'released', who, isMe, taskName: info.taskName, icon: info.icon });
          }
        })();
      }
    )
    .subscribe();

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}

// send-reminders: turns due quests into Web Push notifications.
//
// Called every minute by pg_cron (see 008_push.sql) with the `x-cron-secret`
// header. A signed-in user may also call it with `{ "test": true }` to get a
// test notification on their own devices, which is what the Profile page's
// "Testmelding" button does.
//
// Deploy with `--no-verify-jwt`: the cron call carries no user JWT, so this
// function checks the secret or the user token itself.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  BOUNTY_MESSAGES,
  MESSAGES,
  SAD_MESSAGES,
  SAD_TITLES,
  TITLES,
  randomItem,
} from '../_shared/reminderMessages.ts';
import { dueSlot, localMoment, type LocalMoment, type RecurrenceType } from './logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
// Push services want a contact; a URL is allowed and keeps an address out of
// the code.
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://stephanevanrossem02.github.io/ChoreQuest/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  last_seen_at: string;
};

type ScheduleRow = {
  id: string;
  recurrence_type: RecurrenceType;
  recurrence_day: number | null;
  once_date: string | null;
  time_of_day: string;
  task_templates: {
    name: string;
    user_id: string | null;
    is_active: boolean;
    is_deleted: boolean;
  } | null;
};

type InstanceRow = {
  schedule_id: string;
  due_date: string;
  completed_at: string | null;
  claimed_by: string | null;
};

type LogRow = { schedule_id: string; user_id: string; due_date: string; slot: number };

type Payload = { title: string; body: string; tag: string; url: string };

type Candidate = {
  userId: string;
  schedule: ScheduleRow;
  date: string;
  slot: number;
  bounty: boolean;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Sends one push; returns false when the subscription is gone for good. */
async function push(sub: Subscription, payload: Payload): Promise<'ok' | 'gone' | 'error'> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      {
        vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
        // A reminder that arrives two hours late is worse than none.
        TTL: 60 * 60,
        urgency: 'high',
      }
    );
    return 'ok';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404/410: the browser unsubscribed or the user cleared site data.
    if (status === 404 || status === 410) return 'gone';
    console.error('push mislukt', status, (e as Error).message);
    return 'error';
  }
}

async function sendToUser(subs: Subscription[], payload: Payload): Promise<number> {
  let delivered = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      const result = await push(sub, payload);
      if (result === 'ok') delivered++;
      if (result === 'gone') gone.push(sub.id);
    })
  );
  if (gone.length) await db.from('push_subscriptions').delete().in('id', gone);
  return delivered;
}

function payloadFor(c: Candidate): Payload {
  const name = c.schedule.task_templates?.name ?? 'je queeste';
  if (c.bounty && c.slot === 0) {
    return { title: '🪙 Prijzenbord', body: randomItem(BOUNTY_MESSAGES)(name), tag: `quest-${c.schedule.id}`, url: '#/bounties' };
  }
  const sad = c.slot > 0;
  return {
    title: sad ? randomItem(SAD_TITLES) : randomItem(TITLES),
    body: sad ? randomItem(SAD_MESSAGES)(name) : randomItem(MESSAGES)(name),
    // One tag per quest, so a sad nudge replaces the previous one instead of
    // stacking five notifications.
    tag: `quest-${c.schedule.id}`,
    url: '#/today',
  };
}

async function runReminders(now: Date): Promise<Record<string, number>> {
  const { data: subs, error: subErr } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, timezone, last_seen_at');
  if (subErr) throw subErr;
  if (!subs?.length) return { subscriptions: 0, sent: 0 };

  const subsByUser = new Map<string, Subscription[]>();
  for (const s of subs as Subscription[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  // Each user's clock comes from the device they used most recently.
  const clockByUser = new Map<string, LocalMoment>();
  for (const [userId, list] of subsByUser) {
    const latest = [...list].sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))[0];
    clockByUser.set(userId, localMoment(now, latest.timezone));
  }

  const { data: schedules, error: schedErr } = await db
    .from('task_schedules')
    .select(
      'id, recurrence_type, recurrence_day, once_date, time_of_day, task_templates!task_template_id(name, user_id, is_active, is_deleted)'
    )
    .eq('is_active', true)
    .eq('reminder_enabled', true);
  if (schedErr) throw schedErr;

  const live = ((schedules ?? []) as unknown as ScheduleRow[]).filter(
    (s) => s.task_templates?.is_active && !s.task_templates.is_deleted
  );

  // Who should hear about what, before looking at completion.
  const candidates: Candidate[] = [];
  for (const [userId, clock] of clockByUser) {
    for (const schedule of live) {
      const owner = schedule.task_templates!.user_id;
      if (owner !== null && owner !== userId) continue;
      const slot = dueSlot(schedule, clock);
      if (slot === null) continue;
      candidates.push({ userId, schedule, date: clock.date, slot, bounty: owner === null });
    }
  }
  if (!candidates.length) return { subscriptions: subs.length, sent: 0 };

  const { data: instances, error: instErr } = await db
    .from('task_instances')
    .select('schedule_id, due_date, completed_at, claimed_by')
    .in('schedule_id', [...new Set(candidates.map((c) => c.schedule.id))])
    .in('due_date', [...new Set(candidates.map((c) => c.date))]);
  if (instErr) throw instErr;
  const instanceByKey = new Map(
    ((instances ?? []) as InstanceRow[]).map((i) => [`${i.schedule_id}|${i.due_date}`, i])
  );

  const due = candidates.filter((c) => {
    const inst = instanceByKey.get(`${c.schedule.id}|${c.date}`);
    if (inst?.completed_at) return false;
    if (!c.bounty) return true;
    // Bounties: a free one gets a single call to everyone; once claimed it
    // belongs to the claimer, sad nudges included.
    if (inst?.claimed_by) return inst.claimed_by === c.userId;
    return c.slot === 0;
  });
  if (!due.length) return { subscriptions: subs.length, sent: 0 };

  // Claim each reminder in the log first. Only rows that were actually
  // inserted come back, so a second run in the same minute sends nothing.
  const { data: claimed, error: logErr } = await db
    .from('reminder_log')
    .upsert(
      due.map((c) => ({ schedule_id: c.schedule.id, user_id: c.userId, due_date: c.date, slot: c.slot })),
      { onConflict: 'schedule_id,user_id,due_date,slot', ignoreDuplicates: true }
    )
    .select('schedule_id, user_id, due_date, slot');
  if (logErr) throw logErr;
  const claimedKeys = new Set(
    ((claimed ?? []) as LogRow[]).map((r) => `${r.schedule_id}|${r.user_id}|${r.due_date}|${r.slot}`)
  );

  let sent = 0;
  await Promise.all(
    due
      .filter((c) => claimedKeys.has(`${c.schedule.id}|${c.userId}|${c.date}|${c.slot}`))
      .map(async (c) => {
        sent += await sendToUser(subsByUser.get(c.userId) ?? [], payloadFor(c));
      })
  );
  return { subscriptions: subs.length, due: due.length, sent };
}

async function runTest(authHeader: string | null): Promise<Response> {
  const token = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Niet ingelogd' }, 401);

  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, timezone, last_seen_at')
    .eq('user_id', data.user.id);
  if (!subs?.length) return json({ error: 'Geen abonnement voor dit account' }, 404);

  const delivered = await sendToUser(subs as Subscription[], {
    title: '🐉 Testmelding',
    body: 'De draak kan je bereiken. Zo klinkt een herinnering.',
    tag: 'chorequest-test',
    url: '#/profile',
  });
  return json({ devices: subs.length, delivered });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST verwacht' }, 405);
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: 'VAPID-sleutels ontbreken' }, 500);

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    if (CRON_SECRET && cronSecret === CRON_SECRET) {
      return json(await runReminders(new Date()));
    }

    const body = await req.json().catch(() => ({}));
    if (body?.test === true) return await runTest(req.headers.get('authorization'));

    return json({ error: 'Geen toegang' }, 401);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

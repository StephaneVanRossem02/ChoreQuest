import { supabase } from '@/lib/supabase';

/**
 * Which optional database features this deployment actually has.
 *
 * The Bounty Board and the Hoard each need a migration, and migrations are run
 * by hand in the Supabase SQL editor — so the code and the database can be out
 * of step for a while. Rather than crash on a missing column, the app probes
 * once at startup and hides whatever is not there yet. Run the migration and
 * the feature appears on the next reload; no redeploy needed.
 */
export type Capabilities = {
  /** 005_bounties.sql — task_instances.claimed_by */
  bounties: boolean;
  /** 006_hoard.sql — profiles.coins / profiles.cosmetics */
  hoard: boolean;
};

export const NO_CAPABILITIES: Capabilities = { bounties: false, hoard: false };

/**
 * Cached and deduped. Services await `probeCapabilities()` rather than reading
 * a snapshot, because they can run concurrently with the first probe; after
 * that first call it resolves from `cached` without a round-trip.
 */
let cached: Capabilities = NO_CAPABILITIES;
let probed = false;
let inFlight: Promise<Capabilities> | null = null;

/** A `select` on a column that does not exist errors instead of returning rows. */
async function hasColumn(table: 'task_instances' | 'profiles', column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;

  // 42703 = undefined_column (Postgres), PGRST204 / 42P01 = PostgREST schema
  // cache miss. Anything else is a real failure worth logging, but it still has
  // to degrade to "feature off" rather than take the whole app down.
  const code = (error as { code?: string }).code;
  if (code !== '42703' && code !== 'PGRST204' && code !== '42P01') {
    console.warn(`Capability probe voor ${table}.${column} faalde onverwacht`, error);
  }
  return false;
}

export async function probeCapabilities(): Promise<Capabilities> {
  // Answered from the cache once it has run once — callers await this on every
  // task load, and re-probing each time would add two queries per call.
  if (probed) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const [bounties, hoard] = await Promise.all([
        hasColumn('task_instances', 'claimed_by'),
        hasColumn('profiles', 'coins'),
      ]);
      cached = { bounties, hoard };
      probed = true;
      return cached;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

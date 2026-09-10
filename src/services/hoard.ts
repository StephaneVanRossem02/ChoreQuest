import { supabase } from '@/lib/supabase';
import type { CosmeticItem, CosmeticKind, CosmeticsBag } from '@/types';

export type Wallet = {
  coins: number;
  coinsLifetime: number;
  cosmetics: CosmeticsBag;
};

export const EMPTY_WALLET: Wallet = { coins: 0, coinsLifetime: 0, cosmetics: { owned: [] } };

/**
 * The catalogue lives in the database, not in TypeScript.
 *
 * The dossier proposed hard-coding it, but that only works if the client is
 * trusted to report the price it paid — and it isn't. `buy_cosmetic()` reads
 * the price server-side from this same table, so what the shop displays and
 * what the purchase charges cannot drift apart or be tampered with.
 */
export async function getCatalog(): Promise<CosmeticItem[]> {
  const { data, error } = await supabase
    .from('cosmetics_catalog')
    .select('*')
    .order('kind', { ascending: true })
    .order('price', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getWallet(userId: string): Promise<Wallet> {
  const { data, error } = await supabase
    .from('profiles')
    .select('coins, coins_lifetime, cosmetics')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return EMPTY_WALLET;

  return {
    coins: data.coins ?? 0,
    coinsLifetime: data.coins_lifetime ?? 0,
    cosmetics: data.cosmetics ?? { owned: [] },
  };
}

/** Returns the new balance. Throws with the database's message on failure. */
export async function buyCosmetic(itemId: string): Promise<number> {
  const { data, error } = await supabase.rpc('buy_cosmetic', { p_item: itemId });
  if (error) throw error;
  return data ?? 0;
}

/**
 * Equipping is a plain client-side update: it only picks between things the
 * member already owns, so there is nothing to cheat. The trigger from 006
 * still rejects any attempt to edit `owned` or the balances this way.
 */
export async function equipCosmetic(
  userId: string,
  kind: CosmeticKind,
  itemId: string,
  current: CosmeticsBag
): Promise<CosmeticsBag> {
  const next: CosmeticsBag = { ...current, [kind]: itemId };

  const { error } = await supabase.from('profiles').update({ cosmetics: next }).eq('id', userId);
  if (error) throw error;
  return next;
}

export function owns(bag: CosmeticsBag, itemId: string): boolean {
  return (bag.owned ?? []).includes(itemId);
}

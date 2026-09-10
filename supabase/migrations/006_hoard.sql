-- 006_hoard.sql
--
-- De Schatkamer: een tweede munt die nooit reset, uitsluitend voor cosmetica.
--
-- Waarom: XP zit in `monthly_summaries` en wordt op de 1e gewist. Wie een
-- topmaand draait, houdt daar niets van over. Munten lopen door en kopen een
-- paarse vlam die je voor altijd houdt.
--
-- BELANGRIJK ONTWERPPUNT — de browser mag zijn eigen saldo niet schrijven.
-- De app is client-only: alles wat de browser mag updaten, kan een kind met
-- de console ook zelf zetten. Daarom:
--   * munten worden GEMUNT door een trigger op task_instances, niet door de app;
--   * munten worden UITGEGEVEN via buy_cosmetic(), een SECURITY DEFINER functie;
--   * een guard-trigger weigert elke directe wijziging van coins/owned.
-- Het uitkiezen van een al bezeten cosmetic mag de app wel gewoon zelf doen —
-- daar valt niets te winnen.
--
-- Dit staat los van het feit dat `points_earned` nog steeds door de client
-- geschreven wordt. Dat was al zo en verandert hier niet; wilde je dat ook
-- dichtzetten, dan hoort completeTaskInstance een RPC te worden.

begin;

-- ── Helper, ook nodig als 003 nooit gedraaid heeft ────────────────────────
-- 006 herschrijft onderaan de profiles-policies, en die moeten admins hun
-- rechten laten houden. Als 003 wel gedraaid heeft is dit exact dezelfde
-- functie; `create or replace` maakt het idempotent.
-- SECURITY DEFINER omzeilt RLS: anders bevraagt een policy op `profiles` de
-- tabel `profiles` en draait dat in zichzelf rond (infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Kolommen ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists coins integer not null default 0 check (coins >= 0);

alter table public.profiles
  add column if not exists coins_lifetime integer not null default 0 check (coins_lifetime >= 0);

-- Vorm: { "owned": ["flame_ember", ...], "flame": "flame_ember", "title": "..." }
alter table public.profiles
  add column if not exists cosmetics jsonb not null default '{"owned": []}'::jsonb;

comment on column public.profiles.coins is
  'Besteedbare munten. Alleen te wijzigen via de trigger op task_instances en via buy_cosmetic().';

-- ── Munten muntten ────────────────────────────────────────────────────────
-- 1 munt per 2 XP, naar beneden afgerond. Credit gaat naar wie de queeste
-- opnam (bounty) of anders naar de eigenaar van de template.
create or replace function public.award_coins_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earner uuid;
  minted integer;
begin
  -- Alleen op de overgang naar "voltooid", niet bij elke latere update.
  if new.completed_at is null or old.completed_at is not null then
    return new;
  end if;

  minted := floor(coalesce(new.points_earned, 0) / 2.0)::integer;
  if minted <= 0 then
    return new;
  end if;

  -- claimed_by bestaat alleen als 005 gedraaid is; to_jsonb() laat dit werken
  -- in beide gevallen zonder de migraties aan elkaar te koppelen.
  earner := nullif(to_jsonb(new) ->> 'claimed_by', '')::uuid;

  if earner is null then
    select t.user_id into earner
    from public.task_schedules s
    join public.task_templates t on t.id = s.task_template_id
    where s.id = new.schedule_id;
  end if;

  if earner is null then
    return new;
  end if;

  perform set_config('chorequest.allow_coin_write', 'on', true);

  update public.profiles
     set coins = coins + minted,
         coins_lifetime = coins_lifetime + minted
   where id = earner;

  perform set_config('chorequest.allow_coin_write', 'off', true);

  return new;
end;
$$;

drop trigger if exists task_instances_award_coins on public.task_instances;
create trigger task_instances_award_coins
  after update on public.task_instances
  for each row execute function public.award_coins_on_completion();

-- ── Munten uitgeven ───────────────────────────────────────────────────────
-- De prijs staat in de database, niet in het verzoek: anders koopt de client
-- alles voor 0 munten. De app leest deze tabel via getCatalog(), dus er is
-- maar één catalogus en die kan niet uit elkaar lopen.
create table if not exists public.cosmetics_catalog (
  id text primary key,
  kind text not null check (kind in ('flame', 'title', 'frame', 'dragon')),
  name text not null,
  price integer not null check (price >= 0),
  value text not null
);

alter table public.cosmetics_catalog enable row level security;

drop policy if exists "catalog_select" on public.cosmetics_catalog;
create policy "catalog_select" on public.cosmetics_catalog
  for select to authenticated using (true);

insert into public.cosmetics_catalog (id, kind, name, price, value) values
  ('flame_ember',    'flame',  'Sintelvlam',        0,   '#C9945A'),
  ('flame_gold',     'flame',  'Goudvlam',          120, '#E8C870'),
  ('flame_azure',    'flame',  'Azuurvlam',         240, '#6FA8C7'),
  ('flame_violet',   'flame',  'Violetvlam',        360, '#9B7BC7'),
  ('flame_verdant',  'flame',  'Smaragdvlam',       480, '#6FAF7B'),
  ('flame_void',     'flame',  'Leegtevlam',        900, '#8A7FA8'),
  ('dragon_green',   'dragon', 'Groene draak',      0,   '🐉'),
  ('dragon_wyrm',    'dragon', 'Lindworm',          200, '🐲'),
  ('dragon_serpent', 'dragon', 'Zeeserpent',        400, '🐍'),
  ('dragon_phoenix', 'dragon', 'Vuurvogel',         750, '🔥'),
  ('title_squire',   'title',  'Schildknaap',       60,  'Schildknaap'),
  ('title_keeper',   'title',  'Vuurbewaarder',     180, 'Vuurbewaarder'),
  ('title_scourge',  'title',  'Schrik van het Hof',420, 'Schrik van het Hof'),
  ('frame_bronze',   'frame',  'Bronzen lijst',     150, 'var(--hof-bronze)'),
  ('frame_gold',     'frame',  'Gouden lijst',      500, 'var(--hof-gold)')
on conflict (id) do update
  set kind = excluded.kind,
      name = excluded.name,
      price = excluded.price,
      value = excluded.value;

create or replace function public.buy_cosmetic(p_item text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  cost integer;
  balance integer;
  already boolean;
begin
  if me is null then
    raise exception 'Niet ingelogd';
  end if;

  select price into cost from public.cosmetics_catalog where id = p_item;
  if cost is null then
    raise exception 'Onbekend item: %', p_item;
  end if;

  select coins, cosmetics -> 'owned' @> to_jsonb(p_item)
    into balance, already
    from public.profiles
   where id = me
     for update;

  if already then
    raise exception 'Dit heb je al';
  end if;

  if balance < cost then
    raise exception 'Te weinig munten: % nodig, % beschikbaar', cost, balance;
  end if;

  perform set_config('chorequest.allow_coin_write', 'on', true);

  update public.profiles
     set coins = coins - cost,
         cosmetics = jsonb_set(
           coalesce(cosmetics, '{}'::jsonb),
           '{owned}',
           coalesce(cosmetics -> 'owned', '[]'::jsonb) || to_jsonb(p_item),
           true
         )
   where id = me;

  perform set_config('chorequest.allow_coin_write', 'off', true);

  select coins into balance from public.profiles where id = me;
  return balance;
end;
$$;

revoke all on function public.buy_cosmetic(text) from public;
grant execute on function public.buy_cosmetic(text) to authenticated;

-- ── Guard: de client mag saldo en bezit niet zelf schrijven ───────────────
create or replace function public.prevent_coin_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('chorequest.allow_coin_write', true), 'off') = 'on' then
    return new;
  end if;

  if new.coins is distinct from old.coins
     or new.coins_lifetime is distinct from old.coins_lifetime then
    raise exception 'Munten kunnen niet direct gewijzigd worden';
  end if;

  if (new.cosmetics -> 'owned') is distinct from (old.cosmetics -> 'owned') then
    raise exception 'Bezit kan alleen via buy_cosmetic() wijzigen';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_coins on public.profiles;
create trigger profiles_guard_coins
  before update on public.profiles
  for each row execute function public.prevent_coin_tampering();

-- profiles moet RLS aan hebben om bovenstaande zinvol te maken. Dit is dezelfde
-- regel als in 003; hij is idempotent en veilig als 003 al gedraaid is.
alter table public.profiles enable row level security;

-- Als 004 gedraaid werd, bestaan de profiles-policies uit 003 niet meer en
-- zou RLS aanzetten alle toegang blokkeren. Daarom hier opnieuw, idempotent.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- LET OP: de `or public.is_admin()` mag hier niet weg. Zonder die clausule
-- verliest een admin het recht om het profiel van een ander hoflid te wijzigen,
-- en dat sloopt de rol-schakelaar in het beheerscherm.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

commit;

-- Terugdraaien:
--   drop trigger if exists profiles_guard_coins on public.profiles;
--   drop trigger if exists task_instances_award_coins on public.task_instances;
--   drop function if exists public.prevent_coin_tampering();
--   drop function if exists public.award_coins_on_completion();
--   drop function if exists public.buy_cosmetic(text);
--   drop table if exists public.cosmetics_catalog;
--   (public.is_admin() blijft staan: 003 gebruikt hem ook.)
--   alter table public.profiles drop column if exists cosmetics;
--   alter table public.profiles drop column if exists coins_lifetime;
--   alter table public.profiles drop column if exists coins;
-- De app verbergt de Schatkamer automatisch zodra `coins` weg is.

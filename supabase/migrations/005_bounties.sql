-- 005_bounties.sql
--
-- Het Prijzenbord: gedeelde queestes die niemand bezit.
--
-- Achtergrond: `task_templates.user_id` is nullable, en 002_seed_data.sql zet
-- tien templates zonder eigenaar in de database. `getTodayTasks` filtert op
-- `user_id = <jij>`, dus die tien staan er wel maar ziet niemand. Deze migratie
-- maakt van die toestand een feature: geen eigenaar = vrij op te nemen.
--
-- Deze migratie is bewust veilig in beide werelden. Op dit moment is niet
-- zeker of 003_tighten_rls.sql nog actief is of teruggedraaid werd door 004,
-- en dit script hoeft dat niet te weten:
--   * de kolom en de index zijn onvoorwaardelijk veilig;
--   * de policies gebruiken `drop ... if exists` en daarna `create`;
--   * policies in Postgres zijn PERMISSIEF (ze worden met OR gecombineerd),
--     dus als 004 actief is en `auth_all_task_instances` nog bestaat, dan
--     versmalt onderstaande policy niets. Ze breekt dan ook niets.
--
-- De race op het opnemen van een bounty wordt NIET door RLS opgelost maar door
-- een conditionele UPDATE in de app (`.is('claimed_by', null)`), zodat twee
-- kinderen die tegelijk tikken niet allebei de queeste krijgen. Dat werkt
-- ongeacht welke policies er staan.

begin;

-- ── De kolom ───────────────────────────────────────────────────────────────
alter table public.task_instances
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null;

alter table public.task_instances
  add column if not exists claimed_at timestamptz;

comment on column public.task_instances.claimed_by is
  'Wie deze bounty heeft opgenomen. NULL voor gewone queestes (die horen bij de eigenaar van de template) en voor nog vrije bounties.';

create index if not exists idx_task_instances_claimed_by
  on public.task_instances(claimed_by);

-- Vrije bounties van vandaag opzoeken moet goedkoop blijven.
create index if not exists idx_task_instances_open_bounties
  on public.task_instances(due_date)
  where claimed_by is null and completed_at is null;

-- ── Policy: een bounty opnemen ─────────────────────────────────────────────
-- Alleen zolang niemand hem heeft, en je kunt hem alleen op je eigen naam
-- zetten. Merk op dat een UPDATE-policy met `using` op de OUDE rij kijkt en
-- `with check` op de NIEUWE.
drop policy if exists "instances_claim_open" on public.task_instances;

create policy "instances_claim_open" on public.task_instances
  for update to authenticated
  using (claimed_by is null and completed_at is null)
  with check (claimed_by = auth.uid());

-- ── Policy: je eigen opgenomen bounty afwerken ─────────────────────────────
drop policy if exists "instances_update_claimed" on public.task_instances;

create policy "instances_update_claimed" on public.task_instances
  for update to authenticated
  using (claimed_by = auth.uid())
  with check (claimed_by = auth.uid());

-- ── Policy: een instance aanmaken voor een onbeheerde template ─────────────
-- De app maakt de instance aan op het moment dat het Prijzenbord geopend
-- wordt. Zonder dit kan niemand een bounty-instance laten ontstaan wanneer
-- 003 actief is (die eist eigendom via owns_schedule()).
drop policy if exists "instances_insert_bounty" on public.task_instances;

create policy "instances_insert_bounty" on public.task_instances
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.task_schedules s
      join public.task_templates t on t.id = s.task_template_id
      where s.id = schedule_id
        and t.user_id is null
    )
  );

commit;

-- Terugdraaien:
--   drop policy if exists "instances_claim_open"     on public.task_instances;
--   drop policy if exists "instances_update_claimed" on public.task_instances;
--   drop policy if exists "instances_insert_bounty"  on public.task_instances;
--   drop index if exists public.idx_task_instances_open_bounties;
--   drop index if exists public.idx_task_instances_claimed_by;
--   alter table public.task_instances drop column if exists claimed_at;
--   alter table public.task_instances drop column if exists claimed_by;
-- De app verbergt het Prijzenbord automatisch zodra de kolom weg is.

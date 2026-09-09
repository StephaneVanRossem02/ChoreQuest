-- 003_tighten_rls.sql
--
-- LEES DIT EERST. Voer dit niet blind uit.
--
-- Migraties 001 en 002 staan in de native ChoreQuest-repo; deze bouwt daarop
-- voort en draait op dezelfde database.
--
-- Waarom: 001 gaf elke ingelogde gebruiker volledige lees- en schrijfrechten op
-- alle tabellen (`TO authenticated USING (true)`). Dat was verdedigbaar toen het
-- één gezin op één telefoon was. Zodra het Hof op een publieke URL staat, is het
-- dat niet meer: wie een account kan aanmaken, kan alles lezen en wijzigen.
--
-- Wat dit script wel en niet doet:
--   * LEZEN blijft breed. Dat is met opzet — de app is een gedeeld hof.
--     Ranking, de kalenderlijst "afgewerkte taken" en de takenverdeling tonen
--     bewust ieders gegevens. Dichttimmeren zou de app slopen.
--   * SCHRIJVEN wordt beperkt tot je eigen queestes, of tot admins.
--   * ROLWIJZIGING wordt afgeschermd, zodat niemand zichzelf admin maakt.
--
-- Dit vervangt NIET het sluiten van open registratie. Doe dat eerst:
--   Supabase -> Authentication -> Sign In / Providers -> "Allow new users to
--   sign up" uit. Dat is de grootste winst en kost één klik.
--
-- Test na afloop: inloggen, queeste aanmaken, voltooien, ranking bekijken, en
-- als admin een rol wisselen.

begin;

-- ── Helpers ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER: draait als de eigenaar en omzeilt daarmee RLS. Nodig,
-- anders draait een policy op `profiles` die `profiles` bevraagt in zichzelf
-- rond (infinite recursion).

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

create or replace function public.owns_template(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.task_templates t
    where t.id = tid and t.user_id = auth.uid()
  );
$$;

create or replace function public.owns_schedule(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_schedules s
    join public.task_templates t on t.id = s.task_template_id
    where s.id = sid and t.user_id = auth.uid()
  );
$$;

-- ── Oude, te ruime policies weg ────────────────────────────────────────────
drop policy if exists "auth_all_task_templates"   on public.task_templates;
drop policy if exists "auth_all_task_schedules"   on public.task_schedules;
drop policy if exists "auth_all_task_instances"   on public.task_instances;
drop policy if exists "auth_all_monthly_summaries" on public.monthly_summaries;
drop policy if exists "auth_read_rewards"         on public.rewards;

-- ── profiles ───────────────────────────────────────────────────────────────
-- Iedereen in het hof ziet elkaar (ranking, avatars, taken toewijzen).
-- Wijzigen alleen je eigen profiel, of als admin.
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- RLS kan geen losse kolom afschermen, dus de rol krijgt een trigger.
-- Zonder dit kan iedereen met een account zichzelf tot admin promoveren.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Alleen een admin kan rollen wijzigen';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ── task_templates ─────────────────────────────────────────────────────────
create policy "templates_select" on public.task_templates
  for select to authenticated using (true);

create policy "templates_insert" on public.task_templates
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "templates_update" on public.task_templates
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "templates_delete" on public.task_templates
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ── task_schedules ─────────────────────────────────────────────────────────
-- Eigendom loopt via de template waar de planning bij hoort.
create policy "schedules_select" on public.task_schedules
  for select to authenticated using (true);

create policy "schedules_insert" on public.task_schedules
  for insert to authenticated
  with check (public.owns_template(task_template_id) or public.is_admin());

create policy "schedules_update" on public.task_schedules
  for update to authenticated
  using (public.owns_template(task_template_id) or public.is_admin())
  with check (public.owns_template(task_template_id) or public.is_admin());

create policy "schedules_delete" on public.task_schedules
  for delete to authenticated
  using (public.owns_template(task_template_id) or public.is_admin());

-- ── task_instances ─────────────────────────────────────────────────────────
-- Let op: de app maakt instances aan bij het openen van "Today", en een admin
-- doet dat ook voor een ander hoflid via het detailscherm. Vandaar is_admin().
create policy "instances_select" on public.task_instances
  for select to authenticated using (true);

create policy "instances_insert" on public.task_instances
  for insert to authenticated
  with check (public.owns_schedule(schedule_id) or public.is_admin());

create policy "instances_update" on public.task_instances
  for update to authenticated
  using (public.owns_schedule(schedule_id) or public.is_admin())
  with check (public.owns_schedule(schedule_id) or public.is_admin());

create policy "instances_delete" on public.task_instances
  for delete to authenticated
  using (public.owns_schedule(schedule_id) or public.is_admin());

-- ── monthly_summaries ──────────────────────────────────────────────────────
-- Lezen breed: de ranking toont ieders XP van deze maand.
create policy "summaries_select" on public.monthly_summaries
  for select to authenticated using (true);

create policy "summaries_insert" on public.monthly_summaries
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "summaries_update" on public.monthly_summaries
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── rewards ────────────────────────────────────────────────────────────────
-- Iedereen ziet de rangen; alleen een admin past ze aan.
create policy "rewards_select" on public.rewards
  for select to authenticated using (true);

create policy "rewards_update" on public.rewards
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;

-- Terugdraaien? Zet de oude situatie terug met:
--   drop trigger if exists profiles_guard_role on public.profiles;
--   ... en herstel de "auth_all_*" policies uit 001_initial_schema.sql.

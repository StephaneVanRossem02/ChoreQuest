-- 004_rollback_003.sql
--
-- NOODREM. Draait 003_tighten_rls.sql volledig terug naar de situatie van 001:
-- elke ingelogde gebruiker mag weer alles lezen en schrijven.
--
-- Gebruik dit alleen om weer aan de slag te kunnen. Het zet de te ruime
-- rechten terug, dus het is een tijdelijke stap, geen eindstation.
--
-- Let op: dit zet `profiles` terug op RLS UIT. Dat was de toestand vóór 003
-- (de tabel is ooit via het dashboard aangemaakt, niet via een migratie).
-- Klopt dat voor jouw database niet, haal die ene regel dan weg.

begin;

-- Trigger en policies uit 003 weg
drop trigger if exists profiles_guard_role on public.profiles;
drop function if exists public.prevent_role_escalation();

drop policy if exists "profiles_select"     on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "templates_select" on public.task_templates;
drop policy if exists "templates_insert" on public.task_templates;
drop policy if exists "templates_update" on public.task_templates;
drop policy if exists "templates_delete" on public.task_templates;

drop policy if exists "schedules_select" on public.task_schedules;
drop policy if exists "schedules_insert" on public.task_schedules;
drop policy if exists "schedules_update" on public.task_schedules;
drop policy if exists "schedules_delete" on public.task_schedules;

drop policy if exists "instances_select" on public.task_instances;
drop policy if exists "instances_insert" on public.task_instances;
drop policy if exists "instances_update" on public.task_instances;
drop policy if exists "instances_delete" on public.task_instances;

drop policy if exists "summaries_select" on public.monthly_summaries;
drop policy if exists "summaries_insert" on public.monthly_summaries;
drop policy if exists "summaries_update" on public.monthly_summaries;

drop policy if exists "rewards_select" on public.rewards;
drop policy if exists "rewards_update" on public.rewards;

drop function if exists public.owns_schedule(uuid);
drop function if exists public.owns_template(uuid);
drop function if exists public.is_admin();

-- profiles terug zoals het was
alter table public.profiles disable row level security;

-- De oude, permissieve policies uit 001 terug
create policy "auth_all_task_templates"
  on public.task_templates for all to authenticated using (true) with check (true);

create policy "auth_all_task_schedules"
  on public.task_schedules for all to authenticated using (true) with check (true);

create policy "auth_all_task_instances"
  on public.task_instances for all to authenticated using (true) with check (true);

create policy "auth_all_monthly_summaries"
  on public.monthly_summaries for all to authenticated using (true) with check (true);

create policy "auth_read_rewards"
  on public.rewards for select to authenticated using (true);

commit;

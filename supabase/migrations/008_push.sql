-- 008_push.sql
--
-- Echte herinneringen: Web Push, ook als de app dicht is.
--
-- Hoe het in elkaar zit:
--   1. De browser abonneert zich bij een push-dienst (Google, Mozilla, Apple)
--      en de app bewaart dat abonnement in `push_subscriptions`.
--   2. pg_cron roept elke minuut de Edge Function `send-reminders` aan.
--   3. Die kijkt welke queestes nu een herinnering verdienen, noteert dat in
--      `reminder_log` en stuurt de push. De service worker toont de melding.
--
-- `reminder_log` is wat dubbele meldingen voorkomt: de primary key laat elke
-- herinnering (queeste, persoon, dag, welke van de vijf) maar één keer toe,
-- ook als de cron eens dubbel of te laat draait.
--
-- VOORAF in de SQL-editor, eenmalig (deze waarden horen niet in git):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<zelfde CRON_SECRET als bij de functie>', 'cron_secret');
-- Zonder die twee faalt de cron-job elke minuut, zonder verdere schade.

begin;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ── Abonnementen ───────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- Eén endpoint = één browser op één toestel. Uniek, zodat een gedeeld
  -- toestel na een andere login naar de nieuwe gebruiker verhuist in plaats
  -- van beide hofleden meldingen te geven.
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  -- De tijden in task_schedules zijn kloktijden van het toestel. De functie
  -- rekent "nu" om naar deze zone.
  timezone     text not null default 'Europe/Brussels',
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Je ziet en verwijdert alleen je eigen abonnementen. Schrijven loopt via
-- save_push_subscription hieronder, omdat een endpoint van gebruiker mag
-- wisselen en een gewone policy dat niet kan toestaan zonder te veel toe te
-- staan.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_timezone text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, timezone, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_timezone, ''), 'Europe/Brussels'), p_user_agent)
  on conflict (endpoint) do update
    set user_id      = excluded.user_id,
        p256dh       = excluded.p256dh,
        auth         = excluded.auth,
        timezone     = excluded.timezone,
        user_agent   = excluded.user_agent,
        last_seen_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text, text, text) to authenticated;

-- ── Wat er al verstuurd is ─────────────────────────────────────────────────
create table if not exists public.reminder_log (
  schedule_id uuid not null references public.task_schedules(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  due_date    date not null,
  -- 0 = de herinnering op het afgesproken uur, 1..4 = de droevige uurlijkse.
  slot        smallint not null,
  sent_at     timestamptz not null default now(),
  primary key (schedule_id, user_id, due_date, slot)
);

-- RLS aan en geen policies: alleen de service role (de Edge Function) komt
-- hieraan.
alter table public.reminder_log enable row level security;

commit;

-- ── Cron ───────────────────────────────────────────────────────────────────
-- Buiten de transactie: cron.schedule met een bestaande naam werkt de job
-- bij, dus deze migratie opnieuw draaien is veilig.
select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Het logboek hoeft maar een paar dagen terug te kijken.
select cron.schedule(
  'prune-reminder-log',
  '17 3 * * *',
  $$ delete from public.reminder_log where due_date < current_date - 7 $$
);

-- Terugdraaien:
--   select cron.unschedule('send-reminders');
--   select cron.unschedule('prune-reminder-log');
--   drop function if exists public.save_push_subscription(text, text, text, text, text);
--   drop table if exists public.reminder_log;
--   drop table if exists public.push_subscriptions;

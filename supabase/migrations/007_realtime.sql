-- 007_realtime.sql
--
-- Zet live-updates aan, zodat je ziet gebeuren wat een ander hoflid doet:
-- een queeste die voltooid wordt, een bounty die van het bord verdwijnt.
--
-- Supabase stuurt alleen wijzigingen door van tabellen die in de publicatie
-- `supabase_realtime` zitten. Standaard zit daar niets in.
--
-- Dit is de veiligste migratie van de drie: hij voegt geen kolommen toe en
-- verandert geen policies. Draait hij niet, dan blijft de app gewoon werken —
-- er komen dan alleen geen live meldingen binnen. Er is dus geen
-- capability-probe voor nodig.
--
-- LET OP: RLS geldt ook voor realtime. Een hoflid krijgt alleen wijzigingen
-- door van rijen die het volgens de policies mag LEZEN. Omdat lezen in dit
-- hof bewust breed is (iedereen ziet elkaars queestes voor de ranking en de
-- kalender), werkt dat hier zoals bedoeld.

begin;

-- `add table` faalt als de tabel er al in zit, en dat mag geen migratie breken.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_instances'
  ) then
    alter publication supabase_realtime add table public.task_instances;
  end if;
end
$$;

-- REPLICA IDENTITY FULL zorgt dat de OUDE rij meekomt in een UPDATE-payload.
-- Zonder dit bevat `old` alleen de primary key, en dan kan de app niet zien
-- of `completed_at` net van NULL naar een tijdstip ging — precies het verschil
-- tussen "queeste voltooid" en "er is iets anders aan deze rij veranderd".
alter table public.task_instances replica identity full;

commit;

-- Terugdraaien:
--   alter publication supabase_realtime drop table public.task_instances;
--   alter table public.task_instances replica identity default;

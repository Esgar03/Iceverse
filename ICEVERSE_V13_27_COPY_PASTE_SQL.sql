-- ============================================================
-- ICEVERSE V13.27 — LIVING LEAGUE MEGA UPDATE
-- COPY/PASTE ENTIRE BLOCK IN SUPABASE
-- ============================================================

-- 1. CREATED-PLAYER IDENTITY / HIDDEN TRAITS
create table if not exists public.player_identity_traits(
 player_id uuid primary key references public.players(id) on delete cascade,
 consistency integer not null default 50 check(consistency between 1 and 99),
 clutch integer not null default 50 check(clutch between 1 and 99),
 injury_proneness integer not null default 50 check(injury_proneness between 1 and 99),
 adaptability integer not null default 50 check(adaptability between 1 and 99),
 rivalry_intensity integer not null default 50 check(rivalry_intensity between 1 and 99),
 big_game integer not null default 50 check(big_game between 1 and 99),
 loyalty integer not null default 50 check(loyalty between 1 and 99),
 ambition integer not null default 50 check(ambition between 1 and 99),
 created_at timestamptz not null default now()
);

insert into public.player_identity_traits(player_id,consistency,clutch,injury_proneness,adaptability,rivalry_intensity,big_game,loyalty,ambition)
select p.id,
 40+floor(random()*41)::int,40+floor(random()*41)::int,30+floor(random()*51)::int,
 40+floor(random()*41)::int,35+floor(random()*51)::int,40+floor(random()*41)::int,
 35+floor(random()*51)::int,40+floor(random()*51)::int
from public.players p
where p.created_by is not null
on conflict(player_id) do nothing;

-- 2. PLAYER GOALS / ROLE SATISFACTION
create table if not exists public.player_career_goals(
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete cascade,
 goal_type text not null, goal_text text not null, target_value numeric,
 progress integer not null default 0 check(progress between 0 and 100),
 active boolean not null default true, completed boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.player_role_satisfaction(
 player_id uuid primary key references public.players(id) on delete cascade,
 desired_role text not null default 'regular',
 actual_role text not null default 'regular',
 satisfaction integer not null default 70 check(satisfaction between 0 and 100),
 trade_request boolean not null default false,
 extension_interest integer not null default 70 check(extension_interest between 0 and 100),
 updated_at timestamptz not null default now()
);

-- 3. PLAYER-TO-PLAYER CHEMISTRY
create table if not exists public.player_chemistry(
 player_a_id uuid not null references public.players(id) on delete cascade,
 player_b_id uuid not null references public.players(id) on delete cascade,
 chemistry integer not null default 50 check(chemistry between 0 and 100),
 games_together integer not null default 0,
 label text,
 updated_at timestamptz not null default now(),
 primary key(player_a_id,player_b_id),
 check(player_a_id<>player_b_id)
);

-- 4/5. RIVALRIES + DEEP MATCHUP SPLITS
create table if not exists public.player_rivalries(
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete cascade,
 rival_team_id uuid references public.teams(id) on delete cascade,
 rival_player_id uuid references public.players(id) on delete cascade,
 rival_type text not null default 'team',
 intensity integer not null default 10 check(intensity between 0 and 100),
 label text, updated_at timestamptz not null default now()
);
create table if not exists public.player_team_splits(
 player_id uuid not null references public.players(id) on delete cascade,
 opponent_team_id uuid not null references public.teams(id) on delete cascade,
 games integer not null default 0, goals integer not null default 0, assists integer not null default 0,
 points integer not null default 0, shots integer not null default 0, plus_minus integer not null default 0,
 primary key(player_id,opponent_team_id)
);
create table if not exists public.player_goalie_splits(
 skater_id uuid not null references public.players(id) on delete cascade,
 goalie_id uuid not null references public.players(id) on delete cascade,
 shots integer not null default 0, goals integer not null default 0,
 primary key(skater_id,goalie_id)
);

-- 6. STORY ENGINE
create table if not exists public.league_story_feed(
 id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete set null,
 player_id uuid references public.players(id) on delete cascade, team_id uuid references public.teams(id) on delete cascade,
 story_type text not null, headline text not null, body text, importance integer not null default 1,
 created_at timestamptz not null default now()
);

-- 8. AWARDS + HALL OF FAME
create table if not exists public.player_awards(
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id) on delete cascade,
 season_id uuid references public.seasons(id) on delete set null, season_number integer,
 award_key text not null, award_name text not null, created_at timestamptz not null default now(),
 unique(player_id,season_id,award_key)
);
create table if not exists public.hall_of_fame(
 player_id uuid primary key references public.players(id) on delete cascade,
 inducted_season integer, reason text, inducted_at timestamptz not null default now()
);

-- 9. HIGH CAP / CONTRACT PREFERENCES
alter table public.teams add column if not exists salary_cap bigint not null default 250000000;
alter table public.players add column if not exists contract_loyalty_discount numeric not null default 1.00;
alter table public.players add column if not exists preferred_role text;

-- 10. INTERNATIONAL CAREER / MEDALS
create table if not exists public.international_player_career(
 player_id uuid primary key references public.players(id) on delete cascade,
 games integer not null default 0, goals integer not null default 0, assists integer not null default 0,
 points integer not null default 0, gold integer not null default 0, silver integer not null default 0, bronze integer not null default 0
);

-- 11. LEAGUE / FRANCHISE RECORDS
create table if not exists public.league_records(
 id uuid primary key default gen_random_uuid(), record_scope text not null default 'league',
 team_id uuid references public.teams(id) on delete cascade,
 record_key text not null, record_name text not null, record_value numeric not null,
 holder_player_id uuid references public.players(id) on delete set null,
 season_number integer, set_at timestamptz not null default now()
);

-- 12. GAME-DAY / CALENDAR STRUCTURE
create table if not exists public.season_calendar_events(
 id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete cascade,
 day_number integer not null, event_type text not null, event_name text not null,
 scheduled_at timestamptz, completed boolean not null default false,
 unique(season_id,day_number,event_type,event_name)
);

-- Fixed calendar: 3 signing days, regular season, international break/tournament,
-- and fixed playoff windows. These days are metadata + scheduling anchors.
create or replace function public.iv_build_season_calendar(p_season uuid)
returns integer language plpgsql security definer set search_path=public set row_security=off as $$
declare v_start timestamptz; v_n int:=0;
begin
 begin select public.iceverse_now() into v_start; exception when undefined_function then v_start:=now(); end;
 delete from public.season_calendar_events where season_id=p_season;
 insert into public.season_calendar_events(season_id,day_number,event_type,event_name,scheduled_at) values
 (p_season,1,'offseason','Signing Day 1',v_start),
 (p_season,2,'offseason','Signing Day 2',v_start+interval '1 day'),
 (p_season,3,'offseason','Signing Day 3',v_start+interval '2 days'),
 (p_season,19,'international','International Tournament — Group Day 1',v_start+interval '18 days'),
 (p_season,20,'international','International Tournament — Group Day 2',v_start+interval '19 days'),
 (p_season,21,'international','International Tournament — Group Day 3',v_start+interval '20 days'),
 (p_season,22,'international','International Tournament — Semifinals',v_start+interval '21 days'),
 (p_season,23,'international','International Tournament — Medal Games',v_start+interval '22 days'),
 (p_season,35,'playoffs','Round 1 — Game Day 1',v_start+interval '34 days'),
 (p_season,36,'playoffs','Round 1 — Game Day 2',v_start+interval '35 days'),
 (p_season,37,'playoffs','Round 1 — Game Day 3',v_start+interval '36 days'),
 (p_season,38,'playoffs','Round 1 — Game Day 4',v_start+interval '37 days'),
 (p_season,39,'playoffs','Round 1 — Game Day 5',v_start+interval '38 days'),
 (p_season,40,'playoffs','Round 1 — Game Day 6',v_start+interval '39 days'),
 (p_season,41,'playoffs','Round 1 — Game Day 7',v_start+interval '40 days'),
 (p_season,43,'playoffs','Round 2 — Game Day 1',v_start+interval '42 days'),
 (p_season,44,'playoffs','Round 2 — Game Day 2',v_start+interval '43 days'),
 (p_season,45,'playoffs','Round 2 — Game Day 3',v_start+interval '44 days'),
 (p_season,46,'playoffs','Round 2 — Game Day 4',v_start+interval '45 days'),
 (p_season,47,'playoffs','Round 2 — Game Day 5',v_start+interval '46 days'),
 (p_season,48,'playoffs','Round 2 — Game Day 6',v_start+interval '47 days'),
 (p_season,49,'playoffs','Round 2 — Game Day 7',v_start+interval '48 days'),
 (p_season,51,'playoffs','Conference Finals — Game Day 1',v_start+interval '50 days'),
 (p_season,52,'playoffs','Conference Finals — Game Day 2',v_start+interval '51 days'),
 (p_season,53,'playoffs','Conference Finals — Game Day 3',v_start+interval '52 days'),
 (p_season,54,'playoffs','Conference Finals — Game Day 4',v_start+interval '53 days'),
 (p_season,55,'playoffs','Conference Finals — Game Day 5',v_start+interval '54 days'),
 (p_season,56,'playoffs','Conference Finals — Game Day 6',v_start+interval '55 days'),
 (p_season,57,'playoffs','Conference Finals — Game Day 7',v_start+interval '56 days'),
 (p_season,59,'playoffs','Iceverse Finals — Game Day 1',v_start+interval '58 days'),
 (p_season,60,'playoffs','Iceverse Finals — Game Day 2',v_start+interval '59 days'),
 (p_season,61,'playoffs','Iceverse Finals — Game Day 3',v_start+interval '60 days'),
 (p_season,62,'playoffs','Iceverse Finals — Game Day 4',v_start+interval '61 days'),
 (p_season,63,'playoffs','Iceverse Finals — Game Day 5',v_start+interval '62 days'),
 (p_season,64,'playoffs','Iceverse Finals — Game Day 6',v_start+interval '63 days'),
 (p_season,65,'playoffs','Iceverse Finals — Game Day 7',v_start+interval '64 days')
 on conflict do nothing;
 get diagnostics v_n=row_count;
 return v_n;
end $$;

-- Make sure a newly created/current next season receives the calendar.
create or replace function public.iv_ensure_next_season_events()
returns jsonb language plpgsql security definer set search_path=public set row_security=off as $$
declare s uuid; n int:=0;
begin
 select id into s from public.seasons order by season_number desc limit 1;
 if s is null then return jsonb_build_object('ready',false,'reason','no season'); end if;
 n:=public.iv_build_season_calendar(s);
 if to_regprocedure('public.iv_schedule_international_tournament(uuid)') is not null then
   perform public.iv_schedule_international_tournament(s);
 end if;
 return jsonb_build_object('ready',true,'season_id',s,'calendar_events',n);
end $$;

-- Re-anchor playoff games that EXIST in public.games onto the fixed postseason days.
-- Because they remain ordinary public.games rows, the live league worker AND Sim Lab
-- consume the same playoff games rather than maintaining separate playoff simulations.
create or replace function public.iv_anchor_playoff_games(p_season uuid)
returns integer language plpgsql security definer set search_path=public set row_security=off as $$
declare v_start timestamptz; n int:=0;
begin
 select min(scheduled_at) into v_start from public.season_calendar_events
 where season_id=p_season and event_type='playoffs';
 if v_start is null then return 0; end if;

 with pg as (
   select id,row_number() over(order by scheduled_at,id) rn
   from public.games
   where season_id=p_season
     and lower(competition) like '%playoff%'
     and status='scheduled'
 )
 update public.games g
 set scheduled_at = v_start
   + (((pg.rn-1)/8)::int * interval '1 day')
   + (interval '11 hours' + ((pg.rn-1)%8) * interval '90 minutes')
 from pg where g.id=pg.id;
 get diagnostics n=row_count;
 return n;
end $$;

-- Special-event worker shared by live league and Sim Lab.
create or replace function public.iv_advance_scheduled_special_events()
returns jsonb language plpgsql security definer set search_path=public set row_security=off as $$
declare s uuid; p int:=0; i int:=0;
begin
 select id into s from public.seasons order by season_number desc limit 1;
 if s is null then return jsonb_build_object('playoffs',0,'international',0); end if;
 p:=public.iv_anchor_playoff_games(s);

 -- International scheduler/simulator are optional existing Iceverse engines.
 if to_regprocedure('public.iv_schedule_international_tournament(uuid)') is not null then
   perform public.iv_schedule_international_tournament(s);
 end if;
 if to_regprocedure('public.iv_sim_due_international_games()') is not null then
   select coalesce(public.iv_sim_due_international_games(),0) into i;
 end if;
 return jsonb_build_object('playoffs_anchored',p,'international_games_simulated',i);
end $$;

-- Seed randomized goals for created players who do not have one.
insert into public.player_career_goals(player_id,goal_type,goal_text,target_value)
select p.id,
 case when random()<.34 then 'production' when random()<.67 then 'role' else 'team' end,
 case when random()<.34 then 'Become a major offensive contributor'
      when random()<.67 then 'Earn a larger role and more ice time'
      else 'Help the team make a deep playoff run' end,
 100
from public.players p
where p.created_by is not null
and not exists(select 1 from public.player_career_goals g where g.player_id=p.id and g.active);

-- Initial role satisfaction rows.
insert into public.player_role_satisfaction(player_id)
select id from public.players where created_by is not null
on conflict(player_id) do nothing;

-- RLS for public career/world information.
alter table public.player_identity_traits enable row level security;
alter table public.player_career_goals enable row level security;
alter table public.player_role_satisfaction enable row level security;
alter table public.player_chemistry enable row level security;
alter table public.player_rivalries enable row level security;
alter table public.player_team_splits enable row level security;
alter table public.player_goalie_splits enable row level security;
alter table public.league_story_feed enable row level security;
alter table public.player_awards enable row level security;
alter table public.hall_of_fame enable row level security;
alter table public.international_player_career enable row level security;
alter table public.league_records enable row level security;
alter table public.season_calendar_events enable row level security;

do $$
declare t text;
begin
 foreach t in array array[
 'player_identity_traits','player_career_goals','player_role_satisfaction','player_chemistry',
 'player_rivalries','player_team_splits','player_goalie_splits','league_story_feed','player_awards',
 'hall_of_fame','international_player_career','league_records','season_calendar_events'
 ] loop
   execute format('drop policy if exists "Iceverse public read" on public.%I',t);
   execute format('create policy "Iceverse public read" on public.%I for select using (true)',t);
 end loop;
end $$;

-- Build the calendar immediately for the current/next season.
select public.iv_ensure_next_season_events();

-- Verification
select
 to_regclass('public.player_identity_traits') is not null as identity_ready,
 to_regclass('public.player_chemistry') is not null as chemistry_ready,
 to_regclass('public.player_rivalries') is not null as rivalries_ready,
 to_regclass('public.league_story_feed') is not null as stories_ready,
 to_regclass('public.player_awards') is not null as awards_ready,
 to_regclass('public.league_records') is not null as records_ready,
 to_regclass('public.season_calendar_events') is not null as calendar_ready,
 to_regprocedure('public.iv_anchor_playoff_games(uuid)') is not null as playoff_days_ready,
 to_regprocedure('public.iv_advance_scheduled_special_events()') is not null as simlab_special_events_ready;

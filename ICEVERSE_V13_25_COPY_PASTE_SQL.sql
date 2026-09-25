-- ============================================================
-- ICEVERSE V13.25 — DEVELOPMENT + NPC LOCK + LEADERSHIP LIMITS
-- COPY/PASTE ENTIRE BLOCK IN SUPABASE
-- ============================================================

-- 1) CPU/NPC players are permanent 50 OVR players.
create or replace function public.iv_lock_cpu_player_overall()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.created_by is null then
    new.overall := 50;
    -- NPC potential cannot secretly drive them above 50 later.
    new.potential := greatest(50, least(coalesce(new.potential,50),50));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_iv_lock_cpu_player_overall on public.players;
create trigger trg_iv_lock_cpu_player_overall
before insert or update of overall,potential,created_by
on public.players
for each row execute function public.iv_lock_cpu_player_overall();

update public.players
set overall=50, potential=50
where created_by is null;


-- 2) Development history exists for created players.
create table if not exists public.player_development_history(
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  old_overall integer not null,
  new_overall integer not null,
  change_amount integer not null,
  reason text,
  created_at timestamptz not null default now()
);


-- 3) Apply end-of-regular-season progression to CREATED players only.
--    Young players with room below potential improve fastest.
create or replace function public.iv_apply_created_player_season_progression(p_season uuid)
returns integer
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  r record;
  v_old integer;
  v_new integer;
  v_gain integer;
  v_gp integer;
  v_pts integer;
  v_perf numeric;
  v_col record;
  v_attr_gain integer;
  v_count integer := 0;
begin
  for r in
    select p.id,p.age,p.overall,p.potential,
           coalesce(p.development_factor,1.0) development_factor
    from public.players p
    where p.created_by is not null
      and coalesce(p.is_retired,false)=false
  loop
    v_old := r.overall;

    select count(distinct pgs.game_id)::int,
           coalesce(sum(coalesce(pgs.points,pgs.goals+pgs.assists)),0)::int
    into v_gp,v_pts
    from public.player_game_stats pgs
    join public.games g on g.id=pgs.game_id
    where pgs.player_id=r.id
      and g.season_id=p_season
      and g.competition='regular_season'
      and g.status in ('completed','final');

    -- Playing time + production help, but potential remains the ceiling.
    v_perf := case when v_gp>0 then least(1.5, (v_pts::numeric/greatest(v_gp,1))*.45) else 0 end;

    v_gain :=
      case
        when r.overall >= r.potential then 0
        when r.age <= 20 then 1 + (random()<0.55)::int
        when r.age <= 23 then 1 + (random()<0.35)::int
        when r.age <= 26 then (random()<0.60)::int
        else (random()<0.25)::int
      end;

    if v_gp >= 35 then v_gain := v_gain + (random()<0.35)::int; end if;
    if v_perf >= .45 then v_gain := v_gain + (random()<0.30)::int; end if;
    if r.development_factor >= 1.08 then v_gain := v_gain + (random()<0.25)::int; end if;

    v_gain := greatest(0, least(3, v_gain));
    v_new := least(r.potential, v_old + v_gain);

    if v_new <> v_old then
      update public.players set overall=v_new where id=r.id;

      insert into public.player_development_history
        (player_id,season_id,old_overall,new_overall,change_amount,reason)
      values
        (r.id,p_season,v_old,v_new,v_new-v_old,'Season progression');

      -- Improve the actual gameplay attributes too, not only the displayed OVR.
      -- Each numeric attribute gets 0..gain points, capped at 99.
      v_attr_gain := greatest(1,v_new-v_old);
      for v_col in
        select column_name
        from information_schema.columns
        where table_schema='public'
          and table_name='player_attributes'
          and data_type in ('smallint','integer','bigint','numeric','real','double precision')
          and column_name not in ('id')
      loop
        execute format(
          'update public.player_attributes
           set %1$I = least(99, coalesce(%1$I,50) + floor(random() * %2$s)::int)
           where player_id=$1',
          v_col.column_name,
          v_attr_gain + 1
        ) using r.id;
      end loop;

      v_count := v_count + 1;
    end if;
  end loop;

  -- Defensive guarantee: CPU players remain exactly 50 after any progression pass.
  update public.players set overall=50,potential=50 where created_by is null;
  return v_count;
end;
$$;


-- 4) Database-level leadership validation.
-- team_settings.player_roles is JSON keyed by player UUID.
create or replace function public.iv_validate_team_leadership()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_captains integer := 0;
  v_alternates integer := 0;
begin
  if new.player_roles is null then return new; end if;

  select
    count(*) filter (where value->>'captain'='captain'),
    count(*) filter (where value->>'captain'='alternate')
  into v_captains,v_alternates
  from jsonb_each(new.player_roles);

  if v_captains > 1 then
    raise exception 'A team may have only 1 captain.';
  end if;

  if v_alternates > 3 then
    raise exception 'A team may have only 3 alternate captains.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_iv_validate_team_leadership on public.team_settings;
create trigger trg_iv_validate_team_leadership
before insert or update of player_roles
on public.team_settings
for each row execute function public.iv_validate_team_leadership();


-- 5) Repair the old bug that effectively displayed/treated everyone as Captain.
-- Keep at most one existing captain and at most three existing alternates.
do $$
declare
  s record;
  kv record;
  v_new jsonb;
  v_c integer;
  v_a integer;
  v_role text;
begin
  for s in select team_id,coalesce(player_roles,'{}'::jsonb) player_roles from public.team_settings
  loop
    v_new := '{}'::jsonb; v_c:=0; v_a:=0;
    for kv in select * from jsonb_each(s.player_roles)
    loop
      v_role := kv.value->>'captain';
      if v_role='captain' then
        if v_c=0 then v_c:=1;
        else kv.value := jsonb_set(kv.value,'{captain}','null'::jsonb); end if;
      elsif v_role='alternate' then
        if v_a<3 then v_a:=v_a+1;
        else kv.value := jsonb_set(kv.value,'{captain}','null'::jsonb); end if;
      elsif v_role not in ('captain','alternate') then
        kv.value := jsonb_set(kv.value,'{captain}','null'::jsonb);
      end if;
      v_new := v_new || jsonb_build_object(kv.key,kv.value);
    end loop;
    update public.team_settings set player_roles=v_new where team_id=s.team_id;
  end loop;
end $$;


-- 6) Hook progression into the existing end-of-regular-season transition.
-- This keeps your badge awards and NHL-style playoff creation.
create or replace function public.iv_check_regular_season_complete()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.competition='regular_season'
     and new.status in ('completed','final')
     and not exists(
       select 1 from public.games
       where season_id=new.season_id
         and competition='regular_season'
         and status='scheduled'
     )
  then
    perform public.iv_apply_created_player_season_progression(new.season_id);

    if to_regprocedure('public.iv_award_season_badges(uuid)') is not null then
      perform public.iv_award_season_badges(new.season_id);
    end if;

    if to_regprocedure('public.iv_create_playoffs(uuid)') is not null then
      perform public.iv_create_playoffs(new.season_id);
    end if;
  end if;
  return new;
end;
$$;


-- 7) Verification.
select
  (select count(*) from public.players where created_by is null and overall<>50) as npc_not_50,
  to_regprocedure('public.iv_apply_created_player_season_progression(uuid)') is not null as created_progression_ready,
  to_regprocedure('public.iv_validate_team_leadership()') is not null as leadership_limit_ready,
  to_regprocedure('public.iv_check_regular_season_complete()') is not null as season_hook_ready;

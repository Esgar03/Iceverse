-- ICEVERSE FULL CURRENT-SEASON RESET
-- Admin-only. Deletes CURRENT SEASON games, game stats/events and season awards.
-- Keeps users, teams, players, rosters, contracts and attributes.
-- Then generates a fresh 32-team schedule.

create or replace function public.admin_full_reset_current_season()
returns jsonb
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  sid uuid;
  s_num integer:=1;
  t text;
  deleted_rows bigint:=0;
  total_deleted bigint:=0;
  new_games integer:=0;
begin
  if not public.is_iceverse_admin() then
    raise exception 'Admin access required.';
  end if;

  select id, coalesce(season_number,1)
    into sid,s_num
  from public.seasons
  where coalesce(is_active,false)=true
  order by created_at desc nulls last
  limit 1;

  if sid is null then
    select id,coalesce(season_number,1) into sid,s_num
    from public.seasons
    order by created_at desc nulls last
    limit 1;
  end if;
  if sid is null then raise exception 'No season exists.'; end if;

  -- Delete game-linked detail first, but only from known simulation/stat tables.
  foreach t in array array[
    'game_events',
    'player_game_stats',
    'goalie_game_stats',
    'game_player_stats',
    'game_team_stats',
    'game_stats',
    'play_by_play'
  ]
  loop
    if to_regclass('public.'||t) is not null
       and exists(
         select 1 from information_schema.columns
         where table_schema='public' and table_name=t and column_name='game_id'
       )
    then
      execute format(
        'delete from public.%I where game_id in (select id from public.games where season_id=$1)',
        t
      ) using sid;
      get diagnostics deleted_rows=row_count;
      total_deleted:=total_deleted+deleted_rows;
    end if;
  end loop;

  -- Delete current-season aggregate stats / awards only when the table
  -- actually exists AND has season_id.
  foreach t in array array[
    'player_awards',
    'season_awards',
    'awards',
    'player_season_stats',
    'goalie_season_stats',
    'team_season_stats',
    'season_stats',
    'standings'
  ]
  loop
    if to_regclass('public.'||t) is not null
       and exists(
         select 1 from information_schema.columns
         where table_schema='public' and table_name=t and column_name='season_id'
       )
    then
      execute format('delete from public.%I where season_id=$1',t) using sid;
      get diagnostics deleted_rows=row_count;
      total_deleted:=total_deleted+deleted_rows;
    end if;
  end loop;

  -- Remove the actual current-season games last.
  delete from public.games where season_id=sid;
  get diagnostics deleted_rows=row_count;
  total_deleted:=total_deleted+deleted_rows;

  -- Return the persistent world to Day 1 without deleting teams/players.
  update public.world_state
     set season_number=s_num,
         world_day=1,
         last_tick_at=now(),
         last_daily_at=now()
   where id=1;

  -- Build a brand-new schedule beginning tomorrow Eastern Time.
  new_games:=public.iv_generate_32_team_schedule(
    sid,
    (now() at time zone 'America/New_York')::date + 1,
    '19:00'
  );

  return jsonb_build_object(
    'season_id',sid,
    'season_number',s_num,
    'rows_removed',total_deleted,
    'new_games',new_games,
    'world_day',1
  );
end;
$$;

revoke all on function public.admin_full_reset_current_season() from public;
grant execute on function public.admin_full_reset_current_season() to authenticated;

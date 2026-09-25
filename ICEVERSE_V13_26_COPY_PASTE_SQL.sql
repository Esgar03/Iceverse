-- ============================================================
-- ICEVERSE V13.26 — TEST RESET CLOCK RE-ANCHOR
-- COPY/PASTE ENTIRE BLOCK IN SUPABASE
-- ============================================================
-- After a Test Season restore, this moves the restored live schedule
-- back onto the CURRENT Iceverse clock while preserving every game's
-- spacing/order. The first restored game is never stranded after the
-- test season's simulated future date.

create or replace function public.admin_reanchor_live_schedule_after_test()
returns jsonb
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  v_now timestamptz;
  v_first timestamptz;
  v_target timestamptz;
  v_delta interval;
  v_shifted integer := 0;
begin
  if not public.is_iceverse_admin() then
    raise exception 'Admin only';
  end if;

  -- Use the authoritative internal game clock if installed.
  begin
    select public.iceverse_now() into v_now;
  exception when undefined_function then
    v_now := now();
  end;

  select min(scheduled_at)
  into v_first
  from public.games
  where status='scheduled'
    and competition='regular_season';

  if v_first is null then
    return jsonb_build_object('games_shifted',0,'reason','no scheduled regular-season games');
  end if;

  -- Preserve the 3-day signing window used by Iceverse.
  v_target := v_now + interval '3 days';

  -- If the restored schedule is already sensibly anchored around now,
  -- leave it alone. Re-anchor only when it was stranded in the future
  -- or behind the current game clock.
  if v_first > v_now + interval '4 days'
     or v_first < v_now - interval '1 hour'
  then
    v_delta := v_target - v_first;

    update public.games
    set scheduled_at = scheduled_at + v_delta
    where status='scheduled'
      and competition='regular_season';

    get diagnostics v_shifted = row_count;
  end if;

  return jsonb_build_object(
    'games_shifted',v_shifted,
    'clock_now',v_now,
    'first_game_before',v_first,
    'first_game_after',
      (select min(scheduled_at) from public.games
       where status='scheduled' and competition='regular_season')
  );
end;
$$;

grant execute
on function public.admin_reanchor_live_schedule_after_test()
to authenticated;

select
  to_regprocedure('public.admin_reanchor_live_schedule_after_test()') is not null
    as test_clock_reanchor_ready;

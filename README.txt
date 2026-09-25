ICEVERSE V13.10 FIRE UPDATE

UPLOAD/REPLACE:
1. Replace your current index.html with this index.html.
2. Upload JS files 29 through 37 beside index.html.
3. No new SQL is required for this update if V13 Living League + V13.07 Test Season SQL are already installed.

KEY FIX:
Sim Full Season no longer calls admin_test_sim_full_season(). It repeatedly calls admin_test_sim_next_day(), so each game day is a separate Supabase request and avoids the 992-game statement timeout.

ADDITIONS:
- Persistent Home navigation
- Stories / International / Playoffs quick navigation
- Created-player spotlight on Home
- Created-player career pulse on profiles
- Three Stars on GameCenter
- Full-season test progress overlay
- Pause-safe test simulation

/* ICEVERSE ADMIN RESET / DATE CONTROLS
   Load after 14-schedule-32-team.js.
   UI is admin-only because it is injected only into the existing Admin screen.
   Backend RPCs independently enforce is_iceverse_admin(). */

async function ivAdminResetSeason(){
  if(!confirm(
    "RESET CURRENT SEASON?\n\n"+
    "This clears current-season game results/stat lines and returns regular-season games to scheduled at 0-0.\n\n"+
    "Teams, users and players are kept."
  )) return;

  const {data,error}=await supabaseClient.rpc("admin_reset_current_season");
  if(error) return alert("Season reset failed: "+error.message);
  alert(`Season reset.\nGames reset: ${data?.games_reset??0}`);
  if(typeof ivRefreshWorldClock==="function") ivRefreshWorldClock();
}

async function ivAdminRevertWorldDate(){
  const season=Number(document.getElementById("ivAdminSeasonNumber")?.value);
  const day=Number(document.getElementById("ivAdminWorldDay")?.value);
  const easternDate=document.getElementById("ivAdminEasternDate")?.value;

  if(!Number.isInteger(season)||season<1) return alert("Enter a valid season number.");
  if(!Number.isInteger(day)||day<1) return alert("Enter a valid world day.");
  if(!easternDate) return alert("Choose the Eastern date that should correspond to that world day.");

  if(!confirm(
    `Revert Iceverse to Season ${season}, Day ${day} on ${easternDate} Eastern Time?\n\n`+
    "The regular-season schedule will move with the world date while keeping its Eastern start times."
  )) return;

  const {data,error}=await supabaseClient.rpc("admin_revert_world_date",{
    p_season_number:season,
    p_world_day:day,
    p_eastern_date:easternDate
  });
  if(error) return alert("World-date revert failed: "+error.message);

  alert(`Iceverse reverted to Season ${data.season_number}, Day ${data.world_day}.`);
  if(typeof ivRefreshWorldClock==="function") ivRefreshWorldClock();
  if(typeof showSchedule==="function") showSchedule();
}

function ivInstallWorldAdminControls(){
  const c=document.getElementById("adminContent");
  if(!c||document.getElementById("ivWorldResetControls")) return;

  const today=new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date());

  const card=document.createElement("div");
  card.id="ivWorldResetControls";
  card.className="panel";
  card.style.marginTop="16px";
  card.innerHTML=`
    <h3>Admin World Controls</h3>
    <p class="muted" style="margin-top:7px">
      Admin only. Scheduled games run automatically from the server when their Eastern scheduled time arrives.
    </p>

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px">
      <label><strong>Season</strong>
        <input id="ivAdminSeasonNumber" type="number" min="1" value="1" style="margin-top:6px">
      </label>
      <label><strong>Day</strong>
        <input id="ivAdminWorldDay" type="number" min="1" value="1" style="margin-top:6px">
      </label>
      <label><strong>Eastern date</strong>
        <input id="ivAdminEasternDate" type="date" value="${today}" style="margin-top:6px">
      </label>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">
      <button class="secondary-button" onclick="ivAdminRevertWorldDate()">Revert Season / Date</button>
      <button class="secondary-button" onclick="ivAdminResetSeason()"
        style="border-color:#b84c5b">Reset Current Season</button>
    </div>`;
  c.appendChild(card);
}

if(typeof showAdmin==="function"){
  const ivWorldAdminOldShowAdmin=showAdmin;
  showAdmin=async function(){
    await ivWorldAdminOldShowAdmin();
    ivInstallWorldAdminControls();
  };
}

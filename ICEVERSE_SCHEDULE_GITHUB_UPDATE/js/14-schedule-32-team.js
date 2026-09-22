/* ICEVERSE 32-TEAM SCHEDULE ADMIN PATCH
   Add this file AFTER 06-schedule-feed.js in index.html. */

async function adminRegenerate32TeamSchedule(){
  if(!confirm(
    "Rebuild the active season as a 32-team, 62-game schedule?\n\n" +
    "Every team will play all 31 opponents, with 31 home and 31 away games."
  )) return;

  const {data,error}=await supabaseClient.rpc("admin_regenerate_32_team_schedule");
  if(error){
    alert("32-team schedule failed: "+error.message);
    return;
  }

  alert(
    "Schedule created.\n\n" +
    `${data?.games_created ?? 992} total games\n` +
    "62 games per team\n" +
    "All 31 opponents played\n" +
    "Games automatically process when their scheduled start time arrives."
  );
  await showSchedule();
}

/* Keep browser-side checking as a backup to server cron. */
let ivDueGameExactTimer=null;
async function ivScheduleDueGameCheck(){
  try{
    const {data,error}=await supabaseClient.rpc("iv_autosim_due_games",{p_limit:100});
    if(error) console.warn("Due-game check:",error.message);
    return data||0;
  }catch(e){
    console.warn("Due-game check:",e);
    return 0;
  }
}
window.addEventListener("load",()=>{
  setTimeout(ivScheduleDueGameCheck,2000);
  if(ivDueGameExactTimer) clearInterval(ivDueGameExactTimer);
  ivDueGameExactTimer=setInterval(ivScheduleDueGameCheck,10000);
});


/* Add the 32-team schedule control to the existing Admin screen. */
function ivInstall32TeamScheduleAdminCard(){
  const c=document.getElementById("adminContent");
  if(!c || document.getElementById("iv32ScheduleAdminCard")) return;

  const card=document.createElement("div");
  card.id="iv32ScheduleAdminCard";
  card.className="panel";
  card.innerHTML=`
    <h3>32-Team League Schedule</h3>
    <p class="muted" style="margin-top:8px">
      Builds a perfectly balanced 62-game regular season:
      every team plays all 31 opponents twice, once home and once away.
      Each team finishes with 31 home and 31 away games.
    </p>
    <button class="primary-button" style="margin-top:12px"
      onclick="adminRegenerate32TeamSchedule()">
      Generate 32-Team Schedule
    </button>`;
  c.appendChild(card);
}

/* Existing showAdmin is defined earlier; wrap it after this patch loads. */
if(typeof showAdmin==="function"){
  const ivScheduleOldShowAdmin=showAdmin;
  showAdmin=async function(){
    await ivScheduleOldShowAdmin();
    ivInstall32TeamScheduleAdminCard();
  };
}

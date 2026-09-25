/* ICEVERSE V13.22 — COMPETITIVE HOCKEY UPDATE
   NHL-style playoff UI hooks, goalie workload control, accurate season history,
   personal dashboard schedule, and staged test reset.
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function iv1322GoaliePanel(teamId){
 const host=document.getElementById("teamDetailContent")||document.getElementById("teamContent"); if(!host)return;
 const {data,error}=await supabaseClient.rpc("iv_get_goalie_plan",{p_team_id:teamId}); if(error||!data)return;
 let box=document.getElementById("iv1322GoaliePlan");if(!box){box=document.createElement("div");box.id="iv1322GoaliePlan";box.className="panel";box.style.marginTop="16px";host.appendChild(box)}
 const pct=Number(data.starter_share||65);
 box.innerHTML=`<h3>🥅 Goalie Workload Plan</h3>
 <p class="muted">Set how aggressively the coach rides the starter. Heavy workloads improve short-term starter usage, but consecutive starts now create a real performance penalty.</p>
 <div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center">
 <input id="ivGoalieShare" type="range" min="50" max="80" step="1" value="${pct}">
 <strong id="ivGoalieShareLabel">${pct}% starter / ${100-pct}% backup</strong></div>
 <div class="muted" style="margin-top:8px">Current streak: starter ${data.starter_consecutive||0} straight · backup ${data.backup_consecutive||0} straight</div>
 <button class="primary-button" style="margin-top:12px" onclick="iv1322SaveGoaliePlan('${teamId}')">Save goalie plan</button>`;
 const s=document.getElementById("ivGoalieShare");s.oninput=()=>document.getElementById("ivGoalieShareLabel").textContent=`${s.value}% starter / ${100-Number(s.value)}% backup`;
}
window.iv1322SaveGoaliePlan=async teamId=>{
 const v=Number(document.getElementById("ivGoalieShare")?.value||65);
 const {error}=await supabaseClient.rpc("iv_set_goalie_plan",{p_team_id:teamId,p_starter_share:v});
 if(error)return alert("Goalie plan failed: "+error.message);
 alert(`Goalie plan saved: ${v}% starter / ${100-v}% backup.`);
 await iv1322GoaliePanel(teamId);
};

async function iv1322SeasonHistory(playerId){
 const host=document.getElementById("playerProfileContent")||document.getElementById("playerProfile");if(!host)return;
 const {data,error}=await supabaseClient.rpc("iv_player_season_history",{p_player_id:playerId});if(error)return;
 let box=document.getElementById("iv1322SeasonHistory");if(!box){box=document.createElement("div");box.id="iv1322SeasonHistory";box.className="panel";box.style.marginTop="16px";host.appendChild(box)}
 box.innerHTML=`<h3>Season History</h3><div class="table-wrap"><table class="iv-table"><thead><tr><th>Season</th><th>GP</th><th>G</th><th>A</th><th>P</th><th>Team</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td><strong>Season ${x.season_number}</strong></td><td>${x.gp}</td><td>${x.goals}</td><td>${x.assists}</td><td>${x.points}</td><td>${E(x.team_name||"—")}</td></tr>`).join("")||'<tr><td colspan="6">No season history yet.</td></tr>'}</tbody></table></div>`;
}

async function iv1322PersonalUpcoming(){
 const host=document.getElementById("dashboardContent")||document.getElementById("homeSection");if(!host)return;
 try{
  const {data:{user}}=await supabaseClient.auth.getUser();if(!user)return;
  const [{data:owned},{data:mine}]=await Promise.all([
   supabaseClient.from("teams").select("id").eq("owner_id",user.id),
   supabaseClient.from("players").select("id").eq("created_by",user.id)
  ]);
  const teamIds=new Set((owned||[]).map(x=>x.id));
  if((mine||[]).length){
   const {data:r}=await supabaseClient.from("rosters").select("team_id,player_id").in("player_id",mine.map(x=>x.id)).eq("roster_status","active");
   (r||[]).forEach(x=>teamIds.add(x.team_id));
  }
  let games=[];
  if(teamIds.size){
   const ids=[...teamIds];
   const {data}=await supabaseClient.from("games").select("id,scheduled_at,home_team_id,away_team_id,status,competition").eq("status","scheduled").or(`home_team_id.in.(${ids.join(",")}),away_team_id.in.(${ids.join(",")})`).order("scheduled_at",{ascending:true}).limit(8);
   games=data||[];
  }
  const tids=[...new Set(games.flatMap(g=>[g.home_team_id,g.away_team_id]))];let tm={};
  if(tids.length){const {data}=await supabaseClient.from("teams").select("id,city,name").in("id",tids);tm=Object.fromEntries((data||[]).map(x=>[x.id,`${x.city} ${x.name}`]))}
  let box=document.getElementById("iv1322MyGames");if(!box){box=document.createElement("div");box.id="iv1322MyGames";box.className="panel";box.style.marginTop="16px";host.prepend(box)}
  box.innerHTML=`<div class="section-toolbar"><div><h3>My Upcoming Games</h3><div class="muted">Only teams you own or teams containing one of your created players.</div></div><button class="secondary-button" onclick="showSchedule()">Full League Schedule</button></div>${games.map(g=>`<div class="data-row"><span>${E(tm[g.away_team_id]||"Away")} @ ${E(tm[g.home_team_id]||"Home")}<div class="muted">${E(g.competition||"regular season")}</div></span><strong>${new Date(g.scheduled_at).toLocaleString()}</strong></div>`).join("")||'<div class="muted">No personal games are currently scheduled.</div>'}`;
 }catch(e){console.warn("personal schedule",e)}
}

async function iv1322SafeReset(){
 if(!confirm("Reset the active Test Season back to its restore point?"))return;
 let overlay=document.getElementById("iv1322Reset");
 if(!overlay){overlay=document.createElement("div");overlay.id="iv1322Reset";overlay.style.cssText="position:fixed;inset:0;background:rgba(2,10,18,.9);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px";overlay.innerHTML='<div class="panel" style="width:min(560px,100%);padding:24px"><h2>Restoring Test Season</h2><div id="iv1322ResetText" class="muted">Cleaning simulated games in small batches…</div><div style="height:10px;background:#071525;border-radius:99px;margin-top:15px;overflow:hidden"><div id="iv1322ResetBar" style="height:100%;width:5%;background:currentColor"></div></div></div>';document.body.appendChild(overlay)}
 overlay.style.display="flex";
 try{
  let loops=0;
  while(true){
   const {data,error}=await supabaseClient.rpc("admin_test_reset_batch",{p_game_limit:4});if(error)throw error;
   loops++;
   document.getElementById("iv1322ResetText").textContent=`Restoring games safely… ${data?.remaining_games??0} left`;
   document.getElementById("iv1322ResetBar").style.width=Math.min(90,5+loops*2)+"%";
   if(data?.complete)break;
   await sleep(70);
  }
  const {error}=await supabaseClient.rpc("admin_test_reset_finish");if(error)throw error;
  document.getElementById("iv1322ResetBar").style.width="100%";document.getElementById("iv1322ResetText").textContent="Restore complete.";
  setTimeout(()=>{overlay.style.display="none";window.showAdmin?.()},1000);
 }catch(e){document.getElementById("iv1322ResetText").textContent="Reset stopped: "+(e?.message||e)}
}
window.iv1322SafeReset=iv1322SafeReset;

/* Replace old reset button handlers after admin renders. */
function patchResetButtons(){
 document.querySelectorAll("button").forEach(b=>{
  if(/reset test season/i.test(b.textContent||"")) b.onclick=iv1322SafeReset;
 });
}
const hook=(name,fn)=>{const old=window[name];if(typeof old!=="function")return;window[name]=async function(...a){const r=await old.apply(this,a);try{await fn(...a)}catch(e){console.warn(name,e)}return r}};
hook("openPlayerProfile",iv1322SeasonHistory);
hook("openTeam",iv1322GoaliePanel);hook("showTeam",iv1322GoaliePanel);hook("openTeamProfile",iv1322GoaliePanel);
hook("showHome",iv1322PersonalUpcoming);hook("showDashboard",iv1322PersonalUpcoming);
hook("showAdmin",async()=>setTimeout(patchResetButtons,50));
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{patchResetButtons();iv1322PersonalUpcoming()},900));
console.log("🏆 Iceverse V13.22 Competitive Hockey Update loaded");
})();
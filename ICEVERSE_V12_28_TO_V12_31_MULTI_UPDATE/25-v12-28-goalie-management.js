/* ICEVERSE V12.28 — GOALIE MANAGEMENT */
(() => {
"use strict";
const E=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"");
async function ivGoalieManagement(teamId){
  showSection("contractsSection");
  const c=document.getElementById("contractsContent");
  c.innerHTML='<div class="loading">Loading goalie room...</div>';
  try{
    const [{data:team,error},{data:roster},{data:usage}]=await Promise.all([
      supabaseClient.from("teams").select("id,city,name").eq("id",teamId).single(),
      supabaseClient.from("rosters").select("player_id,players(id,first_name,last_name,overall,fatigue,current_form,primary_position)").eq("team_id",teamId),
      supabaseClient.from("goalie_game_stats").select("player_id,shots_against,saves,goals_against,win,shutout").eq("team_id",teamId)
    ]);
    if(error)throw error;
    const gs=(roster||[]).map(r=>r.players).filter(p=>p?.primary_position==="G");
    const totals={};(usage||[]).forEach(x=>{const z=totals[x.player_id]??={gp:0,sa:0,sv:0,ga:0,w:0,so:0};z.gp++;z.sa+=+x.shots_against||0;z.sv+=+x.saves||0;z.ga+=+x.goals_against||0;z.w+=x.win?1:0;z.so+=x.shutout?1:0});
    c.innerHTML=`<button class="secondary-button" onclick="openTeamProfile('${teamId}')">← Back to Team</button>
    <div class="section-toolbar" style="margin-top:18px"><div><h2>${E(team.city)} ${E(team.name)} Goalie Room</h2><div class="muted">Workload, form and season performance.</div></div></div>
    <div class="app-grid">${gs.map((g,i)=>{const x=totals[g.id]||{gp:0,sa:0,sv:0,ga:0,w:0,so:0},pct=x.sa?(x.sv/x.sa):0;return `<div class="panel"><span class="pill">${i===0?"Starter Candidate":"Goalie"}</span><h3 class="profile-link" onclick="openPlayerProfile('${g.id}')">${E(g.first_name)} ${E(g.last_name)}</h3><div class="metric-value">${g.overall} OVR</div><div class="data-list"><div class="data-row"><span>GP</span><strong>${x.gp}</strong></div><div class="data-row"><span>Record</span><strong>${x.w} W</strong></div><div class="data-row"><span>Save %</span><strong>${pct?pct.toFixed(3):".000"}</strong></div><div class="data-row"><span>Shutouts</span><strong>${x.so}</strong></div><div class="data-row"><span>Fatigue</span><strong>${g.fatigue??0}</strong></div><div class="data-row"><span>Form</span><strong>${g.current_form??50}</strong></div></div></div>`}).join("")||'<div class="empty-state">No goalies found.</div>'}</div>`;
  }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
}
window.ivGoalieManagement=ivGoalieManagement;
const old=window.openTeamManagement;
if(typeof old==="function")window.openTeamManagement=async function(teamId){await old(teamId);const c=document.getElementById("teamManagementContent")||document.getElementById("contractsContent");if(c&&!document.getElementById("ivGoalieRoomButton"))c.insertAdjacentHTML("afterbegin",`<div id="ivGoalieRoomButton" style="margin-bottom:12px"><button class="secondary-button" onclick="ivGoalieManagement('${teamId}')">Goalie Room</button></div>`)};
console.log("Iceverse V12.28 goalie management loaded.");
})();
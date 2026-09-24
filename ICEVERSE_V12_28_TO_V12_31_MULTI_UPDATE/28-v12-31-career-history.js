/* ICEVERSE V12.31 — CAREER HISTORY */
(() => {
"use strict";
const E=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"");
async function ivCareerHistory(playerId){
 const c=document.getElementById("playerProfileContent");if(!c)return;
 try{
  const [{data:games},{data:gstats},{data:goalies}]=await Promise.all([
   supabaseClient.from("player_game_stats").select("game_id").eq("player_id",playerId),
   supabaseClient.from("player_game_stats").select("goals,assists,points,shots,hits,blocks,pim,toi_seconds").eq("player_id",playerId),
   supabaseClient.from("goalie_game_stats").select("shots_against,saves,goals_against,win,shutout").eq("player_id",playerId)
  ]);
  const s=(gstats||[]).reduce((a,x)=>{for(const k of ["goals","assists","points","shots","hits","blocks","pim","toi_seconds"])a[k]=(a[k]||0)+(+x[k]||0);return a},{});
  const g=(goalies||[]).reduce((a,x)=>{a.gp++;a.sa+=+x.shots_against||0;a.sv+=+x.saves||0;a.ga+=+x.goals_against||0;a.w+=x.win?1:0;a.so+=x.shutout?1:0;return a},{gp:0,sa:0,sv:0,ga:0,w:0,so:0});
  let box=document.getElementById("ivCareerHistory");if(!box){box=document.createElement("div");box.id="ivCareerHistory";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
  box.innerHTML=`<h3>Career Totals</h3>${g.gp?`<div class="app-grid"><div class="metric-card"><div class="muted">Games</div><div class="metric-value">${g.gp}</div></div><div class="metric-card"><div class="muted">Wins</div><div class="metric-value">${g.w}</div></div><div class="metric-card"><div class="muted">Saves</div><div class="metric-value">${g.sv}</div></div><div class="metric-card"><div class="muted">Save %</div><div class="metric-value">${g.sa?(g.sv/g.sa).toFixed(3):".000"}</div></div></div>`:`<div class="app-grid"><div class="metric-card"><div class="muted">GP</div><div class="metric-value">${(gstats||[]).length}</div></div><div class="metric-card"><div class="muted">Goals</div><div class="metric-value">${s.goals||0}</div></div><div class="metric-card"><div class="muted">Assists</div><div class="metric-value">${s.assists||0}</div></div><div class="metric-card"><div class="muted">Points</div><div class="metric-value">${s.points||0}</div></div></div><div class="data-list" style="margin-top:12px"><div class="data-row"><span>Shots</span><strong>${s.shots||0}</strong></div><div class="data-row"><span>Hits</span><strong>${s.hits||0}</strong></div><div class="data-row"><span>Blocks</span><strong>${s.blocks||0}</strong></div><div class="data-row"><span>PIM</span><strong>${s.pim||0}</strong></div></div>`}`;
 }catch(e){console.warn("Career history",e.message)}
}
const old=window.openPlayerProfile;
if(typeof old==="function")window.openPlayerProfile=async function(id){await old(id);await ivCareerHistory(id)};
window.ivCareerHistory=ivCareerHistory;
console.log("Iceverse V12.31 career history loaded.");
})();
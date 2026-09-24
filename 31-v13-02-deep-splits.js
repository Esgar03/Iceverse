/* ICEVERSE V13.02 — DEEP MATCHUP SPLITS */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function iv13Splits(playerId){
 const c=document.getElementById("playerProfileContent");if(!c)return;
 const [{data:s},{data:v}]=await Promise.all([
  supabaseClient.from("player_team_splits").select("*").eq("player_id",playerId).order("points",{ascending:false}),
  supabaseClient.from("shooter_goalie_splits").select("*").eq("shooter_id",playerId).order("goals",{ascending:false}).limit(10)
 ]);
 const tids=[...new Set((s||[]).map(x=>x.opponent_team_id))],gids=[...new Set((v||[]).map(x=>x.goalie_id))];
 let tm={},pm={};
 if(tids.length){const {data:t}=await supabaseClient.from("teams").select("id,city,name").in("id",tids);tm=Object.fromEntries((t||[]).map(x=>[x.id,x]))}
 if(gids.length){const {data:p}=await supabaseClient.from("players").select("id,first_name,last_name").in("id",gids);pm=Object.fromEntries((p||[]).map(x=>[x.id,x]))}
 let box=document.getElementById("iv13Splits");if(!box){box=document.createElement("div");box.id="iv13Splits";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
 box.innerHTML=`<h3>Career Matchups</h3><div class="app-grid"><div><h4>vs Teams</h4>${(s||[]).slice(0,10).map(x=>{const t=tm[x.opponent_team_id]||{};return `<div class="data-row"><span>${E((t.city||"")+" "+(t.name||"Team"))}</span><strong>${x.goals}G ${x.assists}A ${x.points}P</strong></div>`}).join("")||'<div class="muted">No matchup history yet.</div>'}</div><div><h4>vs Goalies</h4>${(v||[]).map(x=>{const p=pm[x.goalie_id]||{},pct=x.shots?100*x.goals/x.shots:0;return `<div class="data-row"><span>${E((p.first_name||"")+" "+(p.last_name||"Goalie"))}</span><strong>${x.goals}/${x.shots} · ${pct.toFixed(1)}%</strong></div>`}).join("")||'<div class="muted">Shooter-goalie history will populate from recorded shot/goal events.</div>'}</div></div>`;
}
window.iv13Splits=iv13Splits;
const old=window.openPlayerProfile;
if(typeof old==="function")window.openPlayerProfile=async function(id){await old(id);await iv13Splits(id)};
console.log("Iceverse V13.02 deep splits loaded.");
})();
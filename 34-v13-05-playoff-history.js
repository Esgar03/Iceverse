/* ICEVERSE V13.05 — PLAYOFF HISTORY + SERIES ARCHIVE */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function showPlayoffHistory(){
 if(typeof hideAllMainSections==="function")hideAllMainSections();
 let sec=document.getElementById("playoffHistorySection");
 if(!sec){sec=document.createElement("section");sec.id="playoffHistorySection";sec.className="section";document.querySelector("main")?.appendChild(sec)}
 sec.style.display="block";sec.innerHTML='<div class="loading">Loading playoff archive...</div>';
 const [{data:s},{data:teams}]=await Promise.all([supabaseClient.from("playoff_series").select("*").order("season_number",{ascending:false}).order("round_number",{ascending:false}),supabaseClient.from("teams").select("id,city,name")]);
 const tm=Object.fromEntries((teams||[]).map(x=>[x.id,x])),name=id=>`${tm[id]?.city||""} ${tm[id]?.name||"Team"}`.trim();
 const seasons=[...new Set((s||[]).map(x=>x.season_number))];
 sec.innerHTML=`<div class="section-toolbar"><div><h1>Playoff Archive</h1><div class="muted">Every series becomes part of Iceverse history.</div></div><button class="secondary-button" onclick="showHome()">Home</button></div>${seasons.map(sn=>`<div class="panel" style="margin-bottom:16px"><h2>Season ${sn}</h2>${s.filter(x=>x.season_number===sn).map(x=>`<div class="data-row"><span>Round ${x.round_number}: ${E(name(x.team_a_id))} vs ${E(name(x.team_b_id))}</span><strong>${x.team_a_wins}-${x.team_b_wins}${x.winner_team_id?` · ${E(name(x.winner_team_id))}`:""}</strong></div>`).join("")}</div>`).join("")||'<div class="empty-state">No playoff series archived yet.</div>'}`;
}
window.showPlayoffHistory=showPlayoffHistory;
console.log("Iceverse V13.05 playoff archive loaded.");
})();
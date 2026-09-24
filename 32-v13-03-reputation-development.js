/* ICEVERSE V13.03 — REPUTATION + DEVELOPMENT HISTORY */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function iv13Legacy(playerId){
 const c=document.getElementById("playerProfileContent");if(!c)return;
 const [{data:p},{data:d},{data:a}]=await Promise.all([
  supabaseClient.from("players").select("id,reputation,overall,potential,career_stage").eq("id",playerId).single(),
  supabaseClient.from("player_development_history").select("*").eq("player_id",playerId).order("created_at",{ascending:false}).limit(12),
  supabaseClient.from("player_awards").select("*").eq("player_id",playerId).order("season_number",{ascending:false})
 ]);
 let box=document.getElementById("iv13Legacy");if(!box){box=document.createElement("div");box.id="iv13Legacy";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
 const rep=p?.reputation||0,label=rep>=90?"League Icon":rep>=75?"Superstar":rep>=55?"Star":rep>=35?"Established":rep>=15?"Known":"Unknown";
 box.innerHTML=`<h3>Legacy & Development</h3><div class="app-grid"><div><div class="metric-card"><div class="muted">Reputation</div><div class="metric-value">${rep}</div><strong>${label}</strong></div><h4 style="margin-top:14px">Awards</h4>${(a||[]).map(x=>`<div class="data-row"><span>${E(x.award_name)}</span><strong>S${x.season_number}</strong></div>`).join("")||'<div class="muted">No awards yet.</div>'}</div><div><h4>Development history</h4>${(d||[]).map(x=>`<div class="data-row"><span>${E(x.reason||"Development update")}<div class="muted">${new Date(x.created_at).toLocaleDateString()}</div></span><strong>${x.old_overall} → ${x.new_overall}</strong></div>`).join("")||'<div class="muted">Future progression, breakouts and declines will appear here.</div>'}</div></div>`;
}
window.iv13Legacy=iv13Legacy;
const old=window.openPlayerProfile;
if(typeof old==="function")window.openPlayerProfile=async function(id){await old(id);await iv13Legacy(id)};
console.log("Iceverse V13.03 legacy loaded.");
})();
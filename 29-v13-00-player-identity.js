/* ICEVERSE V13.00 — PLAYER IDENTITY: goals + tendencies */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function iv13PlayerIdentity(playerId){
 const c=document.getElementById("playerProfileContent"); if(!c)return;
 const [{data:p},{data:t},{data:g}]=await Promise.all([
  supabaseClient.from("players").select("id,first_name,last_name,personality,created_by,reputation").eq("id",playerId).single(),
  supabaseClient.from("player_tendencies").select("*").eq("player_id",playerId).maybeSingle(),
  supabaseClient.from("player_career_goals").select("*").eq("player_id",playerId).order("created_at",{ascending:false})
 ]);
 if(!p)return;
 let box=document.getElementById("iv13Identity"); if(!box){box=document.createElement("div");box.id="iv13Identity";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
 const tend=t||{};
 box.innerHTML=`<div class="section-toolbar"><div><h3>Identity & Career Goals</h3><div class="muted">${E(p.personality)} personality · ${p.reputation||0} reputation</div></div></div>
 <div class="app-grid"><div><h4>Playing tendencies</h4>
 ${[["Shoot / Pass","shoot_pass"],["Risk","risk"],["Physicality","physicality"],["Defensive aggression","defensive_aggression"],["Shift intensity","shift_intensity"],["Fight tendency","fight_tendency"]].map(([n,k])=>`<div class="data-row"><span>${n}</span><strong>${tend[k]??50}/100</strong></div>`).join("")}
 </div><div><h4>Career goals</h4>${(g||[]).slice(0,6).map(x=>`<div class="data-row"><span>${E(x.goal_text)}</span><strong>${x.completed?"✓":Math.round(x.progress||0)+"%"}</strong></div>`).join("")||'<div class="muted">Goals generate from personality at the start of a career/season.</div>'}</div></div>`;
}
window.iv13PlayerIdentity=iv13PlayerIdentity;
const old=window.openPlayerProfile;
if(typeof old==="function")window.openPlayerProfile=async function(id){await old(id);await iv13PlayerIdentity(id)};
console.log("Iceverse V13.00 player identity loaded.");
})();
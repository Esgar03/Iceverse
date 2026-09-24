/* ICEVERSE V13.01 — CHEMISTRY + RELATIONSHIPS */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function iv13Relationships(playerId){
 const c=document.getElementById("playerProfileContent");if(!c)return;
 const {data:r}=await supabaseClient.from("player_relationships").select("*").or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`).order("chemistry",{ascending:false}).limit(12);
 const ids=[...new Set((r||[]).map(x=>x.player_a_id===playerId?x.player_b_id:x.player_a_id))];
 let pm={};if(ids.length){const {data:p}=await supabaseClient.from("players").select("id,first_name,last_name").in("id",ids);pm=Object.fromEntries((p||[]).map(x=>[x.id,x]))}
 let box=document.getElementById("iv13Relationships");if(!box){box=document.createElement("div");box.id="iv13Relationships";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
 box.innerHTML=`<h3>Relationships & Chemistry</h3>${(r||[]).length?(r||[]).map(x=>{const oid=x.player_a_id===playerId?x.player_b_id:x.player_a_id,p=pm[oid]||{};return `<div class="data-row profile-link" onclick="openPlayerProfile('${oid}')"><span>${E(p.first_name)} ${E(p.last_name)}<div class="muted">${E(x.relationship_type||"Teammate")} · ${x.games_together||0} games together</div></span><strong>${x.chemistry>0?"+":""}${x.chemistry}</strong></div>`}).join(""):'<div class="muted">Relationships develop as players share lines, assist each other, compete and meet repeatedly.</div>'}`;
}
window.iv13Relationships=iv13Relationships;
const old=window.openPlayerProfile;
if(typeof old==="function")window.openPlayerProfile=async function(id){await old(id);await iv13Relationships(id)};
console.log("Iceverse V13.01 relationships loaded.");
})();
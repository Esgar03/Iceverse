/* ICEVERSE V13.06 — CREATED-PLAYER STORY ENGINE UI */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function showStoryCenter(){
 if(typeof hideAllMainSections==="function")hideAllMainSections();
 let sec=document.getElementById("storyCenterSection");
 if(!sec){sec=document.createElement("section");sec.id="storyCenterSection";sec.className="section";document.querySelector("main")?.appendChild(sec)}
 sec.style.display="block";sec.innerHTML='<div class="loading">Loading league stories...</div>';
 const {data:s}=await supabaseClient.from("league_stories").select("*").order("importance",{ascending:false}).order("created_at",{ascending:false}).limit(100);
 sec.innerHTML=`<div class="section-toolbar"><div><h1>Iceverse Stories</h1><div class="muted">Milestones, rivalries, records, contracts and created-player careers.</div></div><button class="secondary-button" onclick="showHome()">Home</button></div><div class="panel">${(s||[]).map(x=>`<article style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><div class="muted">${E(x.story_type)} · ${new Date(x.created_at).toLocaleString()} · Importance ${x.importance}</div><h3>${E(x.headline)}</h3><p class="muted">${E(x.body)}</p>${x.player_id?`<button class="secondary-button" onclick="openPlayerProfile('${x.player_id}')">Player Profile</button>`:""}</article>`).join("")||'<div class="empty-state">Stories will be generated as the league creates history.</div>'}</div>`;
}
window.showStoryCenter=showStoryCenter;
console.log("Iceverse V13.06 story center loaded.");
})();
/* ICEVERSE V13.04 — INTERNATIONAL / OFFSEASON HUB */
(() => {"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"");
async function showInternationalHub(){
 if(typeof hideAllMainSections==="function")hideAllMainSections();
 let sec=document.getElementById("internationalSection");
 if(!sec){sec=document.createElement("section");sec.id="internationalSection";sec.className="section";document.querySelector("main")?.appendChild(sec)}
 sec.style.display="block";sec.innerHTML='<div class="loading">Loading international hockey...</div>';
 const [{data:t},{data:g},{data:rosters}]=await Promise.all([
  supabaseClient.from("international_teams").select("*").order("country"),
  supabaseClient.from("international_games").select("*").order("scheduled_at",{ascending:true}).limit(50),
  supabaseClient.from("international_rosters").select("country,player_id,players(first_name,last_name,primary_position,overall,nationality)").limit(500)
 ]);
 const by={};(rosters||[]).forEach(x=>(by[x.country]??=[]).push(x));
 sec.innerHTML=`<div class="section-toolbar"><div><h1>International Hockey</h1><div class="muted">Club offseason, national-team spotlight.</div></div><button class="secondary-button" onclick="showHome()">Home</button></div><div class="app-grid">${(t||[]).map(x=>`<div class="panel"><h2>${E(x.country)}</h2><div class="muted">${E(x.abbreviation||"")} · ${by[x.country]?.length||0} players</div><div class="data-list" style="margin-top:12px">${(by[x.country]||[]).sort((a,b)=>(b.players?.overall||0)-(a.players?.overall||0)).slice(0,5).map(r=>`<div class="data-row profile-link" onclick="openPlayerProfile('${r.player_id}')"><span>${E(r.players?.first_name)} ${E(r.players?.last_name)}</span><strong>${r.players?.overall||0} ${E(r.players?.primary_position)}</strong></div>`).join("")}</div></div>`).join("")||'<div class="empty-state">International teams will populate during the offseason.</div>'}</div>
 <div class="panel" style="margin-top:16px"><h3>International Schedule</h3>${(g||[]).map(x=>`<div class="data-row"><span>${E(x.away_country)} @ ${E(x.home_country)}<div class="muted">${new Date(x.scheduled_at).toLocaleString()}</div></span><strong>${x.status==="completed"?`${x.away_score}-${x.home_score}`:E(x.status)}</strong></div>`).join("")||'<div class="muted">No international games scheduled.</div>'}</div>`;
}
window.showInternationalHub=showInternationalHub;
console.log("Iceverse V13.04 international hub loaded.");
})();
/* ICEVERSE V13.27 — LIVING LEAGUE MEGA UPDATE */
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safe=async(table,sel,fn=q=>q)=>{try{let q=supabaseClient.from(table).select(sel);let {data,error}=await fn(q);if(error)throw error;return data||[]}catch(e){console.warn("V13.27",table,e);return[]}};
async function livingProfile(playerId){
 const host=document.getElementById("playerProfile")||document.getElementById("playerProfileContent"); if(!host)return;
 document.getElementById("iv1327Living")?.remove();
 const [traits,goals,chem,rivals,awards,records,roles,dev,stories]=await Promise.all([
  safe("player_identity_traits","*",q=>q.eq("player_id",playerId).limit(1)),
  safe("player_career_goals","*",q=>q.eq("player_id",playerId).eq("active",true).limit(4)),
  safe("player_chemistry","*",q=>q.or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`).order("chemistry",{ascending:false}).limit(5)),
  safe("player_rivalries","*",q=>q.eq("player_id",playerId).order("intensity",{ascending:false}).limit(5)),
  safe("player_awards","*",q=>q.eq("player_id",playerId).order("season_number",{ascending:false}).limit(12)),
  safe("league_records","*",q=>q.eq("holder_player_id",playerId).order("set_at",{ascending:false}).limit(8)),
  safe("player_role_satisfaction","*",q=>q.eq("player_id",playerId).limit(1)),
  safe("player_development_history","*",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}).limit(8)),
  safe("league_story_feed","*",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}).limit(8))
 ]);
 if(!traits.length&&!goals.length&&!chem.length&&!rivals.length&&!awards.length&&!records.length&&!roles.length&&!dev.length&&!stories.length)return;
 const t=traits[0]||{}, role=roles[0]||{};
 const panel=document.createElement("div"); panel.id="iv1327Living"; panel.className="panel"; panel.style.marginTop="16px";
 panel.innerHTML=`<h3>🌎 Career World</h3>
 <div class="stat-grid">
  ${traits.length?`<div class="stat-card"><span>Consistency</span><strong>${E(t.consistency)}</strong></div><div class="stat-card"><span>Clutch</span><strong>${E(t.clutch)}</strong></div><div class="stat-card"><span>Adaptability</span><strong>${E(t.adaptability)}</strong></div><div class="stat-card"><span>Rivalry drive</span><strong>${E(t.rivalry_intensity)}</strong></div>`:""}
  ${roles.length?`<div class="stat-card"><span>Role happiness</span><strong>${E(role.satisfaction)}%</strong></div>`:""}
 </div>
 ${goals.length?`<h4>Current Goals</h4>${goals.map(x=>`<div class="data-row"><span>${E(x.goal_text)}</span><strong>${E(x.progress||0)}%</strong></div>`).join("")}`:""}
 ${chem.length?`<h4>Best Chemistry</h4>${chem.map(x=>`<div class="data-row"><span>${E(x.label||"Teammate chemistry")}</span><strong>${E(x.chemistry)}</strong></div>`).join("")}`:""}
 ${rivals.length?`<h4>Rivalries & Matchups</h4>${rivals.map(x=>`<div class="data-row"><span>${E(x.label||x.rival_type||"Rival")}</span><strong>${E(x.intensity)}</strong></div>`).join("")}`:""}
 ${awards.length?`<h4>Awards</h4>${awards.map(x=>`<div class="data-row"><span>${E(x.award_name)}</span><strong>Season ${E(x.season_number)}</strong></div>`).join("")}`:""}
 ${records.length?`<h4>Records</h4>${records.map(x=>`<div class="data-row"><span>${E(x.record_name)}</span><strong>${E(x.record_value)}</strong></div>`).join("")}`:""}
 ${dev.length?`<h4>Development</h4>${dev.map(x=>`<div class="data-row"><span>Season progression</span><strong>${E(x.old_overall)} → ${E(x.new_overall)}</strong></div>`).join("")}`:""}
 ${stories.length?`<h4>Career Stories</h4>${stories.map(x=>`<div class="data-row"><span>${E(x.headline)}</span><span class="muted">${E(x.body||"")}</span></div>`).join("")}`:""}`;
 host.appendChild(panel);
}
async function worldFeed(){
 const target=document.getElementById("homeSection")||document.querySelector("main"); if(!target||document.getElementById("iv1327Feed"))return;
 const stories=await safe("league_story_feed","*",q=>q.order("created_at",{ascending:false}).limit(12));
 if(!stories.length)return;
 const p=document.createElement("div");p.id="iv1327Feed";p.className="panel";p.style.marginTop="16px";
 p.innerHTML=`<h3>📰 Around Iceverse</h3>${stories.map(s=>`<div class="data-row"><span><strong>${E(s.headline)}</strong><div class="muted">${E(s.body||"")}</div></span><span class="muted">${new Date(s.created_at).toLocaleDateString()}</span></div>`).join("")}`;
 target.appendChild(p);
}
async function postseasonCalendar(){
 const sec=document.getElementById("scheduleSection"); if(!sec)return;
 document.getElementById("iv1327Calendar")?.remove();
 const rows=await safe("season_calendar_events","*",q=>q.order("day_number",{ascending:true}).limit(80));
 if(!rows.length)return;
 const p=document.createElement("div");p.id="iv1327Calendar";p.className="panel";p.style.marginBottom="16px";
 p.innerHTML=`<h3>🗓️ Season Calendar</h3><div class="iv-usage-clean">${rows.map(x=>`<div class="mini-card"><strong>Day ${E(x.day_number)} · ${E(x.event_name)}</strong><div class="muted">${E(x.event_type.replaceAll("_"," "))}</div></div>`).join("")}</div>`;
 sec.prepend(p);
}
const oldOpen=window.openPlayerProfile;
if(typeof oldOpen==="function")window.openPlayerProfile=async function(id){const r=await oldOpen.apply(this,arguments);await livingProfile(id);return r};
const oldHome=window.showHome;
if(typeof oldHome==="function")window.showHome=async function(){const r=await oldHome.apply(this,arguments);setTimeout(worldFeed,50);return r};
const oldSched=window.showSchedule;
if(typeof oldSched==="function")window.showSchedule=async function(){const r=await oldSched.apply(this,arguments);setTimeout(postseasonCalendar,50);return r};

/* Sim Lab now explicitly advances postseason + international events after each league day. */
async function advanceExtras(){
 try{await supabaseClient.rpc("iv_advance_scheduled_special_events")}catch(e){console.warn("special event advance",e)}
}
const oldNext=window.ivTestNextDay;
if(typeof oldNext==="function")window.ivTestNextDay=async function(){const r=await oldNext.apply(this,arguments);await advanceExtras();return r};
console.log("🔥 Iceverse V13.27 Living League loaded");
})();
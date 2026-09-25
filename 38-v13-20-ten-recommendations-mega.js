/* ICEVERSE V13.20 — TEN RECOMMENDATIONS MEGA UPDATE
   1 salary/cap UX, 2 personality goals, 3 tendencies, 4 chemistry,
   5 deep career profile, 6 reputation, 7 development, 8 international offseason,
   9 created-player storytelling, 10 NPC->created-player takeover visibility.
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));
const money=n=>"$"+new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Number(n||0));

async function safe(table, select="*", cb=q=>q){
  try { let q=supabaseClient.from(table).select(select); q=cb(q); const {data,error}=await q; if(error) throw error; return data||[]; }
  catch(e){ console.warn("V13.20 optional query",table,e?.message||e); return []; }
}

async function iv1320LeaguePulse(){
  const host=$("#homeSection")||$("#dashboardSection")||$("main"); if(!host)return;
  let box=$("#iv1320LeaguePulse");
  if(!box){box=document.createElement("section");box.id="iv1320LeaguePulse";box.className="panel";box.style.margin="18px 0";host.appendChild(box)}
  const [players,rosters,teams,stories]=await Promise.all([
    safe("players","id,created_by,overall,reputation,first_name,last_name,primary_position,is_retired",q=>q.eq("is_retired",false)),
    safe("rosters","player_id,team_id,roster_status",q=>q.eq("roster_status","active")),
    safe("teams","id,city,name,money,salary_cap,wins,losses,overtime_losses"),
    safe("league_stories","headline,story_type,importance,created_at,player_id",q=>q.order("created_at",{ascending:false}).limit(4))
  ]);
  const created=players.filter(p=>p.created_by), npc=players.filter(p=>!p.created_by);
  const pct=players.length?Math.round(created.length*100/players.length):0;
  const stars=[...created].sort((a,b)=>(b.reputation||0)-(a.reputation||0)||(b.overall||0)-(a.overall||0)).slice(0,5);
  box.innerHTML=`<div class="section-toolbar"><div><h2>🔥 Around Iceverse</h2><div class="muted">A living league built around created-player careers.</div></div></div>
  <div class="app-grid">
    <div class="metric-card"><div class="muted">Created-player takeover</div><div class="metric-value">${pct}%</div><div>${created.length} created · ${npc.length} NPC</div><div style="height:8px;background:rgba(255,255,255,.08);border-radius:99px;margin-top:10px;overflow:hidden"><div style="height:100%;width:${pct}%;background:currentColor"></div></div></div>
    <div class="panel"><h3>League Icons</h3>${stars.map(p=>`<div class="data-row profile-link" onclick="openPlayerProfile('${p.id}')"><span>★ ${E(p.first_name)} ${E(p.last_name)} <span class="muted">${E(p.primary_position)}</span></span><strong>${p.overall} OVR · ${p.reputation||0} REP</strong></div>`).join("")||'<div class="muted">Created players will appear here.</div>'}</div>
    <div class="panel"><h3>Latest Stories</h3>${stories.map(s=>`<div class="data-row"><span>${E(s.headline)}</span><strong>${s.importance||50}</strong></div>`).join("")||'<div class="muted">League history is waiting to be written.</div>'}</div>
  </div>`;
}

async function iv1320CareerProfile(playerId){
  const c=$("#playerProfileContent"); if(!c)return;
  const [ps,gs,goals,rels,splits,dev,awards,contracts,intl,p]=await Promise.all([
    safe("player_game_stats","goals,assists,points,shots,hits,blocks,pim,toi_seconds,game_id,team_id",q=>q.eq("player_id",playerId)),
    safe("goalie_game_stats","shots_against,saves,goals_against,win,shutout,gsax,game_id,team_id",q=>q.eq("player_id",playerId)),
    safe("player_career_goals","goal_text,progress,completed,target_value,current_value",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}).limit(6)),
    safe("player_relationships","player_a_id,player_b_id,chemistry,relationship_type,games_together,goals_together",q=>q.or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`).order("chemistry",{ascending:false}).limit(6)),
    safe("player_team_splits","opponent_team_id,games,goals,assists,points,shots,matchup_confidence",q=>q.eq("player_id",playerId).order("points",{ascending:false}).limit(5)),
    safe("player_development_history","old_overall,new_overall,change_amount,reason,created_at",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}).limit(5)),
    safe("player_awards","award_name,season_number,award_type",q=>q.eq("player_id",playerId).order("season_number",{ascending:false}).limit(8)),
    safe("player_contracts","team_id,salary,seasons_remaining,projected_role,status",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}).limit(5)),
    safe("international_player_stats","country,games,goals,assists,points,gold_medals,silver_medals,bronze_medals",q=>q.eq("player_id",playerId)),
    safe("players","id,first_name,last_name,created_by,overall,reputation,personality,current_form,confidence,potential,career_stage",q=>q.eq("id",playerId).limit(1))
  ]);
  const pl=p[0]; if(!pl)return;
  const gp=ps.length, G=ps.reduce((a,x)=>a+(x.goals||0),0), A=ps.reduce((a,x)=>a+(x.assists||0),0), P=ps.reduce((a,x)=>a+(x.points??((x.goals||0)+(x.assists||0))),0), shots=ps.reduce((a,x)=>a+(x.shots||0),0);
  const goalie=gs.length>0, saves=gs.reduce((a,x)=>a+(x.saves||0),0), sa=gs.reduce((a,x)=>a+(x.shots_against||0),0);
  let box=$("#iv1320CareerUniverse"); if(!box){box=document.createElement("div");box.id="iv1320CareerUniverse";box.className="panel";box.style.marginTop="16px";c.appendChild(box)}
  box.innerHTML=`<div class="section-toolbar"><div><h2>${pl.created_by?"⭐ Created Player Career Universe":"Career Universe"}</h2><div class="muted">${E(pl.personality)} · ${E(pl.career_stage)} · ${pl.reputation||0} reputation</div></div></div>
  <div class="app-grid">
   <div class="panel"><h3>Career at a Glance</h3>${goalie?`<div class="metric-value">${gs.length} GP</div><div>${fmt(saves)} saves · ${sa?((saves/sa)*100).toFixed(1):"0.0"} SV% · ${gs.reduce((a,x)=>a+(x.win?1:0),0)} wins · ${gs.reduce((a,x)=>a+(x.shutout?1:0),0)} SO</div>`:`<div class="metric-value">${P} P</div><div>${gp} GP · ${G} G · ${A} A · ${shots} shots · ${shots?((G/shots)*100).toFixed(1):"0.0"} SH%</div>`}</div>
   <div class="panel"><h3>Career Goals</h3>${goals.map(x=>`<div class="data-row"><span>${x.completed?"✓ ":""}${E(x.goal_text)}</span><strong>${x.completed?"DONE":Math.round(x.progress||0)+"%"}</strong></div>`).join("")||'<div class="muted">Personality-driven goals will appear here.</div>'}</div>
   <div class="panel"><h3>Development</h3><div class="data-row"><span>Current</span><strong>${pl.overall} OVR</strong></div><div class="data-row"><span>Form / Confidence</span><strong>${pl.current_form||50} / ${pl.confidence||50}</strong></div>${dev.map(x=>`<div class="data-row"><span>${E(x.reason)}</span><strong>${x.old_overall}→${x.new_overall}</strong></div>`).join("")}</div>
   <div class="panel"><h3>Legacy</h3>${awards.map(x=>`<div class="data-row"><span>${E(x.award_name)}</span><strong>S${x.season_number??"—"}</strong></div>`).join("")||'<div class="muted">Awards, championships and milestones build reputation.</div>'}</div>
   <div class="panel"><h3>Contracts</h3>${contracts.map(x=>`<div class="data-row"><span>${E(x.projected_role||x.status)}</span><strong>${money(x.salary)} · ${x.seasons_remaining} yr</strong></div>`).join("")||'<div class="muted">No contract history available.</div>'}</div>
   <div class="panel"><h3>International</h3>${intl.map(x=>`<div class="data-row"><span>${E(x.country)} · ${x.games} GP</span><strong>${x.goals}G ${x.assists}A ${x.points}P · 🥇${x.gold_medals} 🥈${x.silver_medals} 🥉${x.bronze_medals}</strong></div>`).join("")||'<div class="muted">International history begins during the offseason.</div>'}</div>
  </div>`;
}
window.iv1320CareerProfile=iv1320CareerProfile;

async function iv1320TeamCap(teamId){
 const host=$("#teamDetailContent")||$("#teamContent"); if(!host)return;
 const [t,c,r]=await Promise.all([
  safe("teams","id,city,name,money,salary_cap",q=>q.eq("id",teamId).limit(1)),
  safe("player_contracts","player_id,salary,status",q=>q.eq("team_id",teamId).eq("status","active")),
  safe("rosters","player_id,roster_status",q=>q.eq("team_id",teamId).eq("roster_status","active"))
 ]);
 if(!t[0])return; const hit=c.reduce((a,x)=>a+Number(x.salary||0),0), cap=Number(t[0].salary_cap||180000000), room=cap-hit;
 const ids=r.map(x=>x.player_id); let players=[]; if(ids.length) players=await safe("players","id,created_by",q=>q.in("id",ids));
 const human=players.filter(x=>x.created_by).length;
 let box=$("#iv1320TeamCap");if(!box){box=document.createElement("div");box.id="iv1320TeamCap";box.className="panel";box.style.marginTop="16px";host.appendChild(box)}
 box.innerHTML=`<h3>Roster Construction</h3><div class="app-grid"><div class="metric-card"><div class="muted">Cap hit</div><div class="metric-value">${money(hit)}</div><div>${money(room)} room · ${money(cap)} cap</div></div><div class="metric-card"><div class="muted">Created players</div><div class="metric-value">${human}/${players.length}</div><div>${Math.max(0,23-human)} created-player roster slots remaining</div></div></div>`;
}
window.iv1320TeamCap=iv1320TeamCap;

function hook(name,after){
 const old=window[name]; if(typeof old!=="function")return;
 window[name]=async function(...args){const r=await old.apply(this,args);try{await after(...args)}catch(e){console.warn("V13.20 hook",name,e)}return r}
}
hook("openPlayerProfile",iv1320CareerProfile);
hook("openTeam",iv1320TeamCap);
hook("showTeam",iv1320TeamCap);
hook("showHome",iv1320LeaguePulse);
hook("showDashboard",iv1320LeaguePulse);

document.addEventListener("DOMContentLoaded",()=>setTimeout(iv1320LeaguePulse,900));
console.log("🔥 Iceverse V13.20 Ten Recommendations Mega Update loaded.");
})();
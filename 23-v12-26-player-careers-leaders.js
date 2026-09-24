/* ICEVERSE V12.26 — PLAYER CAREERS + DEEP LEADERS
   Load AFTER 22-v12-25-live-experience.js.
   Uses existing: players, rosters, teams, games, player_game_stats,
   goalie_game_stats, awards, player_contracts (when available).
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const n=v=>Number(v||0);
const pct=(a,b,d=1)=>b?`${(100*a/b).toFixed(d)}%`:"—";
const height=x=>x?`${Math.floor(x/12)}' ${x%12}"`:"—";
function addStyles(){if(document.getElementById("ivCareerStyles"))return;let s=document.createElement("style");s.id="ivCareerStyles";s.textContent=`
.iv-profile-hero{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:start}
.iv-profile-name{font-size:clamp(30px,5vw,48px);margin:5px 0}.iv-profile-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.iv-ovr-box{min-width:110px;text-align:center;padding:16px;border:1px solid #31506d;border-radius:16px;background:rgba(255,255,255,.035)}
.iv-ovr-num{font-size:42px;font-weight:950}.iv-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:10px;margin-top:14px}
.iv-stat-tile{padding:13px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);text-align:center}
.iv-stat-tile strong{display:block;font-size:24px}.iv-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
.iv-tab{padding:9px 13px;border-radius:999px;border:1px solid #31506d;background:transparent;color:inherit;cursor:pointer;font-weight:800}
.iv-tab.active{background:rgba(255,255,255,.12)}.iv-career-table{width:100%;border-collapse:collapse}.iv-career-table th,.iv-career-table td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;white-space:nowrap}.iv-career-table th:first-child,.iv-career-table td:first-child{text-align:left}
.iv-leader-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}.iv-leader-row{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07);align-items:center}
@media(max-width:650px){.iv-profile-hero{grid-template-columns:1fr}.iv-ovr-box{width:100%}}`;document.head.appendChild(s)}
async function safe(table,select="*",builder=null){try{let q=supabaseClient.from(table).select(select);if(builder)q=builder(q);let r=await q;if(r.error)throw r.error;return r.data||[]}catch(e){console.warn(`Iceverse ${table}:`,e.message);return[]}}
function sum(rows,key){return rows.reduce((a,x)=>a+n(x[key]),0)}
function seasonLabel(g){return g?.season_id?String(g.season_id).slice(0,8):"Career"}
async function careerData(playerId){
 const [sk,gl,roster,awards,contracts]=await Promise.all([
  safe("player_game_stats","*",q=>q.eq("player_id",playerId)),
  safe("goalie_game_stats","*",q=>q.eq("player_id",playerId)),
  safe("rosters","team_id,teams(id,name,city,abbreviation)",q=>q.eq("player_id",playerId)),
  safe("awards","*",q=>q.eq("player_id",playerId).order("created_at",{ascending:false})),
  safe("player_contracts","*",q=>q.eq("player_id",playerId).order("created_at",{ascending:false}))
 ]);
 const gameIds=[...new Set([...sk,...gl].map(x=>x.game_id).filter(Boolean))];
 const games=gameIds.length?await safe("games","id,season_id,scheduled_at,status,home_team_id,away_team_id,home_score,away_score",q=>q.in("id",gameIds)):[];
 const gm=Object.fromEntries(games.map(g=>[g.id,g]));
 const teamIds=[...new Set([...sk,...gl].map(x=>x.team_id).filter(Boolean))];
 const teams=teamIds.length?await safe("teams","id,name,city,abbreviation",q=>q.in("id",teamIds)):[];
 const tm=Object.fromEntries(teams.map(t=>[t.id,t]));
 return {sk,gl,roster,awards,contracts,gm,tm};
}
function skTotals(rows){return {gp:new Set(rows.map(x=>x.game_id)).size,g:sum(rows,"goals"),a:sum(rows,"assists"),p:sum(rows,"points"),s:sum(rows,"shots"),h:sum(rows,"hits"),b:sum(rows,"blocks"),fw:sum(rows,"faceoff_wins"),fl:sum(rows,"faceoff_losses")}}
function gTotals(rows){let sv=sum(rows,"saves"),ga=sum(rows,"goals_against");return {gp:new Set(rows.map(x=>x.game_id)).size,sv,ga,sa:sv+ga,w:sum(rows,"wins"),so:sum(rows,"shutouts")}}
function tiles(items){return `<div class="iv-stat-grid">${items.map(([l,v])=>`<div class="iv-stat-tile"><span class="muted">${E(l)}</span><strong>${E(v)}</strong></div>`).join("")}</div>`}
function tabButton(k,label,active){return `<button class="iv-tab ${active===k?"active":""}" data-iv-tab="${k}">${label}</button>`}
function seasonRows(data,isG){
 const src=isG?data.gl:data.sk,groups={};
 src.forEach(x=>{let g=data.gm[x.game_id],key=g?.season_id||"Unknown";(groups[key]??=[]).push(x)});
 if(!Object.keys(groups).length)return '<div class="empty-state">No official game statistics yet.</div>';
 return `<div style="overflow:auto"><table class="iv-career-table"><thead><tr><th>Season</th>${isG?"<th>GP</th><th>SV</th><th>GA</th><th>SV%</th>":"<th>GP</th><th>G</th><th>A</th><th>PTS</th><th>SOG</th><th>HIT</th><th>BLK</th><th>FO%</th>"}</tr></thead><tbody>${Object.entries(groups).map(([key,r])=>{if(isG){let t=gTotals(r);return `<tr><td>${E(String(key).slice(0,8))}</td><td>${t.gp}</td><td>${t.sv}</td><td>${t.ga}</td><td>${pct(t.sv,t.sa)}</td></tr>`}let t=skTotals(r);return `<tr><td>${E(String(key).slice(0,8))}</td><td>${t.gp}</td><td>${t.g}</td><td>${t.a}</td><td>${t.p}</td><td>${t.s}</td><td>${t.h}</td><td>${t.b}</td><td>${pct(t.fw,t.fw+t.fl)}</td></tr>`}).join("")}</tbody></table></div>`;
}
function gameLog(data,isG,playerId){
 const src=[...(isG?data.gl:data.sk)].sort((a,b)=>new Date(data.gm[b.game_id]?.scheduled_at||0)-new Date(data.gm[a.game_id]?.scheduled_at||0));
 if(!src.length)return '<div class="empty-state">No games played yet.</div>';
 return `<div style="overflow:auto"><table class="iv-career-table"><thead><tr><th>Date</th><th>Team</th>${isG?"<th>SV</th><th>GA</th><th>SV%</th>":"<th>G</th><th>A</th><th>PTS</th><th>SOG</th><th>HIT</th><th>BLK</th>"}</tr></thead><tbody>${src.slice(0,100).map(x=>{let g=data.gm[x.game_id],t=data.tm[x.team_id]||{};return `<tr class="profile-link" onclick="openGameDetail('${x.game_id}')"><td>${g?new Date(g.scheduled_at).toLocaleDateString():"—"}</td><td>${E(t.abbreviation||t.name||"—")}</td>${isG?`<td>${n(x.saves)}</td><td>${n(x.goals_against)}</td><td>${pct(n(x.saves),n(x.saves)+n(x.goals_against))}</td>`:`<td>${n(x.goals)}</td><td>${n(x.assists)}</td><td>${n(x.points)}</td><td>${n(x.shots)}</td><td>${n(x.hits)}</td><td>${n(x.blocks)}</td>`}</tr>`}).join("")}</tbody></table></div>`;
}
function awardHTML(a){if(!a.length)return '<div class="empty-state">No awards yet.</div>';return `<div class="data-list">${a.map(x=>`<div class="data-row"><span><strong>${E(x.award_name||x.name||x.award_type||"Award")}</strong><br><span class="muted">${E(x.season_name||x.season_id||"")}</span></span><span>🏆</span></div>`).join("")}</div>`}
window.openPlayerProfile=async function(playerId){
 addStyles();if(typeof hideAllMainSections==="function")hideAllMainSections();let sec=document.getElementById("playerProfileSection"),c=document.getElementById("playerProfile");if(sec)sec.style.display="block";if(!c)return;c.innerHTML='<div class="loading">Building career profile...</div>';
 try{
  const pr=await supabaseClient.from("players").select("*").eq("id",playerId).single();if(pr.error)throw pr.error;let p=pr.data;
  const data=await careerData(playerId),isG=p.primary_position==="G",st=isG?gTotals(data.gl):skTotals(data.sk);
  let current=data.roster?.[0]?.teams||null,owner=null;if(p.created_by){try{let r=await supabaseClient.rpc("get_public_username",{target_user_id:p.created_by});owner=r.data}catch(_){}}
  const summary=isG?tiles([["GP",st.gp],["Saves",st.sv],["Goals Against",st.ga],["Save %",pct(st.sv,st.sa)],["Wins",st.w||0],["Shutouts",st.so||0]]):tiles([["GP",st.gp],["Goals",st.g],["Assists",st.a],["Points",st.p],["Shots",st.s],["Hits",st.h],["Blocks",st.b],["FO%",pct(st.fw,st.fw+st.fl)]]);
  c.innerHTML=`<div class="player-profile-card"><button class="secondary-button" id="ivCareerBack">← Back to Players</button>
   <div class="iv-profile-hero" style="margin-top:18px"><div><div class="muted">${typeof getFlag==="function"?getFlag(p.nationality):""} ${E(p.nationality||"Unknown")} · ${E(p.primary_position||"")}${p.secondary_position?` / ${E(p.secondary_position)}`:""}</div><h1 class="iv-profile-name">${E(p.first_name)} ${E(p.last_name)}</h1>
   <div class="iv-profile-meta"><span class="pill">${current?E(`${current.city||""} ${current.name||""}`.trim()):"Free Agent"}</span><span class="pill">Age ${n(p.age)}</span><span class="pill">${E(p.archetype||"Player")}</span>${p.is_retired?'<span class="pill">Retired</span>':""}</div>
   <div class="muted" style="margin-top:12px">${height(p.height_inches)} · ${p.weight_lbs?`${p.weight_lbs} lbs`:"—"} · ${E(p.handedness||"—")} · ${owner?`Created by ${E(owner)}`:"NPC / Unowned"}</div></div>
   <div class="iv-ovr-box"><div class="iv-ovr-num">${n(p.overall)}</div><div class="muted">OVR</div></div></div>
   <div id="ivCareerSummary">${summary}</div>
   <div class="iv-tabs">${tabButton("overview","Overview","overview")}${tabButton("seasons","Season Stats","overview")}${tabButton("games","Game Log","overview")}${tabButton("awards","Awards","overview")}${tabButton("contract","Contract","overview")}</div>
   <div id="ivCareerPane"></div></div>`;
  const pane=document.getElementById("ivCareerPane");
  const render=tab=>{
   document.querySelectorAll("[data-iv-tab]").forEach(b=>b.classList.toggle("active",b.dataset.ivTab===tab));
   if(tab==="overview")pane.innerHTML=`<div class="app-grid"><div class="panel"><h3>Career Snapshot</h3>${summary}</div><div class="panel"><h3>Player Identity</h3><div class="data-list"><div class="data-row"><span>Personality</span><strong>${E(p.personality||"—")}</strong></div><div class="data-row"><span>Career Stage</span><strong>${E(p.career_stage||"—")}</strong></div><div class="data-row"><span>Reputation</span><strong>${E(p.reputation??"—")}</strong></div><div class="data-row"><span>Current Club</span><strong>${current?E(current.name):"Free Agent"}</strong></div></div></div></div>`;
   if(tab==="seasons")pane.innerHTML=`<div class="panel"><h3>Season-by-Season</h3>${seasonRows(data,isG)}</div>`;
   if(tab==="games")pane.innerHTML=`<div class="panel"><h3>Game Log</h3>${gameLog(data,isG,playerId)}</div>`;
   if(tab==="awards")pane.innerHTML=`<div class="panel"><h3>Trophy Case</h3>${awardHTML(data.awards)}</div>`;
   if(tab==="contract")pane.innerHTML=`<div class="panel"><h3>Contract History</h3>${data.contracts.length?`<div class="data-list">${data.contracts.map(x=>`<div class="data-row"><span>${E(x.status||"Contract")}<br><span class="muted">${E(x.seasons_remaining??x.seasons??"—")} season(s)</span></span><strong>${typeof fmtMoney==="function"?fmtMoney(x.salary):E(x.salary||"—")}</strong></div>`).join("")}</div>`:'<div class="empty-state">No contract history recorded.</div>'}</div>`;
  };render("overview");document.querySelectorAll("[data-iv-tab]").forEach(b=>b.onclick=()=>render(b.dataset.ivTab));document.getElementById("ivCareerBack").onclick=()=>showPlayers();
  if(typeof appendOwnedPlayerControls==="function")await appendOwnedPlayerControls(p);
 }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
};
window.showLeagueLeaders=async function(){
 addStyles();if(typeof showSection==="function")showSection("leadersSection");const c=document.getElementById("leadersContent");if(!c)return;c.innerHTML='<div class="loading">Calculating league leaders...</div>';
 try{
  const [sk,gl,players]=await Promise.all([safe("player_game_stats"),safe("goalie_game_stats"),safe("players","id,first_name,last_name,primary_position")]);
  const pm=Object.fromEntries(players.map(p=>[p.id,p])),sm={},gm={};
  sk.forEach(x=>{let t=sm[x.player_id]??={gp:new Set(),g:0,a:0,p:0,s:0,h:0,b:0,fw:0,fl:0};t.gp.add(x.game_id);t.g+=n(x.goals);t.a+=n(x.assists);t.p+=n(x.points);t.s+=n(x.shots);t.h+=n(x.hits);t.b+=n(x.blocks);t.fw+=n(x.faceoff_wins);t.fl+=n(x.faceoff_losses)});
  gl.forEach(x=>{let t=gm[x.player_id]??={gp:new Set(),sv:0,ga:0,w:0,so:0};t.gp.add(x.game_id);t.sv+=n(x.saves);t.ga+=n(x.goals_against);t.w+=n(x.wins);t.so+=n(x.shutouts)});
  const card=(title,rows,value)=>`<div class="panel"><h3>${title}</h3>${rows.slice(0,10).map((r,i)=>{let p=pm[r[0]]||{};return `<div class="iv-leader-row profile-link" onclick="openPlayerProfile('${r[0]}')"><span>${i+1}</span><span>${E(`${p.first_name||""} ${p.last_name||""}`.trim()||"Player")}</span><strong>${value(r[1])}</strong></div>`}).join("")||'<div class="empty-state">No stats yet.</div>'}</div>`;
  const sort=(obj,fn)=>Object.entries(obj).sort((a,b)=>fn(b[1])-fn(a[1]));
  c.innerHTML=`<div class="section-toolbar"><div><h2>League Leaders</h2><div class="muted">Full statistical leaderboard from official game data.</div></div></div><div class="iv-leader-grid">
   ${card("Points",sort(sm,x=>x.p),x=>x.p)}${card("Goals",sort(sm,x=>x.g),x=>x.g)}${card("Assists",sort(sm,x=>x.a),x=>x.a)}
   ${card("Shots",sort(sm,x=>x.s),x=>x.s)}${card("Hits",sort(sm,x=>x.h),x=>x.h)}${card("Blocks",sort(sm,x=>x.b),x=>x.b)}
   ${card("Faceoff %",Object.entries(sm).filter(([,x])=>x.fw+x.fl>=5).sort((a,b)=>(b[1].fw/(b[1].fw+b[1].fl))-(a[1].fw/(a[1].fw+a[1].fl))),x=>pct(x.fw,x.fw+x.fl))}
   ${card("Goalie Saves",sort(gm,x=>x.sv),x=>x.sv)}
   ${card("Save %",Object.entries(gm).filter(([,x])=>x.sv+x.ga>=10).sort((a,b)=>(b[1].sv/(b[1].sv+b[1].ga))-(a[1].sv/(a[1].sv+a[1].ga))),x=>pct(x.sv,x.sv+x.ga))}
   ${card("Goalie Wins",sort(gm,x=>x.w),x=>x.w)}${card("Shutouts",sort(gm,x=>x.so),x=>x.so)}
  </div>`;
 }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
};
addStyles();console.log("Iceverse V12.26 player careers + deep leaders loaded.");
})();
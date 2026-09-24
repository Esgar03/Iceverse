/* ICEVERSE V12.27 — WORLD DASHBOARD
   Load LAST, after V12.25 and V12.26.
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const N=v=>Number(v||0);
const etDate=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric"});
const etTime=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit"});
async function q(table,select="*",fn=null){try{let x=supabaseClient.from(table).select(select);if(fn)x=fn(x);const r=await x;if(r.error)throw r.error;return r.data||[]}catch(e){console.warn("V12.27",table,e.message);return[]}}
function styles(){if(document.getElementById("ivWorldDashStyles"))return;const s=document.createElement("style");s.id="ivWorldDashStyles";s.textContent=`
.iv-world-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:18px}.iv-world-title{font-size:clamp(30px,5vw,50px);margin:0}.iv-world-grid{display:grid;grid-template-columns:1.4fr .8fr;gap:16px}.iv-world-stack{display:flex;flex-direction:column;gap:16px}.iv-score-strip{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)}.iv-score-strip:last-child{border-bottom:0}.iv-score-mid{text-align:center;min-width:100px}.iv-score-team:last-child{text-align:right}.iv-world-live{font-weight:900}.iv-news-story{padding:13px 0;border-bottom:1px solid rgba(255,255,255,.08)}.iv-news-story:last-child{border-bottom:0}.iv-news-story h4{margin:4px 0}.iv-rank-row{display:grid;grid-template-columns:28px 1fr auto;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)}.iv-quick-actions{display:flex;gap:8px;flex-wrap:wrap}.iv-world-metric{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.iv-world-metric .metric-card{min-width:0}@media(max-width:900px){.iv-world-grid{grid-template-columns:1fr}.iv-world-metric{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.iv-world-head{align-items:flex-start;flex-direction:column}.iv-world-metric{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s)}
function teamName(t){return `${t?.city||""} ${t?.name||"Team"}`.trim()}
function countdown(d){let t=Math.floor((new Date(d).getTime()-Date.now())/1000);if(t<=0)return"Starting";let h=Math.floor(t/3600),m=Math.floor(t%3600/60);return h?`${h}h ${m}m`:`${m}m`}
async function buildDashboard(){
 const home=document.getElementById("homeSection");if(!home)return;
 let dash=document.getElementById("ivWorldDashboard");
 if(!dash){dash=document.createElement("section");dash.id="ivWorldDashboard";dash.className="section";home.prepend(dash)}
 dash.innerHTML='<div class="loading">Loading the Iceverse world...</div>';
 const [games,teams,standings,skaters,goalies,news,feed,seasons]=await Promise.all([
  q("games","id,season_id,home_team_id,away_team_id,scheduled_at,status,period,clock_seconds,home_score,away_score,overtime",x=>x.order("scheduled_at",{ascending:false}).limit(180)),
  q("teams","id,city,name,abbreviation,wins,losses,overtime_losses"),
  q("standings","team_id,gp,wins,losses,otl,points,gf,ga",x=>x.order("points",{ascending:false}).limit(32)),
  q("player_game_stats","player_id,goals,assists,points"),
  q("goalie_game_stats","player_id,saves,goals_against,win,shutout"),
  q("news_posts","headline,body,outlet,reporter,created_at",x=>x.order("created_at",{ascending:false}).limit(5)),
  q("universe_feed","feed_type,title,body,created_at,game_id",x=>x.order("created_at",{ascending:false}).limit(8)),
  q("seasons","id,label,phase,active,starts_at,ends_at",x=>x.eq("active",true).limit(1))
 ]);
 const tm=Object.fromEntries(teams.map(t=>[t.id,t]));
 const now=Date.now(),live=games.filter(g=>g.status==="in_progress").sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
 const upcoming=games.filter(g=>g.status==="scheduled"&&new Date(g.scheduled_at).getTime()>=now).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at)).slice(0,6);
 const finals=games.filter(g=>["completed","final"].includes(g.status)).sort((a,b)=>new Date(b.scheduled_at)-new Date(a.scheduled_at)).slice(0,6);
 const standingsRows=(standings.length?standings:teams.map(t=>({team_id:t.id,wins:t.wins,losses:t.losses,otl:t.overtime_losses,points:N(t.wins)*2+N(t.overtime_losses),gp:N(t.wins)+N(t.losses)+N(t.overtime_losses)}))).sort((a,b)=>N(b.points)-N(a.points)||N(b.wins)-N(a.wins));
 const pmap={};skaters.forEach(x=>{let z=pmap[x.player_id]??={p:0,g:0,a:0};z.p+=N(x.points);z.g+=N(x.goals);z.a+=N(x.assists)});
 const leaders=Object.entries(pmap).sort((a,b)=>b[1].p-a[1].p).slice(0,5);
 const playerIds=leaders.map(x=>x[0]);let pm={};if(playerIds.length){const ps=await q("players","id,first_name,last_name",x=>x.in("id",playerIds));pm=Object.fromEntries(ps.map(p=>[p.id,p]))}
 const season=seasons[0];
 const gameRow=(g,mode)=>{let a=tm[g.away_team_id],h=tm[g.home_team_id],mid=mode==="live"?`<span class="iv-live-badge"><span class="iv-live-dot"></span> LIVE</span><div><strong>${N(g.away_score)}–${N(g.home_score)}</strong> · P${g.period||1}</div>`:mode==="final"?`<strong>${N(g.away_score)}–${N(g.home_score)}</strong><div class="muted">FINAL${g.overtime?" OT":""}</div>`:`<strong>${etTime.format(new Date(g.scheduled_at))} ET</strong><div class="muted iv-home-countdown" data-start="${E(g.scheduled_at)}">${countdown(g.scheduled_at)}</div>`;return `<div class="iv-score-strip profile-link" onclick="openGameDetail('${g.id}')"><div class="iv-score-team">${E(teamName(a))}</div><div class="iv-score-mid">${mid}</div><div class="iv-score-team">${E(teamName(h))}</div></div>`};
 const stories=[...feed.map(x=>({...x,source:"Iceverse"})),...news.map(x=>({title:x.headline,body:x.body,created_at:x.created_at,source:x.outlet||"Iceverse Network"}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6);
 dash.innerHTML=`<div class="iv-world-head"><div><div class="muted">ICEVERSE HOCKEY NETWORK</div><h1 class="iv-world-title">Around the League</h1><div class="muted">${E(season?.label||"Current Season")} · ${E(season?.phase||"Regular Season")}</div></div><div class="iv-quick-actions"><button class="primary-button" onclick="showSchedule()">Schedule</button><button class="secondary-button" onclick="showStandings()">Standings</button><button class="secondary-button" onclick="showLeagueLeaders()">Leaders</button><button class="secondary-button" onclick="showFeed()">World Feed</button></div></div>
 <div class="iv-world-metric"><div class="metric-card"><div class="muted">Live Now</div><div class="metric-value">${live.length}</div></div><div class="metric-card"><div class="muted">Next Games</div><div class="metric-value">${upcoming.length}</div></div><div class="metric-card"><div class="muted">Teams</div><div class="metric-value">${teams.length}</div></div><div class="metric-card"><div class="muted">Games Final</div><div class="metric-value">${games.filter(g=>["completed","final"].includes(g.status)).length}</div></div></div>
 <div class="iv-world-grid" style="margin-top:16px"><div class="iv-world-stack">
 <div class="panel"><div class="section-toolbar"><div><h3>${live.length?"LIVE NOW":"Up Next"}</h3><div class="muted">${live.length?"Games currently underway":"Countdown to the next puck drops"}</div></div></div>${(live.length?live.slice(0,8):upcoming).map(g=>gameRow(g,live.length?"live":"upcoming")).join("")||'<div class="empty-state">No games on the board.</div>'}</div>
 <div class="panel"><div class="section-toolbar"><h3>Recent Finals</h3><button class="secondary-button" onclick="showSchedule()">Full Schedule</button></div>${finals.map(g=>gameRow(g,"final")).join("")||'<div class="empty-state">No completed games yet.</div>'}</div>
 <div class="panel"><div class="section-toolbar"><h3>Iceverse Headlines</h3><button class="secondary-button" onclick="showFeed()">More</button></div>${stories.length?stories.map(x=>`<article class="iv-news-story ${x.game_id?"profile-link":""}" ${x.game_id?`onclick="openGameDetail('${x.game_id}')"`:""}><div class="muted">${E(x.source||x.feed_type||"Iceverse")} · ${new Date(x.created_at).toLocaleString()}</div><h4>${E(x.title||"Iceverse Update")}</h4><div class="muted">${E(x.body||"")}</div></article>`).join(""):'<div class="empty-state">League stories will appear as the world develops.</div>'}</div>
 </div><div class="iv-world-stack">
 <div class="panel"><div class="section-toolbar"><h3>League Table</h3><button class="secondary-button" onclick="showStandings()">Full</button></div>${standingsRows.slice(0,8).map((s,i)=>`<div class="iv-rank-row profile-link" onclick="openTeamProfile('${s.team_id}')"><span>${i+1}</span><span>${E(tm[s.team_id]?.name||"Team")}<div class="muted">${N(s.wins)}-${N(s.losses)}-${N(s.otl)}</div></span><strong>${N(s.points)} PTS</strong></div>`).join("")}</div>
 <div class="panel"><div class="section-toolbar"><h3>Scoring Leaders</h3><button class="secondary-button" onclick="showLeagueLeaders()">Full</button></div>${leaders.map(([id,x],i)=>{let p=pm[id]||{};return `<div class="iv-rank-row profile-link" onclick="openPlayerProfile('${id}')"><span>${i+1}</span><span>${E(`${p.first_name||""} ${p.last_name||"Player"}`)}</span><strong>${x.p} PTS</strong></div>`}).join("")||'<div class="empty-state">No scoring yet.</div>'}</div>
 <div class="panel"><h3>League Pulse</h3><div class="data-list" style="margin-top:10px"><div class="data-row"><span>Goals recorded</span><strong>${skaters.reduce((a,x)=>a+N(x.goals),0)}</strong></div><div class="data-row"><span>Assists recorded</span><strong>${skaters.reduce((a,x)=>a+N(x.assists),0)}</strong></div><div class="data-row"><span>Goalie saves</span><strong>${goalies.reduce((a,x)=>a+N(x.saves),0)}</strong></div><div class="data-row"><span>Shutouts</span><strong>${goalies.reduce((a,x)=>a+(x.shutout?1:0),0)}</strong></div></div></div>
 </div></div>`;
}
const oldHome=window.showHome;
window.showHome=function(){if(typeof oldHome==="function")oldHome();else{if(typeof hideAllMainSections==="function")hideAllMainSections();const h=document.getElementById("homeSection");if(h)h.style.display="block"}buildDashboard()};
styles();
setInterval(()=>document.querySelectorAll(".iv-home-countdown[data-start]").forEach(e=>e.textContent=countdown(e.dataset.start)),1000);
console.log("Iceverse V12.27 world dashboard loaded.");
})();
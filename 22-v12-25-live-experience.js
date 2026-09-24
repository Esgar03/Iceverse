/* ICEVERSE V12.25 — LIVE EXPERIENCE. Load LAST. */
(() => {
"use strict";
let liveTimer=null, liveGameId=null, scheduleTimer=null;
const etDate=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric",year:"numeric"});
const etTime=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
const esc=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clock=s=>{s=Math.max(0,Number(s||0));return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`};
const countdown=d=>{let t=Math.floor((new Date(d).getTime()-Date.now())/1000);if(t<=0)return"Starting...";let D=Math.floor(t/86400),h=Math.floor(t%86400/3600),m=Math.floor(t%3600/60),s=t%60;return D?`${D}d ${h}h ${m}m`:h?`${h}h ${m}m ${s}s`:`${m}m ${s}s`};
function clearLive(){if(liveTimer)clearInterval(liveTimer);liveTimer=null;liveGameId=null}
function clearSchedule(){if(scheduleTimer)clearInterval(scheduleTimer);scheduleTimer=null}
function styles(){if(document.getElementById("ivLiveStyles"))return;let x=document.createElement("style");x.id="ivLiveStyles";x.textContent=`
.iv-live-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;font-weight:900;letter-spacing:.08em;font-size:12px;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.45)}
.iv-live-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:ivPulse 1.2s infinite}@keyframes ivPulse{50%{opacity:.25}}
.iv-live-scoreboard{display:grid;grid-template-columns:1fr minmax(150px,220px) 1fr;gap:18px;align-items:center;text-align:center;margin-top:20px}
.iv-live-team{font-size:clamp(18px,3vw,30px);font-weight:900}.iv-live-score{font-size:clamp(34px,6vw,62px);font-weight:950;line-height:1}
.iv-live-clock{font-variant-numeric:tabular-nums;font-size:18px;font-weight:850;margin-top:8px}
.iv-live-progress{height:7px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:14px auto 0;max-width:420px}
.iv-live-progress>div{height:100%;background:currentColor;transition:width .7s linear}
.iv-pbp{display:flex;flex-direction:column;gap:8px;margin-top:12px}.iv-pbp-row{display:grid;grid-template-columns:82px 1fr;gap:12px;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,.035)}
.iv-pbp-row.goal{border-left:3px solid currentColor;font-weight:750}.iv-pbp-time{font-variant-numeric:tabular-nums;opacity:.68;font-size:12px}.iv-game-countdown{font-variant-numeric:tabular-nums;font-weight:850}
@media(max-width:700px){.iv-live-scoreboard{grid-template-columns:1fr 100px 1fr;gap:8px}.iv-pbp-row{grid-template-columns:64px 1fr}}`;document.head.appendChild(x)}
async function teams(ids){ids=[...new Set(ids.filter(Boolean))];if(!ids.length)return{};const{data}=await supabaseClient.from("teams").select("id,name,city,abbreviation").in("id",ids);return Object.fromEntries((data||[]).map(t=>[t.id,t]))}
async function renderGame(id){
 if(liveGameId!==id)return;const c=document.getElementById("gameDetailContent");if(!c)return;
 try{
  const [gr,sr,scr,er]=await Promise.all([
   supabaseClient.from("games").select("*").eq("id",id).single(),
   supabaseClient.rpc("iv_live_game_state",{p_game_id:id}),
   supabaseClient.rpc("iv_live_score",{p_game_id:id}),
   supabaseClient.rpc("iv_visible_game_events",{p_game_id:id})
  ]);
  if(gr.error)throw gr.error;if(sr.error)throw sr.error;if(scr.error)throw scr.error;if(er.error)throw er.error;
  const g=gr.data,state=sr.data,score=scr.data,ev=er.data||[],tm=await teams([g.home_team_id,g.away_team_id]),h=tm[g.home_team_id]||{},a=tm[g.away_team_id]||{};
  const final=["completed","final"].includes(g.status),live=g.status==="in_progress",scheduled=g.status==="scheduled";
  const as=final?g.away_score:Number(score?.away_score||0),hs=final?g.home_score:Number(score?.home_score||0);
  let center;
  if(scheduled)center=`<div class="pill">UPCOMING</div><div class="iv-live-clock iv-game-countdown" data-start="${esc(g.scheduled_at)}">${countdown(g.scheduled_at)}</div><div class="muted" style="margin-top:5px">${esc(etTime.format(new Date(g.scheduled_at)))}</div>`;
  else if(live){let rem=Number(state?.real_seconds_remaining??0),p=Math.max(0,Math.min(100,(900-rem)/9));center=`<div class="iv-live-badge"><span class="iv-live-dot"></span> LIVE</div><div class="iv-live-clock">P${Number(state?.period||g.period||1)} · ${clock(state?.clock_seconds??g.clock_seconds)}</div><div class="muted" style="margin-top:5px">Broadcast ${clock(rem)} remaining</div><div class="iv-live-progress"><div style="width:${p}%"></div></div>`}
  else center=`<div class="pill">FINAL</div><div class="iv-live-clock">${g.overtime?"OT":"FINAL"}</div>`;
  const ordered=[...ev].sort((x,y)=>y.sequence_no-x.sequence_no);
  const pbp=ordered.length?ordered.slice(0,120).map(e=>`<div class="iv-pbp-row ${String(e.event_type||"").toLowerCase().includes("goal")?"goal":""}"><div class="iv-pbp-time">P${e.period}<br>${clock(e.clock_seconds)}</div><div>${esc(e.description)}</div></div>`).join(""):`<div class="empty-state">${scheduled?"Play-by-play begins automatically at puck drop.":"Waiting for the first event..."}</div>`;
  c.innerHTML=`<button class="secondary-button" id="ivBack" type="button">← Back to Schedule</button>
  <div class="panel" style="margin-top:16px"><div class="muted" style="text-align:center">${esc(etDate.format(new Date(g.scheduled_at)))} · ${esc(etTime.format(new Date(g.scheduled_at)))} · Eastern</div>
  <div class="iv-live-scoreboard"><div><div class="muted">${esc(a.abbreviation||"AWAY")}</div><div class="iv-live-team">${esc(a.city||"")} ${esc(a.name||"Away")}</div></div>
  <div><div class="iv-live-score">${as}–${hs}</div>${center}</div>
  <div><div class="muted">${esc(h.abbreviation||"HOME")}</div><div class="iv-live-team">${esc(h.city||"")} ${esc(h.name||"Home")}</div></div></div></div>
  <div class="panel" style="margin-top:16px"><div class="section-toolbar"><div><h3>Play-by-Play</h3><div class="muted">${live?"Updates automatically as the game happens.":final?"Complete game timeline.":"Live feed begins at puck drop."}</div></div>${live?'<span class="iv-live-badge"><span class="iv-live-dot"></span> LIVE</span>':""}</div><div class="iv-pbp">${pbp}</div></div>`;
  document.getElementById("ivBack")?.addEventListener("click",()=>{clearLive();window.showSchedule()});
  if(final)clearLive();
 }catch(e){console.error(e);c.innerHTML=`<button class="secondary-button" onclick="showSchedule()">← Back to Schedule</button><div class="error" style="margin-top:16px">${esc(e?.message||e)}</div>`}
}
window.openGameDetail=async id=>{styles();clearLive();if(typeof showSection==="function")showSection("gameDetailSection");const c=document.getElementById("gameDetailContent");if(c)c.innerHTML='<div class="loading">Connecting to live game...</div>';liveGameId=id;await renderGame(id);liveTimer=setInterval(()=>renderGame(id),3000)};
window.showSchedule=async()=>{styles();clearLive();clearSchedule();if(typeof showSection==="function")showSection("scheduleSection");const c=document.getElementById("scheduleContent");if(!c)return;c.innerHTML='<div class="loading">Loading Iceverse schedule...</div>';
 const{data:games,error}=await supabaseClient.from("games").select("id,home_team_id,away_team_id,scheduled_at,status,period,clock_seconds,home_score,away_score,overtime").order("scheduled_at",{ascending:true}).limit(1200);
 if(error){c.innerHTML=`<div class="error">${esc(error.message)}</div>`;return}
 const tm=await teams((games||[]).flatMap(g=>[g.home_team_id,g.away_team_id])),groups={};(games||[]).forEach(g=>{let k=etDate.format(new Date(g.scheduled_at));(groups[k]??=[]).push(g)});
 c.innerHTML=`<div class="section-toolbar"><div><h2>Iceverse Schedule</h2><div class="muted">Puck drops use the centralized Eastern game clock.</div></div><button class="secondary-button" id="ivRefresh">Refresh</button></div>`+
 Object.entries(groups).map(([day,list])=>`<div class="iv-schedule-day">${esc(day)}</div>${list.map(g=>{let h=tm[g.home_team_id]||{},a=tm[g.away_team_id]||{},final=["completed","final"].includes(g.status),live=g.status==="in_progress";let mid=final?`<strong>${g.away_score} – ${g.home_score}</strong><br><span class="muted">FINAL${g.overtime?" / OT":""}</span>`:live?`<span class="iv-live-badge"><span class="iv-live-dot"></span> LIVE</span><br><strong>P${g.period||1} · ${clock(g.clock_seconds)}</strong>`:`<strong>${esc(etTime.format(new Date(g.scheduled_at)))}</strong><br><span class="iv-game-countdown muted" data-start="${esc(g.scheduled_at)}">${countdown(g.scheduled_at)}</span>`;return `<div class="iv-game-card profile-link" onclick="openGameDetail('${g.id}')"><div class="iv-game-team"><strong>${esc(a.city||"")} ${esc(a.name||"Away")}</strong><div class="muted">${esc(a.abbreviation||"")}</div></div><div class="iv-game-time">${mid}</div><div class="iv-game-team"><strong>${esc(h.city||"")} ${esc(h.name||"Home")}</strong><div class="muted">${esc(h.abbreviation||"")}</div></div></div>`}).join("")}`).join("");
 document.getElementById("ivRefresh")?.addEventListener("click",()=>window.showSchedule());
 scheduleTimer=setInterval(()=>document.querySelectorAll(".iv-game-countdown[data-start]").forEach(e=>e.textContent=countdown(e.dataset.start)),1000);
};
styles();console.log("Iceverse V12.25 live experience loaded.");
})();
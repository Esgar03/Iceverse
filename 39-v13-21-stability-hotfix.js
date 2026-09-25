/* ICEVERSE V13.21 — STABILITY HOTFIX
   Fixes: test-season timeout batching, authoritative standings/GP,
   and player-creation field/legacy-form conflicts.
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const N=v=>Number(v)||0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- 1. TEST SEASON: SMALL GAME BATCHES ---------- */
let iv1321Pause=false;
function getOverlay(){
 let o=document.getElementById("iv1321TestOverlay");
 if(o)return o;
 o=document.createElement("div");o.id="iv1321TestOverlay";
 o.style.cssText="position:fixed;inset:0;background:rgba(2,10,18,.88);z-index:100000;display:none;align-items:center;justify-content:center;padding:20px";
 o.innerHTML=`<div class="panel" style="width:min(620px,100%);padding:24px">
 <div class="muted">ICEVERSE SAFE TEST SIM</div><h2 id="iv1321Title">Preparing…</h2>
 <p class="muted" id="iv1321Text">Games are simulated in tiny transactions so Supabase never has to process a whole day at once.</p>
 <div style="height:12px;border-radius:99px;background:#071525;overflow:hidden"><div id="iv1321Bar" style="height:100%;width:0;background:currentColor;transition:width .2s"></div></div>
 <div style="display:flex;justify-content:space-between;margin-top:10px"><strong id="iv1321Count">0 games</strong><span id="iv1321Pct">0%</span></div>
 <div style="display:flex;gap:8px;margin-top:16px"><button class="secondary-button" id="iv1321Pause">Pause</button><button class="secondary-button" id="iv1321Hide">Hide</button></div></div>`;
 document.body.appendChild(o);
 document.getElementById("iv1321Hide").onclick=()=>o.style.display="none";
 document.getElementById("iv1321Pause").onclick=()=>{iv1321Pause=true;document.getElementById("iv1321Pause").textContent="Pausing…"};
 return o;
}
async function iv1321FullSeason(){
 if(!confirm("Fast-sim the remaining TEST SEASON in safe 2-game batches? Your restore point remains active until you reset it."))return;
 const o=getOverlay();o.style.display="flex";iv1321Pause=false;
 document.getElementById("iv1321Pause").textContent="Pause";
 try{
  let {data:st,error:se}=await supabaseClient.rpc("admin_test_season_status");if(se)throw se;
  if(!st?.active)throw new Error("Create a Test Season restore point first.");
  const starting=N(st.completed_games), target=starting+N(st.remaining_games);let done=starting,batches=0,empty=0;
  while(done<target){
   const {data,error}=await supabaseClient.rpc("admin_test_sim_batch",{p_game_limit:2});
   if(error)throw error;
   const n=N(data?.games_simulated); done+=n;batches++;
   if(n===0){empty++;if(data?.complete===true||empty>=2)break}else empty=0;
   const pct=target?Math.min(100,Math.round(done/target*100)):100;
   document.getElementById("iv1321Title").textContent=`Safe batch ${batches}`;
   document.getElementById("iv1321Text").textContent=`${n} game${n===1?"":"s"} finished this request. ${N(data?.remaining_games)} remain.`;
   document.getElementById("iv1321Count").textContent=`${done} / ${target} games`;
   document.getElementById("iv1321Pct").textContent=pct+"%";
   document.getElementById("iv1321Bar").style.width=pct+"%";
   if(iv1321Pause){document.getElementById("iv1321Title").textContent="Paused safely";return}
   await sleep(80);
  }
  document.getElementById("iv1321Bar").style.width="100%";
  document.getElementById("iv1321Pct").textContent="100%";
  document.getElementById("iv1321Title").textContent="Test season complete";
  document.getElementById("iv1321Text").textContent="Inspect the league, then Reset Test Season when finished.";
  setTimeout(()=>{o.style.display="none";window.showAdmin?.()},1500);
 }catch(e){
  console.error("V13.21 test sim",e);
  document.getElementById("iv1321Title").textContent="Simulation stopped";
  document.getElementById("iv1321Text").textContent=(e?.message||String(e))+" — the restore point is still active.";
 }
}
window.ivTestSimSeason=iv1321FullSeason;

/* ---------- 2. AUTHORITATIVE STANDINGS FROM COMPLETED GAMES ---------- */
async function iv1321Standings(){
 if(typeof window.showSection==="function")window.showSection("standingsSection");
 const c=document.getElementById("standingsContent");if(!c)return;
 c.innerHTML='<div class="loading">Rebuilding standings from official games...</div>';
 try{
  const [{data:teams,error:te},{data:seasons},{data:games,error:ge}]=await Promise.all([
   supabaseClient.from("teams").select("id,name,city,abbreviation,conference,division"),
   supabaseClient.from("seasons").select("id,season_number,active").eq("active",true).order("season_number",{ascending:false}).limit(1),
   supabaseClient.from("games").select("id,season_id,home_team_id,away_team_id,home_score,away_score,winner_team_id,overtime,status")
     .in("status",["completed","final"])
  ]);
  if(te)throw te;if(ge)throw ge;
  const sid=seasons?.[0]?.id;
  const official=(games||[]).filter(g=>!sid||g.season_id===sid);
  const rows=(teams||[]).map(t=>({ ...t,gp:0,w:0,l:0,otl:0,gf:0,ga:0,pts:0 }));
  const map=Object.fromEntries(rows.map(x=>[x.id,x]));
  official.forEach(g=>{
   const h=map[g.home_team_id],a=map[g.away_team_id];if(!h||!a)return;
   h.gp++;a.gp++;h.gf+=N(g.home_score);h.ga+=N(g.away_score);a.gf+=N(g.away_score);a.ga+=N(g.home_score);
   const winner=g.winner_team_id || (N(g.home_score)>N(g.away_score)?g.home_team_id:N(g.away_score)>N(g.home_score)?g.away_team_id:null);
   if(winner===h.id){h.w++;h.pts+=2;if(g.overtime){a.otl++;a.pts+=1}else a.l++}
   else if(winner===a.id){a.w++;a.pts+=2;if(g.overtime){h.otl++;h.pts+=1}else h.l++}
  });
  rows.sort((a,b)=>b.pts-a.pts||b.w-a.w||(b.gf-b.ga)-(a.gf-a.ga)||a.name.localeCompare(b.name));
  c.innerHTML=`<div class="panel table-wrap"><table class="iv-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th><th>GF</th><th>GA</th><th>DIFF</th></tr></thead><tbody>${rows.map((t,i)=>`<tr class="profile-link" onclick="openTeamProfile('${t.id}')"><td>${i+1}</td><td>${E(t.city||"")} ${E(t.name)}</td><td><strong>${t.gp}</strong></td><td>${t.w}</td><td>${t.l}</td><td>${t.otl}</td><td><strong>${t.pts}</strong></td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gf-t.ga>0?"+":""}${t.gf-t.ga}</td></tr>`).join("")}</tbody></table></div><div class="muted" style="margin-top:10px">Standings are calculated directly from ${official.length} completed games in the active season, so GP always matches the schedule results.</div>`;
 }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
}
window.showStandings=iv1321Standings;

/* ---------- 3. PLAYER CREATION FIELD FIX ---------- */
function val(id){return (document.getElementById(id)?.value??"").toString().trim()}
function creationMessage(text,cls="warning-message"){
 const m=document.getElementById("createPlayerMessage");if(m){m.className=cls;m.textContent=text}else alert(text);
}
function validateVisibleCreation(){
 const first=val("createFirstName"),last=val("createLastName");
 if(!first){creationMessage("Enter a first name.");document.getElementById("createFirstName")?.focus();return false}
 if(!last){creationMessage("Enter a last name.");document.getElementById("createLastName")?.focus();return false}
 return true;
}
const originalCreate=window.createPlayer;
if(typeof originalCreate==="function"){
 window.createPlayer=async function(...args){
  if(!validateVisibleCreation())return;
  return await originalCreate.apply(this,args);
 };
}
/* Some older Iceverse patches still call submitPlayerCreation and look for
   playerFirstName/playerLastName. Route those calls to the current form. */
window.submitPlayerCreation=async function(){
 if(document.getElementById("createFirstName")){
  if(!validateVisibleCreation())return;
  if(typeof window.createPlayer==="function")return await window.createPlayer();
 }
 const first=(document.getElementById("playerFirstName")?.value||"").trim();
 const last=(document.getElementById("playerLastName")?.value||"").trim();
 if(!first){alert("Enter a first name.");return}
 if(!last){alert("Enter a last name.");return}
 throw new Error("Legacy player-creation form detected. Open Create Player again to use the current builder.");
};
/* Keep browser autofill/input changes from leaving stale build state. */
document.addEventListener("input",e=>{
 if(e.target?.id==="createFirstName"||e.target?.id==="createLastName"){
  const m=document.getElementById("createPlayerMessage");
  if(m&&/first|last|required/i.test(m.textContent||"")){m.textContent="";m.className=""}
 }
});
console.log("Iceverse V13.21 stability hotfix loaded.");
})();
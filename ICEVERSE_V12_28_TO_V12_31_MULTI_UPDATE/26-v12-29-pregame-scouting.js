/* ICEVERSE V12.29 — PREGAME SCOUTING */
(() => {
"use strict";
const E=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"");
async function ivScoutGame(gameId){
 showSection("gameDetailSection");const c=document.getElementById("gameDetailContent");c.innerHTML='<div class="loading">Building scouting report...</div>';
 try{
  const {data:g,error}=await supabaseClient.from("games").select("*").eq("id",gameId).single();if(error)throw error;
  const ids=[g.home_team_id,g.away_team_id];
  const [{data:teams},{data:rosters},{data:stats},{data:goalies}]=await Promise.all([
   supabaseClient.from("teams").select("id,city,name,wins,losses,overtime_losses").in("id",ids),
   supabaseClient.from("rosters").select("team_id,player_id,players(id,first_name,last_name,overall,primary_position,current_form,fatigue)").in("team_id",ids),
   supabaseClient.from("player_game_stats").select("team_id,player_id,goals,assists,points,shots,hits,blocks").in("team_id",ids),
   supabaseClient.from("goalie_game_stats").select("team_id,player_id,shots_against,saves,goals_against").in("team_id",ids)
  ]);
  const tm=Object.fromEntries((teams||[]).map(x=>[x.id,x]));
  const report=id=>{
   const rs=(rosters||[]).filter(x=>x.team_id===id), ss=(stats||[]).filter(x=>x.team_id===id);
   const pts={};ss.forEach(x=>pts[x.player_id]=(pts[x.player_id]||0)+(+x.points||0));
   const top=Object.entries(pts).sort((a,b)=>b[1]-a[1]).slice(0,3);
   const avg=rs.length?rs.reduce((a,x)=>a+(+x.players?.overall||0),0)/rs.length:0;
   const form=rs.length?rs.reduce((a,x)=>a+(+x.players?.current_form||50),0)/rs.length:50;
   const fatigue=rs.length?rs.reduce((a,x)=>a+(+x.players?.fatigue||0),0)/rs.length:0;
   const pmap=Object.fromEntries(rs.map(x=>[x.player_id,x.players]));
   return {avg,form,fatigue,top:top.map(([pid,p])=>({p,...pmap[pid]}))};
  };
  const card=id=>{const t=tm[id]||{},r=report(id);return `<div class="panel"><h2>${E(t.city)} ${E(t.name)}</h2><div class="data-list"><div class="data-row"><span>Record</span><strong>${t.wins||0}-${t.losses||0}-${t.overtime_losses||0}</strong></div><div class="data-row"><span>Roster OVR</span><strong>${r.avg.toFixed(1)}</strong></div><div class="data-row"><span>Team Form</span><strong>${r.form.toFixed(1)}</strong></div><div class="data-row"><span>Avg Fatigue</span><strong>${r.fatigue.toFixed(1)}</strong></div></div><h3 style="margin-top:14px">Players to Watch</h3>${r.top.map(p=>`<div class="data-row profile-link" onclick="openPlayerProfile('${p.id}')"><span>${E(p.first_name)} ${E(p.last_name)}</span><strong>${p.p} PTS</strong></div>`).join("")||'<div class="muted">No season scoring yet.</div>'}</div>`};
  c.innerHTML=`<button class="secondary-button" onclick="openGameDetail('${gameId}')">← Game Page</button><div class="section-toolbar" style="margin-top:18px"><div><h2>Pregame Scouting</h2><div class="muted">Personnel, form and workload snapshot.</div></div></div><div class="app-grid">${card(g.away_team_id)}${card(g.home_team_id)}</div>`;
 }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
}
window.ivScoutGame=ivScoutGame;
const old=window.openGameDetail;
if(typeof old==="function")window.openGameDetail=async function(id){await old(id);const c=document.getElementById("gameDetailContent");if(c&&!document.getElementById("ivScoutButton"))c.insertAdjacentHTML("afterbegin",`<div id="ivScoutButton" style="margin-bottom:12px"><button class="secondary-button" onclick="ivScoutGame('${id}')">Pregame Scouting</button></div>`)};
console.log("Iceverse V12.29 scouting loaded.");
})();
/* ICEVERSE V12.30 — POSTGAME ANALYSIS */
(() => {
"use strict";
const E=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"");
async function ivPostgameAnalysis(gameId){
 showSection("gameDetailSection");const c=document.getElementById("gameDetailContent");c.innerHTML='<div class="loading">Analyzing game...</div>';
 try{
  const {data:g,error}=await supabaseClient.from("games").select("*").eq("id",gameId).single();if(error)throw error;
  const [{data:teams},{data:s},{data:gs}]=await Promise.all([
   supabaseClient.from("teams").select("id,city,name").in("id",[g.home_team_id,g.away_team_id]),
   supabaseClient.from("player_game_stats").select("*").eq("game_id",gameId),
   supabaseClient.from("goalie_game_stats").select("*").eq("game_id",gameId)
  ]);
  const tm=Object.fromEntries((teams||[]).map(x=>[x.id,x]));
  const sum=(id,k)=>(s||[]).filter(x=>x.team_id===id).reduce((a,x)=>a+(+x[k]||0),0);
  const goalie=id=>(gs||[]).find(x=>x.team_id===id)||{};
  const insight=(id,opp)=>{
   const sh=sum(id,"shots"),osh=sum(opp,"shots"),hits=sum(id,"hits"),blocks=sum(id,"blocks"),g=goalie(id),sv=+g.saves||0,sa=+g.shots_against||0;
   let a=[];if(sh>osh+5)a.push("Generated the stronger shot volume.");else if(osh>sh+5)a.push("Spent too much of the game defending shot volume.");
   if(hits>sum(opp,"hits")+5)a.push("Established a physical advantage.");
   if(blocks>sum(opp,"blocks")+5)a.push("Protected the defensive zone with strong shot blocking.");
   if(sa&&sv/sa>=.92)a.push("Received high-level goaltending.");else if(sa&&sv/sa<.88)a.push("Goaltending was a major pressure point.");
   return a.length?a.join(" "):"The game was relatively even across the tracked team metrics.";
  };
  const card=id=>{const opp=id===g.home_team_id?g.away_team_id:g.home_team_id,t=tm[id]||{},gl=goalie(id);return `<div class="panel"><h2>${E(t.city)} ${E(t.name)}</h2><div class="data-list"><div class="data-row"><span>Goals</span><strong>${id===g.home_team_id?g.home_score:g.away_score}</strong></div><div class="data-row"><span>Shots</span><strong>${sum(id,"shots")}</strong></div><div class="data-row"><span>Hits</span><strong>${sum(id,"hits")}</strong></div><div class="data-row"><span>Blocks</span><strong>${sum(id,"blocks")}</strong></div><div class="data-row"><span>Takeaways</span><strong>${sum(id,"takeaways")}</strong></div><div class="data-row"><span>Goalie Saves</span><strong>${gl.saves||0}</strong></div></div><p class="muted" style="line-height:1.6">${E(insight(id,opp))}</p></div>`};
  c.innerHTML=`<button class="secondary-button" onclick="openGameDetail('${gameId}')">← Box Score</button><div class="section-toolbar" style="margin-top:18px"><div><h2>Postgame Analysis</h2><div class="muted">What drove the result according to the recorded game stats.</div></div></div><div class="app-grid">${card(g.away_team_id)}${card(g.home_team_id)}</div>`;
 }catch(e){c.innerHTML=`<div class="error">${E(e.message)}</div>`}
}
window.ivPostgameAnalysis=ivPostgameAnalysis;
const old=window.openGameDetail;
if(typeof old==="function")window.openGameDetail=async function(id){await old(id);const {data:g}=await supabaseClient.from("games").select("status").eq("id",id).single();const c=document.getElementById("gameDetailContent");if(c&&g&&["completed","final"].includes(g.status)&&!document.getElementById("ivAnalysisButton"))c.insertAdjacentHTML("afterbegin",`<div id="ivAnalysisButton" style="margin-bottom:12px"><button class="secondary-button" onclick="ivPostgameAnalysis('${id}')">Postgame Analysis</button></div>`)};
console.log("Iceverse V12.30 postgame analysis loaded.");
})();
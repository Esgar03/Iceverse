/* ICEVERSE V12.13 — standings display + box-score close + admin reset hook */
(function(){
  // Standings must read the authoritative standings table, not stale counters on teams.
  window.showStandings = async function(){
    showSection("standingsSection");
    const c=document.getElementById("standingsContent");
    c.innerHTML='<div class="loading">Loading standings...</div>';
    try{
      const {data:seasons,error:se}=await supabaseClient.from("seasons").select("id").order("created_at",{ascending:false}).limit(1);
      if(se) throw se;
      const sid=seasons?.[0]?.id;
      if(!sid) throw new Error("No season found.");

      const [{data:rows,error:re},{data:teams,error:te}]=await Promise.all([
        supabaseClient.from("standings").select("team_id,gp,wins,losses,otl,points,gf,ga,home_wins,away_wins").eq("season_id",sid),
        supabaseClient.from("teams").select("id,name,abbreviation,conference,division")
      ]);
      if(re) throw re; if(te) throw te;
      const tm=Object.fromEntries((teams||[]).map(t=>[t.id,t]));
      const sorted=(rows||[]).sort((a,b)=>
        (b.points-a.points)||(b.wins-a.wins)||((b.gf-b.ga)-(a.gf-a.ga))||(b.gf-a.gf)
      );
      c.innerHTML=`<div class="panel table-wrap"><table class="iv-table">
        <thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>PTS</th><th>GF</th><th>GA</th><th>DIFF</th></tr></thead>
        <tbody>${sorted.map((s,i)=>{const t=tm[s.team_id]||{};return `<tr class="profile-link" onclick="openTeamProfile('${s.team_id}')">
          <td>${i+1}</td><td>${escapeHTML(t.name||t.abbreviation||"Team")}</td><td>${s.gp||0}</td>
          <td>${s.wins||0}</td><td>${s.losses||0}</td><td>${s.otl||0}</td><td><strong>${s.points||0}</strong></td>
          <td>${s.gf||0}</td><td>${s.ga||0}</td><td>${(s.gf||0)-(s.ga||0)}</td></tr>`}).join("")}</tbody>
      </table></div>`;
    }catch(e){c.innerHTML=`<div class="error">${escapeHTML(e.message)}</div>`;}
  };

  // Capture phase prevents the generic data-game-id listener from swallowing/reopening the modal.
  document.addEventListener("click",function(e){
    const close=e.target.closest("#ivCloseGameBox,[data-iv-close-game-box]");
    if(!close)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const modal=close.closest("#ivGameBoxModal")||document.getElementById("ivGameBoxModal");
    if(modal) modal.remove();
  },true);

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") document.getElementById("ivGameBoxModal")?.remove();
  });

  async function resetSeason(){
    if(!confirm("RESET ENTIRE CURRENT SEASON?\n\nThis removes this season's games, game/season stats and awards, then creates a fresh schedule. Players and teams are kept."))return;
    if(prompt("Type RESET SEASON to confirm:")!=="RESET SEASON")return alert("Reset cancelled.");
    const b=document.getElementById("ivFullSeasonResetButton");
    if(b){b.disabled=true;b.textContent="Resetting...";}
    const {data,error}=await supabaseClient.rpc("admin_full_reset_current_season");
    if(b){b.disabled=false;b.textContent="Reset Entire Season";}
    if(error)return alert("Season reset failed: "+error.message);
    alert(`Season reset complete.\nRows removed: ${data?.rows_removed??0}\nFresh games: ${data?.new_games??0}`);
    if(typeof showAdmin==="function")await showAdmin();
  }
  window.ivFullSeasonReset=resetSeason;

  function addReset(){
    const c=document.getElementById("adminContent");
    if(!c||document.getElementById("ivFullSeasonResetCard"))return;
    const d=document.createElement("div");d.className="panel";d.id="ivFullSeasonResetCard";d.style.marginTop="16px";
    d.innerHTML=`<h3>Full Season Reset</h3><p class="muted">Admin only. Removes the current season's games, stats and awards and builds a fresh schedule.</p>
      <button id="ivFullSeasonResetButton" class="secondary-button" style="margin-top:12px;border-color:#c94f5f" onclick="ivFullSeasonReset()">Reset Entire Season</button>`;
    c.appendChild(d);
  }
  if(typeof showAdmin==="function"){
    const old=showAdmin;
    showAdmin=async function(...a){await old.apply(this,a);addReset();};
  }
})();

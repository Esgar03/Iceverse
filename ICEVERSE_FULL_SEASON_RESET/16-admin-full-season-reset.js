/* ICEVERSE ADMIN FULL SEASON RESET BUTTON
   Add after the other numbered Iceverse scripts. */
(function(){
  async function fullSeasonReset(){
    if(!confirm(
      "FULL SEASON RESET?\n\n"+
      "This permanently removes ALL games, game stats, season stats and awards from the CURRENT season.\n\n"+
      "Users, teams, players, rosters, contracts and player attributes are kept.\n\n"+
      "A fresh schedule will be generated."
    )) return;

    const typed=prompt('For safety, type exactly: RESET SEASON');
    if(typed!=="RESET SEASON") return alert("Reset cancelled.");

    const btn=document.getElementById("ivFullSeasonResetButton");
    if(btn){btn.disabled=true;btn.textContent="Resetting season...";}

    const {data,error}=await supabaseClient.rpc("admin_full_reset_current_season");

    if(btn){btn.disabled=false;btn.textContent="Reset Entire Season";}

    if(error) return alert("Full season reset failed: "+error.message);

    alert(
      `Season ${data?.season_number??""} reset complete.\n`+
      `Old season rows removed: ${data?.rows_removed??0}\n`+
      `Fresh games scheduled: ${data?.new_games??0}\n`+
      `World Day: ${data?.world_day??1}`
    );

    if(typeof ivRefreshWorldClock==="function") await ivRefreshWorldClock();
    if(typeof showAdmin==="function") await showAdmin();
  }

  window.ivFullSeasonReset=fullSeasonReset;

  function install(){
    const c=document.getElementById("adminContent");
    if(!c || document.getElementById("ivFullSeasonResetCard")) return;
    const card=document.createElement("div");
    card.id="ivFullSeasonResetCard";
    card.className="panel";
    card.style.marginTop="16px";
    card.innerHTML=`
      <h3>Full Season Reset</h3>
      <p class="muted" style="margin:7px 0 14px">
        Admin only. Erases the current season's games, game/season statistics and awards,
        resets the world to Day 1, then creates a fresh schedule. Players and teams are kept.
      </p>
      <button type="button" id="ivFullSeasonResetButton"
        class="secondary-button" style="border-color:#c94f5f"
        onclick="ivFullSeasonReset()">Reset Entire Season</button>`;
    c.appendChild(card);
  }

  if(typeof showAdmin==="function"){
    const old=showAdmin;
    showAdmin=async function(){await old();install();};
  }
})();

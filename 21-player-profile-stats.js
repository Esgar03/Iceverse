/* Iceverse V12.21 — player profile season + career stats */
(() => {
  "use strict";

  const originalOpenPlayerProfile = window.openPlayerProfile;
  if (typeof originalOpenPlayerProfile !== "function") {
    console.error("Iceverse V12.21: openPlayerProfile was not found.");
    return;
  }

  const esc = (value) => {
    if (typeof window.escapeHTML === "function") return window.escapeHTML(String(value ?? ""));
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[c]);
  };

  const n = (v) => Number(v || 0).toLocaleString();
  const pct = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x.toFixed(3).replace(/^0/, "") : ".000";
  };

  function skaterBlock(title, s) {
    return `
      <div class="panel" style="margin-top:16px">
        <h3>${esc(title)}</h3>
        <div style="overflow-x:auto">
          <table class="iv-box-table">
            <thead><tr>
              <th>GP</th><th>G</th><th>A</th><th>PTS</th><th>SOG</th>
              <th>HIT</th><th>BLK</th><th>FOW</th><th>FOL</th>
            </tr></thead>
            <tbody><tr>
              <td>${n(s.gp)}</td><td>${n(s.goals)}</td><td>${n(s.assists)}</td>
              <td>${n(s.points)}</td><td>${n(s.shots)}</td><td>${n(s.hits)}</td>
              <td>${n(s.blocks)}</td><td>${n(s.faceoff_wins)}</td><td>${n(s.faceoff_losses)}</td>
            </tr></tbody>
          </table>
        </div>
      </div>`;
  }

  function goalieBlock(title, s) {
    return `
      <div class="panel" style="margin-top:16px">
        <h3>${esc(title)}</h3>
        <div style="overflow-x:auto">
          <table class="iv-box-table">
            <thead><tr>
              <th>GP</th><th>W</th><th>SO</th><th>SA</th><th>SV</th><th>GA</th><th>SV%</th>
            </tr></thead>
            <tbody><tr>
              <td>${n(s.gp)}</td><td>${n(s.wins)}</td><td>${n(s.shutouts)}</td>
              <td>${n(s.shots_against)}</td><td>${n(s.saves)}</td>
              <td>${n(s.goals_against)}</td><td>${pct(s.save_pct)}</td>
            </tr></tbody>
          </table>
        </div>
      </div>`;
  }

  async function injectStats(playerId) {
    const host = document.getElementById("playerProfile");
    if (!host) return;

    host.querySelector("#ivPlayerStatsV1221")?.remove();

    const mount = document.createElement("div");
    mount.id = "ivPlayerStatsV1221";
    mount.innerHTML = `<div class="panel" style="margin-top:20px"><div class="loading">Loading season and career statistics...</div></div>`;
    host.appendChild(mount);

    const { data, error } = await supabaseClient.rpc("get_player_stat_profile", {
      p_player_id: playerId
    });

    if (error) {
      console.error("Player stat profile error:", error);
      mount.innerHTML = `<div class="error" style="margin-top:20px">Unable to load player statistics: ${esc(error.message)}</div>`;
      return;
    }

    if (!data) {
      mount.innerHTML = `<div class="panel" style="margin-top:20px"><h3>Statistics</h3><div class="muted">No statistics recorded yet.</div></div>`;
      return;
    }

    const isGoalie = data.position === "G";
    const seasonLabel = data.season_label || "Current Season";

    mount.innerHTML = `
      <div style="margin-top:26px;padding-top:20px;border-top:1px solid #1b3550">
        <h3>Statistics</h3>
        <div class="muted">Official completed-game totals.</div>
        ${isGoalie
          ? goalieBlock(seasonLabel, data.season || {}) + goalieBlock("Career Totals", data.career || {})
          : skaterBlock(seasonLabel, data.season || {}) + skaterBlock("Career Totals", data.career || {})}
      </div>`;
  }

  window.openPlayerProfile = async function(playerId) {
    await originalOpenPlayerProfile(playerId);
    await injectStats(playerId);
  };

  console.log("Iceverse V12.21 player profile statistics patch loaded.");
})();
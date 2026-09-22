// Iceverse V12.14 - Admin Reset Button Fix
(function () {
  "use strict";

  const ADMIN_UUID = "b1f73467-ca8a-4fbb-bbd0-4983cf5ef105";

  async function ivCurrentUserIsAdmin() {
    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error || !data?.user) return false;
      return data.user.id === ADMIN_UUID;
    } catch (_) {
      return false;
    }
  }

  async function ivFullSeasonReset() {
    if (!(await ivCurrentUserIsAdmin())) {
      alert("Admin access required.");
      return;
    }

    if (!confirm("RESET THE CURRENT ICEVERSE SEASON?\n\nThis permanently removes current-season games, standings, stats and awards, then creates a fresh schedule.")) {
      return;
    }

    const typed = prompt('Type RESET SEASON to confirm:');
    if (typed !== "RESET SEASON") {
      alert("Reset cancelled.");
      return;
    }

    const btn = document.getElementById("ivFullSeasonResetButton");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Resetting Season...";
    }

    try {
      const { data, error } = await supabaseClient.rpc("admin_full_reset_current_season");
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      alert(
        "Season reset complete.\n\n" +
        "Games removed: " + (result?.games_removed ?? "—") + "\n" +
        "New games: " + (result?.new_games ?? "—")
      );

      if (typeof showAdmin === "function") await showAdmin();
    } catch (err) {
      console.error("Iceverse reset failed:", err);
      alert("Season reset failed: " + (err?.message || String(err)));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Reset Entire Season";
      }
    }
  }

  async function ivInstallAdminResetButton() {
    if (!(await ivCurrentUserIsAdmin())) return;

    // Try several stable admin containers used across Iceverse builds.
    const host =
      document.getElementById("adminContent") ||
      document.querySelector("#adminSection .section-content") ||
      document.querySelector("#adminSection .content") ||
      document.getElementById("adminSection");

    if (!host || document.getElementById("ivAdminSeasonResetCard")) return;

    const card = document.createElement("div");
    card.id = "ivAdminSeasonResetCard";
    card.className = "panel";
    card.style.cssText =
      "margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:12px;";

    card.innerHTML = `
      <div style="font-weight:800;font-size:18px;margin-bottom:6px;">Full Season Reset</div>
      <div style="opacity:.78;line-height:1.45;margin-bottom:14px;">
        Admin only. Removes the current season's games, standings, stats and awards,
        then creates a fresh schedule.
      </div>
      <button id="ivFullSeasonResetButton" class="danger-button" type="button">
        Reset Entire Season
      </button>
    `;

    host.appendChild(card);

    document
      .getElementById("ivFullSeasonResetButton")
      ?.addEventListener("click", ivFullSeasonReset);
  }

  // Wrap the existing admin renderer when available.
  if (typeof window.showAdmin === "function") {
    const originalShowAdmin = window.showAdmin;
    window.showAdmin = async function (...args) {
      const result = await originalShowAdmin.apply(this, args);
      await ivInstallAdminResetButton();
      return result;
    };
  }

  // Also watch for the admin screen being rendered dynamically.
  const observer = new MutationObserver(() => {
    if (document.getElementById("adminSection")) {
      ivInstallAdminResetButton();
    }
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    ivInstallAdminResetButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.ivFullSeasonReset = ivFullSeasonReset;
})();

/* ICEVERSE V12.18 — authoritative game countdown + reliable admin reset UI
   Load LAST, after all existing Iceverse scripts. */
(function(){
  "use strict";

  const CLOCK_SYNC_MS = 30000;
  let serverEpochMs = Date.now();
  let syncPerfMs = performance.now();
  let clockReady = false;
  let syncTimer = null;
  let paintTimer = null;

  function internalNowMs(){
    return serverEpochMs + (performance.now() - syncPerfMs);
  }

  async function syncInternalClock(){
    try{
      const before = performance.now();
      const {data,error} = await supabaseClient.rpc("iceverse_now");
      const after = performance.now();
      if(error) throw error;
      const parsed = Date.parse(data);
      if(!Number.isFinite(parsed)) throw new Error("Invalid Iceverse clock response");
      serverEpochMs = parsed + ((after-before)/2);
      syncPerfMs = after;
      clockReady = true;
      paintCountdowns();
    }catch(err){
      console.warn("Iceverse clock sync failed:", err?.message || err);
    }
  }

  function formatCountdown(targetMs){
    let seconds = Math.max(0, Math.ceil((targetMs-internalNowMs())/1000));
    const days = Math.floor(seconds/86400); seconds %= 86400;
    const hours = Math.floor(seconds/3600); seconds %= 3600;
    const minutes = Math.floor(seconds/60); seconds %= 60;
    if(days>0) return `${days}d ${hours}h ${minutes}m`;
    if(hours>0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  function paintCountdowns(){
    document.querySelectorAll("[data-iv-game-countdown]").forEach(el=>{
      const target = Date.parse(el.dataset.ivGameCountdown || "");
      if(!Number.isFinite(target)) return;
      const diff = target - internalNowMs();
      el.textContent = diff<=0 ? "GAME TIME" : formatCountdown(target);
      el.title = "Countdown uses the authoritative Iceverse server clock";
    });
  }

  function installCountdownsIntoSchedule(){
    const cards = document.querySelectorAll(".iv-game-card");
    cards.forEach(card=>{
      const time = card.querySelector(".iv-game-time");
      if(!time || /FINAL/i.test(time.textContent||"")) return;

      const onclick = card.getAttribute("onclick") || "";
      const match = onclick.match(/openGameDetail\(['\"]([^'\"]+)/);
      const gameId = match?.[1];
      if(!gameId || !window.ivV1218ScheduleTimes?.has(gameId)) return;

      const scheduledAt = window.ivV1218ScheduleTimes.get(gameId);
      time.innerHTML = `<strong data-iv-game-countdown="${scheduledAt}">—</strong><br><span class="muted">until game time</span>`;
    });
    paintCountdowns();
  }

  async function refreshScheduleTimes(){
    try{
      const {data,error}=await supabaseClient
        .from("games")
        .select("id,scheduled_at,status")
        .eq("status","scheduled")
        .order("scheduled_at",{ascending:true});
      if(error) throw error;
      window.ivV1218ScheduleTimes = new Map((data||[]).map(g=>[g.id,g.scheduled_at]));
    }catch(err){
      console.warn("Iceverse countdown schedule load failed:",err?.message||err);
    }
  }

  async function enhanceSchedule(){
    await refreshScheduleTimes();
    installCountdownsIntoSchedule();
  }

  async function ivResetSeasonV2(){
    if(!confirm(
      "RESET THE CURRENT ICEVERSE SEASON?\n\n"+
      "This clears the current season and creates a fresh schedule. The first three season days are reserved for offseason signings; games begin on Day 4."
    )) return;
    const typed=prompt("Type RESET SEASON to confirm:");
    if(typed!=="RESET SEASON") return alert("Reset cancelled.");

    const btn=document.getElementById("ivV1218ResetButton");
    if(btn){btn.disabled=true;btn.textContent="Resetting…";}
    try{
      const {data,error}=await supabaseClient.rpc("admin_reset_iceverse_season_v2");
      if(error) throw error;
      const r=Array.isArray(data)?data[0]:data;
      alert(
        "Season reset complete.\n\n"+
        "Season Day 1 starts now.\n"+
        "Days 1–3: offseason signing window.\n"+
        "First games: Day 4.\n"+
        `Games shifted for signing window: ${r?.games_shifted ?? "—"}`
      );
      if(typeof showAdmin==="function") await showAdmin();
    }catch(err){
      console.error("Iceverse season reset failed:",err);
      alert("Season reset failed: "+(err?.message||String(err)));
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Reset Season";}
    }
  }

  function installResetCard(){
    const host=document.getElementById("adminContent") || document.getElementById("adminSection");
    if(!host || document.getElementById("ivV1218ResetCard")) return;
    const card=document.createElement("div");
    card.id="ivV1218ResetCard";
    card.className="panel";
    card.style.marginTop="18px";
    card.innerHTML=`
      <h3>Season Reset</h3>
      <p class="muted" style="margin-top:8px">
        Creates a fresh season schedule using the Iceverse server clock. Days 1–3 are a protected offseason signing window; regular-season games begin on Day 4.
      </p>
      <button id="ivV1218ResetButton" class="danger-button secondary-button" type="button" style="margin-top:12px;border-color:#b84c5b">
        Reset Season
      </button>`;
    host.appendChild(card);
    card.querySelector("#ivV1218ResetButton")?.addEventListener("click",ivResetSeasonV2);
  }

  function start(){
    syncInternalClock();
    if(syncTimer) clearInterval(syncTimer);
    syncTimer=setInterval(syncInternalClock,CLOCK_SYNC_MS);
    if(paintTimer) clearInterval(paintTimer);
    paintTimer=setInterval(paintCountdowns,1000);

    const observer=new MutationObserver(()=>{
      installResetCard();
      if(document.querySelector(".iv-game-card")) installCountdownsIntoSchedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    installResetCard();

    if(typeof window.showSchedule==="function"){
      const oldShowSchedule=window.showSchedule;
      window.showSchedule=async function(...args){
        await refreshScheduleTimes();
        const result=await oldShowSchedule.apply(this,args);
        installCountdownsIntoSchedule();
        return result;
      };
    }
  }

  window.ivInternalNow=()=>new Date(internalNowMs());
  window.ivSyncInternalClock=syncInternalClock;
  window.ivResetSeasonV2=ivResetSeasonV2;

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();

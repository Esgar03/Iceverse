/* ICEVERSE V13.28 — CURRENT-SEASON REBUILD + AUTH STABILITY */
(() => {
"use strict";
async function iv1328Session(){
  const {data,error}=await supabaseClient.auth.getSession();
  if(error) throw error;
  const session=data?.session||null;
  if(session?.user) window.currentUser=session.user;
  return session;
}
async function iv1328RebuildSchedule(){
  if(!confirm("Rebuild only the REMAINING schedule for the current season?\n\nCompleted games and standings are preserved. Future scheduled games are replaced.")) return;
  const typed=prompt("Type REBUILD SCHEDULE to confirm:");
  if(typed!=="REBUILD SCHEDULE") return alert("Rebuild cancelled.");
  try{
    const {data,error}=await supabaseClient.rpc("admin_rebuild_current_season_remaining_schedule");
    if(error) throw error;
    const r=Array.isArray(data)?data[0]:data;
    alert(`Schedule rebuilt.\nCompleted games preserved: ${r?.completed_games_preserved??"—"}\nNew remaining games: ${r?.scheduled_games_created??"—"}\nNext game: ${r?.next_game_at??"—"}`);
    await window.ivSyncInternalClock?.();
    await window.showSchedule?.();
  }catch(e){console.error("V13.28 rebuild",e);alert("Schedule rebuild failed: "+(e?.message||e));}
}
window.ivRebuildCurrentSeason=iv1328RebuildSchedule;
window.rebuildSchedule=iv1328RebuildSchedule;
window.ivAdminRebuildSchedule=iv1328RebuildSchedule;

function install(){
  document.querySelectorAll("button").forEach(b=>{
    if(/rebuild schedule/i.test(b.textContent||"")){
      b.onclick=null;
      if(b.dataset.v1328)return;
      b.dataset.v1328="1";
      b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();iv1328RebuildSchedule()},true);
    }
  });
}

// Never sign the user out because a create-player auth check briefly fails.
// Keep currentUser synchronized with Supabase's persisted session.
supabaseClient.auth.onAuthStateChange((_event,session)=>{
  window.currentUser=session?.user||null;
});
iv1328Session().catch(e=>console.warn("V13.28 session sync",e));

const obs=new MutationObserver(install);
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{install();obs.observe(document.body,{childList:true,subtree:true})},{once:true});
else {install();obs.observe(document.body,{childList:true,subtree:true});}
console.log("🧊 Iceverse V13.28 schedule/auth hotfix loaded");
})();

/* ICEVERSE V13.26 — AUTH + EARNED BADGES + TEST CLOCK RESET */
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const read=id=>String(document.getElementById(id)?.value??"").trim();
const draft={first:"",last:""};
document.addEventListener("input",e=>{if(e.target?.id==="createFirstName")draft.first=read("createFirstName");if(e.target?.id==="createLastName")draft.last=read("createLastName")},true);

async function liveUser(){
 const {data,error}=await supabaseClient.auth.getUser();
 if(error)throw error;
 return data?.user||null;
}
async function iv1326CreatePlayer(){
 const message=document.getElementById("createPlayerMessage");
 const fail=t=>{if(message){message.className="warning-message";message.textContent=t}else alert(t)};
 try{
   const user=await liveUser();
   if(!user){fail("Your login session is not active. Please sign in again.");return}
   window.currentUser=user; // keep legacy screens synchronized with real Supabase auth

   const first=read("createFirstName")||draft.first,last=read("createLastName")||draft.last;
   if(!first){fail("Enter a first name.");document.getElementById("createFirstName")?.focus();return}
   if(!last){fail("Enter a last name.");document.getElementById("createLastName")?.focus();return}
   const build=window.creationBuild;
   if(!build){fail("Complete the player build first.");return}
   const handedness=read("createHandedness"),nationality=read("createNationality");
   const secondary=read("createSecondaryPosition")||null;
   if(!handedness){fail("Choose a handedness.");return}
   if(!nationality){fail("Choose a nationality.");return}
   if(build.position==="G"&&secondary){fail("Goalies cannot have a secondary position.");return}

   if(message){message.className="success-message";message.textContent="Creating player…"}
   const purchase=await supabaseClient.rpc("purchase_player_creation");
   if(purchase.error)throw purchase.error;

   const overall=window.calculateOverall(build.attributes);
   const potential=window.calculatePotential(build,nationality,handedness);
   const payload={
     first_name:first,last_name:last,age:18,nationality,
     primary_position:build.position,secondary_position:secondary,
     archetype:build.archetype,overall,potential,created_by:user.id,
     height_inches:build.height??build.height_inches,
     weight_lbs:build.weight??build.weight_lbs,handedness
   };
   const ins=await supabaseClient.from("players").insert(payload).select().single();
   if(ins.error){await supabaseClient.rpc("refund_player_creation");throw ins.error}
   const attrs=await supabaseClient.from("player_attributes").insert({player_id:ins.data.id,...build.attributes});
   if(attrs.error){
     await supabaseClient.from("players").delete().eq("id",ins.data.id);
     await supabaseClient.rpc("refund_player_creation");
     throw new Error("Attributes failed to save: "+attrs.error.message);
   }
   draft.first="";draft.last="";window.creationBuild=null;
   if(message){message.className="success-message";message.textContent=`${first} ${last} created successfully.`}
   await window.openPlayerProfile?.(ins.data.id);
 }catch(e){console.error("V13.26 create",e);fail("Player creation failed: "+(e?.message||e))}
}
function bindCreate(){
 const b=document.getElementById("finalCreatePlayerButton");if(!b)return;
 if(b.dataset.v1326Bound)return;b.dataset.v1326Bound="1";b.removeAttribute("onclick");
 b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();iv1326CreatePlayer()},true);
}
window.createPlayer=iv1326CreatePlayer;
window.submitPlayerCreation=iv1326CreatePlayer;
window.handleCreatePlayer=iv1326CreatePlayer;
window.createNewPlayer=iv1326CreatePlayer;

/* Only render badges that actually exist in player_badges. No empty badge catalog. */
const tier=t=>({bronze:"🥉 Bronze",silver:"🥈 Silver",gold:"🥇 Gold",platinum:"💎 Hall of Fame"}[t]||E(t));
async function earnedBadges(playerId){
 const old=document.getElementById("iv1324Badges");if(old)old.remove();
 const host=document.getElementById("playerProfile")||document.getElementById("playerProfileContent");if(!host)return;
 const {data:badges,error}=await supabaseClient.from("player_badges").select("*").eq("player_id",playerId).order("updated_at",{ascending:false});
 if(error){console.warn("earned badges",error);return}
 if(!(badges||[]).length)return; // zero earned = no badge section at all
 const keys=[...new Set(badges.map(b=>b.badge_key))];
 const {data:defs}=await supabaseClient.from("badge_definitions").select("*").in("badge_key",keys);
 const dm=Object.fromEntries((defs||[]).map(d=>[d.badge_key,d]));
 const box=document.createElement("div");box.id="iv1326EarnedBadges";box.className="panel";box.style.marginTop="16px";
 box.innerHTML=`<h3>🏅 Earned Badges</h3><div class="card-grid">${badges.map(b=>{const d=dm[b.badge_key]||{};return `<div class="mini-card" style="padding:14px"><div style="font-size:24px">${E(d.icon||"🏅")}</div><strong>${E(d.name||b.badge_key)}</strong><div>${tier(b.tier)}</div><div class="muted">${E(d.description||"")}</div><div class="muted">Season ${E(b.season_number||"—")} · ${E(b.metric_value||0)} ${E(b.metric_label||"")}</div></div>`}).join("")}</div>`;
 host.appendChild(box);
}

/* After a test reset, re-anchor the restored schedule to the live Iceverse clock. */
async function reanchorAfterTestReset(){
 const {data,error}=await supabaseClient.rpc("admin_reanchor_live_schedule_after_test");
 if(error)throw error;
 if(typeof window.ivSyncInternalClock==="function")await window.ivSyncInternalClock();
 return data;
}
async function safeResetV1326(){
 if(!confirm("Reset the active Test Season back to its restore point?"))return;
 let loops=0;
 try{
   while(true){
     const {data,error}=await supabaseClient.rpc("admin_test_reset_batch",{p_game_limit:4});if(error)throw error;
     loops++;
     if(data?.complete)break;
     await new Promise(r=>setTimeout(r,60));
   }
   const fin=await supabaseClient.rpc("admin_test_reset_finish");if(fin.error)throw fin.error;
   const anchor=await reanchorAfterTestReset();
   alert(`Test Season reset complete.\nLive schedule restored to the current game clock.\nGames re-anchored: ${anchor?.games_shifted??anchor?.shifted??"—"}`);
   await window.showAdmin?.();
 }catch(e){console.error("V13.26 reset",e);alert("Test reset failed: "+(e?.message||e))}
}
window.iv1322SafeReset=safeResetV1326;
window.ivResetTestSeason=safeResetV1326;

function patch(){
 bindCreate();
 document.querySelectorAll("button").forEach(b=>{if(/reset test season/i.test(b.textContent||""))b.onclick=safeResetV1326});
}
const oldShow=window.showCreatePlayer;
if(typeof oldShow==="function")window.showCreatePlayer=function(){const r=oldShow.apply(this,arguments);setTimeout(bindCreate,0);return r};
const oldOpen=window.openPlayerProfile;
if(typeof oldOpen==="function")window.openPlayerProfile=async function(id){const r=await oldOpen.apply(this,arguments);await earnedBadges(id);return r};
const oldAdmin=window.showAdmin;
if(typeof oldAdmin==="function")window.showAdmin=async function(){const r=await oldAdmin.apply(this,arguments);setTimeout(patch,20);return r};
document.addEventListener("DOMContentLoaded",()=>setTimeout(patch,600));
console.log("🧊 Iceverse V13.26 loaded");
})();
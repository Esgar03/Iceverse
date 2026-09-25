/* ICEVERSE V13.24 — CREATION LOCK + PERFORMANCE BADGES */
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const draft={first:"",last:""};
const read=(id)=>String(document.getElementById(id)?.value??"").trim();

function snapshotNames(){
 const f=read("createFirstName"),l=read("createLastName");
 if(f)draft.first=f;
 if(l)draft.last=l;
 return {first:f||draft.first,last:l||draft.last};
}
document.addEventListener("input",e=>{
 if(e.target?.id==="createFirstName")draft.first=String(e.target.value||"").trim();
 if(e.target?.id==="createLastName")draft.last=String(e.target.value||"").trim();
},true);
document.addEventListener("change",e=>{
 if(e.target?.id==="createFirstName")draft.first=String(e.target.value||"").trim();
 if(e.target?.id==="createLastName")draft.last=String(e.target.value||"").trim();
},true);

async function iv1324CreatePlayer(){
 const user=window.currentUser;
 if(!user){alert("You must be logged in to create a player.");window.showLogin?.();return}
 const {first,last}=snapshotNames();
 const message=document.getElementById("createPlayerMessage");
 const fail=t=>{if(message){message.className="warning-message";message.textContent=t}else alert(t)};
 if(!first){fail("First name is blank.");document.getElementById("createFirstName")?.focus();return}
 if(!last){fail("Last name is blank.");document.getElementById("createLastName")?.focus();return}

 const build=window.creationBuild;
 if(!build){fail("Complete the player build first.");return}
 const handedness=read("createHandedness"),nationality=read("createNationality");
 const secondary=read("createSecondaryPosition")||null;
 if(!handedness){fail("Choose a handedness.");return}
 if(!nationality){fail("Choose a nationality.");return}
 if(build.position==="G"&&secondary){fail("Goalies cannot have a secondary position.");return}

 const overall=window.calculateOverall(build.attributes);
 const potential=window.calculatePotential(build,nationality,handedness);
 const playerData={
   first_name:first,last_name:last,age:18,nationality,
   primary_position:build.position,secondary_position:secondary,
   archetype:build.archetype,overall,potential,created_by:user.id,
   height_inches:build.height??build.height_inches,
   weight_lbs:build.weight??build.weight_lbs,handedness
 };
 try{
   if(message){message.className="success-message";message.textContent="Creating player…"}
   /* Keep the existing Icepoints purchase/refund transaction path. */
   const purchase=await supabaseClient.rpc("purchase_player_creation");
   if(purchase.error)throw purchase.error;

   const ins=await supabaseClient.from("players").insert(playerData).select().single();
   if(ins.error){await supabaseClient.rpc("refund_player_creation");throw ins.error}

   const attrs=await supabaseClient.from("player_attributes").insert({player_id:ins.data.id,...build.attributes});
   if(attrs.error){
     await supabaseClient.from("players").delete().eq("id",ins.data.id);
     await supabaseClient.rpc("refund_player_creation");
     throw new Error("Attributes failed to save: "+attrs.error.message);
   }
   draft.first="";draft.last="";
   if(message){message.className="success-message";message.textContent=`${first} ${last} created successfully.`}
   window.creationBuild=null;
   await window.openPlayerProfile?.(ins.data.id);
 }catch(e){
   console.error("V13.24 creation",e);
   fail("Player creation failed: "+(e?.message||e));
 }
}
window.createPlayer=iv1324CreatePlayer;
window.submitPlayerCreation=iv1324CreatePlayer;
window.handleCreatePlayer=iv1324CreatePlayer;
window.createNewPlayer=iv1324CreatePlayer;

/* Remove the inline legacy click route entirely and bind exactly one submit handler. */
function bindCreate(){
 const b=document.getElementById("finalCreatePlayerButton");if(!b||b.dataset.v1324Bound)return;
 b.dataset.v1324Bound="1";
 b.removeAttribute("onclick");
 b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();iv1324CreatePlayer()},true);
}
const oldShow=window.showCreatePlayer;
if(typeof oldShow==="function")window.showCreatePlayer=function(){const r=oldShow.apply(this,arguments);setTimeout(bindCreate,0);return r};
document.addEventListener("DOMContentLoaded",()=>setTimeout(bindCreate,500));

const tierLabel=t=>({bronze:"🥉 Bronze",silver:"🥈 Silver",gold:"🥇 Gold",platinum:"💎 Hall of Fame"}[t]||t);
async function iv1324Badges(playerId){
 const host=document.getElementById("playerProfile")||document.getElementById("playerProfileContent");if(!host)return;
 const [{data:badges,error},{data:defs}]=await Promise.all([
   supabaseClient.from("player_badges").select("*").eq("player_id",playerId).order("updated_at",{ascending:false}),
   supabaseClient.from("badge_definitions").select("*").order("display_order")
 ]);
 if(error){console.warn("badges",error);return}
 let box=document.getElementById("iv1324Badges");
 if(!box){box=document.createElement("div");box.id="iv1324Badges";box.className="panel";box.style.marginTop="16px";host.appendChild(box)}
 const owned=Object.fromEntries((badges||[]).map(x=>[x.badge_key,x]));
 box.innerHTML=`<h3>🏅 Performance Badges</h3><p class="muted">Badges are earned from regular-season performance and upgrade from Bronze → Silver → Gold → Hall of Fame.</p>
 <div class="card-grid">${(defs||[]).map(d=>{const b=owned[d.badge_key];return `<div class="mini-card" style="padding:14px"><div style="font-size:24px">${E(d.icon||"🏅")}</div><strong>${E(d.name)}</strong><div>${b?tierLabel(b.tier):"Not earned"}</div><div class="muted">${E(d.description||"")}</div>${b?`<div class="muted">Season ${E(b.season_number||"—")} · ${E(b.metric_value||0)} ${E(b.metric_label||"")}</div>`:""}</div>`}).join("")}</div>`;
}
const oldOpen=window.openPlayerProfile;
if(typeof oldOpen==="function")window.openPlayerProfile=async function(id){const r=await oldOpen.apply(this,arguments);await iv1324Badges(id);return r};
console.log("🏅 Iceverse V13.24 loaded");
})();
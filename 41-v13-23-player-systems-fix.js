/* ICEVERSE V13.23 — PLAYER SYSTEMS FIX
   Fixes the legacy player creator override, improves contract history display,
   and adds Injury History to player profiles.
*/
(() => {
"use strict";
const E=v=>typeof window.escapeHTML==="function"?window.escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const V=id=>(document.getElementById(id)?.value??"").toString().trim();
const msg=(text,ok=false)=>{
 const m=document.getElementById("createPlayerMessage");
 if(m){m.className=ok?"success-message":"warning-message";m.textContent=text}else alert(text);
};

/* ------------------------------------------------------------
   1. PLAYER CREATION
   The old V12.3 override was reading playerFirstName/playerLastName,
   while the actual current form uses createFirstName/createLastName.
   This becomes the one authoritative submit path.
------------------------------------------------------------- */
async function iv1323CreatePlayer(){
 if(!window.currentUser){alert("Please log in first.");window.showLogin?.();return}

 const first=V("createFirstName"), last=V("createLastName");
 if(!first){msg("Enter a first name.");document.getElementById("createFirstName")?.focus();return}
 if(!last){msg("Enter a last name.");document.getElementById("createLastName")?.focus();return}

 const build=window.creationBuild;
 if(!build || !build.position || !build.attributes){
   msg("Finish choosing the player's position and build before creating the player.");
   return;
 }

 const nationality=V("createNationality");
 const hand=V("createHandedness");
 const secondary=V("createSecondaryPosition")||null;
 if(!nationality){msg("Choose a nationality.");return}
 if(!hand){msg("Choose a handedness.");return}
 if(build.position==="G" && secondary){msg("Goalies cannot have a secondary position.");return}

 try{
   msg("Creating player…",true);
   const [{data:profile,error:pe},{count:owned,error:oe}]=await Promise.all([
     supabaseClient.from("profiles").select("player_slots").eq("id",currentUser.id).single(),
     supabaseClient.from("players").select("id",{count:"exact",head:true}).eq("created_by",currentUser.id).eq("is_retired",false)
   ]);
   if(pe||oe)throw pe||oe;
   if(Number(owned||0)>=Number(profile?.player_slots||0)){
     msg("All of your regular player slots are full. Unlock another slot in the Icepoints Shop.");
     return;
   }

   const overall=typeof window.calculateOverall==="function"
      ? window.calculateOverall(build.attributes) : 62;
   const potential=typeof window.calculatePotential==="function"
      ? window.calculatePotential(build,nationality,hand) : Math.max(70,Math.min(99,overall+12));

   const payload={
     created_by:currentUser.id,
     first_name:first,
     last_name:last,
     age:18,
     nationality,
     primary_position:build.position,
     secondary_position:secondary,
     archetype:build.archetype,
     personality:build.personality,
     overall,
     handedness:hand,
     potential,
     career_stage:"Prospect",
     confidence:50,
     fatigue:0,
     current_form:50,
     is_retired:false
   };
   if(build.height_inches!=null)payload.height_inches=build.height_inches;
   if(build.weight_lbs!=null)payload.weight_lbs=build.weight_lbs;

   const {data,error}=await supabaseClient.from("players").insert(payload).select().single();
   if(error)throw error;

   /* Attribute creation remains tied to the build chosen in the creator. */
   const attrs={player_id:data.id,...build.attributes};
   const ar=await supabaseClient.from("player_attributes").insert(attrs);
   if(ar.error){
     await supabaseClient.from("players").delete().eq("id",data.id);
     throw new Error("Player attributes could not be saved: "+ar.error.message);
   }

   msg(`${first} ${last} was created successfully.`,true);
   window.creationBuild=null;
   if(typeof window.openPlayerProfile==="function")await window.openPlayerProfile(data.id);
   else if(typeof window.showPlayersHub==="function")await window.showPlayersHub();
 }catch(e){
   console.error("V13.23 player creation",e);
   msg("Player creation failed: "+(e?.message||e));
 }
}
window.createPlayer=iv1323CreatePlayer;
window.submitPlayerCreation=iv1323CreatePlayer;
window.handleCreatePlayer=iv1323CreatePlayer;
window.createNewPlayer=iv1323CreatePlayer;

/* ------------------------------------------------------------
   2. CONTRACT + INJURY HISTORY PANEL
------------------------------------------------------------- */
async function safe(table,select="*",cb=q=>q){
 try{let q=supabaseClient.from(table).select(select);q=cb(q);const {data,error}=await q;if(error)throw error;return data||[]}
 catch(e){console.warn("V13.23 optional query",table,e.message);return []}
}
async function iv1323PlayerHistory(playerId){
 const host=document.getElementById("playerProfile")||document.getElementById("playerProfileContent");
 if(!host)return;

 const [contracts,history,injuries,teams]=await Promise.all([
   safe("player_contracts","*",q=>q.eq("player_id",playerId).order("created_at",{ascending:false})),
   safe("player_contract_history","*",q=>q.eq("player_id",playerId).order("recorded_at",{ascending:false})),
   safe("injuries","*",q=>q.eq("player_id",playerId)),
   safe("teams","id,city,name")
 ]);
 const tm=Object.fromEntries(teams.map(t=>[t.id,`${t.city||""} ${t.name||""}`.trim()]));
 const merged=[...contracts,...history].sort((a,b)=>new Date(b.created_at||b.recorded_at||0)-new Date(a.created_at||a.recorded_at||0));

 let box=document.getElementById("iv1323PlayerHistory");
 if(!box){box=document.createElement("div");box.id="iv1323PlayerHistory";box.className="panel";box.style.marginTop="16px";host.appendChild(box)}
 box.innerHTML=`<div class="iv-tabs" style="margin-top:0">
   <button class="iv-tab active" data-v1323="contracts">Contract History</button>
   <button class="iv-tab" data-v1323="injuries">Injury History</button>
 </div><div id="iv1323HistoryPane"></div>`;

 const pane=document.getElementById("iv1323HistoryPane");
 const render=tab=>{
   box.querySelectorAll("[data-v1323]").forEach(b=>b.classList.toggle("active",b.dataset.v1323===tab));
   if(tab==="contracts"){
     pane.innerHTML=merged.length?`<div class="data-list">${merged.map(x=>`<div class="data-row">
       <span><strong>${E(tm[x.team_id]||"Team")}</strong><br><span class="muted">${E(x.status||x.action||"Contract")} · ${E(x.projected_role||"Role not listed")}</span></span>
       <span style="text-align:right"><strong>${typeof window.fmtMoney==="function"?window.fmtMoney(x.salary||0):"$"+Number(x.salary||0).toLocaleString()}</strong><br><span class="muted">${E(x.seasons_remaining??x.seasons??"—")} season(s) · ${x.no_trade_clause?"NTC":"No NTC"}</span></span>
     </div>`).join("")}</div>`:'<div class="empty-state">No contract history recorded.</div>';
   }else{
     const rows=[...injuries].sort((a,b)=>new Date(b.injured_at||b.created_at||b.start_date||0)-new Date(a.injured_at||a.created_at||a.start_date||0));
     pane.innerHTML=rows.length?`<div class="data-list">${rows.map(x=>{
       const start=x.injured_at||x.created_at||x.start_date;
       const end=x.recovered_at||x.returned_at||x.end_date;
       const games=x.games_missed??x.games_out??null;
       return `<div class="data-row"><span><strong>${E(x.injury_type||x.name||"Injury")}</strong><br><span class="muted">${E(x.severity||"")} ${x.body_part?"· "+E(x.body_part):""}</span></span><span style="text-align:right"><strong>${E(x.status||"recorded")}</strong><br><span class="muted">${start?new Date(start).toLocaleDateString():"—"}${end?" → "+new Date(end).toLocaleDateString():""}${games!=null?" · "+games+" GP missed":""}</span></span></div>`;
     }).join("")}</div>`:'<div class="empty-state">No injuries in this player’s career.</div>';
   }
 };
 render("contracts");
 box.querySelectorAll("[data-v1323]").forEach(b=>b.onclick=()=>render(b.dataset.v1323));
}

const oldOpen=window.openPlayerProfile;
if(typeof oldOpen==="function"){
 window.openPlayerProfile=async function(id){const r=await oldOpen.apply(this,arguments);await iv1323PlayerHistory(id);return r}
}
console.log("🩹 Iceverse V13.23 Player Systems Fix loaded.");
})();
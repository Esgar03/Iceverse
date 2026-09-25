/* ICEVERSE V13.25 — COACHING CENTER + UNIQUE BUILDS + LEADERSHIP */
(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---------- unique archetype shells ---------- */
function iv1325Hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function iv1325Rand(seed){let x=Math.sin(seed)*10000;return x-Math.floor(x)}
const oldBase=window.getBaseAttribute;
if(typeof oldBase==="function"){
 window.getBaseAttribute=function(attribute,archetype,height,weight,position){
   const base=oldBase(attribute,archetype,height,weight,position);
   const f=String($("#createFirstName")?.value||"").trim();
   const l=String($("#createLastName")?.value||"").trim();
   const salt=iv1325Hash(`${f}|${l}|${archetype}|${position}|${height}|${weight}|${attribute}`);
   const roll=iv1325Rand(salt);
   /* -3..+3, centered; archetype remains the dominant template. */
   const variance=Math.max(-3,Math.min(3,Math.round((roll-.5)*6)));
   return Math.max(position==="G"?54:52,Math.min(73,base+variance));
 };
}

/* ---------- coaching center visual cleanup ---------- */
function iv1325Styles(){
 if($("#iv1325Styles"))return;
 const s=document.createElement("style");s.id="iv1325Styles";s.textContent=`
 #teamManagementContent .iv-mgmt-page{padding:18px!important}
 #teamManagementContent .line-card,#teamManagementContent [class*="line-card"]{background:#081a29!important;border:1px solid #21435d!important;border-radius:14px!important;padding:14px!important;box-shadow:none!important}
 #teamManagementContent .line-player-select,#teamManagementContent select,#teamManagementContent input{background:#06131f!important;color:#eef7ff!important;border:1px solid #31526a!important;border-radius:9px!important;min-height:42px!important}
 #teamManagementContent option{background:#071722!important;color:#eef7ff!important}
 #teamManagementContent .line-player-select{font-weight:700!important}
 #teamManagementContent .iv-line-grid-clean{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
 #teamManagementContent .iv-usage-clean{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))!important;gap:12px!important}
 #teamManagementContent .iv-usage-clean label{background:#081a29!important;border:1px solid #21435d!important;border-radius:12px!important;padding:12px!important}
 #teamManagementContent .iv-usage-total{padding:9px 12px;border-radius:9px;background:#0b2234;margin-top:10px;display:inline-block}
 #teamManagementContent .iv-leader-count{margin:10px 0;padding:10px 12px;background:#0b2234;border-radius:10px}
 @media(max-width:850px){#teamManagementContent .iv-line-grid-clean{grid-template-columns:1fr!important}}
 `;document.head.appendChild(s);
}
function iv1325NormalizeGroup(changed){
 const group=changed.dataset.usageGroup;if(!group)return;
 const inputs=$$(`[data-usage-group="${group}"]`);
 let value=Math.max(0,Math.min(100,Number(changed.value)||0));changed.value=value;
 const others=inputs.filter(x=>x!==changed);
 const remaining=100-value;
 const old=others.reduce((a,x)=>a+(Number(x.value)||0),0);
 if(!others.length)return;
 let used=0;
 others.forEach((x,i)=>{
   let n=i===others.length-1?remaining-used:
     (old>0?Math.round(remaining*(Number(x.value)||0)/old):Math.floor(remaining/others.length));
   n=Math.max(0,n);x.value=n;used+=n;
 });
 iv1325UsageTotals();
}
function iv1325UsageTotals(){
 ["F","D"].forEach(g=>{
   const xs=$$(`[data-usage-group="${g}"]`);
   const total=xs.reduce((a,x)=>a+(Number(x.value)||0),0);
   const el=$(`#iv1325Total${g}`);if(el)el.textContent=`${g==="F"?"Offensive lines":"Defensive pairs"}: ${total}%`;
 });
}
function iv1325Leadership(){
 const sels=$$('[data-role="captain"]');
 if(!sels.length)return;
 sels.forEach(sel=>{
   const blank=sel.querySelector('option[value=""]');if(blank)blank.textContent="No leadership role";
   const c=sel.querySelector('option[value="captain"]');if(c)c.textContent="Captain (C)";
   const a=sel.querySelector('option[value="alternate"]');if(a)a.textContent="Alternate (A)";
 });
 const counts=()=>({
   c:sels.filter(x=>x.value==="captain").length,
   a:sels.filter(x=>x.value==="alternate").length
 });
 let badge=$("#iv1325LeaderCount");
 if(!badge){
   badge=document.createElement("div");badge.id="iv1325LeaderCount";badge.className="iv-leader-count muted";
   sels[0].closest(".iv-mgmt-page,section,div")?.prepend(badge);
 }
 const paint=()=>{const n=counts();badge.innerHTML=`Leadership: <strong>${n.c}/1 Captain</strong> · <strong>${n.a}/3 Alternates</strong>`};
 sels.forEach(sel=>{
   if(sel.dataset.iv1325Bound)return;sel.dataset.iv1325Bound="1";let previous=sel.value;
   sel.addEventListener("focus",()=>previous=sel.value);
   sel.addEventListener("change",()=>{
     const n=counts();
     if(n.c>1){alert("A team can only have 1 captain.");sel.value=previous}
     else if(n.a>3){alert("A team can only have 3 alternate captains.");sel.value=previous}
     previous=sel.value;paint();
   });
 });paint();
}
function iv1325Management(){
 iv1325Styles();
 const root=$("#teamManagementContent")||$("#teamManagementSection")||document;
 /* Cards/line containers */
 const lineSelects=$$(".line-player-select",root);
 const parents=[...new Set(lineSelects.map(x=>x.closest(".line-card")||x.parentElement?.parentElement).filter(Boolean))];
 const common=parents[0]?.parentElement;if(common&&parents.length>=4)common.classList.add("iv-line-grid-clean");

 /* classify legacy usage inputs */
 $$("[data-usage]",root).forEach(inp=>{
   const key=String(inp.dataset.usage||"").toUpperCase();
   if(/^F[1-4]$/.test(key))inp.dataset.usageGroup="F";
   if(/^D[1-3]$/.test(key))inp.dataset.usageGroup="D";
 });
 $$(".usage-input",root).forEach(inp=>{
   if(inp.dataset.group==="F"||inp.dataset.group==="D")inp.dataset.usageGroup=inp.dataset.group;
 });
 const usages=$$("[data-usage-group]",root);
 if(usages.length){
   const holder=usages[0].closest(".iv-mgmt-page,section,div");
   holder?.classList.add("iv-usage-clean");
   usages.forEach(inp=>{
     if(inp.dataset.iv1325Usage)return;inp.dataset.iv1325Usage="1";
     inp.addEventListener("change",()=>iv1325NormalizeGroup(inp));
   });
   const parent=holder?.parentElement||root;
   if(!$("#iv1325UsageTotals",root)){
     const totals=document.createElement("div");totals.id="iv1325UsageTotals";
     totals.innerHTML='<span id="iv1325TotalF" class="iv-usage-total"></span> <span id="iv1325TotalD" class="iv-usage-total"></span>';
     parent.appendChild(totals);
   }
   /* normalize existing invalid values immediately */
   ["F","D"].forEach(g=>{
     const xs=$$(`[data-usage-group="${g}"]`,root);if(!xs.length)return;
     const sum=xs.reduce((a,x)=>a+(Number(x.value)||0),0);
     if(sum!==100){const vals=g==="F"?[30,27,23,20]:[40,34,26];xs.forEach((x,i)=>x.value=vals[i]??0)}
   });iv1325UsageTotals();
 }
 iv1325Leadership();
}
const oldMgmt=window.openTeamManagement;
if(typeof oldMgmt==="function")window.openTeamManagement=async function(){const r=await oldMgmt.apply(this,arguments);setTimeout(iv1325Management,40);return r};
document.addEventListener("DOMContentLoaded",()=>setTimeout(iv1325Management,700));
console.log("🏒 Iceverse V13.25 loaded");
})();
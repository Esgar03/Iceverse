/* ICEVERSE V12.19 — HARD UI FIXES
   - Authoritative Iceverse clock countdowns
   - Reliable admin season reset control
   - Completed box-score Close always returns to Schedule
*/
(() => {
  'use strict';

  let ivServerBaseMs = null;
  let ivPerfBaseMs = null;
  let ivClockTimer = null;
  let ivSyncTimer = null;

  async function ivSyncServerClock(){
    try{
      const before = performance.now();
      const {data,error} = await supabaseClient.rpc('iceverse_now');
      const after = performance.now();
      if(error) throw error;
      const parsed = new Date(data).getTime();
      if(!Number.isFinite(parsed)) throw new Error('Invalid Iceverse clock value');
      ivServerBaseMs = parsed + Math.max(0,(after-before)/2);
      ivPerfBaseMs = after;
      ivUpdateCountdowns();
    }catch(err){
      console.warn('Iceverse clock sync failed:',err);
    }
  }

  function ivNowMs(){
    if(ivServerBaseMs == null || ivPerfBaseMs == null) return Date.now();
    return ivServerBaseMs + (performance.now()-ivPerfBaseMs);
  }

  function ivCountdownText(targetMs){
    let seconds = Math.max(0,Math.ceil((targetMs-ivNowMs())/1000));
    const days=Math.floor(seconds/86400); seconds%=86400;
    const hours=Math.floor(seconds/3600); seconds%=3600;
    const mins=Math.floor(seconds/60); const secs=seconds%60;
    if(days>0) return `${days}d ${hours}h ${mins}m`;
    if(hours>0) return `${hours}h ${mins}m ${secs}s`;
    if(mins>0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function ivUpdateCountdowns(){
    document.querySelectorAll('[data-iv-puckdrop]').forEach(el=>{
      const target=Date.parse(el.dataset.ivPuckdrop||'');
      if(!Number.isFinite(target)) return;
      if(target<=ivNowMs()){
        el.innerHTML='<strong>Game due</strong><br><span class="muted">waiting for world tick</span>';
      }else{
        el.innerHTML=`<strong>${ivCountdownText(target)}</strong><br><span class="muted">until game time</span>`;
      }
    });
  }

  function ivStartClock(){
    if(!ivClockTimer) ivClockTimer=setInterval(ivUpdateCountdowns,1000);
    if(!ivSyncTimer) ivSyncTimer=setInterval(ivSyncServerClock,30000);
    ivSyncServerClock();
  }

  // Definitive schedule renderer: future games use countdowns, not local date/time labels.
  if(typeof window.showSchedule === 'function'){
    window.showSchedule = async function(){
      showSection('scheduleSection');
      const c=document.getElementById('scheduleContent');
      if(!c) return;
      c.innerHTML='<div class="loading">Loading official Iceverse schedule...</div>';
      await ivSyncServerClock();
      const {data:games,error}=await supabaseClient.from('games')
        .select('id,season_id,competition,home_team_id,away_team_id,scheduled_at,status,home_score,away_score,winner_team_id')
        .order('scheduled_at',{ascending:true}).limit(1200);
      if(error){c.innerHTML=`<div class="error">Schedule error: ${escapeHTML(error.message)}</div>`;return;}
      const teamIds=[...new Set((games||[]).flatMap(g=>[g.home_team_id,g.away_team_id]).filter(Boolean))];
      const teams={};
      if(teamIds.length){
        const {data:td}=await supabaseClient.from('teams').select('id,city,name,abbreviation').in('id',teamIds);
        (td||[]).forEach(t=>teams[t.id]=t);
      }
      if(!(games||[]).length){
        c.innerHTML='<div class="empty-state"><h3>No games are scheduled yet.</h3></div>';
        return;
      }
      const groups={};
      for(const g of games){
        const d=new Date(g.scheduled_at);
        const key=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
        (groups[key]??=[]).push(g);
      }
      c.innerHTML=`<div class="section-toolbar"><div><h2>Official Schedule</h2><div class="muted">${games.length} games loaded from the active Iceverse calendar.</div></div><button class="secondary-button" onclick="showSchedule()">Refresh</button></div>`+
        Object.entries(groups).map(([day,list])=>`<div class="iv-schedule-day">${escapeHTML(day)}</div>${list.map(g=>{
          const h=teams[g.home_team_id]||{},a=teams[g.away_team_id]||{};
          const done=['completed','final'].includes(String(g.status||'').toLowerCase());
          const center=done
            ? `${g.away_score} – ${g.home_score}<br><span class="muted">FINAL</span>`
            : `<span data-iv-puckdrop="${escapeHTML(g.scheduled_at||'')}"></span>`;
          return `<div class="iv-game-card profile-link ${done?'iv-completed-game':''}" data-game-id="${g.id}" onclick="${done?`ivOpenCompletedGame('${g.id}')`:`openGameDetail('${g.id}')`}"><div class="iv-game-team"><strong>${escapeHTML(a.city||'')} ${escapeHTML(a.name||'Away')}</strong><div class="muted">${escapeHTML(a.abbreviation||'')}</div></div><div class="iv-game-time">${center}</div><div class="iv-game-team"><strong>${escapeHTML(h.city||'')} ${escapeHTML(h.name||'Home')}</strong><div class="muted">${escapeHTML(h.abbreviation||'')}</div></div></div>`;
        }).join('')}`).join('');
      ivUpdateCountdowns();
    };
  }

  async function ivReturnToSchedule(){
    document.getElementById('ivGameBoxModal')?.remove();
    if(typeof window.showSchedule==='function') await window.showSchedule();
  }
  window.ivReturnToLeagueSchedule=ivReturnToSchedule;

  // Capture before the older document-level [data-game-id] click handler can reopen the modal.
  document.addEventListener('click',e=>{
    const close=e.target.closest('#ivCloseGameBox,[data-iv-close-game-box]');
    if(!close) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    ivReturnToSchedule();
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && document.getElementById('ivGameBoxModal')){
      e.preventDefault();
      ivReturnToSchedule();
    }
  },true);

  async function ivRunSeasonReset(){
    const ok=await (typeof ivIsAdmin==='function'?ivIsAdmin():Promise.resolve(false));
    if(!ok) return alert('Admin access required.');
    if(!confirm('RESET THE ACTIVE SEASON? This permanently clears/rebuilds the current season.')) return;
    const typed=prompt('Type RESET SEASON to confirm:');
    if(typed!=='RESET SEASON') return alert('Reset cancelled.');
    const btn=document.getElementById('ivHardSeasonReset');
    if(btn){btn.disabled=true;btn.textContent='Resetting…';}
    const {data,error}=await supabaseClient.rpc('admin_reset_iceverse_season_v2');
    if(error){if(btn){btn.disabled=false;btn.textContent='Reset Season';}return alert('Season reset failed: '+error.message);}
    alert(`Season reset complete. Days 1–3 are offseason/signing days. Games begin on Day 4.`);
    if(typeof window.showAdmin==='function') await window.showAdmin();
  }
  window.ivRunSeasonReset=ivRunSeasonReset;

  function ivInjectReset(){
    const c=document.getElementById('adminContent');
    if(!c || document.getElementById('ivHardSeasonResetPanel')) return;
    const panel=document.createElement('div');
    panel.className='panel'; panel.id='ivHardSeasonResetPanel'; panel.style.marginTop='18px';
    panel.innerHTML=`<h3>Season Reset</h3><p class="muted">Restart the active season. Days 1–3 are reserved for offseason signings; games begin on Day 4.</p><button type="button" class="secondary-button" id="ivHardSeasonReset">Reset Season</button>`;
    c.appendChild(panel);
    document.getElementById('ivHardSeasonReset').addEventListener('click',ivRunSeasonReset);
  }

  if(typeof window.showAdmin==='function'){
    const previous=window.showAdmin;
    window.showAdmin=async function(...args){
      const result=await previous.apply(this,args);
      ivInjectReset();
      return result;
    };
  }

  const observer=new MutationObserver(()=>{
    const admin=document.getElementById('adminContent');
    if(admin && admin.offsetParent!==null) ivInjectReset();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  ivStartClock();
})();

/* Iceverse V13.07 — Test Season Lab + persistent Home navigation */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installHomeButton(){
    const nav=document.querySelector('header nav');
    if(!nav || document.getElementById('ivHomeNavButton')) return;
    const b=document.createElement('button');
    b.id='ivHomeNavButton'; b.textContent='Home';
    b.onclick=()=>{ if(typeof window.showHome==='function') window.showHome(); };
    nav.insertBefore(b,nav.firstChild);
  }

  async function rpc(name,args={}){
    const {data,error}=await supabaseClient.rpc(name,args);
    if(error) throw error;
    return data;
  }

  async function testStatus(){
    try{return await rpc('admin_test_season_status');}
    catch(e){return {active:false,error:e.message};}
  }

  async function beginTestSeason(){
    if(!confirm('Create a restore point and enter TEST SEASON mode? Live league data will be restorable afterward.')) return;
    try{
      const out=await rpc('admin_begin_test_season');
      alert(`Test Season restore point created.\nSeason: ${out?.season_label||'Active season'}\nGames available: ${out?.games||0}`);
      if(typeof showAdmin==='function') await showAdmin();
    }catch(e){alert('Could not start Test Season: '+e.message);}
  }

  async function simTestDay(){
    try{
      const out=await rpc('admin_test_sim_next_day');
      alert(`Test day simulated.\nGames: ${out?.games_simulated||0}\nDay: ${out?.day||'—'}`);
      if(typeof showAdmin==='function') await showAdmin();
    }catch(e){alert('Test simulation failed: '+e.message);}
  }

  async function simTestWeek(){
    try{
      const out=await rpc('admin_test_sim_days',{p_days:7});
      alert(`Test block complete.\nGames simulated: ${out?.games_simulated||0}`);
      if(typeof showAdmin==='function') await showAdmin();
    }catch(e){alert('Test simulation failed: '+e.message);}
  }

  async function simTestSeason(){
    if(!confirm('Fast-sim every remaining scheduled game in this test season?')) return;
    try{
      const out=await rpc('admin_test_sim_full_season');
      alert(`Full Test Season complete.\nGames simulated: ${out?.games_simulated||0}\nYou can inspect standings, player profiles and box scores now.`);
      if(typeof showAdmin==='function') await showAdmin();
    }catch(e){alert('Full-season test failed: '+e.message);}
  }

  async function resetTestSeason(){
    if(!confirm('RESET TEST SEASON?\n\nThis restores the league to the restore point made when Test Season began and removes the test results.')) return;
    try{
      const out=await rpc('admin_reset_test_season');
      alert(`Test Season reset complete.\nRestored ${out?.games_restored||0} games.\nThe live league is back to its pre-test state.`);
      if(typeof showAdmin==='function') await showAdmin();
    }catch(e){alert('Test reset failed: '+e.message);}
  }

  async function injectAdminLab(){
    const ok = typeof window.ivIsAdmin==='function' ? await window.ivIsAdmin() : false;
    if(!ok) return;
    const host=document.getElementById('adminContent');
    if(!host || document.getElementById('ivTestSeasonLab')) return;
    const s=await testStatus();
    const card=document.createElement('div');
    card.id='ivTestSeasonLab'; card.className='panel'; card.style.marginTop='18px';
    card.innerHTML=`<div class="section-toolbar"><div><h3>🧪 Test Season Lab</h3><div class="muted">Fast-sim the real season engine, inspect the results, then restore the league to the exact pre-test checkpoint.</div></div>${s.active?'<span class="pill">TEST MODE ACTIVE</span>':'<span class="pill">SAFE</span>'}</div>
      ${s.error?`<div class="error">Install the Test Season SQL first: ${esc(s.error)}</div>`:''}
      <div class="app-grid" style="margin-top:14px">
        <div class="metric-card"><div class="muted">Status</div><div class="metric-value" style="font-size:20px">${s.active?'Testing':'Inactive'}</div></div>
        <div class="metric-card"><div class="muted">Test Games Completed</div><div class="metric-value">${s.completed_games??0}</div></div>
        <div class="metric-card"><div class="muted">Remaining</div><div class="metric-value">${s.remaining_games??0}</div></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">
        ${!s.active?'<button class="primary-button" onclick="ivBeginTestSeason()">Create Restore Point</button>':''}
        ${s.active?'<button class="secondary-button" onclick="ivTestSimDay()">Sim Next Day</button><button class="secondary-button" onclick="ivTestSimWeek()">Sim 7 Days</button><button class="primary-button" onclick="ivTestSimSeason()">Sim Full Season</button><button class="secondary-button" onclick="showStandings()">Inspect Standings</button><button class="secondary-button" onclick="showPlayersHub()">Inspect Players</button><button class="danger-button" onclick="ivResetTestSeason()">Reset Test Season</button>':''}
      </div>`;
    host.appendChild(card);
  }

  window.ivBeginTestSeason=beginTestSeason;
  window.ivTestSimDay=simTestDay;
  window.ivTestSimWeek=simTestWeek;
  window.ivTestSimSeason=simTestSeason;
  window.ivResetTestSeason=resetTestSeason;

  installHomeButton();
  const prior=window.showAdmin;
  if(typeof prior==='function'){
    window.showAdmin=async function(...args){const r=await prior.apply(this,args); await injectAdminLab(); return r;};
  }
  document.addEventListener('DOMContentLoaded',installHomeButton);
  console.log('Iceverse V13.07 Test Season + Home loaded.');
})();

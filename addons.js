/* addons.js — Toggleable add-ons for Study To-Do & Timer
   Create file: addons.js and include it after your main script tag.
*/
(() => {
  const LS_ADDONS = 'study_addons_v1';
  const defaultSettings = { animatedProgress: true, subjectColors: true, pomodoro: false, streaks: true, confetti: true, quickPlus: true, lightTheme: false };

  function loadSettings(){ try{ const r= localStorage.getItem(LS_ADDONS); return r ? JSON.parse(r) : {...defaultSettings}; } catch(e){ return {...defaultSettings}; } }
  function saveSettings(s){ localStorage.setItem(LS_ADDONS, JSON.stringify(s)); }

  let settings = loadSettings();

  // inject helper CSS
  const style = document.createElement('style');
  style.textContent = `
/* small addon styles */
.addon-panel{margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);display:inline-block}
.addon-panel label{display:flex;align-items:center;gap:8px;cursor:pointer}
.light-theme{ --bg:#f8fafc; --card:#ffffff; --muted:#475569; color:#04263b; background:linear-gradient(180deg,#f8fafc,#e6eef8)}
.confetti-piece{position:fixed;left:50%;top:10%;font-size:20px;pointer-events:none;animation:fall 1200ms linear forwards;transform:translateX(-50%);}
@keyframes fall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(800px) rotate(480deg)}}
.pomodoro-controls{display:flex;gap:8px;align-items:center;margin-top:8px}
.quick-plus{margin-left:8px;padding:4px 8px;border-radius:6px;border:0;background:rgba(255,255,255,0.04);cursor:pointer}
`;
  document.head.appendChild(style);

  // create UI
  function createAddonsUI(){
    if(document.getElementById('addonsPanel')) return;
    const tabs = document.querySelector('.tabs');
    if(!tabs) return;
    const panel = document.createElement('div'); panel.id='addonsPanel'; panel.className='addon-panel card';
    panel.innerHTML = `
      <details id="addonDetails"><summary style="cursor:pointer">⚙️ Add-ons</summary>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
          <label><input type="checkbox" data-key="animatedProgress"> Animated progress bars</label>
          <label><input type="checkbox" data-key="subjectColors"> Unique subject colors</label>
          <label><input type="checkbox" data-key="pomodoro"> Pomodoro mode (adds Pomodoro controls)</label>
          <label><input type="checkbox" data-key="streaks"> Streak tracker (shows consecutive study days)</label>
          <label><input type="checkbox" data-key="confetti"> Confetti on Save</label>
          <label><input type="checkbox" data-key="quickPlus"> Quick +1 completed button</label>
          <label><input type="checkbox" data-key="lightTheme"> Light theme (toggle)</label>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button id="saveAddons">Save</button><button id="resetAddons">Reset add-ons</button>
          </div>
        </div>
      </details>`;
    tabs.parentNode.insertBefore(panel, tabs.nextSibling);

    // set checkbox states
    Object.keys(settings).forEach(k=>{
      const cb = panel.querySelector(`input[data-key="${k}"]`);
      if(cb) cb.checked = !!settings[k];
    });

    panel.addEventListener('change', e=>{
      if(e.target && e.target.matches('input[data-key]')){
        const key = e.target.dataset.key; settings[key] = e.target.checked;
      }
    });

    panel.querySelector('#saveAddons').addEventListener('click', ()=>{
      saveSettings(settings); applyAddons();
      document.getElementById('addonDetails').removeAttribute('open');
    });
    panel.querySelector('#resetAddons').addEventListener('click', ()=>{
      if(!confirm('Reset add-ons to defaults?')) return;
      settings = {...defaultSettings}; saveSettings(settings);
      Object.keys(settings).forEach(k=>{
        const cb = panel.querySelector(`input[data-key="${k}"]`); if(cb) cb.checked = settings[k];
      });
      applyAddons();
    });
  }

  // small color palette
  const palette = ['#60a5fa','#7dd3fc','#7c3aed','#f97316','#f472b6','#34d399','#f59e0b','#ef4444'];

  function applyColors(){
    if(!Array.isArray(subjects)) return;
    let changed=false;
    subjects.forEach((s,idx)=>{
      if(!s.color){
        s.color = palette[idx % palette.length];
        changed = true;
      }
      const pb = document.getElementById('pb'+idx);
      const subDiv = document.querySelectorAll('.subject')[idx];
      if(pb) pb.style.background = `linear-gradient(90deg, ${s.color}, ${s.color}33)`;
      if(subDiv) subDiv.firstElementChild.style.background = s.color;
    });
    if(changed && typeof saveSubjects === 'function') saveSubjects(subjects);
  }
  function removeColors(){
    document.querySelectorAll('.subject').forEach((el,idx)=>{
      if(el) el.firstElementChild.style.background='rgba(255,255,255,0.03)';
      const pb = document.getElementById('pb'+idx); if(pb) pb.style.background='';
    });
  }

  function animateProgress(){
    if(typeof computePercent !== 'function') return;
    subjects.forEach((s,idx)=>{
      const pb = document.getElementById('pb'+idx);
      if(!pb) return;
      pb.style.transition = 'width 700ms cubic-bezier(.2,.9,.2,1)';
      pb.style.width = '0%';
      const p = computePercent(s);
      setTimeout(()=> pb.style.width = p + '%', 40 + idx*40);
    });
  }
  function removeAnimation(){
    document.querySelectorAll('.progress-bar').forEach(pb=> pb.style.transition='' );
  }

  function addQuickPlusButtons(){
    document.querySelectorAll('.subject').forEach((el,idx)=>{
      if(el.querySelector('.quick-plus')) return;
      const compInput = el.querySelector('.comp-input');
      const saveBtn = el.querySelector('.saveSubject');
      const btn = document.createElement('button'); btn.className='quick-plus'; btn.textContent='+1';
      btn.title = 'Add +1 completed (and save)';
      btn.onclick = ()=>{
        const max = parseInt(el.querySelector('.chap-input').value) || 0;
        let val = parseInt(compInput.value)||0; val = Math.min(max, val+1);
        compInput.value = val; if(saveBtn) saveBtn.click(); else { subjects[idx].completed = val; saveSubjects(subjects); renderSubjects(); updateStatsAndChart(); }
      };
      el.querySelector('.small').appendChild(btn);
    });
  }
  function removeQuickPlusButtons(){ document.querySelectorAll('.subject .quick-plus').forEach(b=>b.remove()); }

  // simple confetti
  function showConfetti(){
    const count = 20;
    for(let i=0;i<count;i++){
      const span = document.createElement('div'); span.className='confetti-piece'; span.textContent = ['🎉','🍪','✨','👏'][i%4];
      span.style.left = (20 + Math.random()*60)+'%';
      span.style.top = (10 + Math.random()*10)+'%';
      span.style.fontSize = (14 + Math.random()*20)+'px';
      document.body.appendChild(span);
      setTimeout(()=> span.remove(), 1500 + Math.random()*700);
    }
  }
  function hookSaveConfetti(){
    const saveBtnMain = document.getElementById('saveBtn');
    if(!saveBtnMain) return;
    if(saveBtnMain._addonsConfettiAttached) return;
    saveBtnMain.addEventListener('click', ()=>{ setTimeout(()=>{ if(settings.confetti) showConfetti(); }, 250); });
    saveBtnMain._addonsConfettiAttached = true;
  }

  // streak
  function computeStreak(){
    if(!Array.isArray(sessions) || sessions.length===0) return 0;
    const days = new Set(sessions.map(s=> new Date(s.ts).toISOString().slice(0,10)));
    let streak=0; const d=new Date(); d.setHours(0,0,0,0);
    while(days.has(d.toISOString().slice(0,10))){ streak++; d.setDate(d.getDate()-1); }
    return streak;
  }
  function showStreakStat(){
    const stats = document.querySelector('.stats');
    if(!stats) return;
    if(stats.querySelector('.streak-stat')){ stats.querySelector('.streak-stat .value').textContent = computeStreak() + 'd'; return; }
    const div = document.createElement('div'); div.className='stat streak-stat';
    div.innerHTML = `<div class="small">Streak</div><div class="value">${computeStreak()}d</div>`;
    stats.appendChild(div);
  }
  function removeStreakStat(){ const el = document.querySelector('.streak-stat'); if(el) el.remove(); }

  // pomodoro (minimal)
  let pomodoroState = null; let pomodoroIntervalId = null; let pomodoroRemaining = 0;
  function addPomodoroUI(){
    const timerPane = document.getElementById('timerPane');
    if(!timerPane) return;
    if(timerPane.querySelector('.pomodoro-controls')) return;
    const container = document.createElement('div'); container.className='pomodoro-controls';
    container.innerHTML = `
      <select id="pomodoroPreset"><option value="25:5">25 / 5</option><option value="50:10">50 / 10</option><option value="15:3">15 / 3</option></select>
      <button id="startPom">Start Pomodoro</button>
      <button id="stopPom" disabled>Stop Pomodoro</button>
    `;
    timerPane.querySelector('.controls').after(container);
    const startBtnPom = container.querySelector('#startPom');
    const stopBtnPom = container.querySelector('#stopPom');
    startBtnPom.addEventListener('click', ()=>{
      const v = container.querySelector('#pomodoroPreset').value.split(':');
      startPomodoro(parseInt(v[0])*60, parseInt(v[1])*60);
      startBtnPom.disabled = true; stopBtnPom.disabled = false;
    });
    stopBtnPom.addEventListener('click', ()=>{ stopPomodoro(); startBtnPom.disabled=false; stopBtnPom.disabled=true; });
  }
  function removePomodoroUI(){ const el = document.querySelector('.pomodoro-controls'); if(el) el.remove(); stopPomodoro(); }
  function startPomodoro(workSec, breakSec){
    if(pomodoroIntervalId) clearInterval(pomodoroIntervalId);
    pomodoroState = 'work'; pomodoroRemaining = workSec;
    startBtn.disabled = true; pauseBtn.disabled = true; saveBtn.disabled = true;
    updatePomodoroDisplay();
    pomodoroIntervalId = setInterval(()=>{
      pomodoroRemaining--;
      if(pomodoroRemaining<=0){
        if(pomodoroState==='work'){
          if(settings.confetti) showConfetti();
          alert('Work session complete — time for a break!');
          pomodoroState='break'; pomodoroRemaining = breakSec;
        } else {
          alert('Break over — back to work!');
          stopPomodoro();
        }
      }
      updatePomodoroDisplay();
    },1000);
  }
  function updatePomodoroDisplay(){
    const sec = pomodoroRemaining || 0;
    const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    timeDisplay.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function stopPomodoro(){ if(pomodoroIntervalId) clearInterval(pomodoroIntervalId); pomodoroIntervalId=null; pomodoroState=null; pomodoroRemaining=0; startBtn.disabled=false; pauseBtn.disabled=true; saveBtn.disabled=true; timeDisplay.textContent='00:00:00'; }

  // observe subjectList to reapply addons after render
  function observeSubjects(){
    const target = document.getElementById('subjectList');
    if(!target) return;
    const mo = new MutationObserver(()=> applyAddons());
    mo.observe(target,{childList:true, subtree:true});
  }

  function applyAddons(){
    if(settings.lightTheme) document.body.classList.add('light-theme'); else document.body.classList.remove('light-theme');
    if(settings.subjectColors) applyColors(); else removeColors();
    if(settings.animatedProgress) animateProgress(); else removeAnimation();
    if(settings.quickPlus) addQuickPlusButtons(); else removeQuickPlusButtons();
    hookSaveConfetti();
    if(settings.streaks) showStreakStat(); else removeStreakStat();
    if(settings.pomodoro) addPomodoroUI(); else removePomodoroUI();
    if(typeof updateStatsAndChart === 'function') updateStatsAndChart();
  }

  // init when DOM ready (or shortly after if already loaded)
  function init(){
    createAddonsUI(); observeSubjects(); applyAddons();
    // wrap saveSessions so UI updates after sessions change
    const oldSaveSessions = window.saveSessions;
    if(typeof oldSaveSessions === 'function' && !oldSaveSessions._wrappedByAddons){
      window.saveSessions = function(arr){
        oldSaveSessions(arr);
        applyAddons();
      };
      window.saveSessions._wrappedByAddons = true;
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 200);

})();

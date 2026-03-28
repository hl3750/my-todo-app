'use strict';

/* ═══════════════════════════════════════════════════════
   POMODORO TIMER
══════════════════════════════════════════════════════ */
const POMO = (() => {
  const FOCUS_MIN  = 25;
  const BREAK_MIN  = 5;
  const CIRC       = 2 * Math.PI * 29;  // svg r=29

  let remaining  = FOCUS_MIN * 60;
  let total      = FOCUS_MIN * 60;
  let isRunning  = false;
  let isBreak    = false;
  let sessions   = 0;
  let timerId    = null;
  let minimized  = false;

  function fmt(sec) {
    const m = Math.floor(sec/60), s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateUI() {
    const ring    = document.getElementById('pomo-ring');
    const display = document.getElementById('pomo-display');
    const modeLbl = document.getElementById('pomo-mode-lbl');
    const label   = document.getElementById('pomo-label');
    const dots    = document.getElementById('pomo-dots');
    const startBtn= document.getElementById('pomo-start');
    if (!ring) return;

    const progress = remaining / total;
    const offset   = CIRC * (1 - progress);
    ring.style.strokeDasharray  = CIRC;
    ring.style.strokeDashoffset = offset;
    ring.classList.toggle('break-mode', isBreak);

    display.textContent = fmt(remaining);
    modeLbl.textContent = isBreak ? 'BREAK' : 'FOCUS';
    label.textContent   = isBreak ? '☕ Break time' : '🎯 Focus session';
    startBtn.textContent = isRunning ? '⏸' : '▶';
    startBtn.classList.toggle('running', isRunning);

    // Session dots (max 4)
    dots.innerHTML = Array.from({length:4},(_,i)=>
      `<div class="pomo-dot${i<sessions%4||sessions>=4?' done':''}"></div>`
    ).join('');

    // Show currently focused task if any
    const taskRow = document.getElementById('pomo-task-row');
    if (taskRow) taskRow.textContent = attachedTask ? attachedTask : '—';
  }

  function tick() {
    if (!isRunning) return;
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerId); isRunning = false;
      notify(isBreak ? 'Break over! Time to focus 🎯' : 'Focus session done! Take a break ☕');
      if (!isBreak) sessions++;
      isBreak    = !isBreak;
      total      = (isBreak ? BREAK_MIN : FOCUS_MIN) * 60;
      remaining  = total;
      updateUI();
      // Auto-start next phase
      timerId  = setInterval(tick, 1000);
      isRunning = true;
    }
    updateUI();
  }

  function notify(msg) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Planner ⏱', { body: msg, icon: '' });
    }
  }

  function requestNotifPerm() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  let attachedTask = '';

  function init() {
    requestNotifPerm();
    const startBtn = document.getElementById('pomo-start');
    const resetBtn = document.getElementById('pomo-reset');
    const skipBtn  = document.getElementById('pomo-skip');
    const minBtn   = document.getElementById('pomo-min');
    const widget   = document.getElementById('pomo-widget');
    if (!startBtn) return;

    startBtn.addEventListener('click', () => {
      isRunning = !isRunning;
      if (isRunning) { timerId = setInterval(tick, 1000); }
      else            { clearInterval(timerId); }
      updateUI();
    });

    resetBtn.addEventListener('click', () => {
      clearInterval(timerId); isRunning = false;
      isBreak = false; remaining = FOCUS_MIN*60; total = FOCUS_MIN*60;
      updateUI();
    });

    skipBtn.addEventListener('click', () => {
      clearInterval(timerId); isRunning = false;
      if (!isBreak) sessions++;
      isBreak   = !isBreak;
      total     = (isBreak ? BREAK_MIN : FOCUS_MIN)*60;
      remaining = total;
      updateUI();
    });

    minBtn.addEventListener('click', () => {
      minimized = !minimized;
      widget.classList.toggle('minimized', minimized);
      minBtn.textContent = minimized ? '+' : '−';
    });

    // Click minimized widget to restore
    widget.addEventListener('click', e => {
      if (minimized && e.target === widget) { minimized=false; widget.classList.remove('minimized'); minBtn.textContent='−'; }
    });

    updateUI();
  }

  return { init, attachTask: t => { attachedTask = t; const el=document.getElementById('pomo-task-row'); if(el) el.textContent=t||'—'; } };
})();

/* ═══════════════════════════════════════════════════════
   HABIT TRACKER
══════════════════════════════════════════════════════ */
function renderHabits() {
  const el = document.getElementById('habit-list');
  if (!el) return;
  const dates = typeof weekDates === 'function' ? weekDates() : [];
  const today  = typeof isoDate  === 'function' ? isoDate(new Date()) : '';

  if (!S.habits.length) {
    el.innerHTML = '<div class="inbox-empty">No habits yet</div>';
    return;
  }

  el.innerHTML = S.habits.map(habit => {
    const daysHtml = dates.map(d => {
      const key  = typeof isoDate==='function' ? isoDate(d) : '';
      const done = (S.habitDone[key]||[]).includes(habit.id);
      const isT  = key === today;
      return `<div class="habit-day${done?' done':''}" data-habit="${habit.id}" data-date="${key}" title="${key}">${done?'✓':''}</div>`;
    }).join('');

    // Streak: count consecutive days ending today
    let streak = 0, cur = new Date();
    for (let i=0; i<30; i++) {
      const k = typeof isoDate==='function' ? isoDate(cur) : '';
      if ((S.habitDone[k]||[]).includes(habit.id)) { streak++; cur = typeof addDays==='function' ? addDays(cur,-1) : cur; }
      else break;
    }

    return `<div class="habit-row">
      <span class="habit-name" title="${typeof esc==='function'?esc(habit.name):habit.name}">${typeof esc==='function'?esc(habit.name):habit.name}</span>
      <div class="habit-days">${daysHtml}</div>
      <span class="habit-streak">${streak>0?'🔥'+streak:''}</span>
      <button class="subtask-del" data-habit-del="${habit.id}" style="margin-left:2px">✕</button>
    </div>`;
  }).join('');

  el.querySelectorAll('.habit-day').forEach(cell => {
    cell.addEventListener('click', () => {
      const hid  = cell.dataset.habit;
      const date = cell.dataset.date;
      if (!S.habitDone[date]) S.habitDone[date] = [];
      const idx = S.habitDone[date].indexOf(hid);
      if (idx >= 0) S.habitDone[date].splice(idx,1);
      else           S.habitDone[date].push(hid);
      if (typeof save === 'function') save();
      renderHabits();
    });
  });

  el.querySelectorAll('[data-habit-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.habits = S.habits.filter(h => h.id !== btn.dataset.habitDel);
      if (typeof save === 'function') save();
      renderHabits();
    });
  });
}

function initHabits() {
  const btn = document.getElementById('add-habit-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const name = prompt('Habit name (e.g. 💪 Exercise, 📚 Read):');
    if (!name || !name.trim()) return;
    S.habits.push({ id: typeof uid==='function'?uid():Date.now().toString(36), name: name.trim() });
    if (typeof save === 'function') save();
    renderHabits();
  });
}

/* ═══════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════ */
function openAnalytics() {
  const el = document.getElementById('analytics-body');
  if (!el) return;

  const dates  = typeof weekDates==='function' ? weekDates() : [];
  const cats   = { work:0, personal:0, health:0, other:0 };
  const catLbl = { work:'💼 Work', personal:'🏠 Personal', health:'💪 Health', other:'✨ Other' };
  const catCol = { work:'var(--c-work)', personal:'var(--c-personal)', health:'var(--c-health)', other:'var(--c-other)' };
  let td = 0, ta = 0;
  const dayData = [];

  dates.forEach(d => {
    const tasks = typeof tasksOn==='function' ? tasksOn(typeof isoDate==='function'?isoDate(d):'') : [];
    const done  = tasks.filter(t=>t.status==='done').length;
    const total = tasks.length;
    td += done; ta += total;
    dayData.push({ done, total, pct: total>0?Math.round(done/total*100):0 });
    tasks.forEach(t => { if(cats[t.category]!==undefined) cats[t.category] += (t.duration||60); });
  });

  // Donut chart
  const totalMins = Object.values(cats).reduce((a,b)=>a+b,0);
  let donutSVG = '', startAngle = -Math.PI/2;
  const cx=50, cy=50, r=36;
  if (totalMins > 0) {
    for (const [cat,mins] of Object.entries(cats)) {
      if (!mins) continue;
      const angle = (mins/totalMins)*2*Math.PI;
      const x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
      const x2=cx+r*Math.cos(startAngle+angle), y2=cy+r*Math.sin(startAngle+angle);
      const large = angle>Math.PI?1:0;
      donutSVG += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${catCol[cat]}" opacity=".9"/>`;
      startAngle += angle;
    }
    donutSVG += `<circle cx="${cx}" cy="${cy}" r="18" fill="var(--solid-surf)"/>`;
  } else {
    donutSVG = `<circle cx="50" cy="50" r="36" fill="var(--border)"/><circle cx="50" cy="50" r="18" fill="var(--solid-surf)"/>`;
  }

  const legend = Object.entries(cats).map(([cat,mins])=>`
    <div class="donut-legend-row">
      <div class="donut-legend-dot" style="background:${catCol[cat]}"></div>
      <span>${catLbl[cat]}: ${Math.floor(mins/60)}h ${mins%60}m</span>
    </div>`).join('');

  // Bar chart
  const maxPct = Math.max(...dayData.map(d=>d.pct), 1);
  const bars = dayData.map((d,i)=>`
    <div class="bar-item">
      <div class="bar-fill" style="height:${Math.round(d.pct/maxPct*60)}px" title="${d.pct}%"></div>
      <span class="bar-label">${(typeof DAYS!=='undefined'?DAYS:['M','T','W','T','F','S','S'])[i]}</span>
    </div>`).join('');

  // Insight: peak hour
  const hourCounts = {};
  dates.forEach(d => {
    (typeof tasksOn==='function' ? tasksOn(typeof isoDate==='function'?isoDate(d):'') : []).filter(t=>t.status==='done').forEach(t => {
      const h = parseInt(t.time.split(':')[0]);
      hourCounts[h] = (hourCounts[h]||0) + 1;
    });
  });
  const peakHour = Object.keys(hourCounts).sort((a,b)=>hourCounts[b]-hourCounts[a])[0];
  const peakLabel = peakHour ? `${peakHour}:00` : 'N/A';

  // Streak of fully-done days
  let streak = 0;
  for (let i=0; i<14; i++) {
    const d = typeof addDays==='function' ? addDays(new Date(), -i) : new Date();
    const key = typeof isoDate==='function' ? isoDate(d) : '';
    const tasks = typeof tasksOn==='function' ? tasksOn(key) : [];
    if (tasks.length > 0 && tasks.every(t=>t.status==='done')) streak++;
    else if (i > 0) break;
  }

  const completionRate = ta > 0 ? Math.round(td/ta*100) : 0;

  el.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-box">
        <h4>Time by Category</h4>
        <div class="donut-wrap">
          <svg viewBox="0 0 100 100">${donutSVG}</svg>
          <div class="donut-legend">${legend}</div>
        </div>
      </div>
      <div class="analytics-box">
        <h4>Daily Completion</h4>
        <div class="bar-chart-wrap">${bars}</div>
      </div>
    </div>
    <div class="insight-cards">
      <div class="insight-card">
        <div class="insight-icon">⏰</div>
        <div class="insight-val">${peakLabel}</div>
        <div class="insight-label">Peak hour</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">✅</div>
        <div class="insight-val">${completionRate}%</div>
        <div class="insight-label">Completion rate</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">🔥</div>
        <div class="insight-val">${streak}</div>
        <div class="insight-label">Day streak</div>
      </div>
    </div>
  `;

  document.getElementById('overlay-stats').hidden = false;
}

/* ═══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  POMO.init();
  initHabits();
});

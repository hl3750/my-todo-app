'use strict';

/* ═══════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════ */
const HOUR_H  = 64;
const START_H = 5;
const END_H   = 23;
const GRID_H  = (END_H - START_H) * HOUR_H;
const DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const THEMES  = ['nebula','forest','sunset','midnight','rose'];

/* ═══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let S = {
  tasks:         [],   // { id, text, date, time, duration, category, priority, status, notes, subtasks:[] }
  inbox:         [],   // { id, text, category, priority, notes }
  weekStart:     getMonday(new Date()),
  weekGoals:     {},
  weekSummaries: {},
  dayGoals:      {},
  habits:        [],   // { id, name, color }
  habitDone:     {},   // { 'YYYY-MM-DD': [habitId, ...] }
  theme:         'nebula',
  darkMode:      false,
  miniMonth:     new Date(),
};

let editId    = null;
let inboxEdit = null;  // id of inbox item being scheduled

/* ═══════════════════════════════════════════════════════
   PERSIST
══════════════════════════════════════════════════════ */
function save() {
  try {
    localStorage.setItem('planner-v3', JSON.stringify({
      tasks: S.tasks, inbox: S.inbox,
      weekGoals: S.weekGoals, weekSummaries: S.weekSummaries, dayGoals: S.dayGoals,
      habits: S.habits, habitDone: S.habitDone,
      theme: S.theme, darkMode: S.darkMode,
    }));
  } catch(e) {}
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('planner-v3') || '{}');
    if (d.tasks)         S.tasks         = d.tasks;
    if (d.inbox)         S.inbox         = d.inbox;
    if (d.weekGoals)     S.weekGoals     = d.weekGoals;
    if (d.weekSummaries) S.weekSummaries = d.weekSummaries;
    if (d.dayGoals)      S.dayGoals      = d.dayGoals;
    if (d.habits)        S.habits        = d.habits;
    if (d.habitDone)     S.habitDone     = d.habitDone;
    if (d.theme)         S.theme         = d.theme;
    if (d.darkMode)      S.darkMode      = !!d.darkMode;
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════
   DATE UTILS
══════════════════════════════════════════════════════ */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function isoDate(d)    { return d.toISOString().split('T')[0]; }
function isToday(d)    { const n = new Date(); return isoDate(d) === isoDate(n); }
function weekDates()   { return Array.from({length:7},(_,i)=>addDays(S.weekStart,i)); }

function weekLabel(monday) {
  const jan1 = new Date(monday.getFullYear(),0,1);
  const wn   = Math.ceil(((monday-jan1)/86400000+jan1.getDay()+1)/7);
  return `W${wn} · ${monday.toLocaleDateString('en-US',{month:'short',year:'numeric'})}`;
}
function toMin(hhmm)      { const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function fromMin(m)       { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function minToPx(m)       { return (m/60)*HOUR_H; }
function uid()            { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function esc(s)           { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ═══════════════════════════════════════════════════════
   NATURAL LANGUAGE PARSER
══════════════════════════════════════════════════════ */
function parseNL(raw) {
  let txt = raw, date = isoDate(new Date()), time = null, duration = 60, category = 'work';

  // duration: "1h", "2hr", "30min", "1.5 hours"
  txt = txt.replace(/\b(\d+(?:\.\d+)?)\s*(?:h(?:r|ours?)?)(?:\s|$)/i, (_, n) => { duration = Math.round(parseFloat(n)*60); return ' '; });
  txt = txt.replace(/\b(\d+)\s*min(?:utes?)?/i, (_, n) => { duration = parseInt(n); return ' '; });

  // time: "3pm", "3:30pm", "15:00"
  const t12 = txt.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (t12) {
    let h = parseInt(t12[1]), m = parseInt(t12[2]||'0');
    if (t12[3].toLowerCase()==='pm' && h!==12) h+=12;
    if (t12[3].toLowerCase()==='am' && h===12) h=0;
    time = fromMin(h*60+m);
    txt = txt.replace(t12[0],' ');
  }
  if (!time) {
    const t24 = txt.match(/\b(\d{2}):(\d{2})\b/);
    if (t24) { time = t24[0]; txt = txt.replace(t24[0],' '); }
  }

  // date keywords
  const now = new Date();
  if (/\btomorrow\b/i.test(txt)) { date = isoDate(addDays(now,1)); txt = txt.replace(/\btomorrow\b/i,' '); }
  else if (/\btoday\b/i.test(txt)) { txt = txt.replace(/\btoday\b/i,' '); }
  else {
    const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i=0; i<dow.length; i++) {
      const re = new RegExp('\\b'+dow[i]+'\\b','i');
      if (re.test(txt)) {
        let diff = i - now.getDay(); if (diff<=0) diff+=7;
        date = isoDate(addDays(now,diff));
        txt = txt.replace(re,' '); break;
      }
    }
  }

  // category hints
  if (/\b(gym|workout|run|exercise|health|meditat)\b/i.test(txt)) category = 'health';
  else if (/\b(lunch|dinner|family|home|personal|friend)\b/i.test(txt)) category = 'personal';
  else if (/\b(design|art|music|creative)\b/i.test(txt)) category = 'other';

  txt = txt.replace(/\s+/g,' ').trim().replace(/^[,.\s]+|[,.\s]+$/g,'').trim();
  return { text: txt||raw, date, time, duration, category };
}

/* ═══════════════════════════════════════════════════════
   TASK OPERATIONS
══════════════════════════════════════════════════════ */
function tasksOn(dateStr) { return S.tasks.filter(t=>t.date===dateStr); }

function addTask(data) {
  S.tasks.push({ id:uid(), status:'planned', subtasks:[], notes:'', ...data });
  save(); render();
  checkDayComplete(data.date);
}
function editTask(id, data) {
  const i = S.tasks.findIndex(t=>t.id===id);
  if (i<0) return;
  S.tasks[i] = { ...S.tasks[i], ...data };
  save(); render();
}
function removeTask(id) {
  const task = S.tasks.find(t=>t.id===id);
  S.tasks = S.tasks.filter(t=>t.id!==id);
  save(); render();
}
function cycleStatus(id) {
  const cycle = ['planned','inprogress','done'];
  const task  = S.tasks.find(t=>t.id===id);
  if (!task) return;
  const next  = cycle[(cycle.indexOf(task.status)+1)%cycle.length];
  editTask(id,{status:next});
  if (next==='done') checkDayComplete(task.date);
}

/* ── Confetti trigger ── */
function checkDayComplete(dateStr) {
  const tasks = tasksOn(dateStr);
  if (tasks.length > 0 && tasks.every(t=>t.status==='done')) {
    launchConfetti();
  }
}

function launchConfetti() {
  const wrap   = document.getElementById('confetti-wrap');
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#38bdf8','#a855f7','#f43f5e'];
  for (let i=0; i<70; i++) {
    const p = document.createElement('div');
    p.className = 'cp';
    p.style.cssText = `
      left:${Math.random()*100}vw;
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${2+Math.random()*1.5}s;
      animation-delay:${Math.random()*0.6}s;
      border-radius:${Math.random()>.5?'50%':'3px'};
    `;
    wrap.appendChild(p);
    setTimeout(()=>p.remove(), 3200);
  }
}

/* ═══════════════════════════════════════════════════════
   INBOX
══════════════════════════════════════════════════════ */
function addInboxItem(data) {
  S.inbox.push({ id:uid(), ...data });
  save(); renderInbox();
}
function removeInboxItem(id) { S.inbox=S.inbox.filter(x=>x.id!==id); save(); renderInbox(); }

function renderInbox() {
  const el = document.getElementById('inbox-list');
  if (!S.inbox.length) { el.innerHTML='<div class="inbox-empty">Inbox empty ✓</div>'; return; }
  el.innerHTML = S.inbox.map(item=>`
    <div class="inbox-item" draggable="true" data-inbox-id="${item.id}">
      <div class="inbox-dot"></div>
      <span class="inbox-text" title="${esc(item.text)}">${esc(item.text)}</span>
      <span class="inbox-sched" data-inbox-id="${item.id}">Schedule</span>
      <button class="inbox-del" data-inbox-id="${item.id}">✕</button>
    </div>
  `).join('');

  el.querySelectorAll('.inbox-sched').forEach(btn=>{
    btn.addEventListener('click',()=>{ inboxEdit=btn.dataset.inboxId; openModal(isoDate(new Date()),'09:00'); });
  });
  el.querySelectorAll('.inbox-del').forEach(btn=>{
    btn.addEventListener('click',()=>removeInboxItem(btn.dataset.inboxId));
  });
  el.querySelectorAll('.inbox-item[draggable]').forEach(item=>{
    item.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('inboxId', item.dataset.inboxId);
      e.dataTransfer.effectAllowed='move';
    });
  });
}

/* ═══════════════════════════════════════════════════════
   RENDER PIPELINE
══════════════════════════════════════════════════════ */
function render() {
  applyTheme();
  renderWeekLabel();
  renderDayHeaders();
  renderGutter();
  renderGrid();
  renderSidebar();
  renderMiniCal();
  renderInbox();
  if (typeof renderHabits === 'function') renderHabits();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  document.documentElement.setAttribute('data-dark',  S.darkMode ? 'true' : 'false');
  document.getElementById('btn-dark').textContent = S.darkMode ? '☀️' : '🌙';
  document.querySelectorAll('.theme-dot').forEach(d=>{
    d.classList.toggle('active', d.dataset.t===S.theme);
  });
}

function renderWeekLabel() {
  document.getElementById('week-label').textContent = weekLabel(S.weekStart);
}

/* ── Day headers ── */
function renderDayHeaders() {
  const el = document.getElementById('cal-header');
  el.innerHTML='<div class="cal-hdr-gutter"></div>';
  weekDates().forEach((d,i)=>{
    const key=isoDate(d), tasks=tasksOn(key);
    const done=tasks.filter(t=>t.status==='done').length;
    const div=document.createElement('div');
    div.className='day-hdr'+(isToday(d)?' today':'');
    div.innerHTML=`
      <span class="dh-name">${DAYS[i]}</span>
      <span class="dh-num">${d.getDate()}</span>
      <div class="dh-dot"></div>
      <input class="dh-goal" placeholder="Today's goal…"
        data-date="${key}" value="${esc(S.dayGoals[key]||'')}">
      ${tasks.length>0?`<span class="dh-count">${done}/${tasks.length}</span>`:''}
    `;
    el.appendChild(div);
  });
  el.querySelectorAll('.dh-goal').forEach(inp=>{
    inp.addEventListener('input',()=>{ S.dayGoals[inp.dataset.date]=inp.value; save(); });
    inp.addEventListener('click',e=>e.stopPropagation());
  });
}

/* ── Time gutter ── */
function renderGutter() {
  const el=document.getElementById('time-gutter');
  el.style.height=GRID_H+'px'; el.innerHTML='';
  for(let h=START_H;h<=END_H;h++){
    const lbl=document.createElement('div');
    lbl.className='time-lbl';
    lbl.style.top=((h-START_H)*HOUR_H)+'px';
    lbl.textContent=`${String(h).padStart(2,'0')}:00`;
    el.appendChild(lbl);
  }
}

/* ── Days grid ── */
function renderGrid() {
  const el=document.getElementById('days-grid');
  el.style.height=GRID_H+'px'; el.innerHTML='';
  weekDates().forEach(d=>{
    const key=isoDate(d);
    const col=document.createElement('div');
    col.className='day-col'+(isToday(d)?' today':'');
    col.dataset.date=key;
    col.style.height=GRID_H+'px';
    // hour lines + click targets
    for(let h=START_H;h<END_H;h++){
      const top=(h-START_H)*HOUR_H;
      const line=document.createElement('div');
      line.className='hr-line'; line.style.top=top+'px'; col.appendChild(line);
      const half=document.createElement('div');
      half.className='hr-line half'; half.style.top=(top+HOUR_H/2)+'px'; col.appendChild(half);
      const hit=document.createElement('div');
      hit.className='slot-hit'; hit.style.top=top+'px'; hit.style.height=HOUR_H+'px';
      hit.dataset.date=key; hit.dataset.time=fromMin(h*60);
      hit.addEventListener('click',e=>{ e.stopPropagation(); openModal(key,fromMin(h*60)); });
      col.appendChild(hit);
    }
    // now line
    if(isToday(d)){
      const nl=document.createElement('div');
      nl.className='now-line'; nl.id='now-line'; positionNowLine(nl); col.appendChild(nl);
    }
    // tasks
    tasksOn(key).forEach(t=>col.appendChild(buildPill(t)));
    // drag targets
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('drag-over'); e.dataTransfer.dropEffect='move'; });
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',e=>{ e.preventDefault(); col.classList.remove('drag-over'); handleDrop(e,col); });
    el.appendChild(col);
  });
}

/* ── Task pill ── */
function buildPill(task) {
  const startRel=toMin(task.time)-START_H*60;
  const top   =minToPx(Math.max(0,startRel));
  const height=Math.max(24,minToPx(task.duration)-4);
  const subs  =task.subtasks||[];
  const subDone=subs.filter(s=>s.done).length;
  const pct   =subs.length>0?Math.round(subDone/subs.length*100):0;

  const pill=document.createElement('div');
  pill.className='task-pill';
  pill.dataset.cat=task.category; pill.dataset.status=task.status; pill.dataset.id=task.id;
  pill.style.top=top+'px'; pill.style.height=height+'px';
  pill.draggable=true;

  const hasNotes=task.notes&&task.notes.trim().length>0;
  pill.innerHTML=`
    <div class="pill-row">
      <span class="pill-text">${task.priority?'⭐ ':''}${esc(task.text)}</span>
      <span class="pill-meta">
        ${hasNotes?'<span class="pill-notes-icon" title="Has notes">📎</span>':''}
        <span class="pill-time">${task.time}</span>
        <button class="pill-del" data-id="${task.id}">✕</button>
      </span>
    </div>
    ${subs.length>0?`
      <div class="pill-progress"><div class="pill-progress-fill" style="width:${pct}%"></div></div>
      <div class="pill-sub-label">${subDone}/${subs.length} subtasks</div>
    `:''}
  `;

  pill.addEventListener('click',e=>{ if(e.target.classList.contains('pill-del'))return; e.stopPropagation(); cycleStatus(task.id); pill.classList.add('pulsing'); setTimeout(()=>pill.classList.remove('pulsing'),500); });
  pill.addEventListener('dblclick',e=>{ if(e.target.classList.contains('pill-del'))return; e.stopPropagation(); openModal(task.date,task.time,task.id); });
  pill.querySelector('.pill-del').addEventListener('click',e=>{ e.stopPropagation(); pill.classList.add('deleting'); setTimeout(()=>removeTask(task.id),200); });
  pill.addEventListener('dragstart',e=>{ const r=pill.getBoundingClientRect(); e.dataTransfer.setData('taskId',task.id); e.dataTransfer.setData('dragOffset',String(e.clientY-r.top)); e.dataTransfer.effectAllowed='move'; requestAnimationFrame(()=>pill.style.opacity='.3'); });
  pill.addEventListener('dragend',()=>pill.style.opacity='');
  return pill;
}

/* ── Drop handler ── */
function handleDrop(e, col) {
  const inboxId=e.dataTransfer.getData('inboxId');
  if (inboxId) {
    const item=S.inbox.find(x=>x.id===inboxId);
    if (!item) return;
    const rect=col.getBoundingClientRect();
    const relY=e.clientY-rect.top;
    const snapped=Math.round((relY/HOUR_H)*60/30)*30;
    const abs=START_H*60+Math.max(0,Math.min((END_H-START_H)*60-30,snapped));
    addTask({ text:item.text, date:col.dataset.date, time:fromMin(abs), duration:60, category:item.category||'work', priority:item.priority||false, notes:item.notes||'' });
    removeInboxItem(inboxId);
    return;
  }
  const taskId=e.dataTransfer.getData('taskId');
  const offset=parseFloat(e.dataTransfer.getData('dragOffset'))||0;
  if (!taskId) return;
  const rect=col.getBoundingClientRect();
  const relY=e.clientY-rect.top-offset;
  const snapped=Math.round((relY/HOUR_H)*60/30)*30;
  const abs=START_H*60+Math.max(0,Math.min((END_H-START_H)*60-30,snapped));
  editTask(taskId,{date:col.dataset.date,time:fromMin(abs)});
}

/* ── Now-line ── */
function positionNowLine(el) { const n=new Date(); el.style.top=Math.max(0,minToPx(n.getHours()*60+n.getMinutes()-START_H*60))+'px'; }
function tickNow() { const el=document.getElementById('now-line'); if(el) positionNowLine(el); }

/* ═══════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════ */
function renderSidebar() {
  const key=isoDate(S.weekStart);
  document.getElementById('week-goals').value   = S.weekGoals[key]    ||'';
  document.getElementById('week-summary').value = S.weekSummaries[key]||'';
  // stats
  let html='', td=0, ta=0;
  weekDates().forEach((d,i)=>{
    const tasks=tasksOn(isoDate(d));
    const done=tasks.filter(t=>t.status==='done').length;
    const total=tasks.length; td+=done; ta+=total;
    const pct=total>0?Math.round(done/total*100):0;
    html+=`<div class="stat-row"><span class="stat-day">${DAYS[i]}</span><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${pct}%"></div></div><span class="stat-pct">${total>0?pct+'%':'—'}</span></div>`;
  });
  const wp=ta>0?Math.round(td/ta*100):0;
  html+=`<div class="stat-total">Week: ${td}/${ta} tasks · ${wp}%</div>`;
  document.getElementById('week-stats').innerHTML=html;
}

/* ═══════════════════════════════════════════════════════
   MINI CALENDAR
══════════════════════════════════════════════════════ */
function renderMiniCal() {
  const el=document.getElementById('mini-cal');
  const yr=S.miniMonth.getFullYear(), mo=S.miniMonth.getMonth();
  const label=new Date(yr,mo,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const firstMon=getMonday(new Date(yr,mo,1));
  const cur=isoDate(S.weekStart);
  let html=`<div class="mc-nav"><button data-mc="prev">‹</button><span>${label}</span><button data-mc="next">›</button></div><div class="mc-dows"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>`;
  for(let w=0;w<6;w++){
    const mon=addDays(firstMon,w*7);
    if(w>=4&&mon.getMonth()>mo&&mon.getFullYear()>=yr) break;
    const wk=isoDate(mon);
    html+=`<div class="mc-week-row${wk===cur?' mc-active':''}" data-monday="${wk}">`;
    for(let d=0;d<7;d++){
      const day=addDays(mon,d);
      html+=`<span class="mc-day${isToday(day)?' mc-today':''}${day.getMonth()!==mo?' mc-other':''}">${day.getDate()}</span>`;
    }
    html+='</div>';
  }
  el.innerHTML=html;
  el.querySelector('[data-mc="prev"]').addEventListener('click',()=>{ S.miniMonth=new Date(yr,mo-1,1); renderMiniCal(); });
  el.querySelector('[data-mc="next"]').addEventListener('click',()=>{ S.miniMonth=new Date(yr,mo+1,1); renderMiniCal(); });
  el.querySelectorAll('.mc-week-row').forEach(r=>r.addEventListener('click',()=>{ S.weekStart=new Date(r.dataset.monday+'T00:00:00'); render(); }));
}

/* ═══════════════════════════════════════════════════════
   TASK MODAL
══════════════════════════════════════════════════════ */
function buildTimeOptions() {
  const sel=document.getElementById('inp-time'); sel.innerHTML='';
  for(let h=START_H;h<END_H;h++) for(const m of[0,30]){ const o=document.createElement('option'); o.value=o.textContent=fromMin(h*60+m); sel.appendChild(o); }
}

function openModal(date, time, taskId) {
  editId=taskId||null;
  const titleEl=document.getElementById('modal-task-title');
  const submitEl=document.getElementById('btn-submit');
  if (taskId) {
    const t=S.tasks.find(x=>x.id===taskId); if(!t) return;
    titleEl.textContent='Edit Task'; submitEl.textContent='Save Changes';
    document.getElementById('inp-text').value  = t.text;
    document.getElementById('inp-date').value  = t.date;
    document.getElementById('inp-time').value  = t.time;
    document.getElementById('inp-dur').value   = t.duration;
    document.getElementById('inp-notes').value = t.notes||'';
    setCat(t.category); setStarred(t.priority);
    renderSubtasksInModal(t.subtasks||[]);
  } else {
    titleEl.textContent='New Task'; submitEl.textContent='Add Task';
    document.getElementById('inp-text').value  = '';
    document.getElementById('inp-date').value  = date||isoDate(new Date());
    document.getElementById('inp-time').value  = time||'09:00';
    document.getElementById('inp-dur').value   = '60';
    document.getElementById('inp-notes').value = '';
    setCat('work'); setStarred(false);
    renderSubtasksInModal([]);
  }
  document.getElementById('overlay-task').hidden=false;
  setTimeout(()=>document.getElementById('inp-text').focus(),60);
}

function closeModal() { document.getElementById('overlay-task').hidden=true; editId=null; inboxEdit=null; }

function submitModal() {
  const text    =document.getElementById('inp-text').value.trim();
  const date    =document.getElementById('inp-date').value;
  const time    =document.getElementById('inp-time').value;
  const duration=parseInt(document.getElementById('inp-dur').value,10);
  const category=document.querySelector('#cat-picker .cat-btn.active')?.dataset.cat||'work';
  const priority=document.getElementById('priority-btn').dataset.starred==='true';
  const notes   =document.getElementById('inp-notes').value.trim();
  const subtasks=collectSubtasks();
  if (!text||!date||!time) { document.getElementById('inp-text').focus(); return; }

  if (inboxEdit) {
    removeInboxItem(inboxEdit);
    addTask({text,date,time,duration,category,priority,notes,subtasks});
  } else if (editId) {
    editTask(editId,{text,date,time,duration,category,priority,notes,subtasks});
  } else {
    addTask({text,date,time,duration,category,priority,notes,subtasks});
  }
  closeModal();
}

/* Subtask helpers inside modal */
let modalSubtasks = [];

function renderSubtasksInModal(subs) {
  modalSubtasks = subs.map(s=>({...s}));
  refreshSubtaskUI();
}
function refreshSubtaskUI() {
  const el=document.getElementById('subtask-list'); el.innerHTML='';
  modalSubtasks.forEach((s,i)=>{
    const row=document.createElement('div'); row.className='subtask-row';
    row.innerHTML=`
      <div class="subtask-check${s.done?' checked':''}" data-si="${i}">${s.done?'✓':''}</div>
      <input class="subtask-inp" value="${esc(s.text)}" placeholder="Subtask…" data-si="${i}">
      <button class="subtask-del" data-si="${i}">✕</button>
    `;
    el.appendChild(row);
  });
  el.querySelectorAll('.subtask-check').forEach(c=>c.addEventListener('click',()=>{ const i=parseInt(c.dataset.si); modalSubtasks[i].done=!modalSubtasks[i].done; refreshSubtaskUI(); }));
  el.querySelectorAll('.subtask-inp').forEach(inp=>inp.addEventListener('input',()=>{ modalSubtasks[parseInt(inp.dataset.si)].text=inp.value; }));
  el.querySelectorAll('.subtask-del').forEach(btn=>btn.addEventListener('click',()=>{ modalSubtasks.splice(parseInt(btn.dataset.si),1); refreshSubtaskUI(); }));
}
function collectSubtasks() { return modalSubtasks.map(s=>({...s})); }

function setCat(cat)     { document.querySelectorAll('#cat-picker .cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat)); }
function setStarred(val) { const b=document.getElementById('priority-btn'); b.dataset.starred=val?'true':'false'; b.textContent=val?'⭐ High Priority':'☆ Normal'; }

/* ═══════════════════════════════════════════════════════
   QUICK ADD
══════════════════════════════════════════════════════ */
function handleQuickAdd() {
  const inp=document.getElementById('quick-add-input');
  const raw=inp.value.trim(); if(!raw) return;
  const parsed=parseNL(raw);
  if (parsed.time) {
    addTask({ text:parsed.text, date:parsed.date, time:parsed.time, duration:parsed.duration, category:parsed.category, priority:false, notes:'', subtasks:[] });
  } else {
    addInboxItem({ text:parsed.text, category:parsed.category, priority:false });
  }
  inp.value='';
}

/* ═══════════════════════════════════════════════════════
   SCROLL TO NOW
══════════════════════════════════════════════════════ */
function scrollToNow() {
  const n=new Date();
  const top=Math.max(0,minToPx(n.getHours()*60+n.getMinutes()-START_H*60)-200);
  document.getElementById('cal-main').scrollTop=top;
}

/* ═══════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════ */
function bindKeys() {
  document.addEventListener('keydown',e=>{
    const tag=document.activeElement.tagName;
    const inField=['INPUT','TEXTAREA','SELECT'].includes(tag);
    const anyModal=!document.getElementById('overlay-task').hidden||
                   !document.getElementById('overlay-stats').hidden||
                   !document.getElementById('overlay-guide').hidden;
    if(e.key==='Escape'){
      document.getElementById('overlay-task').hidden=true;
      document.getElementById('overlay-stats').hidden=true;
      document.getElementById('overlay-guide').hidden=true;
      return;
    }
    if(anyModal||inField) return;
    if(e.key==='n'||e.key==='N') openModal(isoDate(new Date()),'09:00');
    else if(e.key==='ArrowLeft')  { S.weekStart=addDays(S.weekStart,-7); S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); }
    else if(e.key==='ArrowRight') { S.weekStart=addDays(S.weekStart,7);  S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); }
    else if(e.key==='t'||e.key==='T') { S.weekStart=getMonday(new Date()); S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); scrollToNow(); }
  });
}

/* ═══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
function init() {
  load();
  S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1);
  buildTimeOptions();

  // Header
  document.getElementById('btn-prev').addEventListener('click',()=>{ S.weekStart=addDays(S.weekStart,-7); S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); });
  document.getElementById('btn-next').addEventListener('click',()=>{ S.weekStart=addDays(S.weekStart,7);  S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); });
  document.getElementById('btn-today').addEventListener('click',()=>{ S.weekStart=getMonday(new Date()); S.miniMonth=new Date(S.weekStart.getFullYear(),S.weekStart.getMonth(),1); render(); scrollToNow(); });
  document.getElementById('btn-new-task').addEventListener('click',()=>openModal(isoDate(new Date()),'09:00'));
  document.getElementById('btn-sidebar').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('collapsed'));
  document.getElementById('btn-dark').addEventListener('click',()=>{ S.darkMode=!S.darkMode; save(); applyTheme(); });
  document.getElementById('btn-guide').addEventListener('click',()=>document.getElementById('overlay-guide').hidden=false);
  document.getElementById('btn-stats').addEventListener('click',()=>{ if(typeof openAnalytics==='function') openAnalytics(); });

  // Theme dots
  document.querySelectorAll('.theme-dot').forEach(dot=>{
    dot.addEventListener('click',()=>{ S.theme=dot.dataset.t; save(); applyTheme(); });
  });

  // Task modal
  document.getElementById('close-task').addEventListener('click',closeModal);
  document.getElementById('btn-cancel').addEventListener('click',closeModal);
  document.getElementById('btn-submit').addEventListener('click',submitModal);
  document.getElementById('overlay-task').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });
  document.getElementById('overlay-task').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) submitModal(); });

  // Cat picker
  document.getElementById('cat-picker').addEventListener('click',e=>{ const b=e.target.closest('.cat-btn'); if(!b) return; document.querySelectorAll('#cat-picker .cat-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); });
  document.getElementById('priority-btn').addEventListener('click',e=>setStarred(e.currentTarget.dataset.starred!=='true'));
  document.getElementById('add-subtask-btn').addEventListener('click',()=>{ modalSubtasks.push({text:'',done:false}); refreshSubtaskUI(); setTimeout(()=>{ const ins=document.querySelectorAll('.subtask-inp'); if(ins.length) ins[ins.length-1].focus(); },40); });

  // Guide / stats modals
  document.getElementById('close-guide').addEventListener('click',()=>document.getElementById('overlay-guide').hidden=true);
  document.getElementById('overlay-guide').addEventListener('click',e=>{ if(e.target===e.currentTarget) document.getElementById('overlay-guide').hidden=true; });
  document.getElementById('close-stats').addEventListener('click',()=>document.getElementById('overlay-stats').hidden=true);
  document.getElementById('overlay-stats').addEventListener('click',e=>{ if(e.target===e.currentTarget) document.getElementById('overlay-stats').hidden=true; });

  // Sidebar textareas
  document.getElementById('week-goals').addEventListener('input',e=>{ S.weekGoals[isoDate(S.weekStart)]=e.target.value; save(); });
  document.getElementById('week-summary').addEventListener('input',e=>{ S.weekSummaries[isoDate(S.weekStart)]=e.target.value; save(); });

  // Quick add
  document.getElementById('qa-submit').addEventListener('click',handleQuickAdd);
  document.getElementById('quick-add-input').addEventListener('keydown',e=>{ if(e.key==='Enter') handleQuickAdd(); });

  bindKeys();
  render();
  scrollToNow();
  setInterval(tickNow,60000);
}

document.addEventListener('DOMContentLoaded',init);

// Shift 90 v3
const DAYS_TOTAL = 90;
const KEY_STATE='shift90_v3_state', KEY_START='shift90_v3_start', KEY_NOTIF='shift90_v3_notif';

function phaseOf(day){ if(day<=30) return 1; if(day<=60) return 2; return 3; }

// Tâches par pôle et phase
function tasksFor(day){
  const p = phaseOf(day);
  // Performance physiologique
  const org = [
    {k:'energie', label:`Éveil physiologique ${p===1? '30m': p===2? '40m':'45m'}`, icon:'⚡', pillar:'org'},
    {k:'conscience', label:`Performance cognitive ${p===1? '12m': p===2? '15m':'20m'}`, icon:'🔮', pillar:'org'},
    {k:'clarte1', label:'Absence substances Cat.1', icon:'✨', pillar:'org'},
    {k:'clarte2', label:'Absence substances Cat.2', icon:'✨', pillar:'org'},
    {k:'toc', label:'Pas de TOC', icon:'🧠', pillar:'org'}
  ];
  // Performance cognitive & économique
  const str = [
    {k:'savoir', label:`Savoir ${p===1? '20m': p===2? '25m':'30m'}`, icon:'📖', pillar:'str'},
    {k:'competence', label:`Compétence ${p===1? '—': p===2? '60m':'90m'}`, icon:'🛠', pillar:'str'},
    {k:'valeur', label:`Valeur & Revenus ${p===1? '—': p===2? '45m':'60m'}`, icon:'💰', pillar:'str'}
  ];
  // Expression créative
  const art = [
    {k:'paye', label:`Paye – Expression ${p===1? '(micro)': p===2? '60m':'120m'}`, icon:'🎤', pillar:'art'},
    ...(p===3 ? [{k:'impact', label:'Impact / Diffusion', icon:'🌐', pillar:'art'}] : [])
  ];
  // Transverse
  const rev = [{k:'revue', label:'Revue & Alignement', icon:'📝', pillar:'str'}];

  // Filtrer entrées "—"
  const all = [...org, ...str.filter(t=>!t.label.includes('—')), ...art, ...rev];
  return all;
}

function maxPointsFor(day){ const p=phaseOf(day); if(p===1) return 60; if(p===2) return 80; return 100; }
function weightsFor(day){
  const tasks = tasksFor(day); const max = maxPointsFor(day);
  const w = Math.floor(max/tasks.length), rem = max - w*tasks.length;
  return tasks.map((_,i)=> i<rem ? w+1 : w);
}

// État
let state = JSON.parse(localStorage.getItem(KEY_STATE) || '{}');
let startDate = localStorage.getItem(KEY_START)? new Date(localStorage.getItem(KEY_START)) : new Date();
let notif = JSON.parse(localStorage.getItem(KEY_NOTIF) || JSON.stringify({morning:'08:30', noon:'14:00', evening:'21:30'}));

function dateForDay(day){ const d=new Date(startDate); d.setDate(d.getDate()+(day-1)); return d; }
function fmtDate(d){ return d.toISOString().slice(0,10); }
function ensureDay(day){
  if(!state[day]){
    const t = tasksFor(day);
    const tasksState = {}; t.forEach(x=> tasksState[x.k]=0); // 0 gray,1 blue,2 green
    state[day] = {tasks: tasksState, notes: '', answer:'', autoplan:[]};
  } else {
    // Assurer présence de nouvelles tâches si version mise à jour
    const keysNow = tasksFor(day).map(t=>t.k);
    keysNow.forEach(k=>{ if(state[day].tasks[k]===undefined) state[day].tasks[k]=0; });
  }
}
function saveState(){ localStorage.setItem(KEY_STATE, JSON.stringify(state)); }

// Points
function pointsFor(day){
  ensureDay(day);
  const tasks = tasksFor(day), weights = weightsFor(day); const max = maxPointsFor(day);
  let got=0;
  tasks.forEach((t,i)=>{
    const st=state[day].tasks[t.k]||0; const w=weights[i];
    if(st===2) got+=w; if(st===1) got+=Math.floor(w/2);
  });
  return {got,max};
}
function pillarPct(rangeDays, pillar){
  let got=0, max=0;
  rangeDays.forEach(day=>{
    ensureDay(day);
    const tasks = tasksFor(day), weights=weightsFor(day);
    tasks.forEach((t,i)=>{
      if(t.pillar!==pillar) return;
      const st=state[day].tasks[t.k]||0; const w=weights[i];
      max += w;
      if(st===2) got += w; else if(st===1) got += Math.floor(w/2);
    });
  });
  if(max===0) return 0;
  return Math.round(100*got/max);
}

// UI grid
function renderGrid(){
  const grid = document.getElementById('daysGrid'); grid.innerHTML='';
  const filter = document.getElementById('phaseFilter').value;
  const search = document.getElementById('searchDay').value.trim();
  let totalPts = 0, streak = 0, currentStreak = 0;
  for(let day=1; day<=DAYS_TOTAL; day++){
    const p = phaseOf(day);
    if(filter!=='all' && String(p)!==filter) continue;
    const dateStr = fmtDate(dateForDay(day));
    if(search && !String(day).includes(search) && !dateStr.includes(search)) continue;
    ensureDay(day);
    const {got,max} = pointsFor(day); totalPts += got;
    if(got >= Math.floor(max*0.6)) currentStreak++; else currentStreak = 0;
    if(currentStreak>streak) streak=currentStreak;

    const pct = Math.min(100, Math.round(100*got/max));
    const card = document.createElement('div'); card.className='card'; card.dataset.day=day; card.tabIndex=0; card.setAttribute('role','button');
    card.innerHTML = `
      <div class="head">
        <div class="progress-ring">
          <div class="ring" style="--pct:${pct}"></div>
          <div class="daynum">${day}</div>
        </div>
        <div class="badge p${p}">P${p}</div>
      </div>
      <div class="date">${dateStr}</div>
      <div class="points-small">${got}/${max} pts</div>`;
    card.addEventListener('click', ()=>openDay(day));
    card.addEventListener('keypress', (e)=>{ if(e.key==='Enter'||e.key===' ') openDay(day); });
    grid.appendChild(card);
  }
  // Scoreboard
  document.getElementById('totalPts').textContent = totalPts;
  document.getElementById('streak').textContent = streak;
  const todayIdx = Math.max(1, Math.min(DAYS_TOTAL, Math.floor((new Date()-new Date(startDate))/(1000*60*60*24))+1));
  document.getElementById('phaseNow').textContent = 'P'+phaseOf(todayIdx);
  renderSpark();

  // Sous‑scores 7 derniers jours
  const start = Math.max(1, todayIdx-6);
  const range = Array.from({length:todayIdx-start+1}, (_,i)=> start+i);
  document.getElementById('orgPct').textContent = pillarPct(range,'org') + '%';
  document.getElementById('strPct').textContent = pillarPct(range,'str') + '%';
  document.getElementById('artPct').textContent = pillarPct(range,'art') + '%';
}

// Detail
const dailyQuestions = [
  "Qu’ai‑je fait aujourd’hui qui va compounder dans 1 an ?",
  "Quel obstacle récurrent ai‑je réduit de 1% ?",
  "Quelle croyance ai‑je testée contre la réalité ?",
  "Qu’ai‑je publié ou partagé, même minimalement ?",
  "Qu’est‑ce qui m’a distrait et comment le fracturer demain ?",
  "Une décision binaire qui simplifie mon système ?",
  "Qu’ai‑je appris que je peux enseigner en 3 lignes ?"
];
function phaseDesc(p){ return p===1?'Reset (stabilité, clarté, socle)': p===2?'Intensité (profondeur, production)':'Vision (publication, diffusion)'; }
function guideFor(day){
  const p=phaseOf(day);
  if(p===1) return `Socle: sommeil régulier, Absence substances Cat.2 zéro, Cat.1 → Vert d’ici J7, Éveil physiologique/Performance cognitive quotidiennes, micro‑expression.`;
  if(p===2) return `Profondeur: sessions longues, Compétence et Valeur quotidiennes, Paye soutenue.`;
  return `Vision: Impact hebdo, consolidation des compétences, cohérence publique.`;
}

let longPressTimer=null;
function attachTaskInteractions(el, day, key){
  // Appui court = cycle état, appui long = vert
  const cycle = ()=>{
    const cur = state[day].tasks[key] ?? 0;
    const next = (cur+1)%3; state[day].tasks[key]=next; saveState(); openDay(day); renderGrid();
  };
  const setGreen = ()=>{
    state[day].tasks[key]=2; saveState(); openDay(day); renderGrid();
  };
  el.addEventListener('click', (e)=>{ e.preventDefault(); cycle(); });
  el.addEventListener('pointerdown', ()=>{
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(setGreen, 550);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt=> el.addEventListener(evt, ()=> clearTimeout(longPressTimer)));
}

function renderTaskRow(containerId, day, items, weights){
  const wrap = document.getElementById(containerId); wrap.innerHTML='';
  items.forEach((t, idx)=>{
    const st = state[day].tasks[t.k] ?? 0;
    const row = document.createElement('div'); row.className='task'; row.dataset.task=t.k;
    const status = document.createElement('div'); status.className='status ' + (st===0?'gray':st===1?'blue':'green');
    const label = document.createElement('div'); label.className='label';
    const icon = document.createElement('span'); icon.className='icon'; icon.textContent = t.icon;
    const txt = document.createElement('span'); txt.textContent = t.label;
    const pts = document.createElement('div'); pts.textContent = `${weights[idx]} pts`; pts.style.opacity=.7;
    label.appendChild(icon); label.appendChild(txt);
    row.appendChild(status); row.appendChild(label); row.appendChild(pts);
    attachTaskInteractions(row, day, t.k); // clic sur la ligne entière
    wrap.appendChild(row);
  });
}

function openDay(day){
  ensureDay(day);
  document.getElementById('detail').classList.remove('hidden');
  document.getElementById('detailTitle').textContent = `Jour ${day}`;
  document.getElementById('detailPhase').textContent = `Phase ${phaseOf(day)} — ${phaseDesc(phaseOf(day))}`;
  document.getElementById('detailDate').textContent = fmtDate(dateForDay(day));
  document.getElementById('dayGuide').textContent = guideFor(day);
  const {got,max} = pointsFor(day);
  document.getElementById('detailPoints').textContent = `${got}/${max} pts`;

  // Split par piliers
  const all = tasksFor(day); const w = weightsFor(day);
  const org = all.filter((t)=> t.pillar==='org'); const wOrg = w.filter((_,i)=> all[i].pillar==='org');
  const str = all.filter((t)=> t.pillar==='str'); const wStr = w.filter((_,i)=> all[i].pillar==='str');
  const art = all.filter((t)=> t.pillar==='art'); const wArt = w.filter((_,i)=> all[i].pillar==='art');
  renderTaskRow('tasksOrg', day, org, wOrg);
  renderTaskRow('tasksStr', day, str, wStr);
  renderTaskRow('tasksArt', day, art, wArt);

  // Question du jour
  const q = dailyQuestions[(day-1) % dailyQuestions.length];
  document.getElementById('dayQuestion').textContent = q;
  document.getElementById('dayAnswer').value = state[day].answer || '';

  // Tags quick insert
  document.querySelectorAll('.tag').forEach(btn=>{
    btn.onclick = ()=>{
      const t = btn.dataset.tag + ' ';
      const ta = document.getElementById('dayNotes');
      ta.value = (ta.value||'') + (ta.value.endsWith(' ')||ta.value===''?'':' ') + t;
    };
  });

  // Notes
  document.getElementById('dayNotes').value = state[day].notes || '';
  document.getElementById('saveDay').onclick = ()=>{
    state[day].notes = document.getElementById('dayNotes').value;
    state[day].answer = document.getElementById('dayAnswer').value;
    saveState();
  };
}

// Sparkline
function renderSpark(){
  const svg = document.getElementById('spark');
  const w=200,h=40; const pad=2;
  const pts=[];
  const today = Math.max(1, Math.min(DAYS_TOTAL, Math.floor((new Date()-new Date(startDate))/(1000*60*60*24))+1));
  const start = Math.max(1, today-13);
  let maxVal = 1;
  for(let d=start; d<=Math.min(DAYS_TOTAL, start+13); d++){
    const {got,max} = pointsFor(d);
    const v = Math.round(100*got/max); maxVal = Math.max(maxVal, v);
    pts.push(v);
  }
  const step = (w-2*pad)/Math.max(1, pts.length-1);
  const points = pts.map((v,i)=> `${pad+i*step},${h-pad - (v/maxVal)*(h-2*pad)}`).join(' ');
  svg.innerHTML = `<polyline fill="none" stroke="url(#g)" stroke-width="2" points="${points}"/> 
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2dd4bf"/></linearGradient></defs>`;
}

// Auto-plan: sélectionne 3 tâches à forte levier aujourd'hui (une par pilier si possible)
function autoplanToday(){
  const today = Math.max(1, Math.min(DAYS_TOTAL, Math.floor((new Date()-new Date(startDate))/(1000*60*60*24))+1));
  ensureDay(today);
  const all = tasksFor(today);
  // Priorités: org: energie/conscience, str: valeur ou competence, art: paye
  const pick = [];
  const byKey = (k)=> all.find(t=>t.k===k);
  ['energie','valeur','paye','conscience','competence','savoir'].forEach(k=>{
    const t = byKey(k);
    if(t && pick.length<3) pick.push(t.k);
  });
  state[today].autoplan = pick;
  saveState();
  openDay(today);
}

// MVI
function doMVI(){
  const today = Math.max(1, Math.min(DAYS_TOTAL, Math.floor((new Date()-new Date(startDate))/(1000*60*60*24))+1));
  ensureDay(today);
  ['energie','conscience','paye'].forEach(k=>{
    if(state[today].tasks[k]!==undefined) state[today].tasks[k]=2;
  });
  saveState(); openDay(today); renderGrid();
}

// Start date, filters, IO
function setStartDateInput(){
  const input=document.getElementById('startDate'); input.value=fmtDate(startDate);
  input.addEventListener('change',()=>{
    const d = new Date(input.value);
    if(String(d)!=='Invalid Date'){ startDate=d; localStorage.setItem(KEY_START, startDate.toISOString()); renderGrid(); }
  });
}
function handleToday(){
  document.getElementById('todayBtn').addEventListener('click', ()=>{
    const today = new Date();
    const diff = Math.floor((today - new Date(startDate))/(1000*60*60*24)) + 1;
    const day = Math.max(1, Math.min(DAYS_TOTAL, diff));
    openDay(day);
    const card=document.querySelector(`.card[data-day="${day}"]`);
    if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
  });
}
function handleMVI(){ document.getElementById('mviBtn').addEventListener('click', doMVI); }
function handleAutoplan(){ document.getElementById('autoplanBtn').addEventListener('click', autoplanToday); }
function handleFilter(){ 
  document.getElementById('phaseFilter').addEventListener('change', renderGrid);
  document.getElementById('searchDay').addEventListener('input', renderGrid);
}
function handleExportImport(){
  const exp=document.getElementById('exportBtn'), imp=document.getElementById('importBtn'), file=document.getElementById('importFile');
  exp.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({start:startDate.toISOString(), state}, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='shift90_v3_export.json'; a.click(); URL.revokeObjectURL(url);
  });
  imp.addEventListener('click', ()=> file.click());
  file.addEventListener('change', ()=>{
    const f=file.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(data.start){ startDate=new Date(data.start); localStorage.setItem(KEY_START, startDate.toISOString()); }
        if(data.state){ state=data.state; saveState(); }
        renderGrid(); alert('Import OK');
      }catch(e){ alert('Fichier invalide'); }
    };
    reader.readAsText(f);
  });

  // CSV export
  document.getElementById('exportCsvBtn').addEventListener('click', ()=>{
    let rows = [['Jour','Date','Clé','Label','Pôle','État(0-2)','Points','Notes','Réponse']];
    for(let day=1; day<=DAYS_TOTAL; day++){
      ensureDay(day);
      const t=tasksFor(day), w=weightsFor(day);
      t.forEach((task,i)=>{
        rows.push([day, fmtDate(dateForDay(day)), task.k, task.label, task.pillar, state[day].tasks[task.k]||0, w[i], state[day].notes||'', state[day].answer||'']);
      });
    }
    const csv = rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='shift90_v3_points.csv'; a.click(); URL.revokeObjectURL(url);
  });
}

// Notifications
function timeToNext(msTime){
  const [h,m]=msTime.split(':').map(Number);
  const now=new Date(); const target=new Date();
  target.setHours(h,m,0,0); if(target<=now) target.setDate(target.getDate()+1);
  return target-now;
}
let notifTimers=[]; function clearNotifTimers(){ notifTimers.forEach(t=>clearTimeout(t)); notifTimers=[]; }
function scheduleLocalNotifs(){
  clearNotifTimers(); if(Notification.permission!=='granted') return;
  const add=(title,body,delay)=>{ const id=setTimeout(()=>{ new Notification(title,{body}); scheduleLocalNotifs(); },delay); notifTimers.push(id); };
  add('Shift 90 — Matin','Check-in: Éveil physiologique, Performance cognitive, Paye.', timeToNext(notif.morning));
  add('Shift 90 — Après-midi','Focus: Savoir/Compétence/Valeur.', timeToNext(notif.noon));
  add('Shift 90 — Soir','Revue & Alignement: 3 lignes + question du jour.', timeToNext(notif.evening));
}
function handleNotifications(){
  document.getElementById('notifMorning').value=notif.morning;
  document.getElementById('notifNoon').value=notif.noon;
  document.getElementById('notifEvening').value=notif.evening;
  document.getElementById('reqPerm').addEventListener('click', ()=>{
    Notification.requestPermission().then(p=>{ if(p==='granted') scheduleLocalNotifs(); else alert('Autorisation refusée'); });
  });
  document.getElementById('saveNotif').addEventListener('click', ()=>{
    notif.morning=document.getElementById('notifMorning').value;
    notif.noon=document.getElementById('notifNoon').value;
    notif.evening=document.getElementById('notifEvening').value;
    localStorage.setItem(KEY_NOTIF, JSON.stringify(notif));
    scheduleLocalNotifs();
  });
}

// SW
if('serviceWorker' in navigator){ window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js')); }

function init(){
  setStartDateInput(); handleToday(); handleMVI(); handleAutoplan(); handleFilter(); handleExportImport(); handleNotifications(); renderGrid();
}
init();

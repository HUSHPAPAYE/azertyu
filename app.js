/* Shift90 minimal PWA with inline day detail and scientific labels */
const LABELS = {
  consciousness: "Performance cognitive",
  energy: "Éveil physiologique",
  clarity_cat1: "Absence substances Cat.1",
  clarity_cat2: "Absence substances Cat.2",
  streak: "Streak ≥60%",
  phase: "Phase"
};

const STORAGE_KEY = "shift90_v3_state";
const START_DATE = new Date(); // today as Day 1

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveState(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function dayDate(dayIndex){ // 1..90
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + (dayIndex-1));
  return d;
}
function fmtDate(d){
  return d.toISOString().slice(0,10);
}

function tasksFor(day){
  // state fields for the day
  return [
    {key:"consciousness", label:LABELS.consciousness, type:"bool"},
    {key:"energy", label:LABELS.energy, type:"bool"},
    {key:"clarity_cat1", label:LABELS.clarity_cat1, type:"bool"},
    {key:"clarity_cat2", label:LABELS.clarity_cat2, type:"bool"}
  ];
}

function computeMetrics(state){
  // simple example metrics
  let energy = 0, days>=60
  let count60 = 0;
  for(let i=1;i<=90;i++){
    const s = state[i] || {};
    const vals = ["consciousness","energy","clarity_cat1","clarity_cat2"].map(k=>!!s[k]);
    const score = vals.reduce((a,b)=>a+(b?25:0),0);
    energy += (s.energy?1:0);
    if(score>=60) count60++;
  }
  const streakPercent = Math.round((count60/90)*100);
  return {energy, streakPercent, phase:"P1"};
}

function renderMetrics(state){
  const m = computeMetrics(state);
  document.getElementById("m_energy").textContent = m.energy;
  document.getElementById("m_streak").textContent = m.streakPercent + "%";
  document.getElementById("m_phase").textContent = m.phase;
}

function buildCard(day, state){
  const d = dayDate(day);
  const el = document.createElement("article");
  el.className = "day-card";
  el.dataset.day = String(day);
  el.innerHTML = `
    <div class="num">${day}</div>
    <div class="date">${fmtDate(d)}</div>
    <div class="pills">
      <span class="pill">${LABELS.consciousness}</span>
      <span class="pill">${LABELS.energy}</span>
      <span class="pill">${LABELS.clarity_cat1}</span>
      <span class="pill">${LABELS.clarity_cat2}</span>
    </div>
  `;
  el.addEventListener("click", ()=> openDayAtCard(day, el));
  return el;
}

function buildDetailHTML(day, state){
  const d = dayDate(day);
  const s = state[day] || {};
  const fields = tasksFor(day).map(t=>{
    const id = `sw_${day}_${t.key}`;
    const checked = s[t.key] ? "checked" : "";
    return `<label class="switch"><input type="checkbox" id="${id}" ${checked} data-key="${t.key}"><span>${t.label}</span></label>`;
  }).join("");
  return `
    <div class="detail-head">
      <h3>Jour <span class="d-num">${day}</span> — <span class="d-date">${fmtDate(d)}</span></h3>
      <button class="close">Fermer</button>
    </div>
    <div class="detail-body">
      <div class="switches">${fields}</div>
      <p class="small">Les états sont enregistrés localement sur cet appareil.</p>
    </div>
  `;
}

function openDayAtCard(day, cardEl){
  document.querySelectorAll(".day-detail").forEach(n=>n.remove());
  const state = loadState();
  const host = document.createElement("section");
  host.className = "day-detail";
  host.innerHTML = buildDetailHTML(day, state);
  cardEl.insertAdjacentElement("afterend", host);
  host.querySelector("button.close").addEventListener("click", ()=> host.remove());
  // listeners
  host.querySelectorAll("input[type=checkbox]").forEach(chk=>{
    chk.addEventListener("change", e=>{
      const key = e.target.dataset.key;
      const st = loadState();
      st[day] = st[day] || {};
      st[day][key] = e.target.checked;
      saveState(st);
      renderMetrics(st);
    });
  });
  host.scrollIntoView({behavior:"smooth", block:"start"});
}

function exportJSON(){
  const data = {generatedAt:new Date().toISOString(), state: loadState()};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a = Object.assign(document.createElement("a"),{href:url,download:"shift90-export.json"});
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function exportCSV(){
  const st = loadState();
  const rows = [["day","date","consciousness","energy","clarity_cat1","clarity_cat2"]];
  for(let i=1;i<=90;i++){
    const s = st[i] || {};
    rows.push([i, fmtDate(dayDate(i)), s.consciousness?1:0, s.energy?1:0, s.clarity_cat1?1:0, s.clarity_cat2?1:0]);
  }
  const csv = rows.map(r=>r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  const a = Object.assign(document.createElement("a"),{href:url,download:"shift90-export.csv"});
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(reader.result);
      if(obj && obj.state){ saveState(obj.state); renderMetrics(loadState()); alert("Import OK"); }
      else alert("Format invalide");
    }catch{ alert("JSON invalide"); }
  };
  reader.readAsText(file);
}

function init(){
  const grid = document.getElementById("grid");
  const state = loadState();
  for(let i=1;i<=90;i++){ grid.appendChild(buildCard(i, state)); }
  renderMetrics(state);

  document.getElementById("btn_export_json").onclick = exportJSON;
  document.getElementById("btn_export_csv").onclick = exportCSV;
  document.getElementById("btn_import").onclick = ()=> document.getElementById("file_import").click();
  document.getElementById("file_import").addEventListener("change", e=>{
    const f = e.target.files[0]; if(f) importJSON(f);
  });
}

document.addEventListener("DOMContentLoaded", init);

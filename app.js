const state = { mode: "basic", lastResult: null };

function unitOptions(selected="infantry"){
  return UNIT_ORDER.map(id => `<option value="${id}" ${id===selected?"selected":""}>${UNITS[id].name}</option>`).join("");
}
function heroOptions(selected="none"){
  return Object.keys(HEROES).map(id => `<option value="${id}" ${id===selected?"selected":""}>${HEROES[id].name}</option>`).join("");
}
function affectsOptions(selected="all"){
  const rows = [["all","Todos"], ...UNIT_ORDER.map(id => [id, UNITS[id].name])];
  return rows.map(([id,name]) => `<option value="${id}" ${id===selected?"selected":""}>${name}</option>`).join("");
}

const UNIT_ICONS = {
  infantry:"🪖",
  cavalry:"🐎",
  armoredCar:"🚙",
  lightTank:"🛡️",
  heavyTank:"🛡️",
  stormtrooper:"⚔️",
  artillery:"💥",
  railgun:"🚂",
  balloon:"🎈",
  fighter:"✈️",
  bomber:"🛩️",
  airship:"🎯"
};

function cleanNumber(value, digits=2){
  const n = Number(value);
  if(!Number.isFinite(n)) return "";
  const rounded = Math.round(n * Math.pow(10,digits)) / Math.pow(10,digits);
  return String(rounded).replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1");
}

function unitMaxHp(type, count){
  const unit = UNITS[type];
  return unit ? Number(unit.hp || 0) * Number(count || 0) : 0;
}

function parseHpInputForRow(rawHp, type, count){
  const max = unitMaxHp(type, count);
  const raw = String(rawHp ?? "100%").trim();
  if(raw.endsWith("%")){
    const pct = Number(raw.replace("%","")) || 0;
    return {hp:max * pct / 100, pct};
  }
  const hp = Number(raw);
  if(Number.isFinite(hp)){
    return {hp, pct:max ? hp / max * 100 : 0};
  }
  return {hp:max, pct:100};
}

function updateUnitRow(row, changed="auto"){
  if(!row) return;
  const type = row.querySelector(".unit-type")?.value || "infantry";
  const unit = UNITS[type] || UNITS.infantry;
  const countInput = row.querySelector(".unit-count");
  const hpInput = row.querySelector(".unit-hp");
  const pctInput = row.querySelector(".unit-hp-percent");
  const count = Math.max(0, Number(countInput?.value || 0));
  const max = unit.hp * count;

  row.querySelector(".unit-icon").textContent = UNIT_ICONS[type] || "⚔️";
  row.querySelector(".unit-meta").textContent = `HP unidad: ${unit.hp} · Daño normal: ${unit.combat?.normal?.attack ?? "-"} / Def: ${unit.combat?.normal?.defense ?? "-"}`;

  let hp = Number(hpInput?.value || 0);
  let pct = Number(pctInput?.value || 0);

  if(changed === "percent"){
    pct = Number(pctInput.value || 0);
    hp = max * pct / 100;
    hpInput.value = cleanNumber(hp);
  }else if(changed === "hp"){
    hp = Number(hpInput.value || 0);
    pct = max ? hp / max * 100 : 0;
    pctInput.value = cleanNumber(pct, 1);
  }else{
    if(changed === "type" || changed === "count"){
      pct = Number(pctInput.value || 100);
      if(!Number.isFinite(pct)) pct = 100;
      hp = max * pct / 100;
      hpInput.value = cleanNumber(hp);
    }else{
      hp = Number(hpInput.value || max);
      pct = max ? hp / max * 100 : 0;
      pctInput.value = cleanNumber(pct, 1);
    }
  }

  const over = hp > max && max > 0;
  const under = hp < 0 || pct < 0;
  const invalid = over || under || count <= 0;
  row.classList.toggle("hp-error", invalid);

  row.querySelector(".max-hp-label").textContent = `Máximo: ${cleanNumber(max)} HP (${count} × ${unit.hp})`;
  const warning = row.querySelector(".hp-warning");
  if(over) warning.textContent = `Excede el máximo por ${cleanNumber(hp - max)} HP`;
  else if(count <= 0) warning.textContent = "Cantidad debe ser mayor que 0";
  else if(under) warning.textContent = "HP o porcentaje inválido";
  else warning.textContent = `Vida: ${cleanNumber(pct,1)}%`;

  const bar = row.querySelector(".hp-bar i");
  const barPct = Math.max(0, Math.min(100, pct));
  if(bar) bar.style.width = `${barPct}%`;

  updateArmyHpSummaryForRow(row);
}

function updateArmyHpSummaryForRow(row){
  const list = row?.closest(".unit-list");
  if(!list) return;
  const army = list.id === "unitsA" ? "A" : "B";
  updateArmyHpSummary(army);
}

function updateArmyHpSummary(army){
  const list = document.querySelector(`#units${army}`);
  if(!list) return;
  let max = 0;
  let hp = 0;
  [...list.querySelectorAll(".unit-row")].forEach(row => {
    const type = row.querySelector(".unit-type")?.value || "infantry";
    const count = Number(row.querySelector(".unit-count")?.value || 0);
    const rowMax = unitMaxHp(type, count);
    const rowHp = Number(row.querySelector(".unit-hp")?.value || 0);
    max += rowMax;
    hp += rowHp;
  });
  let summary = list.parentElement.querySelector(`.stack-hp-summary[data-army="${army}"]`);
  if(!summary){
    summary = document.createElement("div");
    summary.className = "stack-hp-summary";
    summary.dataset.army = army;
    list.insertAdjacentElement("afterend", summary);
  }
  const pct = max ? hp / max * 100 : 0;
  summary.innerHTML = `<strong>HP total del stack:</strong> ${cleanNumber(hp)} / ${cleanNumber(max)} HP · ${cleanNumber(pct,1)}%`;
}

function updateAllUnitRows(){
  document.querySelectorAll(".unit-row").forEach(row => updateUnitRow(row, "auto"));
  updateArmyHpSummary("A");
  updateArmyHpSummary("B");
}

function createUnitRow(data={}){
  const row = document.querySelector("#unitRowTemplate").content.firstElementChild.cloneNode(true);
  const type = data.type || "infantry";
  const count = data.count ?? 10;
  row.querySelector(".unit-type").innerHTML = unitOptions(type);
  row.querySelector(".unit-count").value = count;

  const parsed = parseHpInputForRow(data.hp ?? "100%", type, count);
  row.querySelector(".unit-hp").value = cleanNumber(parsed.hp);
  row.querySelector(".unit-hp-percent").value = cleanNumber(parsed.pct, 1);
  updateUnitRow(row, "init");
  return row;
}
function addUnit(army, data={}){
  const list = document.querySelector(`#units${army}`);
  list.appendChild(createUnitRow(data));
  updateArmyHpSummary(army);
}
function initHeroes(){
  ["A","B"].forEach(army => {
    document.querySelector(`#hero${army}`).innerHTML = heroOptions("none");
    document.querySelector(`#heroAffects${army}`).innerHTML = affectsOptions("all");
  });
}
function applyHeroPreset(army){
  const select = document.querySelector(`#hero${army}`);
  const preset = HEROES[select.value] || HEROES.none;
  if(select.value === "custom") return;
  document.querySelector(`#heroAffects${army}`).value = preset.affects || "all";
  document.querySelector(`#heroAttack${army}`).value = preset.attackBonus || 0;
  document.querySelector(`#heroDefense${army}`).value = preset.defenseBonus || 0;
  document.querySelector(`#heroHp${army}`).value = preset.hpBonus || 0;
}
function readHero(army){
  const id = document.querySelector(`#hero${army}`).value || "none";
  return {
    id,
    name: HEROES[id]?.name || "Sin héroe",
    level: 20,
    affects: document.querySelector(`#heroAffects${army}`).value || "all",
    attackBonus: Number(document.querySelector(`#heroAttack${army}`).value || 0),
    defenseBonus: Number(document.querySelector(`#heroDefense${army}`).value || 0),
    hpBonus: Number(document.querySelector(`#heroHp${army}`).value || 0),
    duration: 0
  };
}
function readUnits(army){
  return [...document.querySelectorAll(`#units${army} .unit-row`)].map(row => ({
    type: row.querySelector(".unit-type").value,
    count: Number(row.querySelector(".unit-count").value || 0),
    hp: row.querySelector(".unit-hp").value || "0"
  })).filter(unit => unit.count > 0);
}
function readStack(army){
  return {
    id: `${army}1`,
    target: document.querySelector(`#target${army}`)?.value || (army === "A" ? "B1" : "Defend"),
    terrain: document.querySelector(`#terrain${army}`)?.value || "land",
    targetClass: document.querySelector(`#targetClass${army}`)?.value || "auto",
    position: Number(document.querySelector(`#pos${army}`)?.value || 0),
    fortress: document.querySelector(`#fort${army}`)?.value || "none",
    fortHp: Number(document.querySelector(`#fortHp${army}`)?.value || 0),
    hero: readHero(army),
    units: readUnits(army)
  };
}
function readArmy(army){ return { id: army, stacks: [readStack(army)] }; }
function setMode(mode){
  state.mode = mode;
  document.body.dataset.mode = mode;
  document.querySelectorAll(".mode").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  if(document.querySelector("#modeHint")) updateModeHint();
}
function format(n, d=1){
  if(n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return Number(n).toFixed(d).replace(/\.0$/, "");
}
function winnerClass(text){
  if(String(text).includes("A")) return "win-a";
  if(String(text).includes("B")) return "win-b";
  return "";
}
function mainWinnerText(result){
  if(result.probabilityA !== undefined){
    if(result.probabilityA > result.probabilityB) return `Army A favorito (${format(result.probabilityA)}%)`;
    if(result.probabilityB > result.probabilityA) return `Army B favorito (${format(result.probabilityB)}%)`;
    return "Batalla muy pareja";
  }
  return result.winner || "Sin ganador";
}
function buildWarnings(result){
  const warnings = [];
  if(result.probabilityA !== undefined){
    if(Math.abs(result.probabilityA - result.probabilityB) <= 10) warnings.push(["danger","Batalla muy pareja: una mala tirada puede cambiar el resultado."]);
    if(result.probabilityA >= 70) warnings.push(["safe",`Army A tiene ventaja clara: ${format(result.probabilityA)}% de victorias.`]);
    if(result.probabilityB >= 70) warnings.push(["safe",`Army B tiene ventaja clara: ${format(result.probabilityB)}% de victorias.`]);
    return warnings.length ? warnings : [["safe","Sin alertas fuertes en la varianza."]];
  }
  const hpA = result.armyA.totalInitialHp ? result.armyA.totalRemainingHp / result.armyA.totalInitialHp : 0;
  const hpB = result.armyB.totalInitialHp ? result.armyB.totalRemainingHp / result.armyB.totalInitialHp : 0;
  if(hpA < 0.25) warnings.push(["danger","Army A queda por debajo de 25% de HP."]);
  if(hpB < 0.25) warnings.push(["danger","Army B queda por debajo de 25% de HP."]);
  [...(result.armyA.fortAlerts || []), ...(result.armyB.fortAlerts || [])].forEach(alert => warnings.push(["danger", alert.text]));
  return warnings.length ? warnings : [["safe","Sin alertas críticas detectadas."]];
}
function renderSimpleResult(result){
  const hero = document.querySelector("#summaryResult");
  hero.className = `result-hero ${winnerClass(mainWinnerText(result))}`;
  hero.innerHTML = `<div><p class="eyebrow">Resultado principal</p><h2>${mainWinnerText(result)}</h2><p>${result.note || "Resultado estimado de la simulación."}</p></div>`;
  const warnings = buildWarnings(result).map(([type,text]) => `<div class="warning ${type}">${text}</div>`).join("");
  const advice = buildHumanAdvice(result);
  if(result.probabilityA !== undefined){
    document.querySelector("#simpleReport").innerHTML = `
      <div class="report-cards">
        <div class="report-card"><strong>Victoria Army A</strong><b>${format(result.probabilityA)}%</b></div>
        <div class="report-card"><strong>Victoria Army B</strong><b>${format(result.probabilityB)}%</b></div>
        <div class="report-card"><strong>Rondas promedio</strong><b>${format(result.avgRounds,2)}</b></div>
      </div>
      <div class="advice-box"><strong>Lectura táctica:</strong> ${advice}</div>
      ${warnings}
      <div class="copy-note"><button type="button" data-action="copy-summary">Copiar resumen</button></div>`;
    return;
  }
  document.querySelector("#simpleReport").innerHTML = `
    <div class="report-cards">
      <div class="report-card"><strong>Ganador</strong><b>${result.winner}</b></div>
      <div class="report-card"><strong>HP Army A</strong><b>${format(result.armyA.totalRemainingHp)} / ${format(result.armyA.totalInitialHp)}</b></div>
      <div class="report-card"><strong>HP Army B</strong><b>${format(result.armyB.totalRemainingHp)} / ${format(result.armyB.totalInitialHp)}</b></div>
    </div>
    <div class="advice-box"><strong>Lectura táctica:</strong> ${advice}</div>
    ${warnings}
    <div class="copy-note"><button type="button" data-action="copy-summary">Copiar resumen</button></div>`;
}
function renderTechnical(result){
  if(result.probabilityA !== undefined){
    document.querySelector("#technicalReport").innerHTML = `
      <table><thead><tr><th>Dato</th><th>Valor</th></tr></thead><tbody>
        <tr><td>Simulaciones</td><td>${result.runs}</td></tr>
        <tr><td>Gana Army A</td><td>${result.winsA}</td></tr>
        <tr><td>Gana Army B</td><td>${result.winsB}</td></tr>
        <tr><td>Empates</td><td>${result.draws}</td></tr>
        <tr><td>HP promedio A</td><td>${result.avgRemainingHpA}</td></tr>
        <tr><td>HP promedio B</td><td>${result.avgRemainingHpB}</td></tr>
      </tbody></table>`;
    return;
  }
  const rows = [
    ["Army A", result.armyA.totalInitialUnits, result.armyA.totalRemainingUnits, result.armyA.totalDeadUnits, result.armyA.totalLostHp],
    ["Army B", result.armyB.totalInitialUnits, result.armyB.totalRemainingUnits, result.armyB.totalDeadUnits, result.armyB.totalLostHp]
  ].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${format(r[4])}</td></tr>`).join("");
  document.querySelector("#technicalReport").innerHTML = `
    <table><thead><tr><th>Ejército</th><th>Iniciales</th><th>Restantes</th><th>Bajas</th><th>HP perdido</th></tr></thead><tbody>${rows}</tbody></table>
    <table><thead><tr><th>Tiempo</th><th>A aplicado</th><th>B aplicado</th><th>HP A</th><th>HP B</th></tr></thead>
    <tbody>${(result.roundLog || []).slice(0,25).map(r => `<tr><td>${r.tickLabel ?? r.round}</td><td>${format(r.attackApplied)}</td><td>${format(r.defenseApplied)}</td><td>${format(r.hpA)}</td><td>${format(r.hpB)}</td></tr>`).join("")}</tbody></table>`;
}

function updateModeHint(){
  const hint = document.querySelector("#modeHint");
  const text = {
    basic: ["Modo básico", "Solo coloca unidades, cantidad y HP. Ideal para calcular rápido sin distracciones."],
    tactical: ["Modo táctico", "Agrega terreno, posición y objetivos. Útil cuando importa la distancia, el desembarco o el rango."],
    advanced: ["Modo avanzado", "Activa fortalezas, héroes, varianza y exportación. Úsalo para análisis completo."]
  }[state.mode] || ["Modo básico", "Calcula rápido."];
  hint.innerHTML = `<strong>${text[0]}</strong><span>${text[1]}</span>`;
}

function hideGuide(){
  const guide = document.querySelector("#startGuide");
  if(guide) guide.style.display = "none";
  localStorage.setItem("battleLab1914.stage19.hideGuide", "1");
}

function restoreGuide(){
  if(localStorage.getItem("battleLab1914.stage19.hideGuide") === "1"){
    const guide = document.querySelector("#startGuide");
    if(guide) guide.style.display = "none";
  }
}

function armyReadableName(army){
  return army === "A" ? "Army A" : "Army B";
}

function validateBeforeSimulate(){
  updateAllUnitRows();
  const errors = [];
  ["A","B"].forEach(army => {
    const rows = [...document.querySelectorAll(`#units${army} .unit-row`)];
    const units = readUnits(army);
    if(!units.length) errors.push(`${armyReadableName(army)} no tiene unidades válidas.`);
    rows.forEach((row, index) => {
      const type = row.querySelector(".unit-type").value;
      const unit = UNITS[type];
      const count = Number(row.querySelector(".unit-count").value || 0);
      const hp = Number(row.querySelector(".unit-hp").value || 0);
      const pct = Number(row.querySelector(".unit-hp-percent").value || 0);
      const max = unitMaxHp(type, count);
      if(!unit) errors.push(`${armyReadableName(army)} unidad ${index+1}: tipo inválido.`);
      if(count <= 0) errors.push(`${armyReadableName(army)} unidad ${index+1}: cantidad debe ser mayor que 0.`);
      if(!Number.isFinite(hp)) errors.push(`${armyReadableName(army)} unidad ${index+1}: HP inválido.`);
      if(hp < 0) errors.push(`${armyReadableName(army)} unidad ${index+1}: HP no puede ser negativo.`);
      if(hp > max) errors.push(`${armyReadableName(army)} unidad ${index+1}: HP máximo permitido ${cleanNumber(max)}.`);
      if(!Number.isFinite(pct) || pct < 0) errors.push(`${armyReadableName(army)} unidad ${index+1}: porcentaje inválido.`);
      if(pct > 100.01) errors.push(`${armyReadableName(army)} unidad ${index+1}: porcentaje supera 100%.`);
    });
  });
  const maxRounds = Number(document.querySelector("#maxRounds").value || 0);
  if(maxRounds <= 0) errors.push("Las rondas deben ser mayores que 0.");
  if(document.querySelector("#simulateVariance").checked){
    const runs = Number(document.querySelector("#simulationRuns").value || 0);
    if(runs < 2) errors.push("Para varianza usa al menos 2 simulaciones.");
    if(runs > 1000) errors.push("Para evitar lentitud, usa máximo 1000 simulaciones.");
  }
  renderValidation(errors);
  return errors.length === 0;
}

function renderValidation(errors){
  const box = document.querySelector("#validationBox");
  if(!errors.length){
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = `<strong>Revisa estos datos antes de simular:</strong><ul>${errors.map(e=>`<li>${e}</li>`).join("")}</ul>`;
}

function describeArmyLoss(summary){
  if(!summary || !summary.totalInitialHp) return "sin datos";
  const lostPct = summary.totalInitialHp ? (summary.totalLostHp / summary.totalInitialHp) * 100 : 0;
  if(lostPct < 15) return "daño leve";
  if(lostPct < 40) return "daño moderado";
  if(lostPct < 70) return "daño fuerte";
  return "daño crítico";
}

function buildHumanAdvice(result){
  if(result.probabilityA !== undefined){
    if(Math.abs(result.probabilityA - result.probabilityB) <= 10){
      return "La batalla está muy pareja. Conviene agregar refuerzos, mejorar posición o simular varias veces antes de atacar.";
    }
    if(result.probabilityA > result.probabilityB){
      return "Army A tiene ventaja estadística. Aun así, revisa el peor caso antes de comprometer tropas importantes.";
    }
    return "Army B tiene ventaja estadística. No conviene atacar sin refuerzos o sin cambiar la condición táctica.";
  }

  const winner = result.winner || "";
  const lossA = describeArmyLoss(result.armyA);
  const lossB = describeArmyLoss(result.armyB);

  if(winner.includes("A")){
    if(lossA === "daño leve" || lossA === "daño moderado"){
      return "Army A gana con margen aceptable. Es una batalla favorable si el enemigo no recibe refuerzos.";
    }
    return "Army A gana, pero queda muy desgastado. Conviene esperar apoyo o reducir el daño antes de entrar.";
  }
  if(winner.includes("B")){
    return "Army B gana o resiste mejor. Atacar así es riesgoso; busca dividir al enemigo, usar fortaleza, rango o refuerzos.";
  }
  return `Resultado cerrado. Army A recibe ${lossA} y Army B recibe ${lossB}. Revisa detalle técnico antes de decidir.`;
}

function makeShareText(result){
  if(result.probabilityA !== undefined){
    return `Battle Lab 1914\nResultado: Army A ${format(result.probabilityA)}% / Army B ${format(result.probabilityB)}%\nRondas promedio: ${format(result.avgRounds,2)}`;
  }
  return `Battle Lab 1914\nGanador estimado: ${result.winner}\nArmy A HP: ${format(result.armyA.totalRemainingHp)} / ${format(result.armyA.totalInitialHp)}\nArmy B HP: ${format(result.armyB.totalRemainingHp)} / ${format(result.armyB.totalInitialHp)}`;
}

async function copyResultSummary(){
  if(!state.lastResult){ alert("Primero simula una batalla."); return; }
  const text = makeShareText(state.lastResult.result);
  try{
    await navigator.clipboard.writeText(text);
    alert("Resumen copiado.");
  }catch(error){
    alert(text);
  }
}

function loadExample(kind){
  resetAll();
  if(kind === "basic"){
    document.querySelector("#unitsA").innerHTML = "";
    document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"infantry",count:80,hp:"100%"});
    addUnit("B",{type:"infantry",count:60,hp:"100%"});
    setMode("basic");
  }
  if(kind === "tactical"){
    document.querySelector("#unitsA").innerHTML = "";
    document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"artillery",count:12,hp:"100%"});
    addUnit("A",{type:"infantry",count:40,hp:"100%"});
    addUnit("B",{type:"infantry",count:80,hp:"100%"});
    addUnit("B",{type:"armoredCar",count:4,hp:"100%"});
    document.querySelector("#posA").value = 50;
    document.querySelector("#posB").value = 0;
    document.querySelector("#targetA").value = "B1";
    setMode("tactical");
  }
  if(kind === "advanced"){
    document.querySelector("#unitsA").innerHTML = "";
    document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"artillery",count:36,hp:"100%"});
    addUnit("B",{type:"infantry",count:120,hp:"100%"});
    addUnit("B",{type:"armoredCar",count:8,hp:"100%"});
    document.querySelector("#posA").value = 50;
    document.querySelector("#fortB").value = "2";
    document.querySelector("#fortHpB").value = 50;
    document.querySelector("#heroA").value = "georg";
    applyHeroPreset("A");
    document.querySelector("#simulateVariance").checked = true;
    document.querySelector("#simulationRuns").value = 250;
    setMode("advanced");
  }
  renderValidation([]);
  document.querySelector("#simpleReport").innerHTML = `<div class="warning safe">Ejemplo ${kind} cargado. Pulsa <b>Simular batalla</b> para ver el resultado.</div>`;
}




function supabaseApi(){
  return window.BattleLabSupabase || null;
}

function loadSupabaseConfigInputs(){
  const api = supabaseApi();
  if(!api) return;
  const cfg = api.getSupabaseConfig();
  const urlInput = document.querySelector("#supabaseUrl");
  const keyInput = document.querySelector("#supabaseAnonKey");
  if(urlInput) urlInput.value = cfg.url || "";
  if(keyInput) keyInput.value = cfg.anonKey || "";
}

function saveSupabaseConfigFromInputs(){
  const api = supabaseApi();
  if(!api){
    alert("No se cargó el cliente de Supabase.");
    return;
  }
  const url = document.querySelector("#supabaseUrl").value;
  const anonKey = document.querySelector("#supabaseAnonKey").value;
  api.saveSupabaseConfig(url, anonKey);
  window.__battleLabSupabaseClient = null;
  updateSessionUI();
  alert("Configuración Supabase guardada en este navegador.");
}

async function testSupabaseConfig(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Supabase no está configurado o no cargó la librería.");
    return;
  }
  try{
    const user = await api.getSupabaseUser();
    alert(user ? `Conexión OK. Sesión activa: ${user.email}` : "Conexión OK. No hay sesión activa todavía.");
  }catch(error){
    alert(`Error al probar Supabase: ${error.message}`);
  }
}

function clearSupabaseConfigFromInputs(){
  const api = supabaseApi();
  if(!api) return;
  api.clearSupabaseConfig();
  window.__battleLabSupabaseClient = null;
  loadSupabaseConfigInputs();
  updateSessionUI();
  alert("Configuración Supabase borrada.");
}

function readLoginProfile(){
  return {
    name:(document.querySelector("#loginName").value || "").trim(),
    email:(document.querySelector("#loginEmail").value || "").trim(),
    password:document.querySelector("#loginPassword")?.value || "",
    country:(document.querySelector("#loginCountry").value || "").trim(),
    role:document.querySelector("#loginRole").value || "General"
  };
}

async function signUpSupabaseFromForm(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const profile = readLoginProfile();
  if(!profile.email || !profile.password || !profile.name){
    alert("Para Supabase necesitas nombre, correo y contraseña.");
    return;
  }
  try{
    const data = await api.signUpWithSupabase({
      email:profile.email,
      password:profile.password,
      profile
    });
    await mirrorSupabaseUserToLocal(data.user, profile);
    closeLogin();
    updateSessionUI();
    openDashboard();
    alert("Registro enviado/creado. Si Supabase exige confirmación por correo, revisa tu email.");
  }catch(error){
    alert(`No se pudo registrar: ${error.message}`);
  }
}

async function signInSupabaseFromForm(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const profile = readLoginProfile();
  if(!profile.email || !profile.password){
    alert("Coloca correo y contraseña.");
    return;
  }
  try{
    const data = await api.signInWithSupabase({
      email:profile.email,
      password:profile.password
    });
    const userMeta = data.user?.user_metadata || {};
    await mirrorSupabaseUserToLocal(data.user, {
      name:profile.name || userMeta.name || userMeta.username || profile.email,
      email:profile.email,
      country:profile.country || userMeta.country || "",
      role:profile.role || userMeta.role || "General"
    });
    closeLogin();
    updateSessionUI();
    openDashboard();
  }catch(error){
    alert(`No se pudo iniciar sesión: ${error.message}`);
  }
}

async function mirrorSupabaseUserToLocal(supabaseUser, profile){
  if(!supabaseUser) return;
  const id = `supabase-${supabaseUser.id}`;
  const users = getPlatformUsers();
  users[id] = users[id] || {
    id,
    supabaseId:supabaseUser.id,
    createdAt:new Date().toISOString(),
    scenarios:[],
    history:[]
  };
  users[id].name = profile.name || supabaseUser.email || "Jugador";
  users[id].email = supabaseUser.email || profile.email || "";
  users[id].country = profile.country || "";
  users[id].role = profile.role || "General";
  users[id].authProvider = "supabase";
  users[id].updatedAt = new Date().toISOString();
  setPlatformUsers(users);
  localStorage.setItem(PLATFORM_SESSION_KEY, id);
}

async function restoreSupabaseSession(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()) return;
  try{
    const user = await api.getSupabaseUser();
    if(user && !getCurrentUser()){
      await mirrorSupabaseUserToLocal(user, {
        name:user.user_metadata?.name || user.user_metadata?.username || user.email,
        email:user.email,
        country:user.user_metadata?.country || "",
        role:user.user_metadata?.role || "General"
      });
      updateSessionUI();
    }
  }catch(error){}
}






function startProductionApp(){
  document.querySelector("#productionHome")?.scrollIntoView({behavior:"smooth", block:"end"});
  const guide = document.querySelector("#startGuide");
  if(guide) guide.style.display = "none";
  document.querySelector(".mode-panel")?.scrollIntoView({behavior:"smooth"});
}

function loadPublicDemo(){
  if(typeof loginDemoUser === "function" && !getCurrentUser()){
    try{ loginDemoUser(); }catch(error){}
  }
  if(typeof loadExample === "function"){
    loadExample("basic");
  }else{
    resetAll();
  }
  setMode("basic");
  document.querySelector("#simpleReport").innerHTML = `
    <div class="warning safe"><b>Modo demo público cargado.</b> Este modo permite probar la calculadora sin configurar Supabase.</div>
    <div class="warning">Puedes simular, cambiar unidades o pasar a modo táctico/avanzado.</div>`;
  document.querySelector(".mode-panel")?.scrollIntoView({behavior:"smooth"});
}

function showProductionChecklist(){
  const html = `
    <h2>Checklist de producción</h2>
    <div class="checklist-grid">
      <div class="check-item ok"><strong>Interfaz simple</strong><span>La app abre con inicio, modo básico y navegación progresiva.</span></div>
      <div class="check-item ok"><strong>Motor de batalla</strong><span>Incluye unidades, fortalezas, rango, aviones, héroes y varianza.</span></div>
      <div class="check-item ok"><strong>Escenarios</strong><span>Permite guardar, cargar, exportar, compartir e importar.</span></div>
      <div class="check-item ok"><strong>Supabase opcional</strong><span>Funciona localmente aunque no configures la nube.</span></div>
      <div class="check-item ok"><strong>GitHub Pages</strong><span>Proyecto estático listo para publicar.</span></div>
      <div class="check-item warn"><strong>Pendiente recomendado</strong><span>Probar con más batallas reales para seguir calibrando el motor.</span></div>
    </div>`;
  document.querySelector("#simpleReport").innerHTML = html;
  document.querySelector("#simpleReport")?.scrollIntoView({behavior:"smooth"});
}

function showPublishGuide(){
  const html = `
    <h2>Guía rápida para publicar en GitHub Pages</h2>
    <div class="publish-steps">
      <div class="publish-step"><b>1. Crear repositorio</b><span>Crea un repositorio llamado battle-lab-1914 o similar.</span></div>
      <div class="publish-step"><b>2. Subir archivos</b><code>git add .
git commit -m "Etapa 29 producción"
git push</code></div>
      <div class="publish-step"><b>3. Activar Pages</b><span>En GitHub: Settings → Pages → Deploy from branch → main → /root.</span></div>
      <div class="publish-step"><b>4. Abrir la web</b><span>GitHub te dará un link público para compartir la calculadora.</span></div>
      <div class="publish-step"><b>5. Supabase</b><span>Si quieres nube real, configura Project URL y anon public key dentro de la app publicada.</span></div>
    </div>`;
  document.querySelector("#simpleReport").innerHTML = html;
  document.querySelector("#simpleReport")?.scrollIntoView({behavior:"smooth"});
}

function exportProjectInfo(){
  const payload = {
    app:"Battle Lab 1914",
    stage:29,
    status:"production-ready",
    type:"static web app",
    features:[
      "simulación de batalla",
      "modo básico/táctico/avanzado",
      "fortalezas",
      "aviones y patrullas",
      "héroes",
      "varianza",
      "escenarios",
      "Supabase opcional",
      "comunidad",
      "estadísticas"
    ],
    deploy:[
      "GitHub Pages",
      "Netlify",
      "Vercel",
      "hosting estático"
    ],
    generatedAt:new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download="battle_lab_1914_project_info.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


let PLAYER_STATS_CACHE = null;
let CLOUD_STATS_SOURCE = null;

function openPlayerStats(){
  openDashboard();
  const panel = document.querySelector("#playerStatsPanel");
  if(panel) panel.open = true;
}

function countBy(items, getter){
  const map = {};
  (items || []).forEach(item => {
    const key = getter(item) || "unknown";
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function topEntry(map){
  const entries = Object.entries(map || {}).sort((a,b) => b[1] - a[1]);
  return entries[0] || ["-",0];
}

function collectUnitsFromSnapshot(snapshot){
  const stacks = [
    ...(snapshot?.armyA?.stacks || []),
    ...(snapshot?.armyB?.stacks || [])
  ];
  return stacks.flatMap(stack => stack.units || []);
}

function getScenarioTypeFromSnapshot(snapshot){
  if(typeof detectScenarioType === "function") return detectScenarioType(snapshot);
  const units = collectUnitsFromSnapshot(snapshot).map(u => u.type);
  if(units.includes("artillery") || units.includes("railgun")) return "artillery";
  if(units.includes("fighter") || units.includes("bomber")) return "air";
  return "general";
}

function localPlayerStatsSource(){
  const user = getCurrentUser && getCurrentUser();
  const scenarios = user?.scenarios || [];
  const history = user?.history || [];
  return {
    source:"local",
    scenarios:scenarios.map(s => ({
      id:s.id,
      name:s.name,
      mode:s.mode,
      created_at:s.createdAt,
      snapshot:s.snapshot
    })),
    history:history.map(h => ({
      id:h.id,
      created_at:h.createdAt,
      winner:h.winner,
      result:h.result,
      scenario_snapshot:h.scenario
    })),
    favorites:[]
  };
}

function normalizeStatsSource(source){
  const scenarios = (source.scenarios || []).map(s => ({
    ...s,
    snapshot:s.snapshot || s.scenario_snapshot || s.scenario || {}
  }));
  const history = (source.history || []).map(h => ({
    ...h,
    scenario_snapshot:h.scenario_snapshot || h.scenarioSnapshot || h.scenario || {}
  }));
  return {...source, scenarios, history, favorites:source.favorites || []};
}

function buildPlayerStats(sourceInput){
  const source = normalizeStatsSource(sourceInput || localPlayerStatsSource());
  const scenarios = source.scenarios || [];
  const history = source.history || [];
  const favorites = source.favorites || [];

  const allScenarioUnits = scenarios.flatMap(s => collectUnitsFromSnapshot(s.snapshot));
  const allHistoryUnits = history.flatMap(h => collectUnitsFromSnapshot(h.scenario_snapshot));
  const allUnits = [...allScenarioUnits, ...allHistoryUnits];

  const unitCounts = {};
  allUnits.forEach(u => {
    const name = UNITS[u.type]?.name || u.type || "unknown";
    unitCounts[name] = (unitCounts[name] || 0) + Number(u.count || 0);
  });

  const typeCounts = {};
  scenarios.forEach(s => {
    const type = getScenarioTypeFromSnapshot(s.snapshot);
    typeCounts[typeName ? typeName(type) : type] = (typeCounts[typeName ? typeName(type) : type] || 0) + 1;
  });
  history.forEach(h => {
    const type = getScenarioTypeFromSnapshot(h.scenario_snapshot);
    typeCounts[typeName ? typeName(type) : type] = (typeCounts[typeName ? typeName(type) : type] || 0) + 1;
  });

  const winnerCounts = countBy(history, h => h.winner || "unknown");
  const winsA = winnerCounts["Army A"] || 0;
  const winsB = winnerCounts["Army B"] || 0;
  const draws = (winnerCounts["Draw"] || 0) + (winnerCounts["unknown"] || 0);
  const decided = winsA + winsB;
  const winRateA = decided ? (winsA / decided) * 100 : 0;
  const avgRounds = history.length ? history.reduce((sum,h) => {
    const r = h.result || {};
    return sum + Number(r.roundsPlayed || r.avgRounds || 0);
  },0) / history.length : 0;

  const [topUnit, topUnitCount] = topEntry(unitCounts);
  const [topType, topTypeCount] = topEntry(typeCounts);

  const lastActivity = [...scenarios.map(s => s.created_at), ...history.map(h => h.created_at)]
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    source:source.source || "local",
    scenarios:scenarios.length,
    history:history.length,
    favorites:favorites.length,
    winsA,
    winsB,
    draws,
    winRateA,
    avgRounds,
    topUnit,
    topUnitCount,
    topType,
    topTypeCount,
    unitCounts,
    typeCounts,
    winnerCounts,
    lastActivity
  };
}

function percentBar(value){
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="meter"><i style="width:${v}%"></i></div>`;
}

function renderPlayerStats(stats){
  PLAYER_STATS_CACHE = stats;
  const grid = document.querySelector("#playerStatsGrid");
  const insights = document.querySelector("#playerStatsInsights");
  const tables = document.querySelector("#playerStatsTables");
  if(!grid || !insights || !tables) return;

  grid.innerHTML = `
    <div class="player-stat-card"><strong>Escenarios</strong><b>${stats.scenarios}</b><span>guardados / cargados</span></div>
    <div class="player-stat-card"><strong>Simulaciones</strong><b>${stats.history}</b><span>en historial</span></div>
    <div class="player-stat-card"><strong>Favoritos</strong><b>${stats.favorites}</b><span>escenarios marcados</span></div>
    <div class="player-stat-card"><strong>Rondas prom.</strong><b>${format(stats.avgRounds,2)}</b><span>duración estimada</span></div>
    <div class="player-stat-card"><strong>Army A</strong><b>${stats.winsA}</b><span>victorias estimadas ${format(stats.winRateA)}%</span>${percentBar(stats.winRateA)}</div>
    <div class="player-stat-card"><strong>Army B</strong><b>${stats.winsB}</b><span>victorias estimadas ${format(100 - stats.winRateA)}%</span>${percentBar(100 - stats.winRateA)}</div>
    <div class="player-stat-card"><strong>Unidad más usada</strong><b>${stats.topUnit}</b><span>${stats.topUnitCount} unidades cargadas</span></div>
    <div class="player-stat-card"><strong>Tipo favorito</strong><b>${stats.topType}</b><span>${stats.topTypeCount} apariciones</span></div>
  `;

  const activityText = stats.lastActivity ? new Date(stats.lastActivity).toLocaleString() : "sin actividad registrada";
  const styleHint = stats.topType === "Artillería" ? "Tiendes a analizar combates de rango. Revisa siempre distancia y contraataque melee." :
    stats.topType === "Fortaleza" ? "Tu análisis se centra en defensa. Revisa HP de fortaleza y daño estructural." :
    stats.topType === "Aéreo" ? "Estás usando bastante combate aéreo. Revisa patrulla, alcance operativo y defensa antiaérea." :
    "Todavía falta historial para detectar un estilo claro.";

  insights.innerHTML = `
    <article class="insight-card"><strong>Lectura del perfil</strong><p>${styleHint}</p></article>
    <article class="insight-card"><strong>Última actividad</strong><p>${activityText}</p></article>
  `;

  const unitRows = Object.entries(stats.unitCounts).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([name,count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join("") || `<tr><td>Sin datos</td><td>0</td></tr>`;
  const typeRows = Object.entries(stats.typeCounts).sort((a,b)=>b[1]-a[1])
    .map(([name,count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join("") || `<tr><td>Sin datos</td><td>0</td></tr>`;
  const winnerRows = Object.entries(stats.winnerCounts).sort((a,b)=>b[1]-a[1])
    .map(([name,count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join("") || `<tr><td>Sin datos</td><td>0</td></tr>`;

  tables.innerHTML = `
    <article class="stats-table-card"><h3>Top unidades</h3><table><thead><tr><th>Unidad</th><th>Cantidad</th></tr></thead><tbody>${unitRows}</tbody></table></article>
    <article class="stats-table-card"><h3>Tipos de batalla</h3><table><thead><tr><th>Tipo</th><th>Usos</th></tr></thead><tbody>${typeRows}</tbody></table></article>
    <article class="stats-table-card"><h3>Ganadores</h3><table><thead><tr><th>Resultado</th><th>Cantidad</th></tr></thead><tbody>${winnerRows}</tbody></table></article>
    <article class="stats-table-card"><h3>Fuente</h3><table><tbody><tr><td>Origen</td><td>${stats.source}</td></tr><tr><td>Escenarios</td><td>${stats.scenarios}</td></tr><tr><td>Historial</td><td>${stats.history}</td></tr></tbody></table></article>
  `;
}

function buildPlayerStatsFromLocal(){
  const stats = buildPlayerStats(localPlayerStatsSource());
  renderPlayerStats(stats);
}

async function loadStatsFromCloud(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    buildPlayerStatsFromLocal();
    return;
  }
  try{
    const source = api.getPlayerStatsCloudData ? await api.getPlayerStatsCloudData() : {
      scenarios: await api.listSupabaseScenarios(),
      history: await api.listSupabaseHistory(),
      favorites: []
    };
    CLOUD_STATS_SOURCE = {...source, source:"Supabase"};
    const stats = buildPlayerStats(CLOUD_STATS_SOURCE);
    renderPlayerStats(stats);
  }catch(error){
    alert(`No se pudieron cargar estadísticas desde nube: ${error.message}`);
  }
}

function exportPlayerStats(){
  if(!PLAYER_STATS_CACHE){
    buildPlayerStatsFromLocal();
  }
  const payload = {
    app:"Battle Lab 1914",
    stage:28,
    exportedAt:new Date().toISOString(),
    stats:PLAYER_STATS_CACHE
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download="battle_lab_1914_estadisticas_jugador.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyPlayerStats(){
  if(!PLAYER_STATS_CACHE){
    buildPlayerStatsFromLocal();
  }
  const s = PLAYER_STATS_CACHE;
  const text = `Battle Lab 1914 - Estadísticas
Escenarios: ${s.scenarios}
Simulaciones: ${s.history}
Victorias Army A: ${s.winsA}
Victorias Army B: ${s.winsB}
Unidad más usada: ${s.topUnit}
Tipo más usado: ${s.topType}`;
  try{
    await navigator.clipboard.writeText(text);
    alert("Resumen de estadísticas copiado.");
  }catch(error){
    alert(text);
  }
}


let COMMUNITY_CACHE = [];

function openCommunity(){
  openDashboard();
  const panel = document.querySelector("#communityPanel");
  if(panel) panel.open = true;
}

function detectScenarioType(snapshot){
  const allUnits = [
    ...(snapshot?.armyA?.stacks?.flatMap(s => s.units || []) || []),
    ...(snapshot?.armyB?.stacks?.flatMap(s => s.units || []) || [])
  ];
  const terrains = [
    ...(snapshot?.armyA?.stacks?.map(s => s.terrain) || []),
    ...(snapshot?.armyB?.stacks?.map(s => s.terrain) || [])
  ];
  const forts = [
    ...(snapshot?.armyA?.stacks?.map(s => s.fortress) || []),
    ...(snapshot?.armyB?.stacks?.map(s => s.fortress) || [])
  ];
  const heroes = [
    ...(snapshot?.armyA?.stacks?.map(s => s.hero?.id) || []),
    ...(snapshot?.armyB?.stacks?.map(s => s.hero?.id) || [])
  ];
  const types = allUnits.map(u => u.type);
  if(types.includes("artillery") || types.includes("railgun")) return "artillery";
  if(forts.some(f => f && f !== "none")) return "fortress";
  if(types.includes("fighter") || types.includes("bomber") || terrains.includes("air") || terrains.includes("patrol")) return "air";
  if(terrains.includes("debark")) return "debark";
  if(heroes.some(h => h && h !== "none")) return "hero";
  if(terrains.includes("sea")) return "naval";
  return "general";
}

function typeName(type){
  return {
    artillery:"Artillería",
    fortress:"Fortaleza",
    air:"Aéreo",
    debark:"Desembarco",
    hero:"Héroes",
    naval:"Naval",
    general:"General"
  }[type] || type;
}

function communityPreview(row){
  return scenarioShortPreview(row.snapshot || {});
}

function filterCommunityRows(rows){
  const q = (document.querySelector("#communitySearch")?.value || "").trim().toLowerCase();
  const type = document.querySelector("#communityTypeFilter")?.value || "all";
  let out = rows || [];
  if(q){
    out = out.filter(row => {
      const blob = `${row.name || ""} ${JSON.stringify(row.snapshot || {})}`.toLowerCase();
      return blob.includes(q);
    });
  }
  if(type !== "all"){
    out = out.filter(row => detectScenarioType(row.snapshot) === type);
  }
  const sort = document.querySelector("#communitySort")?.value || "newest";
  if(sort === "name"){
    out = [...out].sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
  }
  if(sort === "type"){
    out = [...out].sort((a,b) => detectScenarioType(a.snapshot).localeCompare(detectScenarioType(b.snapshot)));
  }
  return out;
}

function renderCommunityStats(rows){
  const box = document.querySelector("#communityStats");
  if(!box) return;
  const stats = {
    total:rows.length,
    artillery:rows.filter(r => detectScenarioType(r.snapshot) === "artillery").length,
    fortress:rows.filter(r => detectScenarioType(r.snapshot) === "fortress").length,
    air:rows.filter(r => detectScenarioType(r.snapshot) === "air").length,
    debark:rows.filter(r => detectScenarioType(r.snapshot) === "debark").length,
    hero:rows.filter(r => detectScenarioType(r.snapshot) === "hero").length
  };
  box.innerHTML = `
    <div class="community-stat"><strong>Total</strong><b>${stats.total}</b></div>
    <div class="community-stat"><strong>Artillería</strong><b>${stats.artillery}</b></div>
    <div class="community-stat"><strong>Fortaleza</strong><b>${stats.fortress}</b></div>
    <div class="community-stat"><strong>Aéreo</strong><b>${stats.air}</b></div>
    <div class="community-stat"><strong>Desembarco</strong><b>${stats.debark}</b></div>
    <div class="community-stat"><strong>Héroes</strong><b>${stats.hero}</b></div>`;
}

function renderCommunityFeed(rows){
  COMMUNITY_CACHE = rows || COMMUNITY_CACHE || [];
  const filtered = filterCommunityRows(COMMUNITY_CACHE);
  const feed = document.querySelector("#communityFeed");
  renderCommunityStats(filtered);
  if(!feed) return;
  if(!filtered.length){
    feed.innerHTML = `<div class="platform-notice">No hay escenarios públicos con esos filtros.</div>`;
    return;
  }
  feed.innerHTML = filtered.map(row => {
    const type = detectScenarioType(row.snapshot);
    const encodedSnapshot = encodeURIComponent(JSON.stringify(row.snapshot || {}));
    const encodedRow = encodeURIComponent(JSON.stringify(row));
    return `
      <article class="community-card">
        <h3>${row.name || "Escenario público"}</h3>
        <div class="community-meta">
          <span class="type-pill ${type}">${typeName(type)}</span>
          <span class="saved-pill">Modo: ${row.mode || "-"}</span>
          <span class="saved-pill">${row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
        </div>
        <div class="community-preview">${communityPreview(row)}</div>
        <div class="community-actions">
          <button type="button" class="green" data-community-load="${encodedSnapshot}">Cargar</button>
          <button type="button" class="gold" data-community-copy="${encodedRow}">Copiar a mi nube</button>
          <button type="button" class="gold" data-community-favorite="${row.id}">Favorito</button>
          <button type="button" data-community-share="${encodedRow}">Compartir código</button>
        </div>
      </article>`;
  }).join("");
}

async function loadCommunityFeed(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const feed = document.querySelector("#communityFeed");
  try{
    const search = document.querySelector("#communitySearch")?.value || "";
    const rows = api.listCommunityScenarios
      ? await api.listCommunityScenarios({search})
      : await api.listPublicSupabaseScenarios();
    COMMUNITY_CACHE = rows || [];
    renderCommunityFeed(COMMUNITY_CACHE);
  }catch(error){
    feed.innerHTML = `<div class="warning danger">Error al cargar comunidad: ${error.message}</div>`;
  }
}

async function copyCommunityScenario(encodedRow){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  try{
    const row = JSON.parse(decodeURIComponent(encodedRow));
    const name = prompt("Nombre para tu copia privada:", `${row.name || "Escenario"} copia`) || `${row.name || "Escenario"} copia`;
    await api.saveSupabaseScenario({
      name,
      mode:row.mode || "basic",
      snapshot:row.snapshot,
      visibility:"private"
    });
    alert("Copia privada guardada en tu nube.");
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo copiar: ${error.message}`);
  }
}

function loadCommunityScenario(encodedSnapshot){
  try{
    const snapshot = JSON.parse(decodeURIComponent(encodedSnapshot));
    applyScenarioSnapshot(snapshot);
    closeDashboard();
    document.querySelector("#simpleReport").innerHTML = `<div class="warning safe">Escenario público cargado. Puedes simularlo o guardarlo en tu cuenta.</div>`;
  }catch(error){
    alert("No se pudo cargar el escenario público.");
  }
}

function shareCommunityScenario(encodedRow){
  try{
    const row = JSON.parse(decodeURIComponent(encodedRow));
    const payload = {
      app:"Battle Lab 1914",
      type:"shared_scenario",
      version:27,
      exportedAt:new Date().toISOString(),
      name:row.name,
      mode:row.mode,
      snapshot:row.snapshot,
      scenario:row
    };
    const code = encodeSharePayload(payload);
    const box = document.querySelector("#sharedScenarioCode");
    if(box) box.value = code;
    renderShareResult(payload, code, "Código comunitario creado.");
  }catch(error){
    alert("No se pudo crear código comunitario.");
  }
}

async function favoriteCommunityScenario(id){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  try{
    await api.addSupabaseFavorite(id);
    alert("Escenario público agregado a favoritos.");
  }catch(error){
    alert(`No se pudo marcar favorito: ${error.message}`);
  }
}

function exportCommunityFeed(){
  const rows = filterCommunityRows(COMMUNITY_CACHE);
  if(!rows.length){
    alert("Primero carga el panel comunitario.");
    return;
  }
  const payload = {
    app:"Battle Lab 1914",
    stage:27,
    exportedAt:new Date().toISOString(),
    count:rows.length,
    scenarios:rows
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download="battle_lab_1914_panel_comunitario.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


let IMPORTED_SHARED_SCENARIO = null;

function encodeSharePayload(payload){
  const json = JSON.stringify(payload);
  try{
    return "battlelab://" + btoa(unescape(encodeURIComponent(json)));
  }catch(error){
    return JSON.stringify(payload,null,2);
  }
}

function decodeSharePayload(text){
  const raw = String(text || "").trim();
  if(!raw) throw new Error("No hay código para importar.");
  if(raw.startsWith("battlelab://")){
    const encoded = raw.replace("battlelab://","");
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  }
  return JSON.parse(raw);
}

function buildSharedScenarioPayload(){
  return {
    app:"Battle Lab 1914",
    type:"shared_scenario",
    version:26,
    exportedAt:new Date().toISOString(),
    name:document.querySelector("#cloudScenarioName")?.value || document.querySelector("#testCaseName")?.value || "Escenario compartido",
    mode:state.mode,
    snapshot:currentScenarioSnapshot()
  };
}

function makeShareCode(){
  const payload = buildSharedScenarioPayload();
  const code = encodeSharePayload(payload);
  const box = document.querySelector("#sharedScenarioCode");
  if(box) box.value = code;
  renderShareResult(payload, code, "Código creado desde el escenario actual.");
  openDashboard();
}

async function copyShareCode(){
  const box = document.querySelector("#sharedScenarioCode");
  const text = box?.value || "";
  if(!text){
    alert("Primero crea o pega un código.");
    return;
  }
  try{
    await navigator.clipboard.writeText(text);
    alert("Código compartido copiado.");
  }catch(error){
    alert(text);
  }
}

function renderShareResult(payload, code="", message=""){
  const target = document.querySelector("#shareResult");
  if(!target) return;
  const snapshot = payload.snapshot || {};
  const preview = scenarioShortPreview ? scenarioShortPreview(snapshot) : "";
  target.innerHTML = `
    <article class="share-card">
      <h3>${payload.name || "Escenario compartido"}</h3>
      <span class="community-badge">Compartible</span>
      <p>${message}</p>
      <p>${preview}</p>
      ${code ? `<textarea class="share-code-box" readonly>${code.replace(/</g,"&lt;")}</textarea>` : ""}
    </article>`;
}

function importShareCode(){
  try{
    const text = document.querySelector("#sharedScenarioCode")?.value || "";
    const payload = decodeSharePayload(text);
    if(payload.type !== "shared_scenario" || !payload.snapshot){
      throw new Error("El código no parece ser un escenario compartido válido.");
    }
    IMPORTED_SHARED_SCENARIO = payload;
    applyScenarioSnapshot(payload.snapshot);
    setMode(payload.mode || payload.snapshot?.options?.mode || "basic");
    renderShareResult(payload, "", "Escenario importado y cargado en la calculadora.");
    closeDashboard();
    document.querySelector("#simpleReport").innerHTML = `<div class="warning safe">Escenario compartido importado. Puedes simularlo o guardarlo en tu cuenta.</div>`;
  }catch(error){
    alert(`No se pudo importar: ${error.message}`);
  }
}

async function saveImportedToCloud(){
  if(!IMPORTED_SHARED_SCENARIO){
    alert("Primero importa un escenario compartido.");
    return;
  }
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  try{
    const name = prompt("Nombre para guardar en tu nube:", IMPORTED_SHARED_SCENARIO.name || "Escenario importado") || "Escenario importado";
    const data = api.importSharedScenarioToCloud
      ? await api.importSharedScenarioToCloud({name, mode:IMPORTED_SHARED_SCENARIO.mode || "basic", snapshot:IMPORTED_SHARED_SCENARIO.snapshot, visibility:"private"})
      : await api.saveSupabaseScenario({name, mode:IMPORTED_SHARED_SCENARIO.mode || "basic", snapshot:IMPORTED_SHARED_SCENARIO.snapshot, visibility:"private"});
    alert(`Escenario importado guardado: ${data.name}`);
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo guardar importado: ${error.message}`);
  }
}


let CLOUD_SCENARIO_CACHE = [];

function getCloudScenarioName(){
  return (document.querySelector("#cloudScenarioName")?.value || document.querySelector("#testCaseName")?.value || "Escenario Battle Lab").trim();
}
function getCloudVisibility(){
  return document.querySelector("#cloudScenarioVisibility")?.value || "private";
}
function scenarioShortPreview(snapshot){
  const a = snapshot?.armyA?.stacks?.[0]?.units || [];
  const b = snapshot?.armyB?.stacks?.[0]?.units || [];
  const unitText = units => units.map(u => `${u.count} ${UNITS[u.type]?.name || u.type}`).join(", ");
  return `A: ${unitText(a) || "sin unidades"} · B: ${unitText(b) || "sin unidades"}`;
}
function filterCloudRows(rows){
  const q = (document.querySelector("#cloudScenarioSearch")?.value || "").trim().toLowerCase();
  if(!q) return rows;
  return rows.filter(row => String(row.name || "").toLowerCase().includes(q));
}
function updateCloudStats(rows, label="Escenarios cargados"){
  const stats = document.querySelector("#cloudScenarioStats");
  if(!stats) return;
  const total = rows.length;
  const pub = rows.filter(r => r.visibility === "public").length;
  const priv = rows.filter(r => r.visibility === "private").length;
  const shared = rows.filter(r => r.visibility === "shared").length;
  stats.innerHTML = `<strong>${label}:</strong> ${total} · privados ${priv} · públicos ${pub} · compartidos ${shared}`;
}
function renderCloudScenarios(rows, label="Escenarios cargados"){
  CLOUD_SCENARIO_CACHE = rows || [];
  const list = document.querySelector("#cloudHistoryList") || document.querySelector("#cloudDataList");
  const filtered = filterCloudRows(CLOUD_SCENARIO_CACHE);
  updateCloudStats(filtered, label);

  if(!filtered.length){
    list.innerHTML = `<div class="platform-notice">No hay escenarios para mostrar.</div>`;
    return;
  }

  list.innerHTML = filtered.map(row => {
    const visibility = row.visibility || "private";
    const preview = scenarioShortPreview(row.snapshot);
    const encodedSnapshot = encodeURIComponent(JSON.stringify(row.snapshot || {}));
    const encodedRow = encodeURIComponent(JSON.stringify(row));
    return `
      <article class="cloud-item">
        <h3>${row.name || "Escenario sin nombre"}</h3>
        <div class="saved-meta">
          <span class="cloud-tag ${visibility}">${visibility}</span>
          <span class="saved-pill">Modo: ${row.mode || "-"}</span>
          <span class="saved-pill">${row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
        </div>
        <div class="cloud-preview">${preview}</div>
        <div class="cloud-toolbar">
          <button type="button" class="green" data-cloud-scenario="${encodedSnapshot}">Cargar</button>
          <button type="button" data-cloud-edit-id="${row.id}" data-cloud-current-name="${encodeURIComponent(row.name || "")}">Renombrar</button>
          <button type="button" data-cloud-visibility-id="${row.id}" data-cloud-current-visibility="${visibility}">Cambiar visibilidad</button>
          <button type="button" class="gold" data-cloud-duplicate="${encodedRow}">Duplicar</button>
          <button type="button" class="gold" data-cloud-favorite="${row.id}">Favorito</button>
          <button type="button" data-cloud-share="${encodedRow}">Link/JSON</button>
          <button type="button" class="danger" data-cloud-delete-id="${row.id}">Eliminar</button>
        </div>
      </article>`;
  }).join("");
}
async function renameCloudScenario(id, currentName=""){
  const api = supabaseApi();
  if(!api) return;
  const name = prompt("Nuevo nombre del escenario:", decodeURIComponent(currentName || "") || "Escenario Battle Lab");
  if(!name) return;
  try{
    await api.updateSupabaseScenario(id, {name});
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo renombrar: ${error.message}`);
  }
}
async function changeCloudVisibility(id, current="private"){
  const api = supabaseApi();
  if(!api) return;
  const next = prompt("Visibilidad: private, public o shared", current) || current;
  if(!["private","public","shared"].includes(next)){
    alert("Visibilidad inválida. Usa private, public o shared.");
    return;
  }
  try{
    await api.updateSupabaseScenario(id, {visibility:next});
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo cambiar visibilidad: ${error.message}`);
  }
}
async function deleteCloudScenario(id){
  const api = supabaseApi();
  if(!api) return;
  if(!confirm("¿Eliminar este escenario de Supabase?")) return;
  try{
    await api.deleteSupabaseScenario(id);
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo eliminar: ${error.message}`);
  }
}
async function duplicateCloudScenario(encodedRow){
  const api = supabaseApi();
  if(!api) return;
  try{
    const row = JSON.parse(decodeURIComponent(encodedRow));
    const name = prompt("Nombre de la copia:", `${row.name || "Escenario"} copia`);
    if(!name) return;
    await api.duplicateSupabaseScenario(row, name);
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo duplicar: ${error.message}`);
  }
}
async function favoriteCloudScenario(id){
  const api = supabaseApi();
  if(!api) return;
  try{
    await api.addSupabaseFavorite(id);
    alert("Escenario agregado a favoritos.");
  }catch(error){
    alert(`No se pudo marcar favorito: ${error.message}`);
  }
}
function shareCloudScenario(encodedRow){
  try{
    const row = JSON.parse(decodeURIComponent(encodedRow));
    const payload = {
      app:"Battle Lab 1914",
      type:"shared_scenario",
      version:26,
      exportedAt:new Date().toISOString(),
      name:row.name,
      mode:row.mode,
      snapshot:row.snapshot,
      scenario:row
    };
    const text = encodeSharePayload(payload);
    const list = document.querySelector("#cloudDataList");
    list.insertAdjacentHTML("afterbegin", `
      <article class="cloud-item selected">
        <h3>JSON para compartir</h3>
        <p>Copia este bloque para compartir el escenario o guardarlo como respaldo.</p>
        <textarea class="share-box" readonly>${text.replace(/</g,"&lt;")}</textarea>
      </article>
    `);
  }catch(error){
    alert("No se pudo generar el JSON de compartir.");
  }
}
function exportCloudCache(){
  if(!CLOUD_SCENARIO_CACHE.length){
    alert("Primero carga escenarios de Supabase.");
    return;
  }
  const payload = {
    app:"Battle Lab 1914",
    stage:24,
    exportedAt:new Date().toISOString(),
    scenarios:CLOUD_SCENARIO_CACHE
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download="battle_lab_1914_escenarios_nube.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function saveScenarioToCloud(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  try{
    const data = await api.saveSupabaseScenario({
      name:getCloudScenarioName(),
      mode:state.mode,
      snapshot:currentScenarioSnapshot(),
      visibility:getCloudVisibility()
    });
    alert(`Escenario guardado en Supabase: ${data.name}`);
    await loadCloudScenarios();
  }catch(error){
    alert(`No se pudo guardar en Supabase: ${error.message}`);
  }
}


let CLOUD_HISTORY_CACHE = [];

function getHistoryFilters(){
  return {
    winner: document.querySelector("#historyWinnerFilter")?.value || "all",
    dateFrom: document.querySelector("#historyDateFrom")?.value || "",
    dateTo: document.querySelector("#historyDateTo")?.value || "",
    search: (document.querySelector("#historySearch")?.value || "").trim().toLowerCase()
  };
}
function historyWinnerClass(winner){
  if(winner === "Army A") return "history-winner-a";
  if(winner === "Army B") return "history-winner-b";
  return "history-winner-draw";
}
function historyScenarioPreview(row){
  const snapshot = row.scenario_snapshot || row.scenarioSnapshot || row.scenario || {};
  const a = snapshot?.armyA?.stacks?.[0]?.units || [];
  const b = snapshot?.armyB?.stacks?.[0]?.units || [];
  const unitText = units => units.map(u => `${u.count} ${UNITS[u.type]?.name || u.type}`).join(", ");
  return `A: ${unitText(a) || "sin unidades"} · B: ${unitText(b) || "sin unidades"}`;
}
function filterHistoryRows(rows){
  const filters = getHistoryFilters();
  let out = rows || [];
  if(filters.search){
    out = out.filter(row => JSON.stringify(row).toLowerCase().includes(filters.search));
  }
  return out;
}
function computeHistoryStats(rows){
  const total = rows.length;
  const a = rows.filter(r => r.winner === "Army A").length;
  const b = rows.filter(r => r.winner === "Army B").length;
  const draw = rows.filter(r => r.winner === "Draw" || r.winner === "unknown").length;
  const avgRounds = rows.length ? rows.reduce((sum,row) => {
    const r = row.result || {};
    return sum + Number(r.roundsPlayed || r.avgRounds || 0);
  },0) / rows.length : 0;
  return {total,a,b,draw,avgRounds};
}
function renderHistoryStats(rows){
  const box = document.querySelector("#cloudHistoryStats");
  if(!box) return;
  const s = computeHistoryStats(rows);
  box.innerHTML = `
    <div class="history-stat"><strong>Total</strong><b>${s.total}</b></div>
    <div class="history-stat"><strong>Army A</strong><b>${s.a}</b></div>
    <div class="history-stat"><strong>Army B</strong><b>${s.b}</b></div>
    <div class="history-stat"><strong>Empates</strong><b>${s.draw}</b></div>
    <div class="history-stat"><strong>Rondas prom.</strong><b>${format(s.avgRounds,2)}</b></div>`;
}
function renderCloudHistoryRows(rows){
  CLOUD_HISTORY_CACHE = rows || [];
  const filtered = filterHistoryRows(CLOUD_HISTORY_CACHE);
  const list = document.querySelector("#cloudHistoryList") || document.querySelector("#cloudDataList");
  renderHistoryStats(filtered);
  if(!filtered.length){
    list.innerHTML = `<div class="platform-notice">No hay historial para mostrar con esos filtros.</div>`;
    return;
  }
  list.innerHTML = filtered.map(row => {
    const winner = row.winner || "unknown";
    const preview = historyScenarioPreview(row);
    const encodedScenario = encodeURIComponent(JSON.stringify(row.scenario_snapshot || row.scenario || {}));
    const encodedResult = encodeURIComponent(JSON.stringify(row.result || {}));
    return `
      <article class="history-item ${historyWinnerClass(winner)}">
        <h3>Simulación · ${winner}</h3>
        <div class="saved-meta">
          <span class="saved-pill">${row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
          <span class="saved-pill">Ganador: ${winner}</span>
          <span class="saved-pill">Rondas: ${row.result?.roundsPlayed || row.result?.avgRounds || "-"}</span>
        </div>
        <div class="history-preview">${preview}</div>
        ${row.note ? `<div class="history-preview"><strong>Nota:</strong> ${row.note}</div>` : ""}
        <div class="cloud-toolbar">
          <button type="button" class="green" data-history-load-scenario="${encodedScenario}">Cargar escenario</button>
          <button type="button" data-history-detail="${encodedResult}">Ver resultado</button>
          <button type="button" data-history-note-id="${row.id}" data-history-current-note="${encodeURIComponent(row.note || "")}">Editar nota</button>
          <button type="button" class="gold" data-history-compare="${row.id}">Comparar</button>
          <button type="button" class="danger" data-history-delete-id="${row.id}">Eliminar</button>
        </div>
      </article>`;
  }).join("");
}
async function loadCloudHistoryFiltered(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const list = document.querySelector("#cloudHistoryList") || document.querySelector("#cloudDataList");
  try{
    const filters = getHistoryFilters();
    const rows = api.listSupabaseHistoryFiltered ? await api.listSupabaseHistoryFiltered(filters) : await api.listSupabaseHistory();
    renderCloudHistoryRows(rows);
  }catch(error){
    list.innerHTML = `<div class="warning danger">Error: ${error.message}</div>`;
  }
}
function showHistoryResultDetail(encoded){
  try{
    const result = JSON.parse(decodeURIComponent(encoded));
    const list = document.querySelector("#cloudHistoryList") || document.querySelector("#cloudDataList");
    list.insertAdjacentHTML("afterbegin", `<article class="history-item"><h3>Detalle del resultado</h3><textarea class="history-detail" readonly>${JSON.stringify(result,null,2).replace(/</g,"&lt;")}</textarea></article>`);
  }catch(error){ alert("No se pudo abrir el detalle."); }
}
function loadHistoryScenario(encoded){
  try{
    const snapshot = JSON.parse(decodeURIComponent(encoded));
    applyScenarioSnapshot(snapshot);
    closeDashboard();
    document.querySelector("#simpleReport").innerHTML = `<div class="warning safe">Escenario cargado desde historial. Pulsa <b>Simular batalla</b> para repetirlo.</div>`;
  }catch(error){ alert("No se pudo cargar el escenario del historial."); }
}
async function deleteCloudHistoryItem(id){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()) return;
  if(!confirm("¿Eliminar esta simulación del historial en Supabase?")) return;
  try{ await api.deleteSupabaseHistory(id); await loadCloudHistoryFiltered(); }
  catch(error){ alert(`No se pudo eliminar: ${error.message}`); }
}
async function editCloudHistoryNote(id, current=""){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()) return;
  const note = prompt("Nota para esta simulación:", decodeURIComponent(current || ""));
  if(note === null) return;
  try{ await api.updateSupabaseHistoryNote(id, note); await loadCloudHistoryFiltered(); }
  catch(error){ alert(`No se pudo editar nota: ${error.message}`); }
}
function compareHistoryItem(id){
  const row = CLOUD_HISTORY_CACHE.find(item => item.id === id);
  if(!row){ alert("No se encontró la simulación en la lista cargada."); return; }
  const current = state.lastResult?.result;
  const list = document.querySelector("#cloudHistoryList") || document.querySelector("#cloudDataList");
  if(!current){
    list.insertAdjacentHTML("afterbegin", `<div class="compare-box">Simula una batalla actual para compararla contra este historial.</div>`);
    return;
  }
  const oldWinner = row.winner || "unknown";
  const newWinner = calculatedWinnerFromResult(current);
  const oldRounds = row.result?.roundsPlayed || row.result?.avgRounds || "-";
  const newRounds = current.roundsPlayed || current.avgRounds || "-";
  list.insertAdjacentHTML("afterbegin", `<article class="compare-box"><strong>Comparación rápida</strong><p>Historial: ${oldWinner}, rondas ${oldRounds}</p><p>Actual: ${newWinner}, rondas ${newRounds}</p><p>${oldWinner === newWinner ? "Coincide el ganador." : "El ganador cambió; revisa configuración, varianza o datos."}</p></article>`);
}
function exportHistoryJson(){
  const rows = filterHistoryRows(CLOUD_HISTORY_CACHE);
  if(!rows.length){ alert("Primero carga historial."); return; }
  const payload = {app:"Battle Lab 1914",stage:25,exportedAt:new Date().toISOString(),stats:computeHistoryStats(rows),history:rows};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="battle_lab_1914_historial_nube.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function csvEscape(value){ const s = String(value ?? ""); return `"${s.replace(/"/g,'""')}"`; }
function exportHistoryCsv(){
  const rows = filterHistoryRows(CLOUD_HISTORY_CACHE);
  if(!rows.length){ alert("Primero carga historial."); return; }
  const header = ["id","created_at","winner","rounds","note","preview"];
  const lines = [header.join(",")];
  rows.forEach(row => {
    lines.push([row.id,row.created_at,row.winner,row.result?.roundsPlayed || row.result?.avgRounds || "",row.note || "",historyScenarioPreview(row)].map(csvEscape).join(","));
  });
  const blob = new Blob([lines.join("\\n")],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="battle_lab_1914_historial_nube.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function clearHistoryFilters(){
  if(document.querySelector("#historyWinnerFilter")) document.querySelector("#historyWinnerFilter").value = "all";
  if(document.querySelector("#historyDateFrom")) document.querySelector("#historyDateFrom").value = "";
  if(document.querySelector("#historyDateTo")) document.querySelector("#historyDateTo").value = "";
  if(document.querySelector("#historySearch")) document.querySelector("#historySearch").value = "";
  renderCloudHistoryRows(CLOUD_HISTORY_CACHE);
}

async function saveHistoryToCloud(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  if(!state.lastResult){
    alert("Primero simula una batalla.");
    return;
  }
  try{
    const result = state.lastResult.result;
    const data = await api.saveSupabaseHistory({
      winner:calculatedWinnerFromResult(result),
      result:{...result, note:document.querySelector("#historyNote")?.value || ""},
      note:document.querySelector("#historyNote")?.value || "",
      scenarioSnapshot:state.lastResult.scenario
    });
    alert("Historial guardado en Supabase.");
    await loadCloudHistory();
  }catch(error){
    alert(`No se pudo guardar historial: ${error.message}`);
  }
}

async function loadCloudScenarios(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const list = document.querySelector("#cloudDataList");
  try{
    const rows = await api.listSupabaseScenarios();
    renderCloudScenarios(rows, "Mis escenarios");
  }catch(error){
    list.innerHTML = `<div class="warning danger">Error: ${error.message}</div>`;
  }
}

async function loadPublicScenarios(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const list = document.querySelector("#cloudDataList");
  try{
    const rows = await api.listPublicSupabaseScenarios();
    renderCloudScenarios(rows, "Escenarios públicos");
  }catch(error){
    list.innerHTML = `<div class="warning danger">Error: ${error.message}</div>`;
  }
}

async function loadFavoriteScenarios(){
  const api = supabaseApi();
  if(!api || !api.getSupabaseClient()){
    alert("Primero configura Supabase.");
    return;
  }
  const list = document.querySelector("#cloudDataList");
  try{
    const rows = await api.listFavoriteSupabaseScenarios();
    renderCloudScenarios(rows, "Favoritos");
  }catch(error){
    list.innerHTML = `<div class="warning danger">Error: ${error.message}</div>`;
  }
}

async function loadCloudHistory(){
  await loadCloudHistoryFiltered();
}

function loadCloudScenarioFromButton(encoded){
  try{
    const snapshot = JSON.parse(decodeURIComponent(encoded));
    applyScenarioSnapshot(snapshot);
    closeDashboard();
  }catch(error){
    alert("No se pudo cargar el escenario de Supabase.");
  }
}

const PLATFORM_USERS_KEY = "battleLab1914.stage22.users";
const PLATFORM_SESSION_KEY = "battleLab1914.stage22.session";

function getPlatformUsers(){
  try{return JSON.parse(localStorage.getItem(PLATFORM_USERS_KEY) || "{}");}
  catch(error){return {};}
}
function setPlatformUsers(users){
  localStorage.setItem(PLATFORM_USERS_KEY, JSON.stringify(users));
}
function getCurrentUserId(){
  return localStorage.getItem(PLATFORM_SESSION_KEY) || "";
}
function getCurrentUser(){
  const id = getCurrentUserId();
  if(!id) return null;
  return getPlatformUsers()[id] || null;
}
function makeUserId(name,email){
  const base = `${name || "jugador"}-${email || ""}`.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return base || `jugador-${Date.now()}`;
}
function openLogin(){
  document.querySelector("#authPanel").hidden = false;
  document.querySelector("#dashboardPanel").hidden = true;
}
function closeLogin(){
  document.querySelector("#authPanel").hidden = true;
}
function openDashboard(){
  if(!getCurrentUser()){
    openLogin();
    return;
  }
  document.querySelector("#dashboardPanel").hidden = false;
  document.querySelector("#authPanel").hidden = true;
  renderDashboard();
}
function closeDashboard(){
  document.querySelector("#dashboardPanel").hidden = true;
}
function createLocalUser(){
  const name = (document.querySelector("#loginName").value || "").trim();
  if(!name){
    alert("Coloca un nombre de usuario.");
    return;
  }
  const email = (document.querySelector("#loginEmail").value || "").trim();
  const country = (document.querySelector("#loginCountry").value || "").trim();
  const role = document.querySelector("#loginRole").value || "General";
  const id = makeUserId(name,email);
  const users = getPlatformUsers();
  users[id] = users[id] || {
    id,
    createdAt:new Date().toISOString(),
    scenarios:[],
    history:[]
  };
  users[id].name = name;
  users[id].email = email;
  users[id].country = country;
  users[id].role = role;
  users[id].updatedAt = new Date().toISOString();
  setPlatformUsers(users);
  localStorage.setItem(PLATFORM_SESSION_KEY,id);
  closeLogin();
  updateSessionUI();
  openDashboard();
}
function loginDemoUser(){
  document.querySelector("#loginName").value = "Jugador Demo";
  document.querySelector("#loginEmail").value = "demo@battlelab.local";
  document.querySelector("#loginCountry").value = "Demo";
  document.querySelector("#loginRole").value = "General";
  createLocalUser();
}
async function logoutUser(){
  const api = supabaseApi();
  if(api && api.getSupabaseClient()){
    try{ await api.signOutSupabase(); }catch(error){}
  }
  localStorage.removeItem(PLATFORM_SESSION_KEY);
  updateSessionUI();
  closeDashboard();
}
function updateSessionUI(){
  const user = getCurrentUser();
  const status = document.querySelector("#sessionStatus");
  const sub = document.querySelector("#sessionSub");
  if(!status || !sub) return;
  const api = supabaseApi();
  const cloudOn = api && api.hasSupabaseConfig && api.hasSupabaseConfig();
  if(!user){
    status.innerHTML = `Sesión no iniciada · <span class="supabase-status ${cloudOn?"on":""}">${cloudOn?"Supabase configurado":"Modo local"}</span>`;
    sub.textContent = "Conecta Supabase o usa modo local para guardar escenarios e historial.";
    return;
  }
  const provider = user.authProvider === "supabase" ? "Supabase" : "Local";
  status.innerHTML = `${user.name} · ${user.role || "General"} · <span class="supabase-status ${provider==="Supabase"?"on":""}">${provider}</span>`;
  sub.textContent = `${user.country || "Sin país"} · ${user.scenarios?.length || 0} escenarios locales · ${user.history?.length || 0} simulaciones locales`;
}
function requireUser(){
  const user = getCurrentUser();
  if(!user){
    alert("Primero inicia sesión local.");
    openLogin();
    return null;
  }
  return user;
}
function updateUser(user){
  const users = getPlatformUsers();
  users[user.id] = user;
  setPlatformUsers(users);
  updateSessionUI();
}
function saveScenarioToUser(){
  const user = requireUser();
  if(!user) return;
  const name = prompt("Nombre del escenario:", document.querySelector("#testCaseName")?.value || "Escenario Battle Lab") || "Escenario Battle Lab";
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `scenario-${Date.now()}`,
    name,
    createdAt:new Date().toISOString(),
    mode:state.mode,
    snapshot:currentScenarioSnapshot()
  };
  user.scenarios = user.scenarios || [];
  user.scenarios.unshift(item);
  updateUser(user);
  renderDashboard();
  alert("Escenario guardado en tu cuenta local.");
}
function saveHistoryNow(){
  const user = requireUser();
  if(!user) return;
  if(!state.lastResult){
    alert("Primero simula una batalla.");
    return;
  }
  const result = state.lastResult.result;
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `history-${Date.now()}`,
    createdAt:new Date().toISOString(),
    winner: calculatedWinnerFromResult(result),
    result,
    scenario: state.lastResult.scenario
  };
  user.history = user.history || [];
  user.history.unshift(item);
  updateUser(user);
  renderDashboard();
  alert("Resultado guardado en tu historial local.");
}
function loadUserScenario(id){
  const user = requireUser();
  if(!user) return;
  const item = (user.scenarios || []).find(s => s.id === id);
  if(!item) return;
  applyScenarioSnapshot(item.snapshot);
  closeDashboard();
}
function deleteUserScenario(id){
  const user = requireUser();
  if(!user) return;
  user.scenarios = (user.scenarios || []).filter(s => s.id !== id);
  updateUser(user);
  renderDashboard();
}
function deleteHistoryItem(id){
  const user = requireUser();
  if(!user) return;
  user.history = (user.history || []).filter(h => h.id !== id);
  updateUser(user);
  renderDashboard();
}
function applyScenarioSnapshot(snapshot){
  if(!snapshot) return;
  document.querySelector("#unitsA").innerHTML = "";
  document.querySelector("#unitsB").innerHTML = "";
  const stackA = snapshot.armyA?.stacks?.[0];
  const stackB = snapshot.armyB?.stacks?.[0];

  function applyStack(army, stack){
    if(!stack) return;
    (stack.units || []).forEach(unit => addUnit(army, unit));
    document.querySelector(`#pos${army}`).value = stack.position ?? 0;
    document.querySelector(`#terrain${army}`).value = stack.terrain || "land";
    document.querySelector(`#targetClass${army}`).value = stack.targetClass || "auto";
    document.querySelector(`#target${army}`).value = stack.target || (army==="A"?"B1":"Defend");
    document.querySelector(`#fort${army}`).value = stack.fortress || "none";
    document.querySelector(`#fortHp${army}`).value = stack.fortHp || 0;
    document.querySelector(`#hero${army}`).value = stack.hero?.id || "none";
    applyHeroPreset(army);
    if(stack.hero){
      document.querySelector(`#heroAffects${army}`).value = stack.hero.affects || "all";
      document.querySelector(`#heroAttack${army}`).value = stack.hero.attackBonus || 0;
      document.querySelector(`#heroDefense${army}`).value = stack.hero.defenseBonus || 0;
      document.querySelector(`#heroHp${army}`).value = stack.hero.hpBonus || 0;
    }
  }

  applyStack("A", stackA);
  applyStack("B", stackB);
  document.querySelector("#maxRounds").value = snapshot.options?.maxRounds || 25;
  document.querySelector("#simulateVariance").checked = Boolean(snapshot.options?.simulateVariance);
  document.querySelector("#simulationRuns").value = snapshot.options?.simulationRuns || 100;
  setMode(snapshot.options?.mode || "basic");
  renderValidation([]);
  document.querySelector("#simpleReport").innerHTML = `<div class="warning safe">Escenario cargado desde tu cuenta local. Pulsa <b>Simular batalla</b>.</div>`;
}
function renderDashboard(){
  const user = getCurrentUser();
  if(!user) return;
  const scenarios = user.scenarios || [];
  const history = user.history || [];
  document.querySelector("#dashScenarioCount").textContent = scenarios.length;
  document.querySelector("#dashHistoryCount").textContent = history.length;
  document.querySelector("#dashPlayerName").textContent = user.name || "Jugador";

  document.querySelector("#userScenarios").innerHTML = scenarios.length ? scenarios.map(item => `
    <article class="saved-item">
      <h3>${item.name}</h3>
      <div class="saved-meta">
        <span class="saved-pill">Modo: ${item.mode}</span>
        <span class="saved-pill">${new Date(item.createdAt).toLocaleString()}</span>
      </div>
      <div class="saved-actions">
        <button type="button" data-load-scenario-id="${item.id}">Cargar</button>
        <button type="button" data-delete-scenario-id="${item.id}">Eliminar</button>
      </div>
    </article>`).join("") : `<div class="platform-notice">No tienes escenarios guardados todavía.</div>`;

  document.querySelector("#userHistory").innerHTML = history.length ? history.map(item => `
    <article class="saved-item">
      <h3>Simulación · ${item.winner}</h3>
      <div class="saved-meta">
        <span class="saved-pill">${new Date(item.createdAt).toLocaleString()}</span>
        <span class="saved-pill">Ganador: ${item.winner}</span>
      </div>
      <div class="saved-actions">
        <button type="button" data-delete-history-id="${item.id}">Eliminar</button>
      </div>
    </article>`).join("") : `<div class="platform-notice">No tienes historial guardado todavía.</div>`;
}
function exportUserData(){
  const user = requireUser();
  if(!user) return;
  const payload = {
    app:"Battle Lab 1914",
    stage:22,
    exportedAt:new Date().toISOString(),
    user
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `battle_lab_1914_${user.name.replace(/[^a-z0-9]+/gi,"_").toLowerCase()}_datos.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const TEST_CASES_KEY = "battleLab1914.stage20.testCases";

function getStoredTestCases(){
  try{
    return JSON.parse(localStorage.getItem(TEST_CASES_KEY) || "[]");
  }catch(error){
    return [];
  }
}

function setStoredTestCases(cases){
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(cases));
}

function currentScenarioSnapshot(){
  return {
    armyA: readArmy("A"),
    armyB: readArmy("B"),
    options: {
      maxRounds: Number(document.querySelector("#maxRounds").value || 25),
      simulateVariance: document.querySelector("#simulateVariance").checked,
      simulationRuns: Number(document.querySelector("#simulationRuns").value || 100),
      mode: state.mode
    }
  };
}

function normalizeWinnerText(value){
  const text = String(value || "").toLowerCase();
  if(text.includes("army a") || text === "a") return "Army A";
  if(text.includes("army b") || text === "b") return "Army B";
  if(text.includes("draw") || text.includes("empate") || text.includes("sin ganador")) return "Draw";
  return "unknown";
}

function calculatedWinnerFromResult(result){
  if(!result) return "unknown";
  if(result.probabilityA !== undefined){
    if(Math.abs(result.probabilityA - result.probabilityB) <= 5) return "Draw";
    return result.probabilityA > result.probabilityB ? "Army A" : "Army B";
  }
  return normalizeWinnerText(result.winner);
}

function compareExpectedToCalculated(expected, calculated){
  if(expected === "unknown") return {status:"pendiente", label:"Sin resultado esperado", ok:null};
  if(expected === calculated) return {status:"ok", label:"Coincide", ok:true};
  return {status:"bad", label:"No coincide", ok:false};
}

function saveCurrentTestCase(){
  if(!state.lastResult){
    alert("Primero simula la batalla para guardar un caso de prueba.");
    return;
  }

  const expected = document.querySelector("#expectedWinner").value || "unknown";
  const calculated = calculatedWinnerFromResult(state.lastResult.result);
  const comparison = compareExpectedToCalculated(expected, calculated);
  const cases = getStoredTestCases();

  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`,
    createdAt: new Date().toISOString(),
    name: document.querySelector("#testCaseName").value || "Caso de prueba",
    expectedWinner: expected,
    calculatedWinner: calculated,
    comparison,
    confidence: document.querySelector("#caseConfidence").value || "pendiente",
    acceptedDiff: Number(document.querySelector("#acceptedDiff").value || 10),
    notes: document.querySelector("#testNotes").value || "",
    snapshot: currentScenarioSnapshot(),
    result: state.lastResult.result
  };

  cases.unshift(item);
  setStoredTestCases(cases);
  renderSingleTestCase(item);
}

function renderSingleTestCase(item){
  const cls = item.comparison.status === "ok" ? "ok" : item.comparison.status === "bad" ? "bad" : "warn";
  document.querySelector("#testCaseReport").innerHTML = `
    <div class="case-card">
      <h3>${item.name}</h3>
      <div class="case-meta">
        <span class="case-pill ${cls}">${item.comparison.label}</span>
        <span class="case-pill">Esperado: ${item.expectedWinner}</span>
        <span class="case-pill">Calculado: ${item.calculatedWinner}</span>
        <span class="case-pill">Confianza: ${item.confidence}</span>
      </div>
      <p>${item.notes || "Sin notas."}</p>
    </div>`;
}

function getCalibrationStats(cases){
  const defined = cases.filter(c => c.expectedWinner && c.expectedWinner !== "unknown");
  const ok = defined.filter(c => c.comparison?.ok === true).length;
  const bad = defined.filter(c => c.comparison?.ok === false).length;
  const pending = cases.length - defined.length;
  const accuracy = defined.length ? (ok / defined.length) * 100 : 0;
  return {total:cases.length, defined:defined.length, ok, bad, pending, accuracy};
}

function showTestCases(){
  const cases = getStoredTestCases();
  const stats = getCalibrationStats(cases);
  const report = document.querySelector("#testCaseReport");

  if(!cases.length){
    report.innerHTML = `<div class="warning">Todavía no hay casos guardados. Simula una batalla y guarda el primer caso de prueba.</div>`;
    return;
  }

  report.innerHTML = `
    <div class="calibration-score">
      <div class="score-card"><strong>Casos</strong><b>${stats.total}</b></div>
      <div class="score-card"><strong>Coinciden</strong><b>${stats.ok}</b></div>
      <div class="score-card"><strong>No coinciden</strong><b>${stats.bad}</b></div>
      <div class="score-card"><strong>Precisión</strong><b>${format(stats.accuracy)}%</b></div>
    </div>
    <div class="case-list">
      ${cases.map(item => {
        const cls = item.comparison?.status === "ok" ? "ok" : item.comparison?.status === "bad" ? "bad" : "warn";
        return `<article class="case-card">
          <h3>${item.name}</h3>
          <div class="case-meta">
            <span class="case-pill ${cls}">${item.comparison?.label || "Pendiente"}</span>
            <span class="case-pill">Esperado: ${item.expectedWinner}</span>
            <span class="case-pill">Calculado: ${item.calculatedWinner}</span>
            <span class="case-pill">Confianza: ${item.confidence}</span>
            <span class="case-pill">${new Date(item.createdAt).toLocaleString()}</span>
          </div>
          <p>${item.notes || "Sin notas."}</p>
        </article>`;
      }).join("")}
    </div>`;
}

function exportTestCases(){
  const cases = getStoredTestCases();
  if(!cases.length){
    alert("No hay casos para exportar.");
    return;
  }
  const payload = {
    app: "Battle Lab 1914",
    stage: 20,
    exportedAt: new Date().toISOString(),
    stats: getCalibrationStats(cases),
    cases
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "battle_lab_1914_casos_prueba.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearTestCases(){
  if(!confirm("¿Borrar todos los casos de prueba guardados en este navegador?")) return;
  setStoredTestCases([]);
  document.querySelector("#testCaseReport").innerHTML = "Casos de prueba borrados.";
}

function autoUpdateTestPanelAfterSimulation(result){
  const expected = document.querySelector("#expectedWinner")?.value || "unknown";
  const calculated = calculatedWinnerFromResult(result);
  const comparison = compareExpectedToCalculated(expected, calculated);
  const cls = comparison.status === "ok" ? "ok" : comparison.status === "bad" ? "bad" : "warn";
  const panel = document.querySelector("#testCaseReport");
  if(!panel) return;
  panel.innerHTML = `
    <div class="case-card">
      <h3>Comparación temporal</h3>
      <div class="case-meta">
        <span class="case-pill ${cls}">${comparison.label}</span>
        <span class="case-pill">Esperado: ${expected}</span>
        <span class="case-pill">Calculado: ${calculated}</span>
      </div>
      <p>Para conservar este análisis, pulsa <b>Guardar caso actual</b>.</p>
    </div>`;
}

function simulate(){
  if(!validateBeforeSimulate()) return;
  const armyA = readArmy("A"), armyB = readArmy("B");
  const options = {
    maxRounds: Number(document.querySelector("#maxRounds").value || 25),
    simulateVariance: document.querySelector("#simulateVariance").checked,
    simulationRuns: Number(document.querySelector("#simulationRuns").value || 100)
  };
  const result = options.simulateVariance && options.simulationRuns > 1
    ? runVarianceSimulations(armyA, armyB, options)
    : simulateBattle(armyA, armyB, options);
  state.lastResult = { scenario: { armyA, armyB, options }, result };
  renderSimpleResult(result);
  renderTechnical(result);
  autoUpdateTestPanelAfterSimulation(result);
  if(getCurrentUser()){
    updateSessionUI();
  }
}
function exportResult(){
  if(!state.lastResult){ alert("Primero simula una batalla."); return; }
  const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "battle_lab_1914_resultado.json";
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function resetAll(){
  document.querySelector("#unitsA").innerHTML = "";
  document.querySelector("#unitsB").innerHTML = "";
  addUnit("A", {type:"infantry", count:75, hp:"100%"});
  addUnit("B", {type:"infantry", count:60, hp:"100%"});
  document.querySelector("#posA").value = 0; document.querySelector("#posB").value = 0;
  document.querySelector("#targetA").value = "B1"; document.querySelector("#targetB").value = "Defend";
  document.querySelector("#fortA").value = "none"; document.querySelector("#fortB").value = "none";
  document.querySelector("#fortHpA").value = 0; document.querySelector("#fortHpB").value = 0;
  document.querySelector("#heroA").value = "none"; document.querySelector("#heroB").value = "none";
  applyHeroPreset("A"); applyHeroPreset("B");
  document.querySelector("#summaryResult").className = "result-hero";
  document.querySelector("#summaryResult").innerHTML = `<div><p class="eyebrow">Resultado principal</p><h2>Configura Army A y Army B, luego pulsa Simular</h2><p>La respuesta principal aparecerá aquí en lenguaje claro. El detalle técnico queda abajo.</p></div>`;
  document.querySelector("#simpleReport").textContent = "Todavía no hay simulación.";
  document.querySelector("#technicalReport").textContent = "Las tablas técnicas aparecerán después de simular.";
}
function loadScenario(name){
  resetAll();
  if(name === "desembarco"){
    document.querySelector("#unitsA").innerHTML = ""; document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"infantry",count:56,hp:"100%"}); addUnit("A",{type:"armoredCar",count:11,hp:"100%"}); addUnit("A",{type:"stormtrooper",count:5,hp:"100%"});
    addUnit("B",{type:"infantry",count:15,hp:"100%"}); addUnit("B",{type:"cavalry",count:8,hp:"100%"}); addUnit("B",{type:"armoredCar",count:9,hp:"100%"});
    document.querySelector("#terrainA").value = "debark"; setMode("tactical");
  }
  if(name === "fortaleza"){
    document.querySelector("#unitsA").innerHTML = ""; document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"artillery",count:25,hp:"100%"}); addUnit("B",{type:"infantry",count:90,hp:"100%"}); addUnit("B",{type:"armoredCar",count:6,hp:"100%"});
    document.querySelector("#posA").value = 50; document.querySelector("#targetClassA").value = "building"; document.querySelector("#fortB").value = "4"; document.querySelector("#fortHpB").value = 50; setMode("advanced");
  }
  if(name === "aereo"){
    document.querySelector("#unitsA").innerHTML = ""; document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"bomber",count:6,hp:"100%"}); addUnit("B",{type:"infantry",count:45,hp:"100%"}); addUnit("B",{type:"armoredCar",count:4,hp:"100%"});
    document.querySelector("#terrainA").value = "air"; document.querySelector("#posA").value = 0; document.querySelector("#posB").value = 150; setMode("tactical");
  }
  if(name === "georg"){
    document.querySelector("#unitsA").innerHTML = ""; document.querySelector("#unitsB").innerHTML = "";
    addUnit("A",{type:"artillery",count:36,hp:"100%"}); addUnit("B",{type:"infantry",count:120,hp:"100%"});
    document.querySelector("#posA").value = 50; document.querySelector("#heroA").value = "georg"; applyHeroPreset("A"); setMode("advanced");
  }
}
function showHelp(){
  document.querySelector("#simpleReport").innerHTML = `
    <div class="help-mini">
      <div><b>Modo básico</b><span>Sirve para comparar dos ejércitos rápido. Solo unidad, cantidad y HP.</span></div>
      <div><b>Modo táctico</b><span>Sirve para distancia, desembarco, terreno, bombardeo y objetivos.</span></div>
      <div><b>Modo avanzado</b><span>Sirve para fortalezas, héroes, varianza, exportación, casos de prueba y guardado por jugador.</span></div>
    </div>
    <div class="warning safe">Consejo: empieza con ejemplo básico, luego pasa a táctico y finalmente avanzado.</div>`;
}
document.addEventListener("click", e => {
  const action = e.target.dataset.action;
  if(e.target.dataset.communityLoad) loadCommunityScenario(e.target.dataset.communityLoad);
  if(e.target.dataset.communityCopy) copyCommunityScenario(e.target.dataset.communityCopy);
  if(e.target.dataset.communityFavorite) favoriteCommunityScenario(e.target.dataset.communityFavorite);
  if(e.target.dataset.communityShare) shareCommunityScenario(e.target.dataset.communityShare);
  if(e.target.dataset.historyLoadScenario) loadHistoryScenario(e.target.dataset.historyLoadScenario);
  if(e.target.dataset.historyDetail) showHistoryResultDetail(e.target.dataset.historyDetail);
  if(e.target.dataset.historyDeleteId) deleteCloudHistoryItem(e.target.dataset.historyDeleteId);
  if(e.target.dataset.historyNoteId) editCloudHistoryNote(e.target.dataset.historyNoteId, e.target.dataset.historyCurrentNote);
  if(e.target.dataset.historyCompare) compareHistoryItem(e.target.dataset.historyCompare);
  if(e.target.dataset.cloudScenario) loadCloudScenarioFromButton(e.target.dataset.cloudScenario);
  if(e.target.dataset.cloudEditId) renameCloudScenario(e.target.dataset.cloudEditId, e.target.dataset.cloudCurrentName);
  if(e.target.dataset.cloudVisibilityId) changeCloudVisibility(e.target.dataset.cloudVisibilityId, e.target.dataset.cloudCurrentVisibility);
  if(e.target.dataset.cloudDeleteId) deleteCloudScenario(e.target.dataset.cloudDeleteId);
  if(e.target.dataset.cloudDuplicate) duplicateCloudScenario(e.target.dataset.cloudDuplicate);
  if(e.target.dataset.cloudFavorite) favoriteCloudScenario(e.target.dataset.cloudFavorite);
  if(e.target.dataset.cloudShare) shareCloudScenario(e.target.dataset.cloudShare);
  if(e.target.dataset.loadScenarioId) loadUserScenario(e.target.dataset.loadScenarioId);
  if(e.target.dataset.deleteScenarioId) deleteUserScenario(e.target.dataset.deleteScenarioId);
  if(e.target.dataset.deleteHistoryId) deleteHistoryItem(e.target.dataset.deleteHistoryId);
  if(e.target.classList.contains("mode")) setMode(e.target.dataset.mode);
  if(e.target.dataset.example) loadExample(e.target.dataset.example);
  if(action === "simulate") simulate();
  if(action === "add-unit") addUnit(e.target.dataset.army);
  if(action === "delete-unit"){
    const list = e.target.closest(".unit-list");
    const army = list?.id === "unitsA" ? "A" : "B";
    if(list && list.children.length > 1){
      e.target.closest(".unit-row").remove();
      updateArmyHpSummary(army);
    }
  }
  if(action === "reset") resetAll();
  if(action === "export") exportResult();
  if(action === "help") showHelp();
  if(action === "hide-guide") hideGuide();
  if(action === "copy-summary") copyResultSummary();
  if(action === "save-test-case") saveCurrentTestCase();
  if(action === "show-test-cases") showTestCases();
  if(action === "export-test-cases") exportTestCases();
  if(action === "clear-test-cases") clearTestCases();
  if(action === "open-login") openLogin();
  if(action === "close-login") closeLogin();
  if(action === "create-local-user") createLocalUser();
  if(action === "demo-user") loginDemoUser();
  if(action === "logout") logoutUser();
  if(action === "open-dashboard") openDashboard();
  if(action === "close-dashboard") closeDashboard();
  if(action === "save-user-scenario") saveScenarioToUser();
  if(action === "save-history-now") saveHistoryNow();
  if(action === "export-user-data") exportUserData();
  if(action === "save-supabase-config") saveSupabaseConfigFromInputs();
  if(action === "test-supabase-config") testSupabaseConfig();
  if(action === "clear-supabase-config") clearSupabaseConfigFromInputs();
  if(action === "signup-supabase") signUpSupabaseFromForm();
  if(action === "signin-supabase") signInSupabaseFromForm();
  if(action === "save-cloud-scenario") saveScenarioToCloud();
  if(action === "save-cloud-history") saveHistoryToCloud();
  if(action === "load-cloud-scenarios") loadCloudScenarios();
  if(action === "load-cloud-history") loadCloudHistory();
  if(action === "export-history-json") exportHistoryJson();
  if(action === "export-history-csv") exportHistoryCsv();
  if(action === "clear-history-filters") clearHistoryFilters();
  if(action === "make-share-code") makeShareCode();
  if(action === "copy-share-code") copyShareCode();
  if(action === "import-share-code") importShareCode();
  if(action === "save-imported-to-cloud") saveImportedToCloud();
  if(action === "open-community") openCommunity();
  if(action === "load-community-feed") loadCommunityFeed();
  if(action === "refresh-community-feed") loadCommunityFeed();
  if(action === "export-community-feed") exportCommunityFeed();
  if(action === "open-player-stats") openPlayerStats();
  if(action === "build-player-stats") buildPlayerStatsFromLocal();
  if(action === "load-stats-from-cloud") loadStatsFromCloud();
  if(action === "export-player-stats") exportPlayerStats();
  if(action === "copy-player-stats") copyPlayerStats();
  if(action === "start-app") startProductionApp();
  if(action === "public-demo") loadPublicDemo();
  if(action === "production-checklist") showProductionChecklist();
  if(action === "publish-guide") showPublishGuide();
  if(action === "export-project-info") exportProjectInfo();
  if(action === "load-public-scenarios") loadPublicScenarios();
  if(action === "load-favorite-scenarios") loadFavoriteScenarios();
  if(action === "export-cloud-cache") exportCloudCache();
  if(e.target.dataset.scenario) loadScenario(e.target.dataset.scenario);
});
document.addEventListener("input", e => {
  const row = e.target.closest(".unit-row");
  if(row){
    if(e.target.classList.contains("unit-count")) updateUnitRow(row, "count");
    if(e.target.classList.contains("unit-hp")) updateUnitRow(row, "hp");
    if(e.target.classList.contains("unit-hp-percent")) updateUnitRow(row, "percent");
  }
});
document.addEventListener("change", e => {
  const row = e.target.closest(".unit-row");
  if(row && e.target.classList.contains("unit-type")) updateUnitRow(row, "type");
  if(e.target.id === "heroA") applyHeroPreset("A");
  if(e.target.id === "heroB") applyHeroPreset("B");
  if(e.target.id === "cloudScenarioSearch") renderCloudScenarios(CLOUD_SCENARIO_CACHE, "Escenarios filtrados");
  if(["historyWinnerFilter","historyDateFrom","historyDateTo","historySearch"].includes(e.target.id)) renderCloudHistoryRows(CLOUD_HISTORY_CACHE);
  if(["communitySearch","communityTypeFilter","communitySort"].includes(e.target.id)) renderCommunityFeed(COMMUNITY_CACHE);
});
document.addEventListener("DOMContentLoaded", () => {
  initHeroes();
  resetAll();
  updateAllUnitRows();
  setMode("basic");
  restoreGuide();
  loadSupabaseConfigInputs();
  updateSessionUI();
  restoreSupabaseSession();
});

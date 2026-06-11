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
function createUnitRow(data={}){
  const row = document.querySelector("#unitRowTemplate").content.firstElementChild.cloneNode(true);
  row.querySelector(".unit-type").innerHTML = unitOptions(data.type || "infantry");
  row.querySelector(".unit-count").value = data.count ?? 10;
  row.querySelector(".unit-hp").value = data.hp ?? "100%";
  return row;
}
function addUnit(army, data={}){
  document.querySelector(`#units${army}`).appendChild(createUnitRow(data));
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
    hp: row.querySelector(".unit-hp").value || "100%"
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
  if(result.probabilityA !== undefined){
    document.querySelector("#simpleReport").innerHTML = `
      <div class="report-cards">
        <div class="report-card"><strong>Victoria Army A</strong><b>${format(result.probabilityA)}%</b></div>
        <div class="report-card"><strong>Victoria Army B</strong><b>${format(result.probabilityB)}%</b></div>
        <div class="report-card"><strong>Rondas promedio</strong><b>${format(result.avgRounds,2)}</b></div>
      </div>${warnings}`;
    return;
  }
  document.querySelector("#simpleReport").innerHTML = `
    <div class="report-cards">
      <div class="report-card"><strong>Ganador</strong><b>${result.winner}</b></div>
      <div class="report-card"><strong>HP Army A</strong><b>${format(result.armyA.totalRemainingHp)} / ${format(result.armyA.totalInitialHp)}</b></div>
      <div class="report-card"><strong>HP Army B</strong><b>${format(result.armyB.totalRemainingHp)} / ${format(result.armyB.totalInitialHp)}</b></div>
    </div>${warnings}`;
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
function simulate(){
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
    <div class="warning safe"><b>Modo básico:</b> solo unidades, cantidad, HP y simular.</div>
    <div class="warning"><b>Modo táctico:</b> agrega terreno, posición, objetivo y tipo de daño.</div>
    <div class="warning"><b>Modo avanzado:</b> activa fortalezas, héroes, varianza y exportación.</div>`;
}
document.addEventListener("click", e => {
  const action = e.target.dataset.action;
  if(e.target.classList.contains("mode")) setMode(e.target.dataset.mode);
  if(action === "simulate") simulate();
  if(action === "add-unit") addUnit(e.target.dataset.army);
  if(action === "delete-unit"){
    const list = e.target.closest(".unit-list");
    if(list && list.children.length > 1) e.target.closest(".unit-row").remove();
  }
  if(action === "reset") resetAll();
  if(action === "export") exportResult();
  if(action === "help") showHelp();
  if(e.target.dataset.scenario) loadScenario(e.target.dataset.scenario);
});
document.addEventListener("change", e => {
  if(e.target.id === "heroA") applyHeroPreset("A");
  if(e.target.id === "heroB") applyHeroPreset("B");
});
document.addEventListener("DOMContentLoaded", () => {
  initHeroes();
  resetAll();
  setMode("basic");
});

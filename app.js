const stackCounters={A:0,B:0};
function formatNumber(v,d=1){if(v===null||v===undefined||Number.isNaN(Number(v)))return"-";return Number(v).toFixed(d).replace(/\.0$/,"")}
function createUnitOptions(selected="infantry"){return UNIT_ORDER.map(id=>`<option value="${id}" ${id===selected?"selected":""}>${UNITS[id].name}</option>`).join("")}
function createHeroOptions(selected="none"){
 return Object.keys(HEROES).map(id=>`<option value="${id}" ${id===selected?"selected":""}>${HEROES[id].name}</option>`).join("");
}
function getHeroPreset(id){
 return HEROES[id]||HEROES.none;
}
function setHeroFields(stack,hero){
 stack.querySelector(".hero-select").innerHTML=createHeroOptions(hero.id||"none");
 stack.querySelector(".hero-level").value=hero.level??0;
 stack.querySelector(".hero-affects").value=hero.affects||"all";
 stack.querySelector(".hero-attack").value=hero.attackBonus??0;
 stack.querySelector(".hero-defense").value=hero.defenseBonus??0;
 stack.querySelector(".hero-hp").value=hero.hpBonus??0;
 stack.querySelector(".hero-duration").value=hero.duration??0;
}
function applyHeroPreset(stack){
 const id=stack.querySelector(".hero-select").value;
 const preset=getHeroPreset(id);
 if(id==="custom")return;
 setHeroFields(stack,preset);
 updateStackSummary(stack);
}
function readHero(stack){
 const id=stack.querySelector(".hero-select").value||"none";
 const preset=getHeroPreset(id);
 return{
  id,
  name:preset.name,
  level:Number(stack.querySelector(".hero-level").value||0),
  affects:stack.querySelector(".hero-affects").value||"all",
  attackBonus:Number(stack.querySelector(".hero-attack").value||0),
  defenseBonus:Number(stack.querySelector(".hero-defense").value||0),
  hpBonus:Number(stack.querySelector(".hero-hp").value||0),
  duration:Number(stack.querySelector(".hero-duration").value||0)
 };
}

function createUnitRow(data={}){const row=document.querySelector("#unitRowTemplate").content.firstElementChild.cloneNode(true);const type=data.type||"infantry";row.querySelector(".unit-type").innerHTML=createUnitOptions(type);row.querySelector(".unit-count").value=data.count??1;row.querySelector(".unit-hp").value=data.hp??"100%";updateMiniStatsForRow(row);return row}
function createStack(army,config={}){
 stackCounters[army]+=1;
 const id=config.id||`${army}${stackCounters[army]}`;
 const stack=document.querySelector("#stackTemplate").content.firstElementChild.cloneNode(true);
 stack.dataset.army=army;
 stack.dataset.stackId=id;
 stack.querySelector(".stack-name").textContent=`Stack ${id}`;
 stack.querySelector(".terrain-select").value=config.terrain||"land";
 stack.querySelector(".target-class-select").value=config.targetClass||"auto";
 stack.querySelector(".position-select").value=String(config.position??0);
 stack.querySelector(".fort-select").value=config.fortress||"none";
 const fort=FORTRESSES[config.fortress]||FORTRESSES.none;
 stack.querySelector(".fort-hp").value=config.fortHp??(fort.level?fort.hp:0);
 const heroConfig=config.hero||HEROES.none;
 setHeroFields(stack,{...getHeroPreset(heroConfig.id||"none"),...heroConfig});
 const units=config.units?.length?config.units:[{type:"infantry",count:army==="A"?75:30,hp:"100%"}];
 units.forEach(u=>stack.querySelector(".unit-list").appendChild(createUnitRow(u)));
 updateFortReadout(stack);
 updateStackSummary(stack);
 return stack
}
function addStack(army,config={}){const stack=createStack(army,config);document.querySelector(`#stacks${army}`).appendChild(stack);updateTargets();updateDeleteButtons();return stack}
function duplicateStack(stack){const army=stack.dataset.army;const c=readStack(stack);delete c.id;addStack(army,c)}
function deleteStack(stack){const army=stack.dataset.army;if(document.querySelectorAll(`.stack-card[data-army="${army}"]`).length<=1){alert("Cada ejército debe tener al menos un stack.");return}stack.remove();updateTargets();updateDeleteButtons()}
function addUnitToStack(stack,data={}){stack.querySelector(".unit-list").appendChild(createUnitRow(data));updateStackSummary(stack)}
function deleteUnit(row){const stack=row.closest(".stack-card");if(stack.querySelectorAll(".unit-row").length<=1){alert("Cada stack debe tener al menos una unidad.");return}row.remove();updateStackSummary(stack)}
function updateMiniStatsForRow(row){const unit=UNITS[row.querySelector(".unit-type").value],stats=row.querySelector(".mini-stats");const range=unit.attackRange>0?`${unit.attackRange} km`:unit.operationalRange>0?`alcance ${unit.operationalRange}`:"melee";stats.innerHTML=`HP ${unit.hp} · N ${formatNumber(unit.combat.normal.attack)}/${formatNumber(unit.combat.normal.defense)} · A ${formatNumber(unit.combat.air.attack)}/${formatNumber(unit.combat.air.defense)} · ${range}`}
function getFortEffectiveProtection(fortressValue,hpValue){const fort=FORTRESSES[fortressValue]||FORTRESSES.none;if(!fort.level)return{fort,hp:0,ratio:0,reduction:0};const hp=Math.max(0,Math.min(fort.hp,Number(hpValue||0)));const ratio=fort.hp>0?hp/fort.hp:0;return{fort,hp,ratio,reduction:fort.reductionPercent*ratio}}
function updateFortReadout(stack){const fortSelect=stack.querySelector(".fort-select"),fortHpInput=stack.querySelector(".fort-hp"),readout=stack.querySelector(".fort-protection"),bar=stack.querySelector(".fort-bar i");const fort=FORTRESSES[fortSelect.value]||FORTRESSES.none;if(!fort.level){fortHpInput.value=0;fortHpInput.disabled=true;readout.textContent="Sin fortaleza: recibe 100% del daño.";bar.style.width="0%";return}fortHpInput.disabled=false;fortHpInput.max=fort.hp;if(Number(fortHpInput.value||0)<=0)fortHpInput.value=fort.hp;const p=getFortEffectiveProtection(fortSelect.value,fortHpInput.value);readout.textContent=`${fort.name}: HP ${formatNumber(p.hp)} / ${fort.hp} · protección efectiva -${formatNumber(p.reduction)}%`;bar.style.width=`${Math.round(p.ratio*100)}%`}
function updateStackSummary(stack){
 const units=[...stack.querySelectorAll(".unit-row")].map(r=>({unitId:r.querySelector(".unit-type").value,count:Number(r.querySelector(".unit-count").value||0)}));
 const total=units.reduce((s,u)=>s+u.count,0),unique=new Set(units.map(u=>u.unitId)).size;
 const p=getFortEffectiveProtection(stack.querySelector(".fort-select").value,stack.querySelector(".fort-hp").value);
 const pos=stack.querySelector(".position-select").value;
 const tc=stack.querySelector(".target-class-select").value;
 const hero=readHero(stack);
 const heroText=hero.id&&hero.id!=="none"?` · ${getHeroPreset(hero.id).name} +${hero.attackBonus}%/+${hero.defenseBonus}%`:"";
 stack.querySelector(".stack-summary").textContent=`${total} tropas · ${unique} tipo(s) · ${pos} km · objetivo ${tc}${p.fort.level?` · ${p.fort.name} (-${formatNumber(p.reduction)}%)`:""}${heroText}`
}
function getStackIds(army){return[...document.querySelectorAll(`.stack-card[data-army="${army}"]`)].map(s=>s.dataset.stackId)}
function updateTargets(){document.querySelectorAll(".stack-card").forEach(stack=>{const enemy=stack.dataset.army==="A"?"B":"A";const sel=stack.querySelector(".target-select"),prev=sel.value,ids=getStackIds(enemy);sel.innerHTML=[`<option value="Defend">Defend</option>`,...ids.map(id=>`<option value="${id}">Stack ${id}</option>`)].join("");sel.value=[...sel.options].some(o=>o.value===prev)?prev:(ids[0]||"Defend")})}
function updateDeleteButtons(){["A","B"].forEach(a=>{const stacks=document.querySelectorAll(`.stack-card[data-army="${a}"]`);stacks.forEach(s=>{const b=s.querySelector('[data-action="delete-stack"]');b.disabled=stacks.length<=1;b.style.opacity=stacks.length<=1?".45":"1"})})}
function readStack(stack){
 return{
  id:stack.dataset.stackId,
  target:stack.querySelector(".target-select").value,
  terrain:stack.querySelector(".terrain-select").value,
  targetClass:stack.querySelector(".target-class-select").value,
  position:Number(stack.querySelector(".position-select").value||0),
  fortress:stack.querySelector(".fort-select").value,
  fortHp:Number(stack.querySelector(".fort-hp").value||0),
  hero:readHero(stack),
  units:[...stack.querySelectorAll(".unit-row")].map(r=>({type:r.querySelector(".unit-type").value,count:Number(r.querySelector(".unit-count").value||0),hp:r.querySelector(".unit-hp").value||"100%"}))
 }
}
function readArmy(a){return{id:a,stacks:[...document.querySelectorAll(`.stack-card[data-army="${a}"]`)].map(readStack)}}
function updateInputsFromResult(result){["A","B"].forEach(a=>{result[`army${a}`].stacks.forEach(sr=>{const stack=document.querySelector(`.stack-card[data-stack-id="${sr.id}"]`);if(!stack)return;stack.querySelector(".fort-hp").value=sr.fortHpRemaining;updateFortReadout(stack);sr.units.forEach(row=>{const match=[...stack.querySelectorAll(".unit-row")].find(r=>r.querySelector(".unit-type").value===row.type);if(match){match.querySelector(".unit-count").value=row.remainingCount;match.querySelector(".unit-hp").value=row.remainingHp}});updateStackSummary(stack)})})}
function renderDataStatus(){document.querySelector("#dataStatus").innerHTML=`<span class="data-pill">${UNIT_ORDER.length} unidades</span><span class="data-pill">Pestañas</span><span class="data-pill">Modo compacto</span><span class="data-pill">Exportar resultado</span>`}
function renderCodex(){document.querySelector("#unitCodex").innerHTML=UNIT_ORDER.map(id=>{const u=UNITS[id],r=u.attackRange>0?`${u.attackRange} km`:u.operationalRange>0?`Alcance ${u.operationalRange}`:"Melee";return`<article class="codex-card"><strong>${u.name}</strong><span>HP: ${u.hp}</span><span>Normal: ${formatNumber(u.combat.normal.attack)} / ${formatNumber(u.combat.normal.defense)}</span><span>Aire: ${formatNumber(u.combat.air.attack)} / ${formatNumber(u.combat.air.defense)}</span><span>Naval: ${formatNumber(u.combat.naval.attack)} / ${formatNumber(u.combat.naval.defense)}</span><span>Edificio: ${formatNumber(u.combat.building.attack)} / ${formatNumber(u.combat.building.defense)}</span><span>Rango: ${r}</span><span class="tag">${u.domain==="air"?"Aérea":"Terrestre"}</span></article>`}).join("")}
function renderArmyUnitRows(army){return army.stacks.flatMap(stack=>stack.units.map(unit=>`<tr><td>${stack.id}</td><td>${stack.position} km</td><td>${stack.targetClass}</td><td>${unit.name}${unit.heroHpBonusApplied?" ★":""}</td><td>${unit.initialCount}</td><td>${unit.remainingCount}</td><td>${unit.deadCount}</td><td>${formatNumber(unit.initialHp)}</td><td>${formatNumber(unit.remainingHp)}</td><td>${formatNumber(unit.lostHp)}</td></tr>`)).join("")}
function renderFortRows(result){
 return`<table class="results-table"><thead><tr><th>Army</th><th>Stack</th><th>Fortaleza</th><th>HP fortaleza</th><th>Protección</th><th>Estado</th><th>Derrumbe</th><th>Bloqueado</th><th>Daño fort</th></tr></thead><tbody>${[...result.armyA.stacks.map(s=>({army:"A",s})),...result.armyB.stacks.map(s=>({army:"B",s}))].map(({army,s})=>`<tr><td>${army}</td><td>${s.id}</td><td>${s.fortLevel?s.fortName:"Sin fortaleza"}</td><td>${s.fortLevel?`${formatNumber(s.fortHpInitial)} → ${formatNumber(s.fortHpRemaining)}`:"-"}</td><td>${s.fortLevel?`${formatNumber(s.fortReductionBase)}% → ${formatNumber(s.fortReductionEnd)}%`:"-"}</td><td>${s.fortLevel?s.fortStatus:"-"}</td><td>${s.fortCollapsedAt?`t=${s.fortCollapsedAt}`:"-"}</td><td>${formatNumber(s.damageBlockedByFort)}</td><td>${formatNumber(s.fortDamageTaken)}</td></tr>`).join("")}</tbody></table>`
}
function renderFortAlerts(result){
 const alerts=[...result.armyA.fortAlerts.map(a=>({army:"A",...a})),...result.armyB.fortAlerts.map(a=>({army:"B",...a}))];
 if(!alerts.length)return `<p class="small-note">Sin derrumbes ni alertas críticas de fortaleza.</p>`;
 return `<table class="results-table"><thead><tr><th>Tiempo</th><th>Army</th><th>Stack</th><th>Tipo</th><th>Alerta</th></tr></thead><tbody>${alerts.map(a=>`<tr><td>${a.time}</td><td>${a.army}</td><td>${a.stackId}</td><td>${a.type}</td><td>${a.text}</td></tr>`).join("")}</tbody></table>`;
}
function renderHeroRows(result){
 const rows=[...result.armyA.stacks.map(s=>({army:"A",s})),...result.armyB.stacks.map(s=>({army:"B",s}))]
  .filter(({s})=>s.hero&&s.hero.id&&s.hero.id!=="none")
  .map(({army,s})=>`<tr><td>${army}</td><td>${s.id}</td><td>${s.hero.name}</td><td>${s.hero.level}</td><td>${s.hero.affects}</td><td>+${formatNumber(s.hero.attackBonus)}%</td><td>+${formatNumber(s.hero.defenseBonus)}%</td><td>+${formatNumber(s.hero.hpBonus)}%</td><td>${s.hero.duration>0?s.hero.duration+" rondas":"Toda la batalla"}</td></tr>`)
  .join("");
 if(!rows)return `<p class="small-note">No hay héroes activos en este escenario.</p>`;
 return `<table class="results-table"><thead><tr><th>Army</th><th>Stack</th><th>Héroe</th><th>Nivel</th><th>Afecta</th><th>Ataque</th><th>Defensa</th><th>HP</th><th>Duración</th></tr></thead><tbody>${rows}</tbody></table><p class="small-note">★ en detalle de unidades indica que esa unidad recibió bono de HP del héroe.</p>`;
}

function renderRoundLog(log){if(!log.length)return"<p>No se ejecutaron rondas.</p>";return`<table class="results-table"><thead><tr><th>Tiempo</th><th>A bruto</th><th>A aplicado</th><th>B bloquea</th><th>Fort B</th><th>B bruto</th><th>B aplicado</th><th>A bloquea</th><th>Fort A</th><th>Estructura</th><th>Derrumbes</th><th>Bombardeos</th><th>Aéreo</th><th>Patrulla</th><th>Melee</th><th>Auto</th><th>Grupos / cambios</th><th>HP A</th><th>HP B</th></tr></thead><tbody>${log.slice(0,25).map(i=>`<tr><td>${i.tickLabel ?? i.round}</td><td>${formatNumber(i.attackRaw)}</td><td>${formatNumber(i.attackApplied)}</td><td>${formatNumber(i.attackBlocked)}</td><td>${formatNumber(i.attackFort)}</td><td>${formatNumber(i.defenseRaw)}</td><td>${formatNumber(i.defenseApplied)}</td><td>${formatNumber(i.defenseBlocked)}</td><td>${formatNumber(i.defenseFort)}</td><td>${i.structureHits ?? 0}</td><td>${(i.fortCollapses ?? []).join("<br>") || "-"}</td><td>${i.rangedShots}</td><td>${i.airStrikes ?? 0}</td><td>${i.patrolTicks ?? 0}</td><td>${i.meleeClashes}</td><td>${i.autoTargets}</td><td>${i.impactGroups.join("<br>")}</td><td>${formatNumber(i.hpA)}</td><td>${formatNumber(i.hpB)}</td></tr>`).join("")}</tbody></table>${log.length>25?`<p class="small-note">Mostrando 25 de ${log.length} rondas.</p>`:""}`}
function renderResults(result){const results=document.querySelector("#results");const winA=result.winner.includes("A")?"win":result.winner.includes("B")?"lose":"gold",winB=result.winner.includes("B")?"win":result.winner.includes("A")?"lose":"gold";results.innerHTML=`<h2>Resultado</h2><p><strong>${result.status}</strong> · ${result.model}</p><div class="result-pills"><span class="result-pill gold">Ganador: ${result.winner}</span><span class="result-pill">Rondas: ${result.roundsPlayed} / ${result.maxRounds}</span><span class="result-pill ${winA}">HP A: ${formatNumber(result.armyA.totalRemainingHp)} / ${formatNumber(result.armyA.totalInitialHp)}</span><span class="result-pill ${winB}">HP B: ${formatNumber(result.armyB.totalRemainingHp)} / ${formatNumber(result.armyB.totalInitialHp)}</span><span class="result-pill">Bloqueado fort A: ${formatNumber(result.armyA.totalBlockedByFort)}</span><span class="result-pill">Bloqueado fort B: ${formatNumber(result.armyB.totalBlockedByFort)}</span></div>${renderWarningBlock(buildTacticalWarningsFromSingle(result))}<h3>Resumen general</h3><table class="results-table"><thead><tr><th>Ejército</th><th>Unidades iniciales</th><th>Unidades restantes</th><th>Bajas</th><th>HP inicial</th><th>HP restante</th><th>HP perdido</th><th>Bloqueado por fort</th><th>Daño fort</th></tr></thead><tbody><tr><td>Army A</td><td>${result.armyA.totalInitialUnits}</td><td>${result.armyA.totalRemainingUnits}</td><td>${result.armyA.totalDeadUnits}</td><td>${formatNumber(result.armyA.totalInitialHp)}</td><td>${formatNumber(result.armyA.totalRemainingHp)}</td><td>${formatNumber(result.armyA.totalLostHp)}</td><td>${formatNumber(result.armyA.totalBlockedByFort)}</td><td>${formatNumber(result.armyA.totalFortDamageTaken)}</td></tr><tr><td>Army B</td><td>${result.armyB.totalInitialUnits}</td><td>${result.armyB.totalRemainingUnits}</td><td>${result.armyB.totalDeadUnits}</td><td>${formatNumber(result.armyB.totalInitialHp)}</td><td>${formatNumber(result.armyB.totalRemainingHp)}</td><td>${formatNumber(result.armyB.totalLostHp)}</td><td>${formatNumber(result.armyB.totalBlockedByFort)}</td><td>${formatNumber(result.armyB.totalFortDamageTaken)}</td></tr></tbody></table><details open><summary>Fortalezas</summary>${renderFortRows(result)}</details><details open><summary>Alertas tácticas de fortaleza</summary>${renderFortAlerts(result)}</details><details open><summary>Héroes y modificadores</summary>${renderHeroRows(result)}</details><details open><summary>Detalle por unidad - Army A</summary><table class="results-table"><thead><tr><th>Stack</th><th>Pos</th><th>Objetivo</th><th>Unidad</th><th>Inicial</th><th>Restante</th><th>Muertas</th><th>HP inicial</th><th>HP restante</th><th>HP perdido</th></tr></thead><tbody>${renderArmyUnitRows(result.armyA)}</tbody></table></details><details open><summary>Detalle por unidad - Army B</summary><table class="results-table"><thead><tr><th>Stack</th><th>Pos</th><th>Objetivo</th><th>Unidad</th><th>Inicial</th><th>Restante</th><th>Muertas</th><th>HP inicial</th><th>HP restante</th><th>HP perdido</th></tr></thead><tbody>${renderArmyUnitRows(result.armyB)}</tbody></table></details><details><summary>Ver rondas y grupos de impacto</summary>${renderRoundLog(result.roundLog)}</details><p style="margin-top:12px">${result.note}</p>`}

function renderScenarioRow(label,item){
 if(!item)return `<tr><td>${label}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
 return `<tr><td>${label}</td><td>${item.winner}</td><td>${formatNumber(item.rounds,2)}</td><td>${formatNumber(item.hpA)}</td><td>${formatNumber(item.hpB)}</td></tr>`;
}

function renderVarianceResults(result){
 const results=document.querySelector("#results");
 const fav=result.probabilityA>result.probabilityB?"Army A":result.probabilityB>result.probabilityA?"Army B":"Empate técnico";

 results.innerHTML=`
  <h2>Varianza avanzada</h2>
  <p><strong>${result.status}</strong> · ${result.model}</p>

  <div class="result-pills">
    <span class="result-pill gold">Favorito: ${fav}</span>
    <span class="result-pill win">Victoria A: ${formatNumber(result.probabilityA)}%</span>
    <span class="result-pill win">Victoria B: ${formatNumber(result.probabilityB)}%</span>
    <span class="result-pill">Empate: ${formatNumber(result.probabilityDraw)}%</span>
    <span class="result-pill">Simulaciones: ${result.runs}</span>
    <span class="result-pill">Rondas promedio: ${formatNumber(result.avgRounds,2)}</span>
  </div>

  ${renderWarningBlock(buildTacticalWarningsFromVariance(result))}<h3>Resumen de probabilidades</h3>
  <table class="results-table">
    <thead>
      <tr>
        <th>Resultado</th>
        <th>Veces</th>
        <th>Probabilidad</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Gana Army A</td><td>${result.winsA}</td><td>${formatNumber(result.probabilityA)}%</td></tr>
      <tr><td>Gana Army B</td><td>${result.winsB}</td><td>${formatNumber(result.probabilityB)}%</td></tr>
      <tr><td>Empate / límite</td><td>${result.draws}</td><td>${formatNumber(result.probabilityDraw)}%</td></tr>
    </tbody>
  </table>

  <h3>Promedios</h3>
  <table class="results-table">
    <thead>
      <tr>
        <th>Ejército</th>
        <th>HP restante promedio</th>
        <th>HP perdido promedio</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Army A</td><td>${formatNumber(result.avgRemainingHpA)}</td><td>${formatNumber(result.avgLostHpA)}</td></tr>
      <tr><td>Army B</td><td>${formatNumber(result.avgRemainingHpB)}</td><td>${formatNumber(result.avgLostHpB)}</td></tr>
    </tbody>
  </table>

  <h3>Mejor y peor caso</h3>
  <table class="results-table">
    <thead>
      <tr>
        <th>Caso</th>
        <th>Ganador</th>
        <th>Rondas</th>
        <th>HP A</th>
        <th>HP B</th>
      </tr>
    </thead>
    <tbody>
      ${renderScenarioRow("Mejor caso para A",result.bestA)}
      ${renderScenarioRow("Peor caso para A",result.worstA)}
      ${renderScenarioRow("Mejor caso para B",result.bestB)}
      ${renderScenarioRow("Peor caso para B",result.worstB)}
    </tbody>
  </table>

  <details>
    <summary>Ver una simulación representativa</summary>
    <p class="small-note">Esta es una de las corridas usadas dentro de la varianza. Sirve para revisar el detalle de una batalla posible.</p>
    <div class="result-pills">
      <span class="result-pill gold">Ganador: ${result.medianSample.winner}</span>
      <span class="result-pill">Rondas: ${result.medianSample.roundsPlayed} / ${result.medianSample.maxRounds}</span>
      <span class="result-pill">HP A: ${formatNumber(result.medianSample.armyA.totalRemainingHp)} / ${formatNumber(result.medianSample.armyA.totalInitialHp)}</span>
      <span class="result-pill">HP B: ${formatNumber(result.medianSample.armyB.totalRemainingHp)} / ${formatNumber(result.medianSample.armyB.totalInitialHp)}</span>
    </div>
    ${renderRoundLog(result.medianSample.roundLog)}
  </details>

  <p style="margin-top:12px">${result.note}</p>
 `;
}



let LAST_RESULT_EXPORT = null;

function setActiveTab(tabName){
 document.querySelectorAll("[data-panel]").forEach(panel=>{
  panel.classList.toggle("panel-hidden",panel.dataset.panel!==tabName);
 });
 document.querySelectorAll(".tab-button").forEach(button=>{
  button.classList.toggle("active",button.dataset.tab===tabName);
 });
 localStorage.setItem("battleLab1914.stage16.activeTab",tabName);
}

function restoreInterfaceState(){
 const compact=localStorage.getItem("battleLab1914.stage16.compact")==="1";
 document.body.classList.toggle("compact-mode",compact);
 const tab=localStorage.getItem("battleLab1914.stage16.activeTab")||"battlefield";
 setActiveTab(tab);
}

function toggleCompactMode(){
 const enabled=!document.body.classList.contains("compact-mode");
 document.body.classList.toggle("compact-mode",enabled);
 localStorage.setItem("battleLab1914.stage16.compact",enabled?"1":"0");
}

function buildTacticalWarningsFromSingle(result){
 const warnings=[];
 if(!result)return warnings;
 const hpRatioA=result.armyA.totalInitialHp>0?result.armyA.totalRemainingHp/result.armyA.totalInitialHp:0;
 const hpRatioB=result.armyB.totalInitialHp>0?result.armyB.totalRemainingHp/result.armyB.totalInitialHp:0;

 if(hpRatioA<0.25)warnings.push({type:"danger",text:"Army A queda por debajo de 25% de HP. Riesgo alto si continúa el combate."});
 if(hpRatioB<0.25)warnings.push({type:"danger",text:"Army B queda por debajo de 25% de HP. Objetivo vulnerable o posible ruptura."});

 const fortAlerts=[...(result.armyA.fortAlerts||[]).map(a=>`A-${a.stackId}: ${a.text}`),...(result.armyB.fortAlerts||[]).map(a=>`B-${a.stackId}: ${a.text}`)];
 fortAlerts.forEach(text=>warnings.push({type:"danger",text}));

 const artilleryStacks=[...result.armyA.stacks,...result.armyB.stacks].filter(s=>s.units.some(u=>u.type==="artillery"||u.type==="railgun"));
 if(artilleryStacks.length)warnings.push({type:"safe",text:"Hay unidades de bombardeo. Revisa la columna de bombardeos para confirmar que no estén recibiendo contraataque melee."});

 if(!warnings.length)warnings.push({type:"safe",text:"Sin alertas críticas detectadas en esta simulación."});
 return warnings;
}

function buildTacticalWarningsFromVariance(result){
 const warnings=[];
 if(!result)return warnings;
 if(result.probabilityA>=70)warnings.push({type:"safe",text:`Army A es favorito fuerte con ${formatNumber(result.probabilityA)}% de victorias.`});
 if(result.probabilityB>=70)warnings.push({type:"safe",text:`Army B es favorito fuerte con ${formatNumber(result.probabilityB)}% de victorias.`});
 if(Math.abs(result.probabilityA-result.probabilityB)<=10)warnings.push({type:"danger",text:"Batalla muy pareja. Una mala tirada puede cambiar el resultado."});
 if(result.avgRemainingHpA<result.avgRemainingHpB&&result.probabilityA>result.probabilityB)warnings.push({type:"danger",text:"Army A gana más veces, pero queda con poco margen promedio. Cuidado con refuerzos enemigos."});
 if(result.avgRemainingHpB<result.avgRemainingHpA&&result.probabilityB>result.probabilityA)warnings.push({type:"danger",text:"Army B gana más veces, pero queda con poco margen promedio."});
 if(!warnings.length)warnings.push({type:"safe",text:"Varianza sin alertas extremas. Revisa mejor y peor caso antes de decidir."});
 return warnings;
}

function renderWarningBlock(warnings){
 return `<div class="tactical-warnings">${warnings.map(w=>`<div class="tactical-warning ${w.type||""}">${w.text}</div>`).join("")}</div>`;
}

function downloadJson(filename,data){
 const json=JSON.stringify(data,null,2);
 const blob=new Blob([json],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;
 a.download=filename;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
 return json;
}

function exportLastResult(){
 if(!LAST_RESULT_EXPORT){
  alert("Primero simula una batalla para tener un resultado que exportar.");
  return;
 }
 const safeName=(LAST_RESULT_EXPORT.scenarioName||"resultado_battle_lab_1914").replace(/[^a-z0-9_-]+/gi,"_").toLowerCase();
 const json=downloadJson(`${safeName}_resultado.json`,LAST_RESULT_EXPORT);
 document.querySelector("#results").innerHTML=`
  <h2>Resultado exportado</h2>
  <p>Se descargó el resultado como JSON. También puedes copiarlo desde aquí:</p>
  <textarea class="export-box" readonly>${json.replace(/</g,"&lt;")}</textarea>
 `;
 setActiveTab("results");
}

function clearResultPanel(){
 LAST_RESULT_EXPORT=null;
 document.querySelector("#results").innerHTML=`
  <h2>Resultado</h2>
  <p>Reporte limpio. Simula una batalla para generar nuevos resultados.</p>
 `;
 setActiveTab("results");
}

const STORAGE_KEY = "battleLab1914.stage15.scenario";

const QUICK_SCENARIOS = {
  currentDemo: {
    name: "Demo con héroes",
    maxRounds: 100,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"land", targetClass:"normal", position:50, fortress:"none", fortHp:0, hero:{id:"georg",level:20,affects:"artillery",attackBonus:25,defenseBonus:0,hpBonus:0,duration:0}, units:[{type:"artillery",count:20,hp:"100%"}] },
          { id:"A2", target:"B1", terrain:"land", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"custom",level:10,affects:"infantry",attackBonus:10,defenseBonus:10,hpBonus:5,duration:0}, units:[{type:"infantry",count:55,hp:"100%"},{type:"armoredCar",count:3,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"Defend", terrain:"land", targetClass:"normal", position:0, fortress:"2", fortHp:50, hero:{id:"orhan",level:20,affects:"armoredCar",attackBonus:0,defenseBonus:25,hpBonus:0,duration:0}, units:[{type:"infantry",count:70,hp:"100%"},{type:"armoredCar",count:4,hp:"100%"}] },
          { id:"B2", target:"Defend", terrain:"land", targetClass:"normal", position:3, fortress:"1", fortHp:50, hero:{id:"none"}, units:[{type:"cavalry",count:10,hp:"100%"}] }
        ]
      }
    }
  },

  desembarco: {
    name: "Desembarco urgente",
    maxRounds: 10,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"debark", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:56,hp:"100%"},{type:"armoredCar",count:11,hp:"100%"},{type:"stormtrooper",count:5,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"A1", terrain:"land", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:15,hp:"100%"},{type:"cavalry",count:8,hp:"100%"},{type:"armoredCar",count:9,hp:"100%"}] }
        ]
      }
    }
  },

  georgArtilleria: {
    name: "Georg + artillería",
    maxRounds: 100,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"land", targetClass:"normal", position:50, fortress:"none", fortHp:0, hero:{id:"georg",level:20,affects:"artillery",attackBonus:25,defenseBonus:0,hpBonus:0,duration:0}, units:[{type:"artillery",count:36,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"Defend", terrain:"land", targetClass:"normal", position:0, fortress:"2", fortHp:50, hero:{id:"none"}, units:[{type:"infantry",count:120,hp:"100%"},{type:"armoredCar",count:8,hp:"100%"}] }
        ]
      }
    }
  },

  fortaleza: {
    name: "Bombardeo a fortaleza",
    maxRounds: 100,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"land", targetClass:"building", position:50, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"artillery",count:25,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"Defend", terrain:"land", targetClass:"normal", position:0, fortress:"4", fortHp:50, hero:{id:"none"}, units:[{type:"infantry",count:90,hp:"100%"},{type:"armoredCar",count:6,hp:"100%"}] },
          { id:"B2", target:"Defend", terrain:"land", targetClass:"normal", position:3, fortress:"3", fortHp:50, hero:{id:"none"}, units:[{type:"lightTank",count:3,hp:"100%"}] }
        ]
      }
    }
  },

  aereo: {
    name: "Ataque aéreo y patrulla",
    maxRounds: 1,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"air", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"bomber",count:6,hp:"100%"}] },
          { id:"A2", target:"B2", terrain:"patrol", targetClass:"air", position:150, fortress:"none", fortHp:0, hero:{id:"redBaron",level:20,affects:"fighter",attackBonus:25,defenseBonus:10,hpBonus:0,duration:0}, units:[{type:"fighter",count:8,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"Defend", terrain:"land", targetClass:"normal", position:150, fortress:"1", fortHp:50, hero:{id:"none"}, units:[{type:"infantry",count:45,hp:"100%"},{type:"armoredCar",count:4,hp:"100%"}] },
          { id:"B2", target:"A2", terrain:"air", targetClass:"air", position:150, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"fighter",count:5,hp:"100%"}] }
        ]
      }
    }
  },

  traicionDia3: {
    name: "Traición día 3",
    maxRounds: 25,
    simulateVariance: false,
    simulationRuns: 100,
    armies: {
      A: {
        stacks: [
          { id:"A1", target:"B1", terrain:"land", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:80,hp:"100%"},{type:"cavalry",count:6,hp:"100%"},{type:"armoredCar",count:5,hp:"100%"}] },
          { id:"A2", target:"B2", terrain:"land", targetClass:"normal", position:10, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:25,hp:"100%"}] }
        ]
      },
      B: {
        stacks: [
          { id:"B1", target:"A1", terrain:"land", targetClass:"normal", position:0, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:60,hp:"100%"},{type:"armoredCar",count:4,hp:"100%"}] },
          { id:"B2", target:"Defend", terrain:"land", targetClass:"normal", position:10, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:20,hp:"100%"}] },
          { id:"B3", target:"Defend", terrain:"land", targetClass:"normal", position:25, fortress:"none", fortHp:0, hero:{id:"none"}, units:[{type:"infantry",count:15,hp:"100%"}] }
        ]
      }
    }
  }
};

function getCurrentScenario(){
 return {
  version: 15,
  app: "Battle Lab 1914",
  name: document.querySelector("#scenarioName")?.value || "Mi batalla",
  savedAt: new Date().toISOString(),
  maxRounds: Number(document.querySelector("#maxRounds").value || 100),
  simulateVariance: document.querySelector("#simulateVariance").checked,
  simulationRuns: Number(document.querySelector("#simulationRuns")?.value || 100),
  armies: {
    A: readArmy("A"),
    B: readArmy("B")
  }
 };
}

function resetStacksOnly(){
 document.querySelector("#stacksA").innerHTML="";
 document.querySelector("#stacksB").innerHTML="";
 stackCounters.A=0;
 stackCounters.B=0;
}

function getMaxStackNumber(stacks,army){
 return stacks.reduce((max,stack)=>{
  const match=String(stack.id||"").match(new RegExp("^"+army+"(\\\\d+)$"));
  return match?Math.max(max,Number(match[1])):max;
 },0);
}

function loadScenarioObject(scenario){
 if(!scenario||!scenario.armies||!scenario.armies.A||!scenario.armies.B){
  alert("El archivo no parece ser un escenario válido.");
  return;
 }

 resetStacksOnly();

 document.querySelector("#scenarioName").value=scenario.name || "Escenario cargado";
 document.querySelector("#maxRounds").value=scenario.maxRounds ?? 100;
 document.querySelector("#simulateVariance").checked=Boolean(scenario.simulateVariance);
 if(document.querySelector("#simulationRuns"))document.querySelector("#simulationRuns").value=scenario.simulationRuns ?? 100;

 const stacksA=scenario.armies.A.stacks || [];
 const stacksB=scenario.armies.B.stacks || [];

 stacksA.forEach(stack=>addStack("A",stack));
 stacksB.forEach(stack=>addStack("B",stack));

 stackCounters.A=Math.max(stackCounters.A,getMaxStackNumber(stacksA,"A"));
 stackCounters.B=Math.max(stackCounters.B,getMaxStackNumber(stacksB,"B"));

 updateTargets();

 [...stacksA,...stacksB].forEach(stackData=>{
  const stack=document.querySelector(`.stack-card[data-stack-id="${stackData.id}"]`);
  if(!stack)return;
  const target=stack.querySelector(".target-select");
  if([...target.options].some(option=>option.value===stackData.target)){
   target.value=stackData.target;
  }
  updateFortReadout(stack);
  updateStackSummary(stack);
 });

 updateDeleteButtons();
 showScenarioMessage(`Escenario cargado: ${scenario.name || "sin nombre"}`);
}

function saveScenario(){
 const scenario=getCurrentScenario();
 localStorage.setItem(STORAGE_KEY,JSON.stringify(scenario));
 showScenarioMessage(`Escenario guardado en este navegador: ${scenario.name}`);
}

function loadSavedScenario(){
 const raw=localStorage.getItem(STORAGE_KEY);
 if(!raw){
  alert("No hay escenario guardado todavía.");
  return;
 }
 try{
  loadScenarioObject(JSON.parse(raw));
 }catch(error){
  alert("No se pudo cargar el escenario guardado.");
 }
}

function exportScenario(){
 const scenario=getCurrentScenario();
 const json=JSON.stringify(scenario,null,2);
 const blob=new Blob([json],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 const safeName=(scenario.name||"battle_lab_1914").replace(/[^a-z0-9_-]+/gi,"_").toLowerCase();
 a.href=url;
 a.download=`${safeName}.json`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);

 const results=document.querySelector("#results");
 results.innerHTML=`
  <h2>Escenario exportado</h2>
  <p>Se descargó un archivo JSON. También puedes copiar el contenido desde aquí:</p>
  <textarea class="scenario-code" readonly>${json.replace(/</g,"&lt;")}</textarea>
 `;
}

function importScenario(){
 const input=document.createElement("input");
 input.type="file";
 input.accept="application/json,.json";
 input.addEventListener("change",()=>{
  const file=input.files?.[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
   try{
    const scenario=JSON.parse(reader.result);
    loadScenarioObject(scenario);
   }catch(error){
    alert("No se pudo leer el JSON del escenario.");
   }
  };
  reader.readAsText(file);
 });
 input.click();
}

function populateQuickScenarios(){
 const select=document.querySelector("#quickScenario");
 if(!select)return;
 select.innerHTML=Object.keys(QUICK_SCENARIOS).map(key=>`<option value="${key}">${QUICK_SCENARIOS[key].name}</option>`).join("");
}

function loadQuickScenario(){
 const key=document.querySelector("#quickScenario")?.value || "currentDemo";
 const scenario=QUICK_SCENARIOS[key];
 if(!scenario)return;
 loadScenarioObject(JSON.parse(JSON.stringify(scenario)));
}

function showScenarioMessage(message){
 const results=document.querySelector("#results");
 results.innerHTML=`
  <h2>Escenarios</h2>
  <p><strong>${message}</strong></p>
  <p class="small-note">Puedes simular la batalla, guardarla de nuevo o exportarla como JSON.</p>
 `;
}

function startBattle(){
 const options={
  maxRounds:Number(document.querySelector("#maxRounds").value||100),
  updateCounts:document.querySelector("#updateCounts").checked,
  simulateVariance:document.querySelector("#simulateVariance").checked,
  simulationRuns:Number(document.querySelector("#simulationRuns")?.value||100)
 };

 const armyA=readArmy("A");
 const armyB=readArmy("B");

 if(options.simulateVariance&&options.simulationRuns>1){
  const varianceResult=runVarianceSimulations(armyA,armyB,options);
  LAST_RESULT_EXPORT={
   exportedAt:new Date().toISOString(),
   scenarioName:document.querySelector("#scenarioName")?.value||"Mi batalla",
   type:"variance",
   scenario:getCurrentScenario(),
   result:varianceResult
  };
  renderVarianceResults(varianceResult);
  setActiveTab("results");
  return;
 }

 const result=simulateBattle(armyA,armyB,options);
 LAST_RESULT_EXPORT={
  exportedAt:new Date().toISOString(),
  scenarioName:document.querySelector("#scenarioName")?.value||"Mi batalla",
  type:"single",
  scenario:getCurrentScenario(),
  result
 };
 renderResults(result);
 setActiveTab("results");
 if(options.updateCounts)updateInputsFromResult(result)
}
function resetDemo(){document.querySelector("#stacksA").innerHTML="";document.querySelector("#stacksB").innerHTML="";stackCounters.A=0;stackCounters.B=0;initializeDemo()}
function initializeDemo(){
 addStack("A",{terrain:"land",position:50,targetClass:"normal",target:"B1",hero:{id:"georg",level:20,affects:"artillery",attackBonus:25,defenseBonus:0,hpBonus:0,duration:0},units:[{type:"artillery",count:20,hp:"100%"}]});
 addStack("A",{terrain:"land",position:0,targetClass:"normal",target:"B1",hero:{id:"custom",level:10,affects:"infantry",attackBonus:10,defenseBonus:10,hpBonus:5,duration:0},units:[{type:"infantry",count:55,hp:"100%"},{type:"armoredCar",count:3,hp:"100%"}]});
 addStack("B",{terrain:"land",position:0,targetClass:"normal",fortress:"2",fortHp:50,hero:{id:"orhan",level:20,affects:"armoredCar",attackBonus:0,defenseBonus:25,hpBonus:0,duration:0},units:[{type:"infantry",count:70,hp:"100%"},{type:"armoredCar",count:4,hp:"100%"}]});
 addStack("B",{terrain:"land",position:3,targetClass:"normal",fortress:"1",fortHp:50,units:[{type:"cavalry",count:10,hp:"100%"}]});
 updateTargets();
 const a1=document.querySelector('.stack-card[data-stack-id="A1"] .target-select'); if(a1)a1.value="B1";
 const a2=document.querySelector('.stack-card[data-stack-id="A2"] .target-select'); if(a2)a2.value="B1";
 document.querySelectorAll(".stack-card").forEach(s=>{updateFortReadout(s);updateStackSummary(s)});
 updateDeleteButtons()
}
document.addEventListener("click",e=>{const a=e.target.dataset.action,stack=e.target.closest(".stack-card"),row=e.target.closest(".unit-row");if(a==="start-battle")startBattle();if(a==="add-stack")addStack(e.target.dataset.army);if(a==="duplicate-stack"&&stack)duplicateStack(stack);if(a==="delete-stack"&&stack)deleteStack(stack);if(a==="add-unit"&&stack)addUnitToStack(stack);if(a==="delete-unit"&&row)deleteUnit(row);if(a==="reset-demo")resetDemo();
if(a==="save-scenario")saveScenario();
if(a==="load-scenario")loadSavedScenario();
if(a==="export-scenario")exportScenario();
if(a==="import-scenario")importScenario();
if(a==="load-quick-scenario")loadQuickScenario();
if(a==="toggle-compact")toggleCompactMode();
if(a==="export-result")exportLastResult();
if(a==="clear-result")clearResultPanel();
if(e.target.classList.contains("tab-button"))setActiveTab(e.target.dataset.tab);
});
document.addEventListener("change",e=>{const stack=e.target.closest(".stack-card");if(e.target.classList.contains("unit-type"))updateMiniStatsForRow(e.target.closest(".unit-row"));if(e.target.classList.contains("fort-select")&&stack){const fort=FORTRESSES[e.target.value]||FORTRESSES.none;stack.querySelector(".fort-hp").value=fort.level?fort.hp:0;updateFortReadout(stack)}if(e.target.classList.contains("hero-select")&&stack){applyHeroPreset(stack)}if(stack&&(e.target.matches(".unit-type,.unit-count,.unit-hp,.fort-select,.fort-hp,.position-select,.target-class-select,.terrain-select,.hero-select,.hero-level,.hero-affects,.hero-attack,.hero-defense,.hero-hp,.hero-duration"))){updateFortReadout(stack);updateStackSummary(stack)}});
document.addEventListener("input",e=>{if(e.target.matches(".unit-count,.unit-hp,.fort-hp,.hero-level,.hero-attack,.hero-defense,.hero-hp,.hero-duration")){const stack=e.target.closest(".stack-card");if(stack){updateFortReadout(stack);updateStackSummary(stack)}}});
document.addEventListener("DOMContentLoaded",()=>{renderDataStatus();renderCodex();populateQuickScenarios();initializeDemo();restoreInterfaceState()});

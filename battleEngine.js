function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function round(v,d=2){const f=10**d;return Math.round((v+Number.EPSILON)*f)/f}
function parseNumber(v,f=0){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:f}
function parseUnitHpInput(value,unitData,count){const maxHp=unitData.hp*count;const text=String(value??"100%").trim();if(!count||count<=0)return{totalHp:0,ratio:0};if(text.endsWith("%")){const r=clamp(parseNumber(text.replace("%",""),100)/100,0,1);return{totalHp:maxHp*r,ratio:r}}const totalHp=clamp(parseNumber(text,maxHp),0,maxHp);return{totalHp,ratio:maxHp>0?totalHp/maxHp:0}}


function createHeroState(rawHero){
 const preset=(typeof HEROES!=="undefined"&&HEROES[rawHero.id])?HEROES[rawHero.id]:(typeof HEROES!=="undefined"?HEROES.none:null);
 const fallback=preset||{id:"none",name:"Sin héroe",level:0,affects:"all",attackBonus:0,defenseBonus:0,hpBonus:0,duration:0};
 return{
  id:rawHero.id||fallback.id||"none",
  name:rawHero.name||fallback.name||"Sin héroe",
  level:parseNumber(rawHero.level,fallback.level||0),
  affects:rawHero.affects||fallback.affects||"all",
  attackBonus:parseNumber(rawHero.attackBonus,fallback.attackBonus||0),
  defenseBonus:parseNumber(rawHero.defenseBonus,fallback.defenseBonus||0),
  hpBonus:parseNumber(rawHero.hpBonus,fallback.hpBonus||0),
  duration:parseNumber(rawHero.duration,fallback.duration||0),
  note:fallback.note||""
 };
}
function heroAffectsUnit(hero,unitType){
 if(!hero||hero.id==="none")return false;
 return hero.affects==="all"||hero.affects===unitType;
}
function heroIsActive(hero,timeValue=0){
 if(!hero||hero.id==="none")return false;
 if(!hero.duration||hero.duration<=0)return true;
 return Number(timeValue)<=Number(hero.duration);
}
function getHeroDamageMultiplier(stack,unitType,mode,timeValue=0){
 const hero=stack.hero;
 if(!heroAffectsUnit(hero,unitType)||!heroIsActive(hero,timeValue))return 1;
 const bonus=mode==="defense"?hero.defenseBonus:hero.attackBonus;
 return 1+(Number(bonus)||0)/100;
}
function getHeroHpMultiplier(hero,unitType){
 if(!heroAffectsUnit(hero,unitType))return 1;
 return 1+(Number(hero.hpBonus)||0)/100;
}

function cloneBattleArmy(inputArmy){return{id:inputArmy.id,stacks:inputArmy.stacks.map(cloneBattleStack).filter(s=>s.units.length>0)}}
function cloneBattleStack(inputStack){
 const fort=FORTRESSES[inputStack.fortress]||FORTRESSES.none;
 const fortHp=fort.level?clamp(parseNumber(inputStack.fortHp,fort.hp),0,fort.hp):0;
 const hero=createHeroState(inputStack.hero||{});
 const units=inputStack.units.map(unit=>{
  const d=UNITS[unit.type]; if(!d)return null;
  const count=Math.max(0,parseNumber(unit.count,0));
  const hpMultiplier=getHeroHpMultiplier(hero,unit.type);
  const effectiveUnitData={...d,hp:d.hp*hpMultiplier};
  const hp=parseUnitHpInput(unit.hp,effectiveUnitData,count);
  if(count<=0||hp.totalHp<=0)return null;
  return{
   type:unit.type,name:d.name,initialCount:count,count,
   baseUnitHp:d.hp,unitHp:effectiveUnitData.hp,
   initialHp:hp.totalHp,hp:hp.totalHp,maxHp:effectiveUnitData.hp*count,
   heroHpBonusApplied:hpMultiplier>1
  }
 }).filter(Boolean);
 return{
  id:inputStack.id,originalTarget:inputStack.target||"Defend",target:inputStack.target||"Defend",lastTarget:null,
  terrain:inputStack.terrain||"land",targetClassSetting:inputStack.targetClass||"auto",position:Number(inputStack.position||0),
  hero,
  fortLevel:fort.level,fortName:fort.name,fortHpMax:fort.hp,fortHpInitial:fortHp,fortHp,
  fortReductionBase:fort.reductionPercent,fortDamageTaken:0,damageBlockedByFort:0,troopHpLost:0,
  fortCollapsedAt:null,fortCollapseReason:null,fortWarnings:[],units
 }
}
function getStackHp(s){return s.units.reduce((sum,u)=>sum+u.hp,0)}
function getArmyHp(a){return a.stacks.reduce((sum,s)=>sum+getStackHp(s),0)}
function isStackAlive(s){return getStackHp(s)>0.0001}
function getAliveStacks(a){return a.stacks.filter(isStackAlive)}
function isAirUnit(type){return UNITS[type]?.domain==="air"}
function isAirStack(s){return s.units.some(u=>u.hp>0&&isAirUnit(u.type))}
function isPatrolStack(s){return s.terrain==="patrol"}
function inferTargetClass(stack){
 if(stack.targetClassSetting&&stack.targetClassSetting!=="auto")return stack.targetClassSetting;
 if(stack.units.some(u=>UNITS[u.type].domain==="air"))return"air";
 if(stack.terrain==="sea")return"naval";
 return"normal";
}

function getUnitRange(unitType,attackerStack){
 const u=UNITS[unitType]; if(!u)return 0;
 if(u.domain==="air"){
  if(attackerStack.terrain==="air"||attackerStack.terrain==="patrol")return u.operationalRange||5;
  return 5;
 }
 return u.attackRange>0?u.attackRange:5;
}
function unitCanReach(unit,target,attackerStack){return getUnitRange(unit.type,attackerStack)>=Math.abs(attackerStack.position-target.position)}
function stackCanReach(attacker,target){return attacker.units.some(u=>u.hp>0&&unitCanReach(u,target,attacker))}
function isMelee(attacker,target){return Math.abs(attacker.position-target.position)<=5}
function isInterceptableAttack(attacker,target){return isAirStack(attacker)||isMelee(attacker,target)}
function getImpactGroup(targetStack,defenderArmy){return getAliveStacks(defenderArmy).filter(s=>Math.abs(s.position-targetStack.position)<=5)}
function getShareByHp(group){const total=group.reduce((sum,s)=>sum+getStackHp(s),0);return group.map(s=>({stack:s,share:total>0?getStackHp(s)/total:1/group.length}))}

function findExplicitTarget(attackerStack,defenderArmy){
 if(!attackerStack.target||attackerStack.target==="Defend")return null;
 const t=getAliveStacks(defenderArmy).find(s=>s.id===attackerStack.target);
 return t&&stackCanReach(attackerStack,t)?t:null;
}
function findClosestTarget(attackerStack,defenderArmy){
 return getAliveStacks(defenderArmy)
  .filter(t=>stackCanReach(attackerStack,t))
  .sort((a,b)=>Math.abs(attackerStack.position-a.position)-Math.abs(attackerStack.position-b.position))[0]||null;
}
function findPriorityThreat(attackerStack,defenderArmy){
 return getAliveStacks(defenderArmy)
  .filter(enemy=>enemy.target===attackerStack.id&&stackCanReach(attackerStack,enemy))
  .sort((a,b)=>Math.abs(attackerStack.position-a.position)-Math.abs(attackerStack.position-b.position))[0]||null;
}
function findTargetStack(attackerStack,defenderArmy){
 if(attackerStack.target==="Defend")return{target:null,auto:false,reason:"defend"};
 const explicit=findExplicitTarget(attackerStack,defenderArmy);
 if(explicit)return{target:explicit,auto:false,reason:"selected"};
 const threat=findPriorityThreat(attackerStack,defenderArmy);
 if(threat)return{target:threat,auto:true,reason:"retaliate"};
 const closest=findClosestTarget(attackerStack,defenderArmy);
 if(closest)return{target:closest,auto:true,reason:"closest"};
 return{target:null,auto:false,reason:"no-target"};
}

function getFortProtection(stack){
 if(!stack.fortLevel||stack.fortHpMax<=0||stack.fortHp<=0)return{reductionPercent:0,multiplier:1,hpRatio:0,status:"none"};
 const hpRatio=clamp(stack.fortHp/stack.fortHpMax,0,1);
 const reductionPercent=stack.fortReductionBase*hpRatio;
 return{reductionPercent,multiplier:1-reductionPercent/100,hpRatio,status:hpRatio<=0.25?"critical":hpRatio<=0.5?"damaged":"active"};
}
function registerFortWarnings(stack,tickLabel){
 if(!stack.fortLevel)return;
 const p=getFortProtection(stack);
 if(p.status==="critical"&&!stack.fortWarnings.some(w=>w.type==="critical")){
  stack.fortWarnings.push({type:"critical",time:tickLabel,text:`${stack.id}: fortaleza crítica, protección reducida a ${round(p.reductionPercent,1)}%`});
 }
 if(stack.fortHp<=0&&stack.fortCollapsedAt===null){
  stack.fortCollapsedAt=tickLabel;
  stack.fortCollapseReason="HP de fortaleza llegó a 0";
  stack.fortWarnings.push({type:"collapse",time:tickLabel,text:`${stack.id}: fortaleza colapsó, protección 0%`});
 }
}

function calculateStackDamageProfile(attackerStack,targetStack,mode="attack",variance=false,damageFactor=1,timeValue=0){
 const targetClass=inferTargetClass(targetStack);
 const structuralFocus=targetClass==="building";
 let troopDamage=0,fortDamage=0;
 attackerStack.units.forEach(unit=>{
  if(unit.hp<=0)return;
  const d=UNITS[unit.type]; if(!unitCanReach(unit,targetStack,attackerStack))return;
  const combat=d.combat[targetClass]||d.combat.normal;
  const building=d.combat.building||{attack:0,defense:0};
  const hpRatio=unit.maxHp>0?clamp(unit.hp/unit.maxHp,0,1):0;
  const heroMultiplier=getHeroDamageMultiplier(attackerStack,unit.type,mode,timeValue);

  if(structuralFocus){
   fortDamage+=(mode==="defense"?building.defense:building.attack)*unit.count*hpRatio*heroMultiplier;
   troopDamage+=0;
  }else{
   troopDamage+=(mode==="defense"?combat.defense:combat.attack)*unit.count*hpRatio*heroMultiplier;
   fortDamage+=(mode==="defense"?building.defense:building.attack)*unit.count*hpRatio*heroMultiplier;
  }
 });
 troopDamage*=damageFactor; fortDamage*=damageFactor;
 if(variance){troopDamage*=.85+Math.random()*.30;fortDamage*=.85+Math.random()*.30}
 return{troopDamage,fortDamage,targetClass,structuralFocus};
}
function applyDamageToStack(stack,troopDamageRaw,fortDamageRaw,tickLabel){
 const protectionBefore=getFortProtection(stack);
 const troopDamageApplied=troopDamageRaw*protectionBefore.multiplier;
 const blocked=troopDamageRaw-troopDamageApplied;
 let remaining=troopDamageApplied,hpLost=0;
 for(const unit of stack.units){
  if(remaining<=0)break; if(unit.hp<=0)continue;
  const loss=Math.min(unit.hp,remaining); unit.hp-=loss; remaining-=loss; hpLost+=loss;
 }

 let fortHpLost=0,collapsedThisHit=false;
 if(stack.fortLevel&&stack.fortHp>0&&fortDamageRaw>0){
  const before=stack.fortHp;
  fortHpLost=Math.min(stack.fortHp,fortDamageRaw);
  stack.fortHp-=fortHpLost;
  stack.fortDamageTaken+=fortHpLost;
  if(before>0&&stack.fortHp<=0){
   collapsedThisHit=true;
   stack.fortHp=0;
  }
 }

 stack.damageBlockedByFort+=blocked; stack.troopHpLost+=hpLost; recalculateStackCounts(stack);
 if(collapsedThisHit)registerFortWarnings(stack,tickLabel);
 else registerFortWarnings(stack,tickLabel);

 return{
  troopDamageRaw,troopDamageApplied,blocked,fortDamageRaw,fortHpLost,
  protectionBefore:protectionBefore.reductionPercent,protectionAfter:getFortProtection(stack).reductionPercent,
  fortHpAfter:stack.fortHp,collapsedThisHit
 }
}
function recalculateStackCounts(stack){stack.units.forEach(u=>{u.count=u.unitHp>0?Math.ceil(u.hp/u.unitHp):0;if(u.hp<=.0001){u.hp=0;u.count=0}})}

function addIncoming(map,targetStack,troopDamageRaw,fortDamageRaw,sourceStackId,info){
 if(!map.has(targetStack.id))map.set(targetStack.id,{targetStack,troopDamageRaw:0,fortDamageRaw:0,sources:[],info:[]});
 const item=map.get(targetStack.id); item.troopDamageRaw+=troopDamageRaw; item.fortDamageRaw+=fortDamageRaw; item.sources.push(sourceStackId); if(info)item.info.push(info);
}

function shouldStackActThisTick(stack,tickIndex){if(isPatrolStack(stack))return true;return tickIndex%4===0}
function getStackDamageFactor(stack){return isPatrolStack(stack)?0.25:1}

function buildAttackEvents(attackerArmy,defenderArmy,variance,tickIndex){
 const events=[];
 getAliveStacks(attackerArmy).forEach(attackerStack=>{
  if(!shouldStackActThisTick(attackerStack,tickIndex))return;
  const choice=findTargetStack(attackerStack,defenderArmy);
  if(!choice.target)return;
  const selectedTarget=choice.target;
  attackerStack.lastTarget=selectedTarget.id;
  const damageFactor=getStackDamageFactor(attackerStack);
  const profile=calculateStackDamageProfile(attackerStack,selectedTarget,"attack",variance,damageFactor,tickIndex/4);
  if(profile.troopDamage<=0&&profile.fortDamage<=0)return;
  const impactGroup=getImpactGroup(selectedTarget,defenderArmy);
  const shares=getShareByHp(impactGroup);
  const airAttack=isAirStack(attackerStack);
  const patrol=isPatrolStack(attackerStack);
  shares.forEach(({stack,share})=>events.push({
   sourceStack:attackerStack,targetStack:stack,selectedTargetId:selectedTarget.id,impactGroupIds:impactGroup.map(s=>s.id),
   mode:profile.structuralFocus?"structure":patrol?"patrol":"attack",
   troopDamageRaw:profile.troopDamage*share,fortDamageRaw:profile.fortDamage*share,
   targetClass:inferTargetClass(stack),distance:Math.abs(attackerStack.position-stack.position),
   isRanged:!isInterceptableAttack(attackerStack,selectedTarget),isAirAttack:airAttack,isPatrol:patrol,isStructural:profile.structuralFocus,
   share,autoTarget:choice.auto,autoReason:choice.reason,originalTarget:attackerStack.originalTarget,damageFactor
  }));
 });
 return events;
}

function buildDefenseEvents(attackEvents,variance,tickTime=0){
 const interceptable=attackEvents.filter(e=>!e.isRanged);
 const defenseEvents=[];
 interceptable.forEach(e=>{
  const defender=e.targetStack;
  if(!isStackAlive(defender))return;
  const responseFactor=e.isPatrol?0.25:1;
  const profile=calculateStackDamageProfile(defender,e.sourceStack,"defense",variance,responseFactor,tickTime);
  if(profile.troopDamage<=0&&profile.fortDamage<=0)return;
  defenseEvents.push({
   sourceStack:defender,targetStack:e.sourceStack,selectedTargetId:e.sourceStack.id,impactGroupIds:[e.sourceStack.id],
   mode:e.isAirAttack?"aa-defense":"defense",troopDamageRaw:profile.troopDamage,fortDamageRaw:profile.fortDamage,
   targetClass:inferTargetClass(e.sourceStack),distance:Math.abs(defender.position-e.sourceStack.position),
   isRanged:false,isAirAttack:false,isPatrol:false,isStructural:false,share:1,autoTarget:false,autoReason:e.isAirAttack?"anti-air":"defense",
   originalTarget:defender.originalTarget,damageFactor:responseFactor
  });
 });
 return defenseEvents;
}

function applyEvents(events,tickLabel){
 const incoming=new Map();
 events.forEach(e=>addIncoming(incoming,e.targetStack,e.troopDamageRaw,e.fortDamageRaw,e.sourceStack.id,{
  distance:e.distance,targetClass:e.targetClass,isRanged:e.isRanged,mode:e.mode,selectedTargetId:e.selectedTargetId,
  impactGroupIds:e.impactGroupIds,share:e.share,autoTarget:e.autoTarget,autoReason:e.autoReason,
  originalTarget:e.originalTarget,isAirAttack:e.isAirAttack,isPatrol:e.isPatrol,isStructural:e.isStructural,damageFactor:e.damageFactor
 }));
 const reports=[];
 incoming.forEach(item=>{const r=applyDamageToStack(item.targetStack,item.troopDamageRaw,item.fortDamageRaw,tickLabel);reports.push({targetStackId:item.targetStack.id,sources:item.sources,info:item.info,...r})});
 return reports;
}

function summarizeStack(stack){
 const initialHp=stack.units.reduce((s,u)=>s+u.initialHp,0),remainingHp=getStackHp(stack);
 const initialUnits=stack.units.reduce((s,u)=>s+u.initialCount,0),remainingUnits=stack.units.reduce((s,u)=>s+u.count,0),p=getFortProtection(stack);
 return{id:stack.id,terrain:stack.terrain,targetClass:inferTargetClass(stack),position:stack.position,originalTarget:stack.originalTarget,lastTarget:stack.lastTarget,
  hero:{
   id:stack.hero?.id||"none",
   name:stack.hero?.name||"Sin héroe",
   level:stack.hero?.level||0,
   affects:stack.hero?.affects||"all",
   attackBonus:stack.hero?.attackBonus||0,
   defenseBonus:stack.hero?.defenseBonus||0,
   hpBonus:stack.hero?.hpBonus||0,
   duration:stack.hero?.duration||0
  },
  fortLevel:stack.fortLevel,fortName:stack.fortName,fortHpInitial:round(stack.fortHpInitial,1),fortHpRemaining:round(stack.fortHp,1),fortDamageTaken:round(stack.fortDamageTaken,1),
  fortReductionBase:round(stack.fortReductionBase,1),fortReductionEnd:round(p.reductionPercent,1),fortStatus:p.status,fortCollapsedAt:stack.fortCollapsedAt,fortCollapseReason:stack.fortCollapseReason,
  damageBlockedByFort:round(stack.damageBlockedByFort,1),fortWarnings:stack.fortWarnings,
  initialHp:round(initialHp,1),remainingHp:round(remainingHp,1),lostHp:round(initialHp-remainingHp,1),initialUnits,remainingUnits,deadUnits:Math.max(0,initialUnits-remainingUnits),
  units:stack.units.map(u=>({type:u.type,name:u.name,initialCount:u.initialCount,remainingCount:u.count,deadCount:Math.max(0,u.initialCount-u.count),initialHp:round(u.initialHp,1),remainingHp:round(u.hp,1),lostHp:round(u.initialHp-u.hp,1),heroHpBonusApplied:u.heroHpBonusApplied||false}))}
}
function summarizeArmy(army){
 const stacks=army.stacks.map(summarizeStack);
 return{id:army.id,totalInitialHp:round(stacks.reduce((s,x)=>s+x.initialHp,0),1),totalRemainingHp:round(stacks.reduce((s,x)=>s+x.remainingHp,0),1),totalLostHp:round(stacks.reduce((s,x)=>s+x.lostHp,0),1),
  totalInitialUnits:stacks.reduce((s,x)=>s+x.initialUnits,0),totalRemainingUnits:stacks.reduce((s,x)=>s+x.remainingUnits,0),totalDeadUnits:stacks.reduce((s,x)=>s+x.deadUnits,0),
  totalBlockedByFort:round(stacks.reduce((s,x)=>s+x.damageBlockedByFort,0),1),totalFortDamageTaken:round(stacks.reduce((s,x)=>s+x.fortDamageTaken,0),1),
  fortAlerts:stacks.flatMap(s=>s.fortWarnings.map(w=>({stackId:s.id,...w}))),stacks}
}
function summarizeTick(tickIndex,armyA,armyB,attackReports,defenseReports,attackEvents,defenseEvents){
 const sum=(arr,k)=>arr.reduce((s,x)=>s+x[k],0);
 const groups=[...new Set(attackEvents.map(e=>`${e.sourceStack.id}→${e.selectedTargetId}${e.isStructural?" estructura":e.isPatrol?" patrol":e.isAirAttack?" air":""}${e.autoTarget?` auto:${e.autoReason}`:""} [${e.impactGroupIds.join("+")}]`))];
 return{round:round(tickIndex/4,2),tickLabel:round(tickIndex/4,2).toFixed(2),
  attackRaw:round(sum(attackReports,"troopDamageRaw"),2),attackApplied:round(sum(attackReports,"troopDamageApplied"),2),attackBlocked:round(sum(attackReports,"blocked"),2),attackFort:round(sum(attackReports,"fortHpLost"),2),
  defenseRaw:round(sum(defenseReports,"troopDamageRaw"),2),defenseApplied:round(sum(defenseReports,"troopDamageApplied"),2),defenseBlocked:round(sum(defenseReports,"blocked"),2),defenseFort:round(sum(defenseReports,"fortHpLost"),2),
  structureHits:attackEvents.filter(e=>e.isStructural).length,fortCollapses:[...attackReports,...defenseReports].filter(r=>r.collapsedThisHit).map(r=>r.targetStackId),
  rangedShots:attackEvents.filter(e=>e.isRanged).length,meleeClashes:attackEvents.filter(e=>!e.isRanged&&!e.isAirAttack&&!e.isPatrol).length,airStrikes:attackEvents.filter(e=>e.isAirAttack&&!e.isPatrol).length,patrolTicks:attackEvents.filter(e=>e.isPatrol).length,autoTargets:attackEvents.filter(e=>e.autoTarget).length,
  impactGroups:groups,hpA:round(getArmyHp(armyA),1),hpB:round(getArmyHp(armyB),1)}
}

function simulateBattle(inputArmyA,inputArmyB,options={}){
 const armyA=cloneBattleArmy(inputArmyA), armyB=cloneBattleArmy(inputArmyB);
 const maxRounds=Math.max(0,Number(options.maxRounds??100));
 const totalTicks=Math.max(0,Math.ceil(maxRounds*4));
 const variance=Boolean(options.simulateVariance);
 const roundLog=[]; let roundsPlayed=0;
 for(let tick=1;tick<=totalTicks;tick++){
  if(getArmyHp(armyA)<=0||getArmyHp(armyB)<=0)break;
  const tickLabel=round(tick/4,2).toFixed(2);
  let attackEvents=[...buildAttackEvents(armyA,armyB,variance,tick),...buildAttackEvents(armyB,armyA,variance,tick)];
  if(!attackEvents.length&&tick%4!==0)continue;
  if(!attackEvents.length&&tick%4===0){
   const a=getAliveStacks(armyA)[0],b=getAliveStacks(armyB)[0];
   if(a&&b&&stackCanReach(a,b)){a.target=b.id;attackEvents=buildAttackEvents(armyA,armyB,variance,tick)}
  }
  if(!attackEvents.length)continue;
  const defenseEvents=buildDefenseEvents(attackEvents,variance,tick/4);
  const attackReports=applyEvents(attackEvents,tickLabel);
  const defenseReports=applyEvents(defenseEvents,tickLabel);
  roundLog.push(summarizeTick(tick,armyA,armyB,attackReports,defenseReports,attackEvents,defenseEvents));
  roundsPlayed=round(tick/4,2);
  const total=attackReports.reduce((s,x)=>s+x.troopDamageRaw,0)+defenseReports.reduce((s,x)=>s+x.troopDamageRaw,0);
  if(total<=0)break;
 }
 const hpA=getArmyHp(armyA),hpB=getArmyHp(armyB); let winner="Empate";
 if(hpA>0&&hpB<=0)winner="Ejército A"; if(hpB>0&&hpA<=0)winner="Ejército B";
 if(hpA>0&&hpB>0&&roundsPlayed>=maxRounds){if(hpA>hpB)winner="Ejército A por HP restante";else if(hpB>hpA)winner="Ejército B por HP restante";else winner="Empate por límite de rondas"}
 return{status:"Etapa 12 funcionando",model:"Fortaleza final + daño estructural",winner,roundsPlayed,maxRounds,armyA:summarizeArmy(armyA),armyB:summarizeArmy(armyB),roundLog,
  note:"Modelo actual: la fortaleza tiene HP, protección proporcional, colapso al llegar a 0 HP y modo objetivo Edificio para priorizar daño estructural. Al colapsar, la guarnición pierde toda protección de fortaleza."}
}


function getWinnerKey(winnerText){
 if(String(winnerText).includes("Ejército A"))return"A";
 if(String(winnerText).includes("Ejército B"))return"B";
 return"D";
}

function runVarianceSimulations(inputArmyA,inputArmyB,options={}){
 const runs=clamp(Math.floor(Number(options.simulationRuns??100)),1,1000);
 const results=[];
 let winsA=0,winsB=0,draws=0;
 let totalRounds=0,totalHpA=0,totalHpB=0,totalLostA=0,totalLostB=0;
 let bestA=null,worstA=null,bestB=null,worstB=null;
 let fastestA=null,fastestB=null;

 for(let i=0;i<runs;i++){
  const result=simulateBattle(inputArmyA,inputArmyB,{...options,simulateVariance:true});
  results.push(result);
  const key=getWinnerKey(result.winner);
  if(key==="A")winsA++;
  else if(key==="B")winsB++;
  else draws++;

  totalRounds+=Number(result.roundsPlayed||0);
  totalHpA+=result.armyA.totalRemainingHp;
  totalHpB+=result.armyB.totalRemainingHp;
  totalLostA+=result.armyA.totalLostHp;
  totalLostB+=result.armyB.totalLostHp;

  if(!bestA||result.armyA.totalRemainingHp>bestA.armyA.totalRemainingHp)bestA=result;
  if(!worstA||result.armyA.totalRemainingHp<worstA.armyA.totalRemainingHp)worstA=result;
  if(!bestB||result.armyB.totalRemainingHp>bestB.armyB.totalRemainingHp)bestB=result;
  if(!worstB||result.armyB.totalRemainingHp<worstB.armyB.totalRemainingHp)worstB=result;

  if(key==="A"&&(!fastestA||result.roundsPlayed<fastestA.roundsPlayed))fastestA=result;
  if(key==="B"&&(!fastestB||result.roundsPlayed<fastestB.roundsPlayed))fastestB=result;
 }

 const orderedForA=[...results].sort((a,b)=>b.armyA.totalRemainingHp-a.armyA.totalRemainingHp);
 const medianA=orderedForA[Math.floor(orderedForA.length/2)]||results[0];
 const sample=results[0];

 return{
  status:"Etapa 13 funcionando",
  model:"Varianza avanzada",
  runs,
  winsA,winsB,draws,
  probabilityA:round((winsA/runs)*100,1),
  probabilityB:round((winsB/runs)*100,1),
  probabilityDraw:round((draws/runs)*100,1),
  avgRounds:round(totalRounds/runs,2),
  avgRemainingHpA:round(totalHpA/runs,1),
  avgRemainingHpB:round(totalHpB/runs,1),
  avgLostHpA:round(totalLostA/runs,1),
  avgLostHpB:round(totalLostB/runs,1),
  bestA:{
   winner:bestA?.winner??"-",
   rounds:bestA?.roundsPlayed??0,
   hpA:round(bestA?.armyA.totalRemainingHp??0,1),
   hpB:round(bestA?.armyB.totalRemainingHp??0,1)
  },
  worstA:{
   winner:worstA?.winner??"-",
   rounds:worstA?.roundsPlayed??0,
   hpA:round(worstA?.armyA.totalRemainingHp??0,1),
   hpB:round(worstA?.armyB.totalRemainingHp??0,1)
  },
  bestB:{
   winner:bestB?.winner??"-",
   rounds:bestB?.roundsPlayed??0,
   hpA:round(bestB?.armyA.totalRemainingHp??0,1),
   hpB:round(bestB?.armyB.totalRemainingHp??0,1)
  },
  worstB:{
   winner:worstB?.winner??"-",
   rounds:worstB?.roundsPlayed??0,
   hpA:round(worstB?.armyA.totalRemainingHp??0,1),
   hpB:round(worstB?.armyB.totalRemainingHp??0,1)
  },
  fastestA:fastestA?{rounds:fastestA.roundsPlayed,hpA:fastestA.armyA.totalRemainingHp,hpB:fastestA.armyB.totalRemainingHp}:null,
  fastestB:fastestB?{rounds:fastestB.roundsPlayed,hpA:fastestB.armyA.totalRemainingHp,hpB:fastestB.armyB.totalRemainingHp}:null,
  medianSample:medianA,
  sample,
  note:"Varianza avanzada: cada corrida aplica una variación aleatoria simple al daño. Las probabilidades son estimaciones, no resultados garantizados."
 }
}

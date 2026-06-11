const UNIT_ORDER=["infantry","cavalry","armoredCar","lightTank","heavyTank","stormtrooper","artillery","railgun","balloon","fighter","bomber","airship"];
const UNITS={
infantry:{id:"infantry",name:"Infantería",domain:"land",hp:20,attackRange:0,operationalRange:0,combat:{normal:{attack:4,defense:5},air:{attack:.3,defense:.4},naval:{attack:2,defense:2.5},building:{attack:.3,defense:.4},morale:{attack:.1,defense:null}}},
cavalry:{id:"cavalry",name:"Caballería",domain:"land",hp:25,attackRange:0,operationalRange:0,combat:{normal:{attack:15,defense:7.5},air:{attack:2,defense:1},naval:{attack:8,defense:4},building:{attack:2,defense:1},morale:{attack:.6,defense:null}}},
armoredCar:{id:"armoredCar",name:"Carro blindado",domain:"land",hp:60,attackRange:0,operationalRange:0,combat:{normal:{attack:6,defense:12},air:{attack:4,defense:8},naval:{attack:3,defense:6},building:{attack:1,defense:2},morale:{attack:.2,defense:null}}},
lightTank:{id:"lightTank",name:"Tanque ligero",domain:"land",hp:175,attackRange:0,operationalRange:0,combat:{normal:{attack:30,defense:30},air:{attack:3,defense:3},naval:{attack:15,defense:15},building:{attack:6,defense:6},morale:{attack:1.2,defense:null}}},
heavyTank:{id:"heavyTank",name:"Tanque pesado",domain:"land",hp:260,attackRange:0,operationalRange:0,combat:{normal:{attack:45,defense:45},air:{attack:4,defense:4},naval:{attack:23,defense:23},building:{attack:9,defense:9},morale:{attack:1.8,defense:null}}},
stormtrooper:{id:"stormtrooper",name:"Tropas de asalto",domain:"land",hp:40,attackRange:0,operationalRange:0,combat:{normal:{attack:25,defense:6.3},air:{attack:4,defense:1},naval:{attack:3,defense:.8},building:{attack:1,defense:.3},morale:{attack:1,defense:null}}},
artillery:{id:"artillery",name:"Artillería",domain:"land",hp:20,attackRange:50,operationalRange:0,combat:{normal:{attack:8,defense:2.7},air:{attack:1,defense:.3},naval:{attack:8,defense:2.7},building:{attack:1.5,defense:.5},morale:{attack:.3,defense:null}}},
railgun:{id:"railgun",name:"Cañón ferroviario",domain:"land",hp:60,attackRange:150,operationalRange:0,combat:{normal:{attack:20,defense:6.7},air:{attack:2,defense:.7},naval:{attack:20,defense:6.7},building:{attack:4,defense:1.3},morale:{attack:.8,defense:null}}},
balloon:{id:"balloon",name:"Globo",domain:"air",hp:20,attackRange:0,operationalRange:0,combat:{normal:{attack:3,defense:3},air:{attack:10,defense:10},naval:{attack:3,defense:3},building:{attack:.5,defense:.5},morale:{attack:.1,defense:null}}},
fighter:{id:"fighter",name:"Caza",domain:"air",hp:60,attackRange:0,operationalRange:250,combat:{normal:{attack:5,defense:5},air:{attack:20,defense:20},naval:{attack:5,defense:5},building:{attack:1,defense:1},morale:{attack:.2,defense:null}}},
bomber:{id:"bomber",name:"Bombardero",domain:"air",hp:80,attackRange:0,operationalRange:350,combat:{normal:{attack:35,defense:35},air:{attack:3,defense:3},naval:{attack:35,defense:35},building:{attack:7,defense:7},morale:{attack:1.4,defense:null}}},
airship:{id:"airship",name:"Dirigible",domain:"air",hp:140,attackRange:0,operationalRange:750,combat:{normal:{attack:5,defense:5},air:{attack:5,defense:5},naval:{attack:5,defense:5},building:{attack:30,defense:30},morale:{attack:5,defense:null}}}
};
const FORTRESSES={none:{name:"Sin fortaleza",level:0,hp:0,reductionPercent:0,damageMultiplier:1,moraleBonus:0},1:{name:"Fortaleza I",level:1,hp:50,reductionPercent:30,damageMultiplier:.70,moraleBonus:5},2:{name:"Fortaleza II",level:2,hp:50,reductionPercent:45,damageMultiplier:.55,moraleBonus:10},3:{name:"Fortaleza III",level:3,hp:50,reductionPercent:60,damageMultiplier:.40,moraleBonus:15},4:{name:"Fortaleza IV",level:4,hp:50,reductionPercent:75,damageMultiplier:.25,moraleBonus:20},5:{name:"Fortaleza V",level:5,hp:50,reductionPercent:90,damageMultiplier:.10,moraleBonus:25}};


const HEROES = {
  none: {
    id: "none",
    name: "Sin héroe",
    level: 0,
    affects: "all",
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    duration: 0,
    note: "Sin modificadores."
  },
  georg: {
    id: "georg",
    name: "Georg Bruchmüller",
    level: 20,
    affects: "artillery",
    attackBonus: 25,
    defenseBonus: 0,
    hpBonus: 0,
    duration: 0,
    note: "Plantilla editable para héroe de artillería."
  },
  redBaron: {
    id: "redBaron",
    name: "Barón Rojo",
    level: 20,
    affects: "fighter",
    attackBonus: 25,
    defenseBonus: 10,
    hpBonus: 0,
    duration: 0,
    note: "Plantilla editable para héroe de cazas."
  },
  allenby: {
    id: "allenby",
    name: "Viscount Allenby",
    level: 20,
    affects: "cavalry",
    attackBonus: 20,
    defenseBonus: 10,
    hpBonus: 0,
    duration: 0,
    note: "Plantilla editable para caballería."
  },
  orhan: {
    id: "orhan",
    name: "Orhan Demir",
    level: 20,
    affects: "armoredCar",
    attackBonus: 0,
    defenseBonus: 25,
    hpBonus: 0,
    duration: 0,
    note: "Plantilla editable para carros blindados."
  },
  marco: {
    id: "marco",
    name: "Fiero Marco Martello",
    level: 20,
    affects: "lightTank",
    attackBonus: 10,
    defenseBonus: 10,
    hpBonus: 20,
    duration: 0,
    note: "Plantilla editable para tanques ligeros."
  },
  custom: {
    id: "custom",
    name: "Personalizado",
    level: 0,
    affects: "all",
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    duration: 0,
    note: "Usa este modo para escribir bonos manuales."
  }
};

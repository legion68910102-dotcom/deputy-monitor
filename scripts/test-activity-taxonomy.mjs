import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const policy=require("../activity-category-policy-v1.js");
const source=fs.readFileSync(new URL("../activity-analysis-v129.js",import.meta.url),"utf8");
assert.match(source,/\}\)\(\);\s*$/,"Activity script should have an IIFE");
const sandbox={document:{addEventListener(){}},window:{dmActivityCategoryPolicy:policy}};
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,"globalThis.__testExtract=extract;\n})();"),sandbox,{timeout:3000});
assert.equal(typeof sandbox.__testExtract,"function");
const samples=[
 {name:"held Council meeting",text:"Сегодня состоялось заседание Совета депутатов муниципального округа. На заседании обсудили бюджет.",yes:["council"],no:["meet","event"]},
 {name:"announcement",text:"Завтра состоится заседание Совета депутатов муниципального округа, приглашаем всех на трансляцию.",yes:["announcement"],no:["council"]},
 {name:"committee is not the Council",text:"Совет депутатов сообщил, что сегодня прошло заседание комиссии по бюджету.",yes:[],no:["council"]},
 {name:"meeting with residents",text:"Сегодня встретился с жителями района, обсудил обращения.",yes:["meet"],no:["council"]},
 {name:"Council meeting and discussion",text:"На заседании Совета депутатов обсудили повестку и приняли решение.",yes:["council"],no:["meet","event"]},
 {name:"round is not an event",text:"Сегодня принял участие в обходе территории района. Проверили состояние детской площадки.",yes:["walk"],no:["event"]},
 {name:"round before a holiday is not an event",text:"Сегодня провел обход дворов перед праздником.",yes:["walk"],no:["event"]},
 {name:"district meeting is not an event",text:"Встретился с жителями для обсуждения проблем освещения.",yes:["meet"],no:["event"]},
 {name:"inspection is not an event",text:"Проверил качество ремонта и благоустройства в районе.",yes:[],no:["event"]},
 {name:"attended forum",text:"Сегодня принял участие в городском форуме депутатов.",yes:["event"],no:["walk"]},
 {name:"spoke at congress",text:"Вчера выступил на съезде общественной организации.",yes:["event"],no:["walk"]},
 {name:"festive concert",text:"Посетил праздничный концерт в честь Дня матери.",yes:["event"],no:["walk"]},
 {name:"festival",text:"Участвовал в городском фестивале искусств.",yes:["event"],no:["walk"]},
 {name:"future concert is an announcement",text:"Завтра состоится праздничный концерт, приглашаем жителей.",yes:["announcement"],no:["event"]},
 {name:"birthday greeting is not an event",text:"Поздравляю жителей с праздником!",yes:[],no:["event"]},
 {name:"walk then concert can be both",text:"Сегодня провел обход территории района. Вечером посетил праздничный концерт.",yes:["walk","event"],no:[]},
];
for(const sample of samples){
 const keys=[...new Set(sandbox.__testExtract(sample.text).map(x=>x.key))];
 for(const k of sample.yes)assert.ok(keys.includes(k),sample.name+": missing "+k+" in "+keys);
 for(const k of sample.no)assert.ok(!keys.includes(k),sample.name+": incorrect "+k+" in "+keys);
 console.log("Fallback taxonomy test passed:",sample.name);
}

const aiCorrections=[
 {name:"AI called a walk an event",text:"Сегодня принял участие в обходе территории района.",input:["event"],expect:["walk"]},
 {name:"AI called a forum an event",text:"Посетил городской форум депутатов.",input:["event"],expect:["event"]},
 {name:"AI called a greeting an event",text:"Поздравляю жителей с праздником.",input:["event"],expect:[]},
 {name:"AI missed a documented festive concert",text:"Вчера посетил праздничный концерт.",input:[],expect:["event"]},
 {name:"AI called a future forum an event",text:"Завтра состоится форум депутатов.",input:["event","announcement"],expect:["announcement"]},
];
for(const sample of aiCorrections){
 const actual=policy.normalizeCategories(sample.input,sample.text);
 assert.deepEqual(actual.slice().sort(),sample.expect.slice().sort(),sample.name);
 console.log("AI policy correction passed:",sample.name);
}

import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const source=fs.readFileSync(new URL("../activity-analysis-v129.js",import.meta.url),"utf8");
assert.match(source,/\}\)\(\);\s*$/,"Activity script should have an IIFE");
const sandbox={document:{addEventListener(){}},window:{}};
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,"globalThis.__testExtract=extract;\n})();"),sandbox,{timeout:3000});
assert.equal(typeof sandbox.__testExtract,"function");
const samples=[
 {name:"held Council meeting",text:"Сегодня состоялось заседание Совета депутатов муниципального округа. На заседании обсудили бюджет.",yes:["council"],no:["meet","event"]},
 {name:"announcement",text:"Завтра состоится заседание Совета депутатов муниципального округа, приглашаем всех на трансляцию.",yes:["announcement"],no:["council"]},
 {name:"committee is not the Council",text:"Совет депутатов сообщил, что сегодня прошло заседание комиссии по бюджету.",yes:[],no:["council"]},
 {name:"meeting with residents",text:"Сегодня встретился с жителями района, обсудил обращения.",yes:["meet"],no:["council"]},
 {name:"Council meeting and discussion",text:"На заседании Совета депутатов обсудили повестку и приняли решение.",yes:["council"],no:["meet","event"]},
];
for(const sample of samples){
 const keys=[...new Set(sandbox.__testExtract(sample.text).map(x=>x.key))];
 for(const k of sample.yes)assert.ok(keys.includes(k),sample.name+": missing "+k+" in "+keys);
 for(const k of sample.no)assert.ok(!keys.includes(k),sample.name+": incorrect "+k+" in "+keys);
 console.log("Fallback taxonomy test passed:",sample.name);
}

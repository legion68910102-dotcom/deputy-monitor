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
 {name:"district cleanup",text:"Сегодня принял участие в районном субботнике. Вместе с жителями убрали мусор.",yes:["event"],no:["walk"]},
 {name:"organized district cleanup",text:"Провели субботник рядом со школой.",yes:["event"],no:["walk"]},
 {name:"future cleanup announcement",text:"Завтра приглашаю всех на субботник.",yes:["announcement"],no:["event"]},
 {name:"head of district administration rounds",text:"Сегодня принял участие в обходе главы управы.",yes:["walk"],no:["event"]},
 {name:"joint district administration walk",text:"Сегодня вместе с главой управы провели обход дворов.",yes:["walk"],no:["event"]},
 {name:"capital repairs progress inspection",text:"Проверил ход капитального ремонта дома.",yes:["inspect"],no:["event"]},
 {name:"inspection of apartment major renovation",text:"Осмотрел ход капремонта многоквартирного дома.",yes:["inspect"],no:["event"]},
 {name:"strolled in a park",text:"Сегодня прогулялся в парке.",yes:["personal"],no:["event"]},
 {name:"traveled to a different city",text:"Съездил в другой город на выходные.",yes:["personal"],no:["event"]},
 {name:"personal museum visit",text:"Посетил музей с семьёй.",yes:["personal"],no:["event"]},
 {name:"personal temple visit",text:"Вчера побывал в храме.",yes:["personal"],no:["event"]},
 {name:"barbecue",text:"С друзьями поехали на шашлыки.",yes:["personal"],no:["event"]},
 {name:"visit to dacha",text:"Съездил на дачу на выходные.",yes:["personal"],no:["event"]},
 {name:"harvest",text:"Собрал урожай на даче.",yes:["personal"],no:["event"]},
 {name:"pets",text:"Мой кот снова шкодит.",yes:["personal"],no:["event"]},
 {name:"children",text:"Наши дети подрастают так быстро.",yes:["personal"],no:["event"]},
 {name:"official childcare issue isn't personal",text:"Провёл встречу с жителями по вопросам строительства детского сада.",yes:["meet"],no:["personal","event"]},

 {name:"humanitarian supplies donated",text:"Передали гуманитарную помощь пострадавшим жителям.",yes:["humanitarian"],no:["event","announcement"]},
 {name:"gathered humanitarian cargo",text:"Собрали гуманитарный груз для нуждающихся.",yes:["humanitarian"],no:["event"]},
 {name:"delivered medicines",text:"Передали медикаменты нуждающимся.",yes:["humanitarian"],no:["event"]},
 {name:"supplies after fire",text:"Собрали продукты для пострадавших от пожара.",yes:["humanitarian"],no:["event"]},
 {name:"organized collection",text:"Организовали сбор гуманитарной помощи для жителей.",yes:["humanitarian"],no:["event"]},
 {name:"future charity collection",text:"Завтра начнётся сбор гуманитарной помощи.",yes:["announcement"],no:["humanitarian","event"]},
 {name:"planned aid not delivered",text:"Планируем собрать гуманитарный груз.",yes:["plan"],no:["humanitarian","event"]},
 {name:"cleaning volunteer day not humanitarian",text:"Провели субботник во дворе, убрали мусор.",yes:["event"],no:["humanitarian"]},
 {name:"civic assistance not humanitarian",text:"Провёл приём граждан, помог разобраться с квитанцией.",yes:["reception"],no:["humanitarian","event"]},
 {name:"topic mention without action",text:"Гуманитарная помощь сейчас очень нужна.",yes:[],no:["humanitarian","event"]},

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
 {name:"AI missed district cleanup",text:"Принял участие в субботнике.",input:[],expect:["event"]},
 {name:"AI put administration round in events",text:"Сегодня принял участие в обходе главы управы.",input:["event"],expect:["walk"]},
 {name:"AI missed capital renovation",text:"Проверил ход капитального ремонта.",input:[],expect:["inspect"]},
 {name:"AI missed my pets",text:"Моя собака радуется первому снегу.",input:[],expect:["personal"]},
 {name:"AI missed travel",text:"Посетил музей с семьёй.",input:[],expect:["personal"]},

 {name:"AI missed actual humanitarian distribution",text:"Передали гуманитарную помощь пострадавшим.",input:[],expect:["humanitarian"]},
 {name:"AI called planned humanitarian delivery completed",text:"Завтра начнётся сбор гуманитарной помощи.",input:["humanitarian","announcement"],expect:["announcement"]},
 {name:"AI mistaken humanitarian label for public cleanup",text:"Провели субботник и убрали мусор.",input:["humanitarian"],expect:["event"]},
 {name:"AI mistaken humanitarian label for paperwork help",text:"Помог жителю с оформлением документов.",input:["humanitarian"],expect:[]},

];
for(const sample of aiCorrections){
 const actual=policy.normalizeCategories(sample.input,sample.text);
 assert.deepEqual(actual.slice().sort(),sample.expect.slice().sort(),sample.name);
 console.log("AI policy correction passed:",sample.name);
}

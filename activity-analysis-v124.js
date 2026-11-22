/* Transparent Russian activity extraction; counts posts with evidence, not confirmed real-world events. */
(function(){
"use strict";
const labels={meet:"Личные встречи",walk:"Обходы территорий",inspect:"Приёмка и контроль работ",event:"Участие в мероприятиях",reception:"Приёмы граждан",appeal:"Работа с обращениями",result:"Решённые вопросы",plan:"Планы и обещания"};
const rules={
meet:/\b(?:встретил(?:ся|ась|ись)|встреч[аиуеой]|пообщал(?:ся|ась|ись)|обсудил[аи]?)\b/iu,
walk:/\b(?:обход[а-я]*|обош[её]л|обошли|осмотр[а-я]* территор|прош[её]л по двор|проверил[аи]? двор)\b/iu,
inspect:/\b(?:при[её]мк[а-я]*|принял[аи]? работ|контрол[а-я]* (?:ход|качеств)|проверил[аи]? (?:ремонт|работ|благоустрой)|осмотр[а-я]* (?:ремонт|работ))\b/iu,
event:/\b(?:принял[аи]? участие|участвовал[аи]?|посетил[аи]? (?:мероприятие|концерт|праздник|соревнован)|выступил[аи]? на)\b/iu,
reception:/\b(?:при[её]м граждан|личн(?:ый|ого) при[её]м|при[её]м жителей|пров[её]л[аи]? при[её]м)\b/iu,
appeal:/\b(?:обращени[еяй]|жалоб[а-я]*|заявлени[еяй] жителей|по просьбе жителей)\b/iu,
result:/\b(?:добил(?:ся|ась|ись)|удалось решить|вопрос реш[её]н|устранен[а-я]*|устран[её]н[а-я]*|работы завершен[а-я]*|ремонт завершен[а-я]*|выполнен[а-я]* работы)\b/iu,
plan:/\b(?:планирую|планируем|предстоит|намерен[а-я]*|обещаю|будем проводить|состоится|запланирован[а-я]*)\b/iu
};
const future=/\b(?:планирую|планируем|планируется|состоится|завтра|на следующей неделе|предстоит|будем|приглашаю|приглашаем|запланирован[а-я]*)\b/iu;
const negate=/\b(?:не состоял[а-я]*|не проводил[а-я]*|не удалось|отмен[её]н[а-я]*)\b/iu;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function extract(text){const sentences=String(text||"").split(/(?<=[.!?\n])\s+|\n+/u).filter(Boolean);let hits=[];for(const sentence of sentences){const t=sentence.trim();if(!t)continue;const uncertain=future.test(t)||negate.test(t);for(const [key,re] of Object.entries(rules)){if(re.test(t))hits.push({key,evidence:t.slice(0,300),certainty:uncertain?"requires_review":"possible"})}}return hits}
function rows(){if(typeof window.dmActivityRows==="function"){try{return window.dmActivityRows()}catch(e){}}const map=new Map();for(const [storage,key] of [[sessionStorage,"dm_vk_posts"],[localStorage,"dm_posts"]]){try{for(const r of JSON.parse(storage.getItem(key)||"[]"))map.set(r.profile+"|"+r.url,r)}catch(e){}}return [...map.values()]}

function directoryOptions(){
 const directory=window.dmActivityDirectory||{};
 const list=[];const seen=new Set();
 const norm=s=>String(s||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/\\s+/g," ").trim();
 for(const [district,people] of Object.entries(directory))for(const name of people){const key=norm(name);if(!key||seen.has(key))continue;seen.add(key);list.push({name,district,key})}
 return list.sort((a,b)=>a.name.localeCompare(b.name,"ru"));
}
const names={"natalia_shabasheva":"Наталья Шабашева","shmakova_os":"О. С. Шмакова","ekaterina.tyutyunnikova":"Екатерина Тютюнникова","aabulatov":"А. А. Булатов","vidutinaov":"О. В. Видутина","tishkovaea":"Е. А. Тишкова","elena.rubtsovanazarova":"Елена Рубцова-Назарова","nuykinakv":"К. В. Нуйкина"};
function render(){const who=document.getElementById("activity-person").value,start=document.getElementById("activity-from").value,end=document.getElementById("activity-to").value,filtered=rows().filter(r=>(who==="all"||r.profile===who||names[r.profile]===who)&&(!start||String(r.date).slice(0,10)>=start)&&(!end||String(r.date).slice(0,10)<=end)),results=[];for(const r of filtered){for(const hit of extract(r.text)){results.push({...hit,profile:r.profile,url:r.url,date:r.date})}}
const counts={};for(const k of Object.keys(labels))counts[k]=new Set(results.filter(r=>r.key===k&&r.certainty==="possible").map(r=>r.profile+"|"+r.url)).size;
document.getElementById("activity-cards").innerHTML=Object.entries(labels).map(([key,label])=>'<div class="kpi"><div class="label">'+esc(label)+'</div><div class="value">'+counts[key]+'</div><div class="hint">Публикаций с признаками · не число событий</div></div>').join("");
document.getElementById("activity-results").innerHTML=results.length?results.slice(0,150).map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+esc(names[r.profile]||r.profile)+'</td><td>'+esc(labels[r.key])+'</td><td>'+esc(r.certainty==="possible"?"Предварительно":"Требует проверки")+'</td><td>'+esc(r.evidence)+'</td><td>'+(String(r.url||"").startsWith("https://")?'<a target="_blank" rel="noopener noreferrer" href="'+esc(r.url)+'">Источник ↗</a>':"—")+'</td></tr>').join(""):'<tr><td colspan="6" class="empty">Нет подходящих текстов за период. Это не означает отсутствие деятельности.</td></tr>';
document.getElementById("activity-summary").textContent="Проанализировано публикаций: "+filtered.length+". Найдено фрагментов: "+results.length+". Категории предварительные, одна публикация может относиться к нескольким направлениям. Количество мероприятий и встреч требует подтверждения.";
}
document.addEventListener("DOMContentLoaded",()=>{const sel=document.getElementById("activity-person");if(!sel)return;for(const person of directoryOptions()){const o=document.createElement("option");o.value=person.name;o.textContent=person.name+" — "+person.district;sel.appendChild(o)}const today=new Date(),iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");document.getElementById("activity-to").value=iso(today);document.getElementById("activity-from").value=iso(new Date(today.getFullYear(),today.getMonth(),1));document.getElementById("activity-run").onclick=render;document.addEventListener("dm-publications-updated",render);render()});
})();

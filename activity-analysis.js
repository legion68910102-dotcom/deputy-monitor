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
function rows(){if(typeof window.dmActivityRows==="function")return window.dmActivityRows();const map=new Map();try{for(const r of JSON.parse(sessionStorage.getItem("dm_vk_posts")||"[]"))map.set(r.profile+"|"+r.url,r)}catch(e){}try{for(const r of JSON.parse(localStorage.getItem("dm_posts")||"[]"))map.set(r.profile+"|"+r.url,r)}catch(e){}return [...map.values()]}
const roster=Array.isArray(window.deputyRoster)?window.deputyRoster:[];
const handles=roster.map(p=>p.handle).filter(Boolean);
const names={"natalia_shabasheva":"Наталья Шабашева","shmakova_os":"О. С. Шмакова","ekaterina.tyutyunnikova":"Екатерина Тютюнникова","aabulatov":"А. А. Булатов","vidutinaov":"О. В. Видутина","tishkovaea":"Е. А. Тишкова","elena.rubtsovanazarova":"Елена Рубцова-Назарова","nuykinakv":"К. В. Нуйкина"};
for(const p of roster)if(p.handle&&p.name)names[p.handle]=p.name;
let resultLimit=150;
function render(){const who=document.getElementById("activity-person").value,start=document.getElementById("activity-from").value,end=document.getElementById("activity-to").value,filtered=rows().filter(r=>(who==="all"||r.profile===who)&&window.dmDateFilter.includes(r.date,start,end)),results=[];for(const r of filtered){for(const hit of extract(r.text)){results.push({...hit,profile:r.profile,url:r.url,date:r.date})}}
const counts={};for(const k of Object.keys(labels))counts[k]=new Set(results.filter(r=>r.key===k&&r.certainty==="possible").map(r=>r.profile+"|"+r.url)).size;
document.getElementById("activity-cards").innerHTML=Object.entries(labels).map(([key,label])=>'<div class="kpi"><div class="label">'+esc(label)+'</div><div class="value">'+counts[key]+'</div><div class="hint">Публикаций с признаками · не число событий</div></div>').join("");
document.getElementById("activity-results").innerHTML=results.length?results.slice(0,resultLimit).map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+esc(names[r.profile]||r.profile)+'</td><td>'+esc(labels[r.key])+'</td><td>'+esc(r.certainty==="possible"?"Предварительно":"Требует проверки")+'</td><td>'+esc(r.evidence)+'</td><td>'+(String(r.url||"").startsWith("https://")?'<a target="_blank" rel="noopener noreferrer" href="'+esc(r.url)+'">Источник ↗</a>':"—")+'</td></tr>').join(""):'<tr><td colspan="6" class="empty">Нет подходящих текстов за период. Это не означает отсутствие деятельности.</td></tr>';
const more=document.getElementById("activity-results-more");more.hidden=results.length<=resultLimit;more.textContent="Показать ещё ("+Math.max(0,results.length-resultLimit)+")";
document.getElementById("activity-summary").textContent=window.dmDateFilter.label(start,end)+" Проанализировано публикаций: "+filtered.length+". Найдено фрагментов: "+results.length+". Категории предварительные, одна публикация может относиться к нескольким направлениям. Количество мероприятий и встреч требует подтверждения.";
}
document.addEventListener("DOMContentLoaded",()=>{const sel=document.getElementById("activity-person");if(!sel)return;for(const h of handles){const o=document.createElement("option");o.value=h;o.textContent=names[h];sel.appendChild(o)}const today=new Date(),iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");document.getElementById("activity-to").value="";document.getElementById("activity-from").value="";document.getElementById("analysis-all-dates").onclick=()=>{document.getElementById("activity-to").value="";document.getElementById("activity-from").value="";resultLimit=150;render()};document.getElementById("activity-results-more").onclick=()=>{resultLimit+=150;render()};document.getElementById("activity-run").onclick=render;for(const id of ["activity-person","activity-from","activity-to"])for(const event of ["input","change"])document.getElementById(id).addEventListener(event,()=>{resultLimit=150;render()});document.addEventListener("dm-publications-updated",render);render()});
})();

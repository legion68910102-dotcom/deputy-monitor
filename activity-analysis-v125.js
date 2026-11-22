/* Transparent Russian activity extraction; counts posts with evidence, not confirmed real-world events. */
(function(){
"use strict";
const labels={meet:"Личные встречи",walk:"Обходы территорий",inspect:"Приёмка и контроль работ",event:"Участие в мероприятиях",reception:"Приёмы граждан",appeal:"Работа с обращениями",result:"Решённые вопросы",plan:"Планы и обещания"};
const rules={
meet:/(?:^|[^а-яёa-z0-9_])(?:встретил(?:ся|ась|ись)|встреч[аиуеой]|пообщал(?:ся|ась|ись)|обсудил[аи]?)(?=$|[^а-яёa-z0-9_])/iu,
walk:/(?:^|[^а-яёa-z0-9_])(?:обход[а-я]*|обош[её]л|обошли|осмотр[а-я]* территор|прош[её]л по двор|проверил[аи]? двор)(?=$|[^а-яёa-z0-9_])/iu,
inspect:/(?:^|[^а-яёa-z0-9_])(?:при[её]мк[а-я]*|принял[аи]? работ|контрол[а-я]* (?:ход|качеств)|проверил[аи]? (?:ремонт|работ|благоустрой)|осмотр[а-я]* (?:ремонт|работ))(?=$|[^а-яёa-z0-9_])/iu,
event:/(?:^|[^а-яёa-z0-9_])(?:принял[аи]? участие|участвовал[аи]?|посетил[аи]? (?:мероприятие|концерт|праздник|соревнован)|выступил[аи]? на)(?=$|[^а-яёa-z0-9_])/iu,
reception:/(?:^|[^а-яёa-z0-9_])(?:при[её]м граждан|личн(?:ый|ого) при[её]м|при[её]м жителей|пров[её]л[аи]? при[её]м)(?=$|[^а-яёa-z0-9_])/iu,
appeal:/(?:^|[^а-яёa-z0-9_])(?:обращени[еяй]|жалоб[а-я]*|заявлени[еяй] жителей|по просьбе жителей)(?=$|[^а-яёa-z0-9_])/iu,
result:/(?:^|[^а-яёa-z0-9_])(?:добил(?:ся|ась|ись)|удалось решить|вопрос реш[её]н|устранен[а-я]*|устран[её]н[а-я]*|работы завершен[а-я]*|ремонт завершен[а-я]*|выполнен[а-я]* работы)(?=$|[^а-яёa-z0-9_])/iu,
plan:/(?:^|[^а-яёa-z0-9_])(?:планирую|планируем|предстоит|намерен[а-я]*|обещаю|будем проводить|состоится|запланирован[а-я]*)(?=$|[^а-яёa-z0-9_])/iu
};
const future=/(?:^|[^а-яёa-z0-9_])(?:планирую|планируем|планируется|состоится|завтра|на следующей неделе|предстоит|будем|приглашаю|приглашаем|запланирован[а-я]*)(?=$|[^а-яёa-z0-9_])/iu;
const negate=/(?:^|[^а-яёa-z0-9_])(?:не состоял[а-я]*|не проводил[а-я]*|не удалось|отмен[её]н[а-я]*)(?=$|[^а-яёa-z0-9_])/iu;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function extract(text){const sentences=String(text||"").split(/(?<=[.!?\n])\s+|\n+/u).filter(Boolean);let hits=[];for(const sentence of sentences){const t=sentence.trim();if(!t)continue;const uncertain=future.test(t)||negate.test(t);for(const [key,re] of Object.entries(rules)){if(re.test(t))hits.push({key,evidence:t.slice(0,300),certainty:uncertain?"requires_review":"possible"})}}return hits}
function rows(){if(typeof window.dmActivityRows==="function"){try{return window.dmActivityRows()}catch(e){}}const map=new Map();for(const [storage,key] of [[sessionStorage,"dm_vk_posts"],[localStorage,"dm_posts"]]){try{for(const r of JSON.parse(storage.getItem(key)||"[]"))map.set(r.profile+"|"+r.url,r)}catch(e){}}return [...map.values()]}

function directoryOptions(){
 const directory=window.dmActivityDirectory||{};
 const list=[];const seen=new Set();
 const norm=s=>String(s||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/\s+/g," ").trim();
 for(const [district,people] of Object.entries(directory))for(const name of people){const key=norm(name);if(!key||seen.has(key))continue;seen.add(key);list.push({name,district,key})}
 return list.sort((a,b)=>a.name.localeCompare(b.name,"ru"));
}
const names={"natalia_shabasheva":"Наталья Шабашева","shmakova_os":"О. С. Шмакова","ekaterina.tyutyunnikova":"Екатерина Тютюнникова","aabulatov":"А. А. Булатов","vidutinaov":"О. В. Видутина","tishkovaea":"Е. А. Тишкова","elena.rubtsovanazarova":"Елена Рубцова-Назарова","nuykinakv":"К. В. Нуйкина"};
function normalizeName(s){return String(s||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/\s+/g," ").trim()}
function rosterName(profile){
 const value=String(profile||"").trim();
 const entry=(Array.isArray(window.deputyRoster)?window.deputyRoster:[]).find(p=>p.handle===value||normalizeName(p.name)===normalizeName(value));
 return entry?.name||names[value]||value;
}
let manualRuns=0;
function render(manual=false){
 const who=document.getElementById("activity-person").value;
 const start=document.getElementById("activity-from").value;
 const end=document.getElementById("activity-to").value;
 const all=rows().filter(r=>r&&typeof r==="object");
 const hasText=r=>String(r.text||"").trim().length>0;
 const filtered=all.filter(r=>(who==="all"||normalizeName(rosterName(r.profile))===normalizeName(who)||normalizeName(r.profile)===normalizeName(who))&&(!start||String(r.date||"").slice(0,10)>=start)&&(!end||String(r.date||"").slice(0,10)<=end));
 const usable=filtered.filter(hasText);
 const results=[];
 for(const r of usable){for(const hit of extract(r.text)){results.push({...hit,profile:r.profile,url:r.url,date:r.date})}}
 const counts={};for(const k of Object.keys(labels))counts[k]=new Set(results.filter(r=>r.key===k&&r.certainty==="possible").map(r=>String(r.profile||"")+"|"+String(r.url||r.date||""))).size;
 document.getElementById("activity-cards").innerHTML=Object.entries(labels).map(([key,label])=>'<div class="kpi"><div class="label">'+esc(label)+'</div><div class="value">'+counts[key]+'</div><div class="hint">Публикаций с признаками · не число событий</div></div>').join("");
 document.getElementById("activity-results").innerHTML=results.length?results.slice(0,150).map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+esc(rosterName(r.profile))+'</td><td>'+esc(labels[r.key])+'</td><td>'+esc(r.certainty==="possible"?"Предварительно":"Требует проверки")+'</td><td>'+esc(r.evidence)+'</td><td>'+(String(r.url||"").startsWith("https://")?'<a target="_blank" rel="noopener noreferrer" href="'+esc(r.url)+'">Источник ↗</a>':"—")+'</td></tr>').join(""):'<tr><td colspan="6" class="empty">Подходящих подтверждающих фраз нет. Это не означает отсутствие депутатской деятельности.</td></tr>';
 const allTexts=all.filter(hasText).length;
 let reason="";
 if(!all.length)reason="В ленте нет доступных публикаций для анализа. Автоматический сбор VK требует доступа к API; без текстов показатели останутся нулевыми.";
 else if(!allTexts)reason="В ленте есть записи, но нет текста публикаций. По одним ссылкам анализ невозможен.";
 else if(!filtered.length)reason="За выбранный период или для выбранного депутата записей нет. Попробуйте «Все депутаты» и пустые поля дат.";
 else if(!usable.length)reason="У выбранных публикаций отсутствует текст для анализа.";
 else if(!results.length)reason="В доступных текстах не обнаружены формулировки по восьми направлениям. Это не доказательство отсутствия деятельности.";
 else reason="Признаки предварительные: количество публикаций не равно числу подтверждённых мероприятий.";
 if(manual)manualRuns++;
 const stamp=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
 document.getElementById("activity-summary").textContent=(manual?"Проверка №"+manualRuns+" выполнена в ":"Данные проанализированы в ")+stamp+". Всего в ленте: "+all.length+"; с текстом: "+allTexts+"; по фильтрам: "+filtered.length+"; проанализировано текстов: "+usable.length+"; найдено признаков: "+results.length+". "+reason;
}
document.addEventListener("DOMContentLoaded",()=>{
 const sel=document.getElementById("activity-person");if(!sel)return;
 for(const person of directoryOptions()){const o=document.createElement("option");o.value=person.name;o.textContent=person.name+" — "+person.district;sel.appendChild(o)}
 // No prefilled dates: analyze all available history unless the user filters it.
 document.getElementById("activity-from").value="";
 document.getElementById("activity-to").value="";
 document.getElementById("activity-run").addEventListener("click",()=>render(true));
 document.addEventListener("dm-publications-updated",()=>render(false));
 render(false);
});
})();

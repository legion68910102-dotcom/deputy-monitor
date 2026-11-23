/* Transparent Russian activity extraction; counts posts with evidence, not confirmed real-world events. */
(function(){
"use strict";
const labels={council:"Заседания Совета депутатов",meet:"Личные встречи",walk:"Обходы территорий",inspect:"Приёмка и контроль работ",event:"Участие в мероприятиях",reception:"Приёмы граждан",appeal:"Работа с обращениями",result:"Решённые вопросы",plan:"Планы и обещания",personal:"Личные",information:"Информационные",announcement:"Публикации-анонсы",repost:"Репосты",uncategorized:"Без темы"};
const rules={
council:/(?:заседани[а-яё]*\s+(?:[а-яё-]+\s+){0,3}совет[а-яё]*\s+депутат[а-яё]*|совет[а-яё]*\s+депутат[а-яё]*[^.!?\n]{0,75}заседани[а-яё]*)/iu,
meet:/(?:^|[^а-яёa-z0-9_])(?:встретил(?:ся|ась|ись)|встреч[аиуеой]|пообщал(?:ся|ась|ись)|обсудил[аи]?)(?=$|[^а-яёa-z0-9_])/iu,
walk:/(?:^|[^а-яёa-z0-9_])(?:обход[а-я]*|обош[её]л|обошли|осмотр[а-я]* территор|прош[её]л по двор|проверил[аи]? двор)(?=$|[^а-яёa-z0-9_])/iu,
inspect:/(?:^|[^а-яёa-z0-9_])(?:при[её]мк[а-я]*|принял[аи]? работ|контрол[а-я]* (?:ход|качеств)|проверил[аи]? (?:ремонт|работ|благоустрой)|осмотр[а-я]* (?:ремонт|работ))(?=$|[^а-яёa-z0-9_])/iu,
event:/(?:^|[^а-яёa-z0-9_])(?:принял[аи]? участие|участвовал[аи]?|посетил[аи]? (?:мероприятие|концерт|праздник|соревнован)|выступил[аи]? на)(?=$|[^а-яёa-z0-9_])/iu,
reception:/(?:^|[^а-яёa-z0-9_])(?:при[её]м граждан|личн(?:ый|ого) при[её]м|при[её]м жителей|пров[её]л[аи]? при[её]м)(?=$|[^а-яёa-z0-9_])/iu,
appeal:/(?:^|[^а-яёa-z0-9_])(?:обращени[еяй]|жалоб[а-я]*|заявлени[еяй] жителей|по просьбе жителей)(?=$|[^а-яёa-z0-9_])/iu,
result:/(?:^|[^а-яёa-z0-9_])(?:добил(?:ся|ась|ись)|удалось решить|вопрос реш[её]н|устранен[а-я]*|устран[её]н[а-я]*|работы завершен[а-я]*|ремонт завершен[а-я]*|выполнен[а-я]* работы)(?=$|[^а-яёa-z0-9_])/iu,
plan:/(?:^|[^а-яёa-z0-9_])(?:планирую|планируем|предстоит|намерен[а-я]*|обещаю|будем проводить|состоится|запланирован[а-я]*)(?=$|[^а-яёa-z0-9_])/iu,
personal:/(?:^|[^а-яёa-z0-9_])(?:мой день рождени[яе]|у меня сегодня день рождени[яе]|мо[ия] родител[ьи]|мои дети|мо[яию] семь[яю]|с семь[её]й|семейный отдых|в отпуске|в отпуск|мой отпуск|отдыхаю|отдыхал[аи]?|мо[её] хобби|мой кот|моя собак[а-я]*|мои друзья|с друзьями|на даче|выходные с семь[её]й|личн(?:ая|ое|ые) (?:истори[яи]|фото|впечатлени[яе]))(?=$|[^а-яёa-z0-9_])/iu,
information:/(?:^|[^а-яёa-z0-9_])(?:информируем|информирую|информирует|сообщаем|сообщаю|сообщает|вниманию жителей|доводим до сведения|обращаем внимание|обратите внимание|важная информация|полезная информация|справочн[а-я]* информаци[а-я]*|напоминаем|напоминаю|напоминает|разъясняем|памятк[а-я]*|график работы|режим работы|расписани[ея]|порядок (?:подачи|получения|обращения|оформления)|сроки (?:подачи|приема|приёма|регистрации)|контактн[а-я]* данн[а-я]*|отключени[ея] (?:воды|электроэнергии|тепла)|изменени[ея] (?:маршрута|движения)|опубликован[а-я]* (?:график|расписание|информация|памятка))(?=$|[^а-яёa-z0-9_])/iu,
announcement:/(?:^|[^а-яёa-z0-9_])(?:анонс[а-я]*|приглаша(?:ем|ю|ет|ют)|жд[её]м вас|будем рады видеть|состоится|пройд[её]т|планируется проведение|ожидается проведение|открыта регистрация|регистрация открыта|записывайтесь|записаться на (?:мероприятие|встречу|при[её]м)|предстоящ[а-я]* (?:встреч[а-я]*|мероприяти[а-я]*|концерт[а-я]*|собрани[а-я]*|при[её]м[а-я]*|праздник[а-я]*)|(?:завтра|послезавтра) (?:состоится|пройд[её]т|провед[её]м))(?=$|[^а-яёa-z0-9_])/iu
};
const future=/(?:^|[^а-яёa-z0-9_])(?:планирую|планируем|планируется|состоится|завтра|на следующей неделе|предстоит|будем|приглашаю|приглашаем|запланирован[а-я]*)(?=$|[^а-яёa-z0-9_])/iu;
const negate=/(?:^|[^а-яёa-z0-9_])(?:не состоял[а-я]*|не проводил[а-я]*|не удалось|отмен[её]н[а-я]*)(?=$|[^а-яёa-z0-9_])/iu;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function extract(text){
 const sentences=String(text||"").split(/(?<=[.!?\n])\s+|\n+/u).filter(Boolean),hits=[];
 const residentMeeting=/(?:встретил[а-яё]*ся|встреч[а-яё]*|обсудил[а-яё]*)[^.!?\n]{0,90}(?:с\s+жител|с\s+избирател)|(?:с\s+жител|с\s+избирател)[^.!?\n]{0,90}встреч/iu;
 const councilCommittee=/заседани[а-яё]*\s+(?:[а-яё-]+\s+){0,3}(?:комисси[а-яё]*|комитет[а-яё]*|рабоч[а-яё]*\s+групп[а-яё]*)/iu;
 for(const sentence of sentences){
  const t=sentence.trim();if(!t)continue;
  const uncertain=future.test(t)||negate.test(t);
  const councilMention=rules.council.test(t)&&!councilCommittee.test(t);
  const heldCouncil=councilMention&&!uncertain;
  for(const [key,re] of Object.entries(rules)){
   if(key==="council"&&!heldCouncil)continue; // An announcement or cancelled session is not a held session.
   if(heldCouncil&&(key==="event"||(key==="meet"&&!residentMeeting.test(t))))continue;
   // «Обсудили» само по себе — не доказательство личной встречи.
   if(key==="meet"&&/обсудил[аи]?/iu.test(t)&&!residentMeeting.test(t)
     &&!/(?:встретил(?:ся|ась|ись)|встреч[аиуеой]|пообщал(?:ся|ась|ись))/iu.test(t))continue;
   if(re.test(t))hits.push({key,evidence:t.slice(0,300),certainty:uncertain?"requires_review":"possible"});
  }
 }
 return hits;
}
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

const icons={council:"🏛️",meet:"🤝",walk:"🚶",inspect:"🛠️",event:"🎉",reception:"🗣️",appeal:"📨",result:"✅",plan:"📅",personal:"👤",information:"ℹ️",announcement:"📣",repost:"🔁",uncategorized:"🏷️"};
let manualRuns=0,activeCategory=null,visibleLimit=60;
let aiDataset=null,aiMessage="Загрузка ИИ…";
function aiIdentity(r){return [r.profile??"",r.url??"",r.date??""].map(String).join("\u001f")}
function aiSignature(r){let h=2166136261;for(const ch of aiIdentity(r)+"\u001f"+String(r.text??""))h=Math.imul(h^ch.codePointAt(0),16777619)>>>0;return h.toString(16).padStart(8,"0")}
function getAiResult(r){
 if(!aiDataset||aiDataset.taxonomy_version!==2||!["ready","partial"].includes(aiDataset.status))return null;
 const item=aiDataset.posts?.[aiIdentity(r)];
 return item?.signature===aiSignature(r)&&Array.isArray(item.categories)?item:null;
}
async function loadAiDataset(){
 try{
  const response=await fetch("./ai-analysis.json?t="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(!data||typeof data.posts!=="object")throw Error("неверный формат");
  aiDataset=data;
  if(data.taxonomy_version!==2)aiMessage="ИИ обновляет классификацию по 14 категориям. Пока показываются предварительные правила.";
  else if(data.status==="ready")aiMessage="Классификация GigaChat доступна. Последнее обновление: "+String(data.generated_at||"нет даты")+".";
  else if(data.status==="partial")aiMessage="ИИ обработал часть публикаций, остальные — по правилам. Категория заседаний Совета депутатов будет пополняться по мере переанализа. Последнее обновление: "+String(data.generated_at||"нет даты")+".";
  else if(data.status==="no_posts")aiMessage="Обработка ИИ настроена, но общей ленте пока нет текстов публикаций.";
  else aiMessage="ИИ ещё не подключён. Нужен секрет GIGACHAT_AUTH_KEY в GitHub. Пока используются правила.";
 }catch(e){aiMessage="Результаты ИИ недоступны; работают правила."}
 render(false);
}

function safeUrl(url){const raw=String(url||"").trim();if(!/^https?:\/\//i.test(raw))return "";try{const u=new URL(raw);return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch(e){return ""}}
function dateOnly(date){return String(date||"").slice(0,10)}
function formatDate(date){const value=dateOnly(date);const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);return m?m[3]+"."+m[2]+"."+m[1]:value||"Дата не указана"}
const hasText=r=>String(r.text||"").trim().length>0;
function posts(){const list=rows();return (Array.isArray(list)?list:[]).filter(r=>r&&typeof r==="object")}
function isRepost(r){
 return Boolean(window.dmRepostDetection&&window.dmRepostDetection.isRepost(r));
}
function makePost(r,index){
 const ai=getAiResult(r);
 let hits;
 if(ai&&ai.method==="ai"){
  hits=[...new Set(ai.categories)].filter(k=>k!=="uncategorized"&&Object.prototype.hasOwnProperty.call(labels,k)).map(k=>({
   key:k,evidence:String(ai.evidence||r.text||"").slice(0,300),
   explanation:String(ai.explanation||"").slice(0,180),
   confidence:Math.max(0,Math.min(1,Number(ai.confidence)||0)),
   certainty:Number(ai.confidence)>=0.7?"ai":"ai_review",method:"ai"
  }));
 }else hits=hasText(r)?extract(r.text):[];
 if(isRepost(r)&&!hits.some(hit=>hit.key==="repost"))hits.push({key:"repost",evidence:hasText(r)?String(r.text).slice(0,300):"Репост в метаданных источника",certainty:"possible",method:"metadata"});
 return {...r,_id:index,_hits:hits,_name:rosterName(r.profile),_aiUsed:Boolean(ai&&ai.method==="ai")};
}
function inCategory(post,key){return key==="uncategorized"?post._hits.length===0:post._hits.some(hit=>hit.key===key)}
function render(manual=false){
 const who=document.getElementById("activity-person").value;
 const start=document.getElementById("activity-from").value;
 const end=document.getElementById("activity-to").value;
 if(who==="all")activeCategory=null;
 const all=posts();
 const filtered=all.filter(r=>(who==="all"||normalizeName(rosterName(r.profile))===normalizeName(who)||normalizeName(r.profile)===normalizeName(who))&&(!start||dateOnly(r.date)>=start)&&(!end||dateOnly(r.date)<=end))
  .map(makePost).sort((a,b)=>dateOnly(b.date).localeCompare(dateOnly(a.date))||a._id-b._id);
 const usable=filtered.filter(hasText);
 const aiCount=filtered.filter(r=>r._aiUsed).length;
 const results=[];
 for(const r of filtered)for(const hit of r._hits)results.push({...hit,profile:r.profile,url:r.url,date:r.date,_id:r._id});
 const counts={};
 for(const key of Object.keys(labels))counts[key]=filtered.filter(r=>inCategory(r,key)).length;
 const personal=who!=="all";
 document.getElementById("activity-cards").innerHTML=Object.entries(labels).map(([key,label])=>{
  const content='<span class="activity-cat-icon" aria-hidden="true">'+icons[key]+'</span><span class="label">'+esc(label)+'</span><span class="value">'+counts[key]+'</span><span class="hint">'+(personal?'Нажмите для просмотра':'Выберите одного депутата')+'</span>';
  return personal?'<button type="button" class="kpi activity-category'+(activeCategory===key?' is-active':'')+'" data-activity-category="'+key+'" aria-pressed="'+(activeCategory===key?'true':'false')+'" aria-label="'+esc(label)+': '+counts[key]+' публикаций">'+content+'</button>':'<div class="kpi activity-category is-disabled">'+content+'</div>';
 }).join("");
 const selected=activeCategory?filtered.filter(r=>inCategory(r,activeCategory)):filtered;
 const matchedResults=activeCategory==="uncategorized"
  ? selected.map(r=>({key:"uncategorized",certainty:"uncategorized",evidence:hasText(r)?String(r.text).trim().slice(0,300):"Текст публикации не получен",profile:r.profile,url:r.url,date:r.date,_id:r._id,_hasText:hasText(r)}))
  : activeCategory?results.filter(x=>x.key===activeCategory):results;
 const resultHTML=matchedResults.slice(0,150).map(r=>'<tr><td>'+esc(formatDate(r.date))+'</td><td>'+esc(rosterName(r.profile))+'</td><td>'+esc(labels[r.key])+'</td><td>'+esc(r.certainty==="uncategorized"?(r._hasText?"Тема не определена":"Нет текста"):r.certainty==="ai"?"ИИ · предварительно":r.certainty==="ai_review"?"ИИ · проверить":r.certainty==="possible"?"По правилам":"Требует проверки")+'</td><td>'+esc(r.evidence)+(r.explanation?'<div class="activity-ai-explanation">🤖 ИИ · уверенность '+Math.round(Number(r.confidence||0)*100)+'% · '+esc(r.explanation)+'</div>':'')+'</td><td>'+(safeUrl(r.url)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(r.url))+'">Источник ↗</a>':"Нет ссылки")+(personal?' <button type="button" class="activity-open-post" data-activity-open="'+r._id+'">Публикация ↓</button>':"")+'</td></tr>').join("");
 document.getElementById("activity-results").innerHTML=resultHTML||'<tr><td colspan="6" class="empty">Подходящих фраз нет. Это не означает отсутствие депутатской деятельности.</td></tr>';
 const selectedLabel=activeCategory?labels[activeCategory]:"Все категории";
 const selectedInfo=document.getElementById("activity-selected-category");
 selectedInfo.textContent=personal?("Выбрано: "+selectedLabel+". Публикаций в категории: "+selected.length+"."):"Выберите одного депутата, чтобы включить фильтры категорий и просмотреть публикации.";
 document.getElementById("activity-category-reset").hidden=!personal||!activeCategory;
 const box=document.getElementById("activity-posts");
 const count=document.getElementById("activity-post-count");
 const more=document.getElementById("activity-post-more");
 if(!personal){
   box.innerHTML='<p class="small">Выберите одного депутата выше, чтобы открыть его публикации по категориям.</p>';
   count.textContent="";more.hidden=true;
 }else{
   count.textContent="Найдено публикаций: "+selected.length+" · Категория: "+selectedLabel+(selected.length>visibleLimit?" · показаны первые "+visibleLimit:"");
   box.innerHTML=selected.slice(0,visibleLimit).map(r=>{
    const url=safeUrl(r.url);
    const fullText=String(r.text||"").trim();
    const hits=Array.from(new Set(r._hits.map(h=>h.key)));
    const badge=hits.length?hits.map(k=>'<span class="activity-topic">'+icons[k]+' '+esc(labels[k])+'</span>').join(" "):'<span class="activity-topic">🏷️ Без темы'+(!fullText?" · нет текста":"")+'</span>';
    const aiHit=r._hits.find(hit=>hit.method==="ai");
    const aiNote=aiHit?'<div class="activity-ai-explanation">🤖 ИИ · уверенность '+Math.round(Number(aiHit.confidence||0)*100)+'% · '+esc(aiHit.explanation)+'</div>':"";
    const preview=(fullText||"Текст публикации не получен").replace(/\s+/g," ").slice(0,115);
    return '<details class="activity-post" id="activity-post-'+r._id+'"><summary><span class="activity-post-date">'+esc(formatDate(r.date))+'</span> · '+esc(preview)+(preview.length>=115?"…":"")+'</summary><div class="activity-post-body"><div class="activity-post-tags">'+badge+'</div>'+aiNote+'<p class="activity-post-text">'+esc(fullText||"Текст публикации недоступен. Сведения о её содержании автоматически не получены.")+'</p>'+(url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Открыть оригинал публикации ↗</a>':'<span class="small">Ссылка на оригинал отсутствует</span>')+'</div></details>';
   }).join("")||'<p class="small">Публикаций по выбранным параметрам нет. Это не означает отсутствие деятельности.</p>';
   more.hidden=selected.length<=visibleLimit;
 }
 let reason="";
 const allTexts=all.filter(hasText).length;
 document.getElementById("activity-ai-status").textContent="🤖 "+aiMessage+" В выбранном наборе: обработано ИИ — "+aiCount+", по правилам — "+(filtered.length-aiCount)+".";
 if(!all.length)reason="В ленте нет доступных публикаций. Для автоматического сбора из VK требуется доступ к API.";
 else if(!allTexts)reason="Доступны ссылки, но нет текстов: определить категории по ссылке невозможно.";
 else if(!filtered.length)reason="По выбранному депутату и датам записей нет.";
 else if(!usable.length)reason="У выбранного депутата нет полученных текстов для анализа.";
 else if(!results.length)reason="В доступных текстах не обнаружены формулировки тематических категорий. Такие публикации доступны в разделе «Без темы».";
 else reason="Категории предварительные, это упоминания в текстах, а не подтверждённые мероприятия. «Без темы» означает отсутствие распознанной темы или текста. «Репосты» определяются по признакам перепубликации, не по числу репостов.";
 if(manual)manualRuns++;
 const stamp=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
 document.getElementById("activity-summary").textContent=(manual?"Проверка №"+manualRuns+" выполнена в ":"Анализ обновлён в ")+stamp+". Публикаций в ленте: "+all.length+"; для выбранного депутата и периода: "+filtered.length+"; с текстом: "+usable.length+"; с ИИ: "+aiCount+"; признаков: "+results.length+". "+reason+(matchedResults.length>150?" В таблице показаны первые 150 совпадений.":"");
}
document.addEventListener("DOMContentLoaded",()=>{
 const sel=document.getElementById("activity-person");if(!sel)return;
 for(const person of directoryOptions()){const o=document.createElement("option");o.value=person.name;o.textContent=person.name+" — "+person.district;sel.appendChild(o)}
 document.getElementById("activity-from").value="";
 document.getElementById("activity-to").value="";
 document.getElementById("activity-run").addEventListener("click",()=>render(true));
 sel.addEventListener("change",()=>{activeCategory=null;visibleLimit=60;render()});
 for(const id of ["activity-from","activity-to"])document.getElementById(id).addEventListener("change",()=>{visibleLimit=60;render()});
 document.getElementById("activity-cards").addEventListener("click",event=>{
  const b=event.target.closest("[data-activity-category]");
  if(!b||sel.value==="all")return;
  activeCategory=activeCategory===b.dataset.activityCategory?null:b.dataset.activityCategory;
  visibleLimit=60;render();
 });
 document.getElementById("activity-category-reset").addEventListener("click",()=>{activeCategory=null;visibleLimit=60;render()});
 document.getElementById("activity-post-more").addEventListener("click",()=>{visibleLimit+=60;render()});
 document.getElementById("activity-results").addEventListener("click",event=>{
  const b=event.target.closest("[data-activity-open]");
  if(!b)return;
  const id="activity-post-"+b.dataset.activityOpen;
  let target=document.getElementById(id);
  if(!target){visibleLimit=Number.MAX_SAFE_INTEGER;render();target=document.getElementById(id)}
  if(target){target.open=true;target.scrollIntoView({behavior:"smooth",block:"center"})}
 });
 document.addEventListener("dm-publications-updated",()=>render(false));
 loadAiDataset();
 render(false);
});
})();

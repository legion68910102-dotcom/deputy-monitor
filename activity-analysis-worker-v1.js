"use strict";
const window=self;
importScripts("./activity-category-policy-v1.js","./repost-detection-v131.js");
const activityPolicy=self.dmActivityCategoryPolicy||null;
let aiDataset=null;
const rosterName=p=>p;
const labels={council:"Заседания Совета депутатов",meet:"Личные встречи",walk:"Обходы территорий",inspect:"Приёмка и контроль работ",event:"Участие в мероприятиях",humanitarian:"Гуманитарная помощь",reception:"Приёмы граждан",appeal:"Работа с обращениями",result:"Решённые вопросы",plan:"Планы и обещания",personal:"Личные",information:"Информационные",announcement:"Публикации-анонсы",repost:"Репосты",uncategorized:"Без темы"};
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
announcement:/(?:^|[^а-яёa-z0-9_])(?:анонс[а-я]*|приглаша(?:ем|ю|ет|ют)|жд[её]м вас|будем рады видеть|состоится|пройд[её]т|планируется проведение|ожидается проведение|открыта регистрация|регистрация открыта|записывайтесь|записаться на (?:мероприятие|встречу|при[её]м)|предстоящ[а-я]* (?:встреч[а-я]*|мероприяти[а-я]*|концерт[а-я]*|собрани[а-я]*|при[её]м[а-я]*|праздник[а-я]*)|(?:завтра|послезавтра) (?:состоится|пройд[её]т|провед[её]м|начн[её]тся))(?=$|[^а-яёa-z0-9_])/iu
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
   if(key==="event"&&activityPolicy&&!activityPolicy.hasConfirmedEvent(t))continue; // A walk or generic participation is not a festive event.
   if(heldCouncil&&(key==="event"||(key==="meet"&&!residentMeeting.test(t))))continue;
   // «Обсудили» само по себе — не доказательство личной встречи.
   if(key==="meet"&&/обсудил[аи]?/iu.test(t)&&!residentMeeting.test(t)
     &&!/(?:встретил(?:ся|ась|ись)|встреч[аиуеой]|пообщал(?:ся|ась|ись))/iu.test(t))continue;
   if(re.test(t))hits.push({key,evidence:t.slice(0,300),certainty:uncertain?"requires_review":"possible"});
  }
 }
 if(!activityPolicy)return hits;
 const normalized=activityPolicy.normalizeCategories(hits.map(h=>h.key),text);
 const verified=hits.filter(h=>normalized.includes(h.key));
 for(const key of normalized){
  if(!verified.some(hit=>hit.key===key))verified.push({key,evidence:String(text||"").slice(0,300),certainty:"possible",method:"policy"});
 }
 return verified;
}
function aiIdentity(r){return [r.profile??"",r.url??"",r.date??""].map(String).join("\u001f")}
function aiSignature(r){let h=2166136261;for(const ch of aiIdentity(r)+"\u001f"+String(r.text??""))h=Math.imul(h^ch.codePointAt(0),16777619)>>>0;return h.toString(16).padStart(8,"0")}
function getAiResult(r){
 if(!aiDataset||aiDataset.taxonomy_version!==2||!["ready","partial"].includes(aiDataset.status))return null;
 const item=aiDataset.posts?.[aiIdentity(r)];
 return item?.signature===aiSignature(r)&&Array.isArray(item.categories)?item:null;
}
const hasText=r=>String(r.text||"").trim().length>0;
function isRepost(r){
 return Boolean(window.dmRepostDetection&&window.dmRepostDetection.isRepost(r));
}
function makePost(r,index){
 const ai=getAiResult(r);
 let hits;
 if(ai&&ai.method==="ai"){
  hits=[...new Set(activityPolicy?activityPolicy.normalizeCategories(ai.categories,r.text,{repost:isRepost(r)}):ai.categories)].filter(k=>k!=="uncategorized"&&Object.prototype.hasOwnProperty.call(labels,k)).map(k=>({
   key:k,evidence:String(ai.evidence||r.text||"").slice(0,300),
   explanation:(ai.methodology_version===1?String(ai.explanation||""):"Ожидается повторный анализ по утверждённой методике. "+String(ai.explanation||"")).slice(0,180),
   confidence:Math.max(0,Math.min(1,Number(ai.confidence)||0)),
   certainty:ai.methodology_version===1&&Number(ai.confidence)>=0.7?"ai":"ai_review",method:"ai"
  }));
 }else hits=hasText(r)?extract(r.text):[];
 if(isRepost(r)&&!hits.some(hit=>hit.key==="repost"))hits.push({key:"repost",evidence:hasText(r)?String(r.text).slice(0,300):"Репост в метаданных источника",certainty:"possible",method:"metadata"});
 return {...r,_id:index,_hits:hits,_name:rosterName(r.profile),_aiUsed:Boolean(ai&&ai.method==="ai")};
}

self.onmessage=e=>{const {id,kind,data,items}=e.data;try{if(kind==="dataset"){aiDataset=data;self.postMessage({id,ok:true});return}const results=items.map((r,i)=>{const p=makePost(r,i);return {hits:p._hits,aiUsed:p._aiUsed}});self.postMessage({id,results})}catch(error){self.postMessage({id,error:String(error.message||error)})}};

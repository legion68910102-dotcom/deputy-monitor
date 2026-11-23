/* Shared policy for GigaChat output and on-device fallback. No network or secrets. */
(function(root,factory){
 const policy=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=policy;
 if(root)root.dmActivityCategoryPolicy=policy;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 // Events are STRICTLY forums, congresses, festivals and festive/entertainment events.
 // Generic "took part" or "public activity" never proves the event category.
 const topic=/(?:форум[а-яё]*|съезд[а-яё]*|праздник[а-яё]*|праздновани[а-яё]*|праздничн[а-яё]*\s+(?:[а-яё-]+\s+){0,2}мероприяти[а-яё]*|торжественн[а-яё]*\s+мероприяти[а-яё]*|увеселительн[а-яё]*\s+мероприяти[а-яё]*|развлекательн[а-яё]*\s+(?:[а-яё-]+\s+){0,2}мероприяти[а-яё]*|культурно-развлекательн[а-яё]*\s+мероприяти[а-яё]*|фестивал[а-яё]*|концерт[а-яё]*|карнавал[а-яё]*|народн[а-яё]*\s+гулян[а-яё]*|спектакл[а-яё]*|театральн[а-яё]*\s+представлени[а-яё]*|праздничн[а-яё]*\s+(?:программ[а-яё]*|вечер[а-яё]*|шоу))/iu;
 const qualifier=/(?:(?:районн|городск|международн|всероссийск|ежегодн|праздничн|культурн|новогодн|благотворительн|детск|торжественн|массов|семейн|традиционн|молод[её]жн|партийн)[а-яё-]*\s+){0,4}/iu;
 const attend=/(?:принял[аи]?\s+участи[её]|принимал[аи]?\s+участи[её]|поучаствовал[аи]?|участвовал[аи]?|посетил[аи]?|побывал[аи]?|выступил[аи]?|присутствовал[аи]?|организовал[аи]?|пров[её]л[аи]?|открыл[аи]?|праздновал[аи]?|отметил[аи]?)/iu;
 const direct=new RegExp(attend.source+"\\s+(?:(?:в|во|на|к)\\s+)?"+qualifier.source+topic.source,"iu");
 const reverse=new RegExp("(?:на|в|во)\\s+"+qualifier.source+topic.source+"[^.!?;\\n]{0,75}(?:выступил[аи]?|принял[аи]?\\s+участи[её]|участвовал[аи]?|побывал[аи]?|присутствовал[аи]?|праздновал[аи]?|поздравил[аи]?)","iu");
 const future=/(?:завтра|послезавтра|состоится|пройд[её]т|планиру(?:ю|ем|ется)|приглаша(?:ю|ем|ет|ют)|анонсир[а-яё]*|запланирован[а-яё]*|будет проходить|предстоящ[а-яё]*|открыта регистрация)/iu;
 const cancellation=/(?:отмен[её]н|не состоял|не участвовал|не посетил|не проводил)/iu;
 const walk=/(?:обход[а-яё]*\s+(?:[а-яё-]+\s+){0,3}(?:территори[а-яё]*|двор[а-яё]*|район[а-яё]*)|(?:пров[её]л[аи]?|совершил[аи]?|участвовал[аи]?\s+в|участи[её]\s+в)\s+обход[а-яё]*|обош[её]л[аи]?\s+(?:двор[а-яё]*|район[а-яё]*|территори[а-яё]*)|осмотр[а-яё]*\s+территори[а-яё]*|прош[её]л[аи]?\s+по\s+двор[а-яё]*)/iu;
 const heldWalk=/(?:сегодня|вчера|пров[её]л[аи]?|совершил[аи]?|по итогам|в ходе|прош[её]л[аи]?|участвовал[аи]?|проверили|осмотрели)/iu;
 // User-defined additional semantics: district volunteer cleanups are events;
 // a head-of-district-administration round is a round, not an event.
 const cleanup=/субботник[а-яё]*/iu;
 const cleanupParticipation=/(?:принял[аи]?\s+участи[её]|участвовал[аи]?|выш[её]л[аи]?|выходил[аи]?|присоединил[а-яё]*|организовал[аи]?|пров[её]л[аи]?|провели|убирал[аи]?|убирали)[^.!?;\n]{0,80}субботник[а-яё]*|субботник[а-яё]*[^.!?;\n]{0,70}(?:провели|участвовал[аи]?|принял[аи]?\s+участи[её]|выш[её]л[аи]?|убирали|присоединил[а-яё]*)/iu;
 const headRound=/(?:обход[а-яё]*\s+(?:глав[а-яё]*\s+управ[а-яё]*|с\s+глав[а-яё]*\s+управ[а-яё]*|совместно\s+с\s+глав[а-яё]*\s+управ[а-яё]*)|(?:с\s+глав[а-яё]*\s+управ[а-яё]*|совместно\s+с\s+глав[а-яё]*\s+управ[а-яё]*)[^.!?;\n]{0,65}обход[а-яё]*)/iu;
 const capitalRepair=/(?:ход[а-яё]*\s+капитальн[а-яё]*\s+ремонт[а-яё]*|ход[а-яё]*\s+капремонт[а-яё]*|(?:провер[а-яё]*|контрол[а-яё]*|инспектир[а-яё]*|при[её]мк[а-яё]*|осмотр[а-яё]*)[^.!?;\n]{0,70}(?:капитальн[а-яё]*\s+ремонт[а-яё]*|капремонт[а-яё]*))/iu;
 const heldRepair=/(?:провер[а-яё]*|контрол[а-яё]*|осмотр[а-яё]*|инспектир[а-яё]*|проинспектир[а-яё]*|обсудили\s+ход|в\s+ходе\s+проверки|побывал[аи]?)/iu;
 const personalTopics=/(?:прогулял[а-яё]*ся|прогулк[а-яё]*\s+(?:по|в|на)|путешеств[а-яё]*|съездил[аи]?\s+в\s+(?:друг[а-яё]*\s+)?город[а-яё]*|поехал[аи]?\s+в\s+друг[а-яё]*\s+город[а-яё]*|посетил[аи]?\s+(?:музей[а-яё]*|храм[а-яё]*|церков[а-яё]*|монастыр[а-яё]*)|побывал[аи]?\s+в\s+(?:музе[а-яё]*|храм[а-яё]*|церкв[а-яё]*|монастыр[а-яё]*)|ходил[аи]?\s+в\s+(?:музе[а-яё]*|храм[а-яё]*|церкв[а-яё]*)|(?:поехал[аи]?|выбрал[а-яё]*ся|выехал[аи]?|собрал[а-яё]*ся)\s+на\s+шашлык[а-яё]*|(?:шашлык[а-яё]*\s+с\s+(?:семь[еёй]|друзьями))|(?:съездил[аи]?|выехал[аи]?|поехал[аи]?|отдыха[а-яё]*|работал[аи]?)\s+на\s+дач[а-яё]*|сбор[а-яё]*\s+урожа[а-яё]*|собрал[аи]?\s+урожай|вырастил[аи]?\s+(?:помидор[а-яё]*|огурц[а-яё]*|ягод[а-яё]*)|домашн[а-яё]*\s+животн[а-яё]*|(?:мой|моя|мо[её]|наши|наш|наша)\s+(?:кот[а-яё]*|кошк[а-яё]*|собак[а-яё]*|питом[а-яё]*|сын[а-яё]*|доч[а-яё]*|дет[а-яё]*)|(?:с\s+детьми|воспитан[а-яё]*\s+детей|дет[а-яё]*\s+подрастают))/iu;
 const officialWork=/(?:на\s+(?:рабоч[а-яё]*|депутатск[а-яё]*)\s+(?:встреч[а-яё]*|мероприяти[а-яё]*|визит[а-яё]*)|в\s+рамках\s+(?:депутатск[а-яё]*|служебн[а-яё]*)|при[её]м\s+граждан|по\s+обращени[а-яё]*\s+жител[а-яё]*|провер[а-яё]*\s+ход[а-яё]*\s+работ[а-яё]*|капремонт[а-яё]*)/iu;

 function sentences(text){return String(text||"").split(/(?<=[.!?])\s+|\n+|;\s*/u).map(s=>s.trim()).filter(Boolean)}
 function hasConfirmedEvent(text){
  return sentences(text).some(s=>{
   if(cancellation.test(s))return false;
   // An invitation or forecast is NOT participation in a completed event.
   if(future.test(s)&&!/(?:сегодня|вчера|уже\s+(?:посетил|прош[её]л|принял участие)|накануне)/iu.test(s))return false;
   return direct.test(s)||reverse.test(s)||(cleanup.test(s)&&cleanupParticipation.test(s));
  });
 }
 function hasActualWalk(text){
  return sentences(text).some(s=>(walk.test(s)||headRound.test(s))&&!cancellation.test(s)&&(!future.test(s)||heldWalk.test(s)));
 }
 function hasCapitalRepairInspection(text){
  return sentences(text).some(s=>capitalRepair.test(s)&&!cancellation.test(s)&&(!future.test(s)||heldRepair.test(s)));
 }
 function hasPersonalStory(text){
  return sentences(text).some(s=>personalTopics.test(s)&&!officialWork.test(s)&&!future.test(s));
 }
 function normalizeCategories(categories,text,{repost=false}={}){
  const out=[...new Set(Array.isArray(categories)?categories:[])];
  const event=hasConfirmedEvent(text);
  const corrected=out.filter(c=>c!=="event");
  if(event&&!repost)corrected.push("event");
  // A documented territory round is a walk, even when AI mistakenly used "event".
  if(!repost&&hasActualWalk(text)&&!corrected.includes("walk"))corrected.push("walk");
  if(!repost&&hasCapitalRepairInspection(text)&&!corrected.includes("inspect"))corrected.push("inspect");
  if(!repost&&hasPersonalStory(text)&&!corrected.includes("personal"))corrected.push("personal");
  return [...new Set(corrected)];
 }
 return {hasConfirmedEvent,hasActualWalk,hasCapitalRepairInspection,hasPersonalStory,normalizeCategories,version:2};
});

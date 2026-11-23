/* Shared policy for GigaChat output and on-device fallback. No network or secrets. */
(function(root,factory){
 const policy=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=policy;
 if(root)root.dmActivityCategoryPolicy=policy;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 // Events are STRICTLY forums, congresses, festivals and festive/entertainment events.
 // Generic "took part" or "public activity" never proves the event category.
 const topic=/(?:форум[а-яё]*|съезд[а-яё]*|праздник[а-яё]*|праздновани[а-яё]*|праздничн[а-яё]*\s+(?:[а-яё-]+\s+){0,2}мероприяти[а-яё]*|увеселительн[а-яё]*\s+мероприяти[а-яё]*|развлекательн[а-яё]*\s+(?:[а-яё-]+\s+){0,2}мероприяти[а-яё]*|культурно-развлекательн[а-яё]*\s+мероприяти[а-яё]*|фестивал[а-яё]*|концерт[а-яё]*|карнавал[а-яё]*|народн[а-яё]*\s+гулян[а-яё]*|спектакл[а-яё]*|театральн[а-яё]*\s+представлени[а-яё]*|праздничн[а-яё]*\s+(?:программ[а-яё]*|вечер[а-яё]*|шоу))/iu;
 const qualifier=/(?:(?:районн|городск|международн|всероссийск|ежегодн|праздничн|культурн|новогодн|благотворительн|детск|торжественн|массов|семейн|традиционн|молод[её]жн|партийн)[а-яё-]*\s+){0,4}/iu;
 const attend=/(?:принял[аи]?\s+участи[её]|поучаствовал[аи]?|участвовал[аи]?|посетил[аи]?|побывал[аи]?|выступил[аи]?|присутствовал[аи]?|организовал[аи]?|пров[её]л[аи]?|открыл[аи]?|праздновал[аи]?|отметил[аи]?)/iu;
 const direct=new RegExp(attend.source+"\\s+(?:(?:в|во|на|к)\\s+)?"+qualifier.source+topic.source,"iu");
 const reverse=new RegExp("(?:на|в|во)\\s+"+qualifier.source+topic.source+"[^.!?;\\n]{0,75}(?:выступил[аи]?|принял[аи]?\\s+участи[её]|участвовал[аи]?|побывал[аи]?|присутствовал[аи]?|праздновал[аи]?|поздравил[аи]?)","iu");
 const future=/(?:завтра|послезавтра|состоится|пройд[её]т|планиру(?:ю|ем|ется)|приглаша(?:ю|ем|ет|ют)|анонсир[а-яё]*|запланирован[а-яё]*|будет проходить|предстоящ[а-яё]*|открыта регистрация)/iu;
 const cancellation=/(?:отмен[её]н|не состоял|не участвовал|не посетил|не проводил)/iu;
 const walk=/(?:обход[а-яё]*\s+(?:[а-яё-]+\s+){0,3}(?:территори[а-яё]*|двор[а-яё]*|район[а-яё]*)|(?:пров[её]л[аи]?|совершил[аи]?|участвовал[аи]?\s+в|участи[её]\s+в)\s+обход[а-яё]*|обош[её]л[аи]?\s+(?:двор[а-яё]*|район[а-яё]*|территори[а-яё]*)|осмотр[а-яё]*\s+территори[а-яё]*|прош[её]л[аи]?\s+по\s+двор[а-яё]*)/iu;
 const heldWalk=/(?:сегодня|вчера|пров[её]л[аи]?|совершил[аи]?|по итогам|в ходе|прош[её]л[аи]?|участвовал[аи]?|проверили|осмотрели)/iu;
 function sentences(text){return String(text||"").split(/(?<=[.!?])\s+|\n+|;\s*/u).map(s=>s.trim()).filter(Boolean)}
 function hasConfirmedEvent(text){
  return sentences(text).some(s=>{
   if(cancellation.test(s))return false;
   // An invitation or forecast is NOT participation in a completed event.
   if(future.test(s)&&!/(?:сегодня|вчера|уже\s+(?:посетил|прош[её]л|принял участие)|накануне)/iu.test(s))return false;
   return direct.test(s)||reverse.test(s);
  });
 }
 function hasActualWalk(text){
  return sentences(text).some(s=>walk.test(s)&&!cancellation.test(s)&&(!future.test(s)||heldWalk.test(s)));
 }
 function normalizeCategories(categories,text,{repost=false}={}){
  const out=[...new Set(Array.isArray(categories)?categories:[])];
  const event=hasConfirmedEvent(text);
  const corrected=out.filter(c=>c!=="event");
  if(event&&!repost)corrected.push("event");
  // A documented territory round is a walk, even when AI mistakenly used "event".
  if(!repost&&hasActualWalk(text)&&!corrected.includes("walk"))corrected.push("walk");
  return [...new Set(corrected)];
 }
 return {hasConfirmedEvent,hasActualWalk,normalizeCategories,version:1};
});

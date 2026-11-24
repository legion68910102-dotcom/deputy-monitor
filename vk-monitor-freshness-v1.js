/* Shared browser/Node view of actual VK API collection freshness.
   This module never claims a browser fetch of GitHub Pages is a new VK collection. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.dmVkFreshness=api;
})(typeof window==="object"?window:null,function(){
 "use strict";
 const STALE_AFTER_MS=36*60*60*1000;
 function summarize(monitor,posts,now=Date.now()){
  const profiles=monitor&&typeof monitor.profiles==="object"?Object.values(monitor.profiles):[];
  const successful=profiles.filter(p=>p&&p.status==="success").length;
  const checked=profiles.filter(p=>p&&p.checked_at&&["success","checked_unavailable"].includes(p.status)).length;
  const unavailable=profiles.filter(p=>p&&p.status==="checked_unavailable").length;
  const needToken=profiles.filter(p=>p&&p.status==="needs_token").length;
  const summary=(posts&&posts.vk_api_last_run)||(monitor&&monitor.vk_api_last_run)||null;
  const lastChecked=(posts&&posts.vk_api_last_checked_at)||(monitor&&monitor.vk_api_last_checked_at)||
   (monitor&&monitor.vk_api_last_run&&monitor.generated_at)||null;
  const stamp=lastChecked?Date.parse(lastChecked):NaN;
  const age=Number.isFinite(stamp)?Math.max(0,now-stamp):null;
  const total=Number(monitor&&monitor.roster_size)||profiles.length||159;
  const postsCount=Array.isArray(posts&&posts.posts)?posts.posts.length:null;
  const dateLabel=Number.isFinite(stamp)?new Date(stamp).toLocaleString("ru-RU",{timeZone:"Europe/Moscow",dateStyle:"short",timeStyle:"short"})+" МСК":"нет данных";
  const base={checked,successful,unavailable,needToken,total,postsCount,age,lastChecked,dateLabel};
  if(!Number.isFinite(stamp))return {...base,state:"not-configured",headline:"VK: автоматический сбор ещё не запускался",
   message:"Сохранённые публикации доступны, но новых проверок VK API нет. Нужен действующий секрет VK_TOKEN в GitHub Actions; расписание уже включено."};
  if(summary&&summary.stopped_reason)return {...base,state:"failed",headline:"VK: сбор остановлен",
   message:"Последняя попытка: "+dateLabel+". Причина: "+String(summary.stopped_reason)+". Ранее полученные записи сохранены."};
  if(age>STALE_AFTER_MS)return {...base,state:"stale",headline:"VK: опубликованные данные устарели",
   message:"Последний опрос VK API: "+dateLabel+". Данные показаны по последнему успешному снимку; сбор VK при открытии страницы не производится."};
  if(checked<total)return {...base,state:"partial",headline:"VK: данные обновлены частично",
   message:"Последний опрос VK API: "+dateLabel+". Проверено "+checked+" из "+total+" профилей; доступно чтение "+successful+" стен."};
  return {...base,state:"current",headline:"VK: опубликован актуальный результат опроса",
   message:"Последний опрос VK API: "+dateLabel+". Проверено "+checked+" из "+total+" профилей, доступны "+successful+" стен; недоступны "+unavailable+"."};
 }
 return {summarize,STALE_AFTER_MS};
});

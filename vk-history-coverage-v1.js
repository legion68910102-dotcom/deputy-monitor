/* Read-only display of saved VK history checkpoints. */
(function(){
"use strict";
function summarize(progress,term){
 const s=progress&&progress.last_run;
 if(!s||!term||progress.term_id!==term.id||progress.start!==term.start||!Array.isArray(term.roster))return null;
 const total=s.roster_size, complete=s.history_complete,pending=s.history_pending,blocked=s.history_blocked,posts=s.archive_posts;
 if(![total,complete,pending,blocked,posts].every(n=>Number.isSafeInteger(n)&&n>=0)||total===0||total!==term.roster.length||complete+pending+blocked!==total)return null;
 const attempts=Object.values(progress.profiles||{}).map(p=>Date.parse(p&&p.last_attempt)).filter(Number.isFinite);
 return {total,complete,pending,blocked,posts,percent:100*complete/total,enabled:progress.enabled===true,stopped:typeof s.stopped_reason==="string"&&s.stopped_reason.length>0,lastAttempt:attempts.length?Math.max(...attempts):null,start:progress.start};
}
function districtSummary(progress,monitor,term,overall){
 if(!overall||!monitor||!monitor.profiles||monitor.roster_size!==overall.total||!progress.profiles||typeof progress.profiles!=="object")return null;
 const groups=new Map(),seen=new Set();
 for(const member of term.roster){
  const {handle,district}=member;
  if(typeof handle!=="string"||!handle||seen.has(handle)||typeof district!=="string"||!district||!Object.prototype.hasOwnProperty.call(monitor.profiles,handle))return null;
  seen.add(handle);
  if(!groups.has(district))groups.set(district,{district,total:0,complete:0,pending:0,blocked:0});
  const g=groups.get(district), state=progress.profiles[handle]?.state, current=monitor.profiles[handle]?.status;
  g.total++;
  if(state==="complete")g.complete++;
  else if(state==="blocked"||current!=="success")g.blocked++;
  else g.pending++;
 }
 const rows=[...groups.values()].sort((a,b)=>a.district.localeCompare(b.district,"ru"));
 if(["total","complete","pending","blocked"].some(k=>rows.reduce((sum,g)=>sum+g[k],0)!==overall[k]))return null;
 return rows.map(g=>({...g,percent:100*g.complete/g.total}));
}
if(typeof module==="object"&&module.exports){module.exports={summarize,districtSummary};return;}
function renderDistricts(host,rows){
 const body=host.querySelector("[data-history-district-rows]"),table=host.querySelector("[data-history-district-table]"),note=host.querySelector("[data-history-district-note]");
 body.replaceChildren();
 if(!rows){table.hidden=true;note.textContent="Районные данные пока недоступны или не совпадают с итогами последнего пакета. Общий прогресс остаётся доступным.";return;}
 for(const g of rows){
  const tr=document.createElement("tr");
  for(const v of [g.district,g.total,g.complete,g.pending,g.blocked,g.percent.toLocaleString("ru-RU",{maximumFractionDigits:1})+"%"]){
   const td=document.createElement("td");td.textContent=String(v);tr.appendChild(td);
  }
  body.appendChild(tr);
 }
 table.hidden=false;note.textContent="Районы по алфавиту. Процент — доля профилей, история которых обработана. Недоступность VK не означает отсутствие деятельности.";
}
function mount(){
 const host=document.getElementById("vk-history-coverage");
 if(!host)return;
 const status=host.querySelector("[data-history-status]"), body=host.querySelector("[data-history-body]"), bar=host.querySelector("[data-history-bar]");
 const set=(key,val)=>{host.querySelector("[data-history-"+key+"]").textContent=val;};
 const fmt=n=>n.toLocaleString("ru-RU");
 let busy=false;
 async function refresh(){
  if(busy)return;busy=true;
  try{
   const response=await fetch("./vk-history-progress.json",{cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const progress=await response.json();
   const data=summarize(progress,window.dmMonitoringTerm);
   if(!data){body.hidden=true;status.textContent="Нет подтверждённых итогов загрузки для текущего периода.";return;}
   const {total,complete,pending,blocked,posts,percent,enabled,stopped,lastAttempt,start}=data;
   const date=start.split("-").reverse().join(".");
   set("period","С "+date+" · "+fmt(total)+" профилей");
   set("complete",fmt(complete));set("pending",fmt(pending));set("blocked",fmt(blocked));set("posts",fmt(posts));
   set("percent",percent.toLocaleString("ru-RU",{maximumFractionDigits:1})+"% профилей");
   for(const [key,value] of [["complete",complete],["pending",pending],["blocked",blocked]])bar.querySelector("[data-segment="+key+"]").style.width=(100*value/total)+"%";
   bar.setAttribute("aria-label","История: "+complete+" завершено, "+pending+" в очереди, "+blocked+" недоступно из "+total);
   set("attempt",lastAttempt===null?"Дата последней попытки не сохранена.":"Последняя попытка чтения: "+new Date(lastAttempt).toLocaleString("ru-RU",{timeZone:"Europe/Moscow",dateStyle:"short",timeStyle:"short"})+" МСК.");
   status.textContent=stopped?"Сбор приостановлен из-за ошибки.":enabled?"Автоматическое продолжение включено.":pending?"Автоматическое продолжение выключено.":blocked?"Очередь доступных профилей обработана; остаются недоступные.":"История всех профилей обработана по правилам сборщика.";
   body.hidden=false;
   renderDistricts(host,null);
   try{const mr=await fetch("./monitor-status.json",{cache:"no-store"});if(mr.ok)renderDistricts(host,districtSummary(progress,await mr.json(),window.dmMonitoringTerm,data));}catch(e){renderDistricts(host,null);}
  }catch(e){body.hidden=true;status.textContent="Не удалось прочитать сохранённый прогресс. Обновите страницу позже.";}
  finally{busy=false;}
 }
 host.querySelector("button").addEventListener("click",refresh);
 refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();

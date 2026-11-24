/* Shared, offline, inclusive calendar-date filter (Moscow publication dates). */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.dmDateFilter=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function day(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(String(value??"").trim());
  if(!m)return "";
  const y=Number(m[1]),month=Number(m[2]),d=Number(m[3]);
  const leap=y%4===0&&(y%100!==0||y%400===0);
  const max=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
  return y>0&&max&&d>0&&d<=max?m[1]+"-"+m[2]+"-"+m[3]:"";
 }
 function valid(from="",to=""){return (!from||day(from)===from)&&(!to||day(to)===to)&&(!from||!to||from<=to)}
 function includes(value,from="",to=""){
  if(!valid(from,to))return false;
  const d=day(value);
  return (!from&&!to)||Boolean(d&&(!from||d>=from)&&(!to||d<=to));
 }
 function today(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day}
 function label(from="",to=""){return !valid(from,to)?"Ошибка: дата начала позже даты окончания или дата некорректна.":from||to?"Период: "+(from||"без ограничения начала")+" — "+(to||"без ограничения окончания")+".":"Период: все даты."}
 function nameMatches(name,query){const norm=x=>String(x??"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").trim().replace(/\s+/g," ");const n=norm(name);return norm(query).split(" ").filter(Boolean).every(t=>n.includes(t))}
 return {day,valid,includes,today,label,nameMatches};
});

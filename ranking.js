/* Public-data ranking: same post dataset and date fields as the Excel report. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const coll=new Intl.Collator("ru",{sensitivity:"base"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const roster=Array.isArray(window.deputyRoster)?window.deputyRoster:[];
const key=p=>p.handle||"roster:"+p.district+":"+p.name;
const safeNum=v=>(v===null||v===undefined||v===""||!Number.isFinite(Number(v)))?0:Number(v);
function storedPosts(){
 const map=new Map();
 for(const [storage,field] of [[sessionStorage,"dm_vk_posts"],[localStorage,"dm_posts"]]){
  try{const arr=JSON.parse(storage.getItem(field)||"[]");if(Array.isArray(arr))for(const p of arr)if(p?.profile&&p?.url)map.set(p.profile+"|"+p.url,p)}catch(e){}
 }
 return [...map.values()];
}
async function fetchPosts(){
 try{const r=await fetch("./vk-posts.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const j=await r.json();if(Array.isArray(j.posts)){sessionStorage.setItem("dm_vk_posts",JSON.stringify(j.posts));if(Array.isArray(j.monitored_profiles))sessionStorage.setItem("dm_vk_monitoring",JSON.stringify(j.monitored_profiles));}}catch(e){console.warn("Ranking: using cached post data",e)}
}
function calculate(){
 const from=$("ranking-from").value,to=$("ranking-to").value,metric=$("ranking-metric").value;
 if(!from||!to||from>to)throw Error("Укажите корректный период.");
 const counts=new Map();
 for(const p of storedPosts()){
  const date=String(p.date||"").slice(0,10);
  if(date<from||date>to)continue;
  const id=p.profile,stats=counts.get(id)||{posts:0,likes:0,comments:0,reposts:0,views:0};
  stats.posts++;for(const k of ["likes","comments","reposts","views"])stats[k]+=safeNum(p[k]);
  counts.set(id,stats);
 }
 const entries=roster.map(p=>({name:p.name,district:p.district||"Не указан",handle:key(p),stats:counts.get(key(p))||{posts:0,likes:0,comments:0,reposts:0,views:0}}));
 const active=entries.filter(p=>p.stats.posts>0),unverified=entries.filter(p=>!p.stats.posts);
 active.sort((a,b)=>b.stats[metric]-a.stats[metric]||b.stats.posts-a.stats.posts||coll.compare(a.name,b.name));
 unverified.sort((a,b)=>coll.compare(a.district,b.district)||coll.compare(a.name,b.name));
 return {active,unverified,metric,from,to};
}
function draw(){
 const body=$("ranking-body"),summary=$("ranking-summary");
 try{
  const {active,unverified,metric,from,to}=calculate();
  const showUnverified=$("ranking-show-unverified").checked;
  const rankValue=p=>metric==="posts"?p.stats.posts:p.stats[metric];
  const rows=active.map((p,i)=>[i+1,p,rankValue(p),true]);
  if(showUnverified)for(const p of unverified)rows.push(["—",p,"Нет данных",false]);
  body.innerHTML=rows.map(([rank,p,value,verified])=>'<tr><td>'+rank+'</td><td>'+esc(p.district)+'</td><td>'+esc(p.name)+'</td><td>'+esc(value)+'</td><td>'+(verified?"Есть публикации в выборке":"Нет публикаций в загруженной выборке")+'</td></tr>').join("");
  summary.textContent="Период: "+from+" — "+to+". С данными: "+active.length+" из "+roster.length+" депутатов; без данных за период: "+unverified.length+". Рейтинг отражает только загруженные публикации VK, а не эффективность работы депутата.";
 }catch(e){body.innerHTML="";summary.textContent="Ошибка: "+e.message}
}
document.addEventListener("DOMContentLoaded",()=>{
 const from=$("ranking-from"),to=$("ranking-to");if(!from||!to)return;
 const now=new Date(),iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 from.value=$("report-from")?.value||iso(new Date(now.getFullYear(),now.getMonth(),1));
 to.value=$("report-to")?.value||iso(now);
 for(const id of ["ranking-from","ranking-to","ranking-metric","ranking-show-unverified"])$(id).addEventListener("change",draw);
 $("ranking-refresh").addEventListener("click",async()=>{await fetchPosts();draw()});
 draw();fetchPosts().then(draw);
});
})();

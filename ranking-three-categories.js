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
const categories=[
 {label:"Отлично",className:"excellent"},
 {label:"Допустимо",className:"acceptable"},
 {label:"Плохо",className:"poor"}
];
function draw(){
 const body=$("ranking-body"),summary=$("ranking-summary"),groups=$("ranking-groups");
 try{
  const {active,unverified,metric,from,to}=calculate();
  const showUnverified=$("ranking-show-unverified").checked;
  // Allocate the ranked, data-backed entries in a 60% / 30% / 10% split.
  // Largest-remainder rounding keeps the three counts adding up exactly.
  const n=active.length,weights=[0.6,0.3,0.1];
  const counts=weights.map(w=>Math.floor(n*w));
  let remaining=n-counts.reduce((a,b)=>a+b,0);
  const remainders=weights.map((w,i)=>({i,fraction:n*w-counts[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  for(let i=0;i<remaining;i++)counts[remainders[i].i]++;
  const totals=[0,0,0];
  const rows=active.map((p,i)=>{const group=i<counts[0]?0:i<counts[0]+counts[1]?1:2;totals[group]++;return {rank:i+1,p,value:p.stats[metric],group}});
  groups.innerHTML=categories.map((c,i)=>'<div class="ranking-legend ranking-'+c.className+'"><strong>'+esc(c.label)+'</strong><span>'+totals[i]+' депутатов</span></div>').join("");
  body.innerHTML=rows.map(({rank,p,value,group})=>'<tr class="ranking-'+categories[group].className+'"><td>'+rank+'</td><td>'+esc(p.district)+'</td><td>'+esc(p.name)+'</td><td>'+value+'</td><td><span class="ranking-tag">'+categories[group].label+'</span></td></tr>').join("")+
   (showUnverified?unverified.map(p=>'<tr class="ranking-no-data"><td>—</td><td>'+esc(p.district)+'</td><td>'+esc(p.name)+'</td><td>Нет данных</td><td>Нет данных за период</td></tr>').join(""):"");
  summary.textContent="⚠ Данные VK могут быть неполными: автоматический сбор не настроен. Пустые показатели не означают отсутствие работы депутата. Период: "+from+" — "+to+". С публикациями: "+active.length+" из "+roster.length+"; без публикаций в загруженной выборке за период: "+unverified.length+". Категории распределены по местам среди депутатов с данными: 60% — «Отлично», 30% — «Допустимо», 10% — «Плохо» (с округлением до целых строк). При равных показателях порядок определяется дополнительной сортировкой. Депутаты без данных не входят в процентное распределение. Это не оценка качества депутатской работы.";
 }catch(e){body.innerHTML="";groups.innerHTML="";summary.textContent="Ошибка: "+e.message}
}
document.addEventListener("DOMContentLoaded",()=>{
 const from=$("ranking-from"),to=$("ranking-to");if(!from||!to)return;
 from.value="2026-01-01";
 to.value="2026-11-21";
 for(const id of ["ranking-from","ranking-to","ranking-metric","ranking-show-unverified"])$(id).addEventListener("change",draw);
 $("ranking-refresh").addEventListener("click",async()=>{await fetchPosts();draw()});
 draw();fetchPosts().then(draw);
});
})();

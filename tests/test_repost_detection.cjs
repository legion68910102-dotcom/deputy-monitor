"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const repost=require("../repost-detection-v131.js");

test("VK copy_history, explicit source URL and verified flag are reposts",()=>{
 assert.equal(repost.isRepost({copy_history:[{owner_id:-300,id:10}]}),true);
 assert.equal(repost.isRepost({is_repost:true}),true);
 assert.equal(repost.isRepost({repost_source_url:"https://vk.com/wall-300_10"}),true);
 assert.equal(repost.isRepost({repost_author:"Управа района Чертаново Центральное"}),true);
 assert.equal(repost.isRepost({post_type:"copy"}),true);
 assert.equal(repost.isRepost({text:"Репост: Управа района Чертаново Центральное"}),true);
});
test("a mention of a person or channel and popularity counts are NOT repost evidence",()=>{
 assert.equal(repost.isRepost({text:"На встрече присутствовали Иван Иванов и Мария Петрова."}),false);
 assert.equal(repost.isRepost({text:"Управа района Чертаново Центральное сообщает о соревнованиях"}),false);
 assert.equal(repost.isRepost({reposts:99,repost:12}),false);
 assert.equal(repost.isRepost({reposts:0,text:"Своя публикация"}),false);
 assert.equal(repost.isRepost({post_type:"post",copy_history:[]}),false);
 assert.equal(repost.isRepost({repost_author:""}),false);
});
test("fallback taxonomy gives repost label to confirmed VK repost even if AI said no theme",()=>{
 const code=fs.readFileSync("activity-analysis-v129.js","utf8");
 const sandbox={window:{dmRepostDetection:repost},document:{addEventListener(){}}};
 vm.runInNewContext(code.replace(/\}\)\(\);\s*$/,"globalThis.__makePost=makePost;\n})();"),sandbox);
 const post={profile:"aabulatov",url:"https://vk.com/wall352446434_2000",date:"2026-11-23",
  text:"Управа района Чертаново Центральное анонсирует соревнования",is_repost:true};
 const record=sandbox.__makePost(post,0);
 assert.equal(record._hits.some(h=>h.key==="repost"),true);
 assert.equal(record._hits.some(h=>h.key==="uncategorized"),false);
 const sameWithoutProof=sandbox.__makePost({...post,is_repost:false},1);
 assert.equal(sameWithoutProof._hits.some(h=>h.key==="repost"),false);
});
test("personal browser correction is private and survives backup and text edits",()=>{
 const code=fs.readFileSync("personal-workspace-v130.js","utf8");
 const makeStorage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
 function person(storage){const window={};vm.runInNewContext(code,{window,localStorage:storage,document:{readyState:"loading",addEventListener(){}}});return window.dmPersonalWorkspace}
 const row={profile:"aabulatov",url:"https://vk.com/wall352446434_2000",date:"2026-11-23",text:"Публикация"};
 const browserA=person(makeStorage()),browserB=person(makeStorage());
 browserA.markRepost(row,true);
 browserA.setEdit(row,{text:"Личный комментарий"});
 assert.equal(browserA.applyPosts([row])[0].is_repost,true);
 assert.equal(browserA.applyPosts([row])[0].text,"Личный комментарий");
 assert.equal(repost.isRepost(browserA.applyPosts([row])[0]),true);
 assert.equal(browserB.applyPosts([row])[0].is_repost,undefined);
 browserB.restoreBackup(browserA.backup());
 assert.equal(browserB.applyPosts([row])[0].is_repost,true);
 browserA.markRepost(row,false);
 assert.equal(browserA.applyPosts([row])[0].is_repost,undefined);
 assert.equal(browserA.applyPosts([row])[0].text,"Личный комментарий");
});
test("repost correction cannot mutate source or hidden user data",()=>{
 const code=fs.readFileSync("personal-workspace-v130.js","utf8");
 const m=new Map(),localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 const win={};vm.runInNewContext(code,{window:win,localStorage,document:{readyState:"loading",addEventListener(){}}});
 const row={profile:"a",url:"https://vk.com/wall2_2",text:"text"};
 win.dmPersonalWorkspace.markRepost(row,true);
 assert.equal(row.is_repost,undefined);
 assert.throws(()=>win.dmPersonalWorkspace.setEdit(row,{is_repost:"yes"}),/подтверждена/);
 win.dmPersonalWorkspace.hide(row);
 assert.equal(win.dmPersonalWorkspace.applyPosts([row]).length,0);
});

test("publication date filters include both boundaries and reject reversed ranges",()=>{
 const dates=require("../date-filter-v1.js");
 const all=["2026-11-20","2026-11-21","2026-11-22","2026-11-23","","2026-02-30"];
 assert.deepEqual(all.filter(d=>dates.includes(d,"2026-11-21","2026-11-22")),["2026-11-21","2026-11-22"]);
 assert.deepEqual(all.filter(d=>dates.includes(d,"2026-11-22","2026-11-22")),["2026-11-22"]);
 assert.deepEqual(all.filter(d=>dates.includes(d,"2026-11-23","2026-11-21")),[]);
 assert.equal(dates.includes("","", "2026-11-22"),false);
 assert.equal(dates.includes("2026-11-22T23:59:59+03:00","2026-11-22","2026-11-22"),true);
 assert.equal(dates.day("2024-02-29"),"2024-02-29");
 assert.equal(dates.day("2026-02-29"),"");
 assert.equal(dates.nameMatches("Семёнов Дмитрий Витальевич","дмитрий семенов"),true);
 assert.equal(dates.nameMatches("Иванов Иван Иванович","Петров"),false);
});
test("both live HTML versions use shared date filters, and filtered export is offline",()=>{
 for(const path of ["index.html","index-v129.html"]){
  const html=fs.readFileSync(path,"utf8");
  assert.match(html,/date-filter-v1\.js/);
  assert.match(html,/dmDateFilter\.includes\(post\.date,activityFrom,activityTo\)/);
  assert.match(html,/dmDateFilter\.includes\(r\.date,a,b\)/);
  assert.match(html,/dmDateFilter\.includes\(p\.date,from,to\)/);
  assert.match(html,/id="report-filtered-download"/);
  assert.match(html,/blob=workbook\(summary,posts,missing\)/);
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(!/\bsrc\s*=/.test(match[1]))new vm.Script(match[2],{filename:path});
  }
 }
 for(const path of ["activity-analysis.js","activity-analysis-v129.js"]){
  const code=fs.readFileSync(path,"utf8");assert.match(code,/dmDateFilter\.includes\(r\.date,start,end\)/);new vm.Script(code,{filename:path});
 }
});

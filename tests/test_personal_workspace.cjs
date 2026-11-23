"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("personal-workspace-v130.js","utf8");
function storage(seed={}){
 const map=new Map(Object.entries(seed));
 return {getItem(k){return map.has(k)?map.get(k):null},setItem(k,v){map.set(k,String(v))},removeItem(k){map.delete(k)},entries(){return [...map.entries()]}};
}
function browser(local){
 const win={};
 vm.runInNewContext(source,{window:win,localStorage:local,document:{readyState:"loading",addEventListener(){}},Set,Map,Date,JSON,Array,Object,String,Number,Error,RegExp});
 return win.dmPersonalWorkspace;
}
const sourcePost={profile:"p1",url:"https://vk.com/wall1_1",date:"2026-11-21",text:"Исходная публичная запись",likes:2};
test("personal edits overlay public data without mutating source",()=>{
 const store=storage();const api=browser(store);
 api.setEdit(sourcePost,{text:"Моя версия",likes:"9"});
 const result=api.applyPosts([sourcePost]);
 assert.equal(result[0].text,"Моя версия");assert.equal(result[0].likes,"9");
 assert.equal(sourcePost.text,"Исходная публичная запись");
 assert.equal(result[0]._personal_edit,true);
});
test("different browser/device storages never share edits or hidden posts",()=>{
 const deviceA=browser(storage()),deviceB=browser(storage());
 deviceA.setEdit(sourcePost,{text:"Версия A"});
 assert.equal(deviceA.applyPosts([sourcePost])[0].text,"Версия A");
 assert.equal(deviceB.applyPosts([sourcePost])[0].text,sourcePost.text);
 deviceA.hide(sourcePost);
 assert.equal(deviceA.applyPosts([sourcePost]).length,0);
 assert.equal(deviceB.applyPosts([sourcePost]).length,1);
 deviceA.unhide(deviceA.identity(sourcePost));
 assert.equal(deviceA.applyPosts([sourcePost]).length,1);
});
test("personal backup and restore without publishing server secrets",()=>{
 const store=storage({dm_posts:JSON.stringify([sourcePost]),dm_deputy_bio:'{"Test":{"birth":"2000-01-01"}}',GIGACHAT_AUTH_KEY:"must-never-export"});
 const api=browser(store);api.setEdit(sourcePost,{text:"Только для меня"});
 const exported=api.backup();
 assert.match(exported,/Только для меня/);
 assert.doesNotMatch(exported,/must-never-export/);
 const another=storage(),other=browser(another);
 other.restoreBackup(exported);
 assert.equal(other.applyPosts([sourcePost])[0].text,"Только для меня");
 assert.equal(JSON.parse(another.getItem("dm_posts")).length,1);
 assert.equal(another.getItem("GIGACHAT_AUTH_KEY"),null);
});
test("unrecognized and malformed backup input does not modify existing local state",()=>{
 const store=storage({dm_posts:"[]"}),api=browser(store);
 assert.throws(()=>api.restoreBackup('{"app":"bad","version":1,"storage":{}}'),/не резервная копия/);
 assert.throws(()=>api.restoreBackup('{"app":"deputy-monitor-personal","version":1,"storage":{"GIGACHAT_AUTH_KEY":"secret"}}'),/Недопустимое поле/);
 assert.equal(store.getItem("dm_posts"),"[]");
});
test("unsafe invalid metrics and dates are rejected",()=>{
 const api=browser(storage());
 assert.throws(()=>api.setEdit(sourcePost,{likes:"-22"}),/Числовые поля/);
 assert.throws(()=>api.setEdit(sourcePost,{date:"yesterday"}),/дата/);
 assert.throws(()=>api.setEdit({profile:"p1"},{text:"x"}),/профиль и ссылку/);
});
test("reset clears only personal keys and retains unrelated storage",()=>{
 const store=storage({dm_posts:"[]",random_app:"do-not-delete"}),api=browser(store);
 api.setEdit(sourcePost,{text:"changed"});api.resetLocal();
 assert.equal(store.getItem("dm_posts"),null);
 assert.equal(store.getItem("dm_personal_post_changes_v1"),null);
 assert.equal(store.getItem("random_app"),"do-not-delete");
});
test("all user-facing tables use the same isolated personal view",()=>{
 const html=fs.readFileSync("index-v129.html","utf8");
 assert.match(html,/<script src="\.\/personal-workspace-v130\.js"><\/script>/);
 assert.equal((html.match(/window\.dmPersonalWorkspace\.applyPosts\(list\)/g)||[]).length,3);
 assert.match(html,/window\.dmActivityRows=allRows/);
 assert.ok(html.indexOf('src="./personal-workspace-v130.js"')<html.indexOf("function allRows(){"));
});
test("personal workspace code contains no API calls that change shared server data",()=>{
 assert.doesNotMatch(source,/\b(method|method:)\s*[:=]\s*["'](?:POST|PUT|PATCH|DELETE)/i);
 assert.doesNotMatch(source,/api\.github\.com|GIGACHAT_AUTH_KEY|VK_TOKEN/);
});

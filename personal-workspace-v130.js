/* Personal edits: browser-local only. No GitHub/API writes and no user data uploads. */
(function(){
"use strict";
var KEY="dm_personal_post_changes_v1";
var KEYS=["dm_posts","dm_districts","dm_extra_deputies","dm_district_edits_v113","dm_undo_v115","dm_deputy_archive_v114","dm_official_profiles_v114","dm_deputy_photos","dm_deputy_bio",KEY];
var FIELDS=["date","text","likes","comments","reposts","views","followers"];
function blank(){return {version:1,edited:{},hidden:[]}}
function obj(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)}
function identity(row){return row&&typeof row.profile==="string"&&typeof row.url==="string"&&row.profile&&row.url?JSON.stringify([row.profile,row.url]):""}
function read(){
 try{var x=JSON.parse(localStorage.getItem(KEY)||"null");if(obj(x)&&x.version===1&&obj(x.edited)&&Array.isArray(x.hidden))return x}catch(e){}
 return blank();
}
function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
function sanitizePatch(p){
 if(!obj(p))throw Error("Неверный формат правки");
 var clean={};
 for(var k of FIELDS){if(!Object.prototype.hasOwnProperty.call(p,k))continue;
  var v=String(p[k]===null||p[k]===undefined?"":p[k]);
  if(k==="date"&&v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error("Неверная дата");
  if(k==="text"&&v.length>30000)throw Error("Текст слишком длинный");
  if(k!=="text"&&k!=="date"&&v!==""&&(!/^\d{1,10}$/.test(v)||Number(v)>1000000000))throw Error("Числовые поля должны быть неотрицательными");
  clean[k]=v;
 }
 if(Object.prototype.hasOwnProperty.call(p,"is_repost")){
  if(p.is_repost!==true)throw Error("Метка репоста должна быть подтверждена");
  clean.is_repost=true;
 }
 return clean;
}
function applyPosts(rows){
 var st=read(),hidden=new Set(st.hidden.filter(x=>typeof x==="string"));
 return (Array.isArray(rows)?rows:[]).filter(function(row){if(!row)return false;var id=identity(row);return !id||!hidden.has(id)}).map(row=>{
  var id=identity(row),patch=id?st.edited[id]:null;
  return obj(patch)?Object.assign({},row,sanitizePatch(patch),{_personal_edit:true}):row;
 });
}
function setEdit(row,patch){
 var id=identity(row);if(!id)throw Error("Публикация должна иметь профиль и ссылку");
 var st=read();st.edited[id]=Object.assign({},sanitizePatch(st.edited[id]||{}),sanitizePatch(patch));write(st);
}
function markRepost(row,marked){
 var id=identity(row);if(!id)throw Error("Публикация должна иметь профиль и ссылку");
 var st=read(),change=sanitizePatch(st.edited[id]||{});
 if(marked)change.is_repost=true;else delete change.is_repost;
 if(Object.keys(change).length)st.edited[id]=change;else delete st.edited[id];
 write(st);
}
function hide(row){var id=identity(row);if(!id)throw Error("Невозможно скрыть запись без ссылки");var st=read();if(!st.hidden.includes(id))st.hidden.push(id);write(st)}
function unhide(id){var st=read();st.hidden=st.hidden.filter(x=>x!==id);write(st)}
function clearEdit(id){var st=read();delete st.edited[id];write(st)}
function backup(){
 var data={};for(var k of KEYS){var v=localStorage.getItem(k);if(v!==null)data[k]=v}
 return JSON.stringify({app:"deputy-monitor-personal",version:1,created_at:new Date().toISOString(),storage:data},null,2);
}
function restoreBackup(json){
 if(typeof json!=="string"||json.length>6*1024*1024)throw Error("Файл слишком большой или повреждён");
 var doc=JSON.parse(json);
 if(!obj(doc)||doc.app!=="deputy-monitor-personal"||doc.version!==1||!obj(doc.storage))throw Error("Это не резервная копия личного пространства");
 for(var k of Object.keys(doc.storage)){
  if(!KEYS.includes(k)||typeof doc.storage[k]!=="string")throw Error("Недопустимое поле в резервной копии");
  var value=JSON.parse(doc.storage[k]);
  if(k==="dm_posts"&&!Array.isArray(value))throw Error("Некорректные публикации");
  if(k===KEY&&(!obj(value)||value.version!==1||!obj(value.edited)||!Array.isArray(value.hidden)))throw Error("Некорректные личные правки");
  if(k!==KEY&&k!=="dm_posts"&&k!=="dm_extra_deputies"&&k!=="dm_deputy_archive_v114"&&k!=="dm_undo_v115"&&!obj(value))throw Error("Некорректные данные: "+k);
  if((k==="dm_extra_deputies"||k==="dm_deputy_archive_v114")&&!Array.isArray(value))throw Error("Некорректный список: "+k);
  if(k===KEY){for(var id of Object.keys(value.edited))sanitizePatch(value.edited[id])}
 }
 var old={};for(var name of KEYS)old[name]=localStorage.getItem(name);
 try{for(var name of KEYS){if(Object.prototype.hasOwnProperty.call(doc.storage,name))localStorage.setItem(name,doc.storage[name]);else localStorage.removeItem(name)}}catch(e){
  for(var name of KEYS){try{if(old[name]===null)localStorage.removeItem(name);else localStorage.setItem(name,old[name])}catch(ignore){}}
  throw Error("Не удалось сохранить на устройстве: "+e.message);
 }
}
function resetLocal(){for(var k of KEYS)localStorage.removeItem(k)}
window.dmPersonalWorkspace={applyPosts:applyPosts,setEdit:setEdit,hide:hide,unhide:unhide,clearEdit:clearEdit,markRepost:markRepost,read:read,backup:backup,restoreBackup:restoreBackup,resetLocal:resetLocal,identity:identity};
function download(text,filename){
 var blob=new Blob([text],{type:"application/json;charset=utf-8"}),link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},60000);
}
// The previous standalone «Личное пространство» panel was retired by product decision.
// Retain only the non-visual compatibility API for earlier browser-local edits and
// the «Это репост (только у меня)» correction inside activity analysis.
})();

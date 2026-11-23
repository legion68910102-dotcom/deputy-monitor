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
function node(tag,txt){var el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;return el}
function mounted(){
 var main=document.querySelector("main");if(!main)return;
 var section=document.createElement("section");section.id="personal-workspace";
 section.innerHTML='<details class="workspace-details"><summary>🔒 Личное пространство — изменения видны только вам <span aria-hidden="true">⌄</span></summary>'+
 '<div class="workspace-body"><p class="workspace-notice"><b>Ваши правки не меняют сайт других пользователей.</b> Добавленные публикации, изменения карточек, скрытые записи и фотографии хранятся в этом браузере. Общие обновления VK и GigaChat доступны всем. На одном устройстве используйте разные браузерные профили для разных людей.</p>'+
 '<div class="workspace-actions"><button type="button" id="workspace-backup">⬇️ Сохранить мои данные</button><label class="workspace-upload">⬆️ Восстановить мои данные<input type="file" accept=".json,application/json" id="workspace-import"></label><button type="button" id="workspace-reset">🗑️ Очистить только мои правки</button></div>'+
 '<p class="workspace-caption">Резервный файл храните у себя; он может содержать личные заметки и загруженные фотографии. Очистка данных браузера удаляет несохранённые изменения. На сервер ничего не отправляется.</p>'+
 '<div class="workspace-search"><label for="workspace-query">Изменить или скрыть публикацию только у себя</label><input id="workspace-query" type="search" placeholder="Фамилия, VK, фраза или ссылка"><button type="button" id="workspace-search-button">Найти публикации</button></div>'+
 '<p class="workspace-caption" id="workspace-status" role="status">Найдите публикацию, чтобы изменить текст или скрыть её в своей копии.</p><div id="workspace-results"></div>'+
 '<div id="workspace-editor" hidden><h3>Личная правка публикации</h3><label>Дата<input type="date" id="workspace-edit-date"></label><label>Текст<textarea rows="5" maxlength="30000" id="workspace-edit-text"></textarea></label><label>Лайки<input type="number" min="0" max="1000000000" id="workspace-edit-likes"></label><div class="workspace-actions"><button id="workspace-edit-save" type="button">Сохранить только у меня</button><button id="workspace-edit-cancel" type="button">Отмена</button><button id="workspace-edit-revert" type="button">Убрать мою правку</button></div></div>'+
 '<details class="workspace-hidden"><summary>Скрытые мной публикации</summary><div id="workspace-hidden-list"></div></details></div></details>';
 var css=document.createElement("style");css.textContent=
 '#personal-workspace{margin:0 0 18px}#personal-workspace .workspace-details{background:#fff;border:2px solid #a8b8ee;border-radius:16px;overflow:hidden;box-shadow:0 5px 22px #17274808}'+
 '#personal-workspace summary{cursor:pointer;padding:15px 18px;font-weight:750;list-style:none}#personal-workspace summary::-webkit-details-marker{display:none}#personal-workspace .workspace-body{padding:0 18px 18px}'+
 '#personal-workspace .workspace-notice{background:#f1f6ff;border-radius:10px;padding:12px;line-height:1.55;color:#284467;font-size:13px}'+
 '#personal-workspace .workspace-actions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}#personal-workspace button,#personal-workspace .workspace-upload{display:inline-flex;align-items:center;justify-content:center;background:#e9efff;color:#244895;border:1px solid #cdd9f6;border-radius:9px;padding:10px 12px;font-weight:650;font-size:13px;cursor:pointer}'+
 '#personal-workspace .workspace-upload input{display:none}#personal-workspace .workspace-caption{font-size:12px;line-height:1.5;color:#61718a}#personal-workspace .workspace-search{display:grid;gap:8px;margin-top:18px}'+
 '#personal-workspace input[type=search],#personal-workspace input[type=date],#personal-workspace input[type=number],#personal-workspace textarea{width:100%;box-sizing:border-box;border:1px solid #cdd8e9;border-radius:9px;padding:10px;color:#15213a;font:inherit}'+
 '#personal-workspace .workspace-search label,#personal-workspace #workspace-editor label{display:grid;gap:6px;font-size:13px;font-weight:650}#personal-workspace .workspace-entry{padding:12px 0;border-bottom:1px solid #e6ebf3;overflow-wrap:anywhere}'+
 '#personal-workspace .workspace-entry p{margin:5px 0;font-size:12px;color:#516079}#personal-workspace .workspace-entry button{margin:4px 7px 2px 0}#personal-workspace #workspace-editor{border:1px solid #cdd8e9;border-radius:12px;padding:14px;display:grid;gap:10px;margin:14px 0}'+
 '#personal-workspace #workspace-editor[hidden]{display:none}#personal-workspace .workspace-hidden{margin-top:15px;border-top:1px solid #e2e8f0}#personal-workspace .workspace-hidden summary{padding-left:0}';
 document.head.appendChild(css);main.prepend(section);
 var $=function(id){return section.querySelector("#"+id)}, selected=null;
 $("workspace-backup").onclick=function(){try{download(backup(),"deputy-monitor-personal-"+new Date().toISOString().slice(0,10)+".json");$("workspace-status").textContent="Сохранена личная резервная копия на устройстве."}catch(e){$("workspace-status").textContent="Ошибка экспорта: "+e.message}};
 $("workspace-import").onchange=async function(ev){var file=ev.target.files[0];if(!file)return;try{if(file.size>6*1024*1024)throw Error("Файл больше 6 МБ");var content=await file.text();if(!confirm("Заменить личные данные на этом устройстве содержимым файла? Общий сайт не изменится."))return;restoreBackup(content);location.reload()}catch(e){$("workspace-status").textContent="Не удалось восстановить: "+e.message}finally{ev.target.value=""}};
 $("workspace-reset").onclick=function(){if(confirm("Удалить все ваши локальные данные, включая добавленные публикации и фото? Общий сайт не изменится.")&&confirm("Вы сохранили резервную копию? Очистку нельзя отменить.")){resetLocal();location.reload()}};
 async function rawPosts(){
  var raw=[];try{raw=JSON.parse(sessionStorage.getItem("dm_vk_posts")||"[]")}catch(e){}
  if(!Array.isArray(raw)||!raw.length){try{var res=await fetch("./vk-posts.json",{cache:"no-store"});if(res.ok){var data=await res.json();raw=Array.isArray(data.posts)?data.posts:[];try{sessionStorage.setItem("dm_vk_posts",JSON.stringify(raw))}catch(e){}}}catch(e){}}
  var manual=[];try{manual=JSON.parse(localStorage.getItem("dm_posts")||"[]")}catch(e){}
  var map=new Map();for(var row of Array.isArray(raw)?raw:[])if(identity(row))map.set(identity(row),row);
  for(var row of Array.isArray(manual)?manual:[])if(identity(row))map.set(identity(row),row);
  return [...map.values()].sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""))});
 }
 var lastRows=[];
 function addEntry(container,row,isHidden){
  var item=node("div");item.className="workspace-entry";var p=node("strong",(row.profile||"Профиль")+" · "+(row.date||"Дата не указана"));item.appendChild(p);
  item.appendChild(node("p",(row.text||row.url||"Нет текста").slice(0,260)));
  var btn=node("button",isHidden?"Вернуть в мою копию":"✏️ Изменить");btn.type="button";item.appendChild(btn);
  if(isHidden){btn.onclick=function(){unhide(identity(row));location.reload()}}
  else{
   btn.onclick=function(){selected=row;var id=identity(row),patch=read().edited[id]||{},current=Object.assign({},row,patch);$("workspace-edit-date").value=String(current.date||"").slice(0,10);$("workspace-edit-text").value=String(current.text||"");$("workspace-edit-likes").value=String(current.likes===null||current.likes===undefined?"":current.likes);$("workspace-editor").hidden=false;$("workspace-editor").scrollIntoView({behavior:"smooth",block:"nearest"})};
   var stored=read().edited[identity(row)]||{},manualRepost=stored.is_repost===true;
   var sourceRepost=!manualRepost&&window.dmRepostDetection&&window.dmRepostDetection.isRepost(row);
   if(!sourceRepost){var repostBtn=node("button",manualRepost?"↩️ Снять мою метку репоста":"🔁 Это репост");repostBtn.type="button";repostBtn.onclick=function(){try{markRepost(row,!manualRepost);location.reload()}catch(e){$("workspace-status").textContent=e.message}};item.appendChild(repostBtn)}
   else item.appendChild(node("p","🔁 Репост определён автоматически по источнику."));
   var hiddenBtn=node("button","🚫 Скрыть только у меня");hiddenBtn.type="button";hiddenBtn.onclick=function(){if(confirm("Скрыть публикацию только в вашем браузере?")){try{hide(row);location.reload()}catch(e){$("workspace-status").textContent=e.message}}};item.appendChild(hiddenBtn);
  }
  container.appendChild(item);
 }
 async function list(){
  $("workspace-status").textContent="Поиск публикаций…";
  lastRows=await rawPosts();var query=$("workspace-query").value.trim().toLocaleLowerCase("ru-RU"),out=$("workspace-results");out.textContent="";
  var st=read(),hidden=new Set(st.hidden),visible=lastRows.filter(function(r){return !hidden.has(identity(r))}).map(function(r){return Object.assign({},r,st.edited[identity(r)]||{})});
  if(query)visible=visible.filter(function(r){return [r.profile,r.date,r.url,r.text].some(function(x){return String(x||"").toLocaleLowerCase("ru-RU").includes(query)})});
  for(var r of visible.slice(0,25))addEntry(out,r,false);
  $("workspace-status").textContent="Найдено: "+visible.length+". Показаны первые "+Math.min(25,visible.length)+". Изменения сохраняются только у вас.";
  var hiddenBox=$("workspace-hidden-list");hiddenBox.textContent="";
  var hiddenRows=lastRows.filter(function(r){return hidden.has(identity(r))});
  for(var r of hiddenRows.slice(0,50))addEntry(hiddenBox,r,true);
  if(!hiddenRows.length)hiddenBox.appendChild(node("p","Скрытых публикаций нет."));
 }
 $("workspace-search-button").onclick=list;
 $("workspace-query").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();list()}});
 $("workspace-edit-cancel").onclick=function(){$("workspace-editor").hidden=true;selected=null};
 $("workspace-edit-save").onclick=function(){if(!selected)return;try{setEdit(selected,{date:$("workspace-edit-date").value,text:$("workspace-edit-text").value,likes:$("workspace-edit-likes").value});location.reload()}catch(e){$("workspace-status").textContent="Не сохранено: "+e.message}};
 $("workspace-edit-revert").onclick=function(){if(!selected)return;try{clearEdit(identity(selected));location.reload()}catch(e){$("workspace-status").textContent=e.message}};
 section.querySelector(".workspace-hidden").addEventListener("toggle",function(){if(this.open)list()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mounted,{once:true});else mounted();
})();
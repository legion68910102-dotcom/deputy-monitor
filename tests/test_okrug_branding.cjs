"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const page=fs.readFileSync("index-v129.html","utf8");
const code=fs.readFileSync("okrug-branding-v132.js","utf8");
function load(config){
 const elems={};
 for(const id of ["okrug-emblem-image","okrug-emblem-fallback","okrug-emblem-caption","okrug-hero-intro","okrug-branding-panel"])
   elems[id]={dataset:{},hidden:false,textContent:"",src:"",alt:""};
 const document={readyState:"loading",title:"",getElementById(id){return elems[id]??null},addEventListener(event,callback){if(event==="DOMContentLoaded")this.boot=callback}};
 const window={};if(config!==undefined)window.deputyMonitorOkrugConfig=config;
 vm.runInNewContext(code,{document,window}, {timeout:1000});
 document.boot();
 return {elements:elems,document,window};
}
test("top duplicated navigation is removed; all content sections remain intact",()=>{
 assert.doesNotMatch(page,/<nav\b[^>]*class="site-nav\b/);
 for(const section of ["overview","deputies","activity","report","ranking","activity-analysis","sources","method"]){
  assert.match(page,new RegExp('id="'+section+'"'));
 }
 assert.match(page,/<figure id="okrug-branding-panel"/);
 assert.match(page,/<img id="okrug-emblem-image"/);
 assert.match(page,/src="\.\/okrug-branding-v132\.js"/);
});
test("UAO default branding shows actual emblem and 16 districts",()=>{
 const {elements,document}=load();
 assert.equal(elements["okrug-emblem-image"].src,"https://upload.wikimedia.org/wikipedia/commons/8/8d/UAO_district_of_Moscow_coa.png");
 assert.match(elements["okrug-emblem-image"].alt,/Южный административный округ Москвы/);
 assert.equal(elements["okrug-emblem-caption"].textContent,"Южный административный округ Москвы");
 assert.match(elements["okrug-hero-intro"].textContent,/16 районов ЮАО/);
 assert.equal(elements["okrug-branding-panel"].dataset.okrug,"uao");
 assert.match(document.title,/ЮАО/);
});
test("future tenant config automatically swaps emblem, title and intro",()=>{
 const another={code:"sao",abbreviation:"САО",fullName:"Северный административный округ Москвы",districtsCount:16,emblemUrl:"./assets/okrugs/sao.svg"};
 const {elements,document,window}=load(another);
 assert.equal(window.deputyMonitorBranding.selectConfig().code,"sao");
 assert.equal(elements["okrug-emblem-image"].src,another.emblemUrl);
 assert.equal(elements["okrug-emblem-caption"].textContent,another.fullName);
 assert.match(elements["okrug-hero-intro"].textContent,/16 районов САО/);
 assert.equal(elements["okrug-branding-panel"].dataset.okrug,"sao");
 assert.match(document.title,/САО/);
});
test("unconfigured tenants, unsafe image schemes and missing metadata fall back safely",()=>{
 const {elements}=load({code:"bad",abbreviation:"BAD",fullName:"Wrong",emblemUrl:"javascript:alert(1)"});
 assert.equal(elements["okrug-branding-panel"].dataset.okrug,"uao");
 const simple=load({code:"test",abbreviation:"ТЕСТ",fullName:"Тестовый округ",emblemUrl:"./assets/okrugs/test.png"});
 assert.equal(simple.elements["okrug-branding-panel"].dataset.okrug,"test");
 assert.match(simple.elements["okrug-hero-intro"].textContent,/Тестовый округ/);
});
test("image fetch failures show district abbreviation, never a broken image",()=>{
 const {elements}=load();
 elements["okrug-emblem-image"].onerror();
 assert.equal(elements["okrug-emblem-image"].hidden,true);
 assert.equal(elements["okrug-emblem-fallback"].hidden,false);
 assert.equal(elements["okrug-emblem-fallback"].textContent,"ЮАО");
});

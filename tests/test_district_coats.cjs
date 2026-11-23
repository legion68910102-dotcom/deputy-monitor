"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const crypto=require("node:crypto");
const page=fs.readFileSync("index-v129.html","utf8");
const source=fs.readFileSync("district-coats-uao-v133.js","utf8");
const expected=[
 "Бирюлёво Восточное","Бирюлёво Западное","Братеево","Даниловский",
 "Донской","Зябликово","Москворечье-Сабурово","Нагатино-Садовники",
 "Нагатинский Затон","Нагорный","Орехово-Борисово Северное",
 "Орехово-Борисово Южное","Царицыно","Чертаново Северное",
 "Чертаново Центральное","Чертаново Южное"
];
function load(){const window={};vm.runInNewContext(source,{window},{timeout:2000});return window.dmDistrictCoats}
test("all 16 correct district keys in original published order",()=>{
 const coats=load();
 assert.deepEqual([...coats.districts],expected);
 assert.equal(coats.url("Несуществующий район"),"");
 assert.equal(coats.url("__proto__"),"");
 assert.equal(coats.url(""),"");
 assert.equal(typeof coats.source,"string");
});
test("every real Wikimedia Commons image path has a valid and matching MD5 prefix",()=>{
 const coats=load(),urls=coats.districts.map(d=>coats.url(d));
 assert.equal(new Set(urls).size,16);
 for(const url of urls){
  assert.match(url,/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[a-f0-9]\/[a-f0-9]{2}\/[^?#]+\/120px-/);
  const m=/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)\/120px-(.+)$/.exec(url);
  assert.ok(m,url);
  assert.equal(m[3],m[4],"thumb image name must match uploaded file name");
  const filename=decodeURIComponent(m[3]);
  assert.equal(crypto.createHash("md5").update(filename).digest("hex").slice(0,2),m[2],filename);
  assert.equal(m[2][0],m[1]);
 }
});
test("district tabs show the correct emblems and iPhone size adapts",()=>{
 assert.match(page,/id="district-coats-v133"/);
 assert.match(page,/#profiles details\.district-group>summary\{background:#eff1f4!important;/);
 assert.match(page,/#profiles details\.district-group\[open\]>summary\{background:#e5e9ee!important;/);
 assert.match(page,/@media\(max-width:600px\)/);
 assert.match(page,/class="district-heading"/);
 assert.match(page,/class="district-coat"/);
 assert.match(page,/class="district-count"/);
 assert.match(page,/loading="lazy" decoding="async"/);
 assert.match(page,/querySelectorAll\('img\.district-coat'\)/);
 assert.ok(page.indexOf('src="./district-coats-uao-v133.js"')<page.indexOf("let handles="));
});
test("all core sections and historical district list remain intact",()=>{
 for(const id of ["overview","deputies","activity","report","ranking","activity-analysis","method"])
  assert.match(page,new RegExp('id="'+id+'"'));
 for(const d of expected)assert.ok(page.includes(d),"District missing: "+d);
 assert.match(page,/const districts=\[/);
});

test("every coat has a corresponding original image URL as a resilient fallback",()=>{
 const coats=load();
 for(const name of expected){
  const thumb=coats.url(name),original=coats.original(name);
  assert.ok(original);
  assert.equal(original,thumb.replace("/thumb/","/").replace(/\/120px-[^/]+$/,""));
 }
 assert.equal(coats.original("Несуществующий район"),"");
 assert.match(page,/data-coat-original=/);
 assert.match(page,/img\.dataset\.coatOriginal/);
 assert.match(page,/img\.src=original/);
 assert.match(page,/else img\.hidden=true/);
});

test("primary navigation is pale green while the sixteen district tabs are darker grey",()=>{
 const palette=/<style id="uao-accordion-palette-v134">([\s\S]*?)<\/style>/.exec(page);
 assert.ok(palette,"missing latest tab palette");
 const css=palette[1];
 assert.ok(page.indexOf('id="uao-accordion-palette-v134"')>page.indexOf('id="district-coats-v133"'),"palette must override the old district grey");
 assert.match(css,/#profiles details\.district-group>summary\{background:#cbd3dd!important;/);
 assert.match(css,/#profiles details\.district-group\[open\]>summary\{background:#b8c4d0!important;/);
 assert.match(css,/#profiles details\.district-group>summary:hover\{background:#b8c4d0!important[;}]/);
 assert.match(css,/#profiles details\.district-group>summary:focus-visible/);
 for(const id of ["overview","deputies","activity","report","ranking","activity-analysis","sources","method","deputy-archive"]){
  const klass=id==="activity"?"activity-excel-fold":"ranking-native";
  const sel="main > #"+id+" > details."+klass+" > summary";
  assert.ok(css.includes(sel),"green main tab missing: "+id);
  assert.ok(css.includes("main > #"+id+" > details."+klass+"[open] > summary"),"green expanded tab missing: "+id);
 }
 assert.match(css,/background:#e2f3e5!important/);
 assert.match(css,/background:#d1ebd8!important/);
 assert.match(css,/color:#20412c!important/);
 assert.match(css,/border-color:#b8dbc3!important/);
 assert.doesNotMatch(css,/#profiles\s+\.deputy-tile/);
 assert.doesNotMatch(css,/#activity-analysis\s+\.activity-post/);
});

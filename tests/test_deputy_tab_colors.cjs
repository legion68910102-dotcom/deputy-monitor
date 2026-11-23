"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const page=fs.readFileSync("index-v129.html","utf8");
const match=/<style id="deputy-lavender-v135">([\s\S]*?)<\/style>/.exec(page);
const css=match?.[1]||"";

test("new lavender styles cover only deputy tabs and do not touch district or outer navigation",()=>{
 assert.ok(match,"lavender style block is missing");
 const selectors=[
  "#profiles .deputy-tile:not(.birthday-today)>details>summary",
  "#profiles .deputy-tile:not(.birthday-today)>details[open]>summary",
  "#profiles .deputy-tile:not(.birthday-today)>details>summary:hover",
  "#profiles .deputy-tile:not(.birthday-today)>details>summary:focus-visible"
 ];
 for(const selector of selectors)assert.ok(css.includes(selector+"{"),selector);
 assert.match(css,/background:#f0e9fa!important/);
 assert.match(css,/background:#e6daf6!important/);
 assert.match(css,/border:1px solid #dacbed!important/);
 assert.match(css,/color:#473165!important/);
 assert.doesNotMatch(css,/#profiles details\.district-group/);
 assert.doesNotMatch(css,/main\s*>\s*#(?:overview|activity|ranking|deputies|report)/);
 assert.match(page,/id="uao-accordion-palette-v134"/);
 assert.match(page,/id="district-coats-v133"/);
});
test("birthday highlight remains vivid green for normal, expanded and hover states",()=>{
 const selectors=[
  "#profiles .deputy-tile.birthday-today>details>summary",
  "#profiles .deputy-tile.birthday-today>details[open]>summary",
  "#profiles .deputy-tile.birthday-today>details>summary:hover"
 ];
 for(const selector of selectors)assert.ok(css.includes(selector),"missing explicit green birthday override: "+selector);
 const birthdayRule=css.slice(css.indexOf(selectors[0]),css.indexOf("</style>",css.indexOf(selectors[0]))>=0?css.indexOf("</style>",css.indexOf(selectors[0])):undefined);
 assert.match(birthdayRule,/background:#dcfce7!important/);
 assert.match(birthdayRule,/border:2px solid #16a34a!important/);
 assert.match(birthdayRule,/color:#14532d!important/);
 assert.match(page,/style id="deputy-birthday-v111"/);
 assert.match(page,/🎂 Сегодня день рождения/);
 assert.match(page,/tile\.classList\.toggle\("birthday-today",isDeputyBirthdayToday\(name\)\)/);
 assert.match(page,/isDeputyBirthdayToday\(name\)\?" birthday-today":""/);
 assert.ok(page.indexOf('id="deputy-lavender-v135"')>page.indexOf('id="deputy-birthday-v111"'));
});
test("birthday name stays green; other names become purple",()=>{
 assert.ok(css.includes("#profiles .deputy-tile:not(.birthday-today) .deputy-name"));
 assert.match(page,/#profiles \.deputy-tile\.birthday-today \.deputy-name\{color:#14532d!important/);
});

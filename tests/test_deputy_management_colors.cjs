"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const html=fs.readFileSync("index-v129.html","utf8");
const matched=/<style id="district-management-colors-v136">([\s\S]*?)<\/style>/.exec(html);
const css=matched?.[1]||"";

test("Add deputy and Remove deputy retain distinct controlled accordion headings",()=>{
 assert.match(html,/<details class="manage-add"><summary>➕ Добавить депутата<\/summary>/);
 assert.match(html,/<details class="manage-remove"><summary>➖ Убрать депутата<\/summary>/);
 assert.ok(html.indexOf('id="district-management-colors-v136"')>html.indexOf('id="deputy-lavender-v135"'));
 assert.ok(matched);
});
test("Add deputy header is green, including open and hover states",()=>{
 assert.match(css,/#profiles \.district-manage>details\.manage-add>summary\{\s*background:#15803d!important;/);
 assert.match(css,/#profiles \.district-manage>details\.manage-add\[open\]>summary,/);
 assert.match(css,/background:#166534!important;/);
 assert.match(css,/color:#fff!important;/);
});
test("Remove deputy header is red, including open and hover states",()=>{
 assert.match(css,/#profiles \.district-manage>details\.manage-remove>summary\{\s*background:#dc2626!important;/);
 assert.match(css,/#profiles \.district-manage>details\.manage-remove\[open\]>summary,/);
 assert.match(css,/background:#b91c1c!important;/);
 assert.match(css,/color:#fff!important;/);
});
test("only local management accordion headings are recolored",()=>{
 assert.doesNotMatch(css,/#profiles \.deputy-tile/);
 assert.doesNotMatch(css,/#profiles details\.district-group/);
 assert.doesNotMatch(css,/main\s*>\s*#(?:overview|deputies|ranking|report)/);
 assert.match(html,/id="uao-accordion-palette-v134"/);
 assert.match(html,/id="district-coats-v133"/);
 assert.match(html,/id="deputy-lavender-v135"/);
 assert.match(html,/id="deputy-birthday-v111"/);
 assert.match(html,/🎂 Сегодня день рождения/);
 assert.match(html,/data-remove-action/);
 assert.match(html,/data-add-check/);
});

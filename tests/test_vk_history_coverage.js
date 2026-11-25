const assert=require("node:assert/strict");
const {summarize}=require("../vk-history-coverage-v1.js");
const p={"term_id":"test","start":"2026-01-01","enabled":true,"profiles":{"a":{"last_attempt":"2026-11-25T10:00:00Z"}},"last_run":{"roster_size":3,"history_complete":1,"history_pending":1,"history_blocked":1,"archive_posts":10,"stopped_reason":null}};
const t={"id":"test","start":"2026-01-01","roster":[{},{},{}]};
assert.equal(summarize(p,t).complete,1);
assert.equal(summarize(p,t).percent,100/3);
assert.equal(summarize(p,{...t,id:"other"}),null);
assert.equal(summarize({...p,last_run:{...p.last_run,history_blocked:2}},t),null);
assert.equal(summarize({},t),null);
assert.equal(summarize({...p,enabled:false,last_run:{...p.last_run,stopped_reason:"quota"}},t).stopped,true);
console.log("VK history coverage tests passed");

const {districtSummary}=require("../vk-history-coverage-v1.js");
const fp={"profiles":{"a":{"state":"complete"},"b":{"state":"pending"},"d":{"state":"blocked"}}}, fm={"roster_size":4,"profiles":{"a":{"status":"success"},"b":{"status":"success"},"c":{"status":"checked_unavailable"},"d":{"status":"success"}}}, ft={"roster":[{"handle":"a","district":"А"},{"handle":"b","district":"А"},{"handle":"c","district":"Б"},{"handle":"d","district":"Б"}]}, fo={"total":4,"complete":1,"pending":1,"blocked":2};
assert.equal(districtSummary(fp,fm,ft,fo)[0].percent,50);
assert.equal(districtSummary(fp,fm,ft,fo)[1].blocked,2);
assert.equal(districtSummary(fp,fm,ft,{...fo,pending:2}),null);
assert.equal(districtSummary(fp,{...fm,profiles:{}},ft,fo),null);
assert.equal(districtSummary(fp,fm,{roster:[...ft.roster.slice(0,3),ft.roster[0]]},fo),null);

const assert=require("node:assert/strict");
const api=require("../mandate-review-v1.js");
assert.equal(api.rows.length,158);
assert.equal(api.rows.filter(r=>r.status==="list_match").length,97);
assert.equal(api.rows.filter(r=>r.status==="discrepancy").length,2);
assert.equal(api.rows.filter(r=>r.status==="review_required").length,59);
const r=api.rows[0];
assert.equal(api.lookup(r.name,r.district,r.handle).status,"list_match");
assert.equal(api.lookup(r.name,"Другой район"),null);
assert.equal(api.lookup(r.name,r.district,"wrong"),null);
assert.match(api.render("Рябева Евгения Николаевна","Зябликово"),/расхождение/);
assert.match(api.render("Неизвестно","Неизвестно"),/отсутствуют/);
assert.doesNotMatch(api.renderStatus({status:"list_match",source:"javascript:alert(1)"}),/javascript:/);
console.log("Mandate review checks passed");

assert.equal(api.lookup("Ильяшенко Александр Викторович","Братеево"),null);

/* Strict mapping regression tests: batching must not merge or lose publications. */
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {batchSchema,decodeBatch}=require("./activity-batch-helper.cjs");
const policy=require("../activity-category-policy-v1.js");
const posts=[
 {text:"Сегодня принял участие в обходе главы управы.",repost:false},
 {text:"Принял участие в районном субботнике.",repost:false},
 {text:"Завтра начнётся сбор гуманитарной помощи.",repost:false},
 {text:"Передали гуманитарную помощь пострадавшим жителям.",repost:false}
];
const source=[
 {index:2,categories:["humanitarian","announcement"],confidence:0.8,explanation:"Анонс сбора",evidence:"Завтра начнётся сбор гуманитарной помощи."},
 {index:0,categories:["event"],confidence:0.9,explanation:"Обход",evidence:"обходе главы управы"},
 {index:3,categories:["humanitarian"],confidence:0.95,explanation:"Передача помощи",evidence:"Передали гуманитарную помощь"},
 {index:1,categories:["event"],confidence:0.95,explanation:"Субботник",evidence:"районном субботнике"}
];
const categories=["walk","event","humanitarian","announcement","repost"];
const options={categorySet:new Set(categories),normalize:policy.normalizeCategories,isRepost:p=>p.repost,methodologyVersion:1};
const schema=batchSchema(categories);
assert.equal(schema.properties.results.items.properties.index.type,"integer");
assert.deepEqual(schema.properties.results.items.properties.categories.items.enum,categories);
const result=decodeBatch({results:source},posts,options);
assert.deepEqual(result.map(x=>x.categories.slice().sort()),[["walk"],["event"],["announcement"],["humanitarian"]]);
assert.ok(result.every(x=>x.method==="ai"&&x.methodology_version===1));
assert.equal(result[0].evidence,"обходе главы управы");
assert.throws(()=>decodeBatch({results:source.slice(0,3)},posts,options),/Incomplete/);
assert.throws(()=>decodeBatch({results:[source[0],source[1],source[2],source[2]]},posts,options),/duplicate/);
assert.throws(()=>decodeBatch({results:source.map(x=>({...x,index:5}))},posts,options),/Invalid/);
assert.throws(()=>decodeBatch({results:source.map((x,i)=>i===0?{...x,confidence:"NaN"}:x)},posts,options),/Malformed/);
const copy=decodeBatch({results:[{...source[0],index:0}]},[{...posts[2],repost:true}],options);
assert.deepEqual(copy[0].categories,["announcement","repost"]);
console.log("Multi-post GigaChat mapping tests passed:",result.length,"posts and invalid-output checks.");

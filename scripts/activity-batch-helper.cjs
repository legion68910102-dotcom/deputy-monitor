/* Strict, testable per-post mapping for a single GigaChat request with multiple texts. */
"use strict";
function batchSchema(categories){
 return {
  type:"object",additionalProperties:false,required:["results"],
  properties:{results:{type:"array",items:{
   type:"object",additionalProperties:false,
   required:["index","categories","confidence","explanation","evidence"],
   properties:{
    index:{type:"integer"},
    categories:{type:"array",items:{type:"string",enum:categories}},
    confidence:{type:"number"},
    explanation:{type:"string"},
    evidence:{type:"string"}
   }
  }}}
 };
}
function decodeBatch(parsed,posts,{categorySet,normalize,isRepost,methodologyVersion}){
 if(!Array.isArray(posts)||!posts.length)throw Error("No posts in batch");
 if(!parsed||!Array.isArray(parsed.results)||parsed.results.length!==posts.length)
  throw Error("Incomplete GigaChat batch response");
 const mapped=new Map();
 for(const item of parsed.results){
  if(!Number.isInteger(item?.index)||item.index<0||item.index>=posts.length||mapped.has(item.index))
   throw Error("Invalid or duplicate GigaChat post index");
  if(!Array.isArray(item.categories)||!Number.isFinite(Number(item.confidence))
    ||typeof item.explanation!=="string"||typeof item.evidence!=="string")
   throw Error("Malformed GigaChat batch item");
  const p=posts[item.index],raw=String(p.text||""),repost=isRepost(p);
  const categories=normalize([...new Set(item.categories.filter(c=>categorySet.has(c)))].slice(0,6),raw,{repost});
  if(repost&&!categories.includes("repost"))categories.push("repost");
  const quote=item.evidence.slice(0,200);
  mapped.set(item.index,{
   categories,methodology_version:methodologyVersion,
   confidence:Math.max(0,Math.min(1,Number(item.confidence))),
   explanation:item.explanation.slice(0,180),
   evidence:raw.includes(quote)?quote:"",
   method:"ai"
  });
 }
 if(mapped.size!==posts.length)throw Error("Some GigaChat batch items were not returned");
 return posts.map((_,i)=>mapped.get(i));
}
module.exports={batchSchema,decodeBatch};

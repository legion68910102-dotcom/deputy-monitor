/* Consistent, conservative VK repost detection for the website and GigaChat.
   This file never treats the number of reposts received as evidence that the author reposted. */
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.dmRepostDetection=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  function nonempty(v){return (typeof v==="string"&&v.trim().length>0)||(typeof v==="number"&&Number.isFinite(v)&&v!==0)}
  function repostReason(r){
    if(!r||typeof r!=="object")return "";
    if(r.is_repost===true||r.isRepost===true||r.is_repost===1||r.isRepost===1)return "verified_repost_flag";
    if(r.repost===true||r.reposted===true)return "verified_repost_flag";
    if(Array.isArray(r.copy_history)&&r.copy_history.length>0)return "vk_copy_history";
    if(Array.isArray(r.copyHistory)&&r.copyHistory.length>0)return "vk_copy_history";
    if(["copy","repost","shared"].includes(String(r.post_type||r.postType||r.type||"").toLowerCase()))return "repost_post_type";
    // These fields describe the *source of another author's post*, not number of shares.
    if(["repost_of","repostOf","repost_source","repostSource","repost_source_url","original_post_url","originalPostUrl","original_author","repost_author","repostAuthor"].some(k=>nonempty(r[k])))return "repost_source";
    if(r.repost&&typeof r.repost==="object"&&!Array.isArray(r.repost)){
      if(nonempty(r.repost.url)||nonempty(r.repost.owner_id)||nonempty(r.repost.source_url)||nonempty(r.repost.author))return "repost_source";
    }
    // Explicit caption/reshare markers copied into a text field. An ordinary
    // mention of another person's name or channel within the post is NOT enough.
    var text=String(r.text||"");
    if(/^\s*(?:\[(?:репост|repost)\]|(?:🔁|↪️?)\s*(?:репост\b|переслано\b|запись от\b)|(?:репост|repost)\s*[:—-]|поделил(?:ся|ась)\s+(?:записью|публикацией)(?=\s|$|[.:—-])|запись\s+(?:со стены|сообщества)(?=\s|$|[.:—-]))/iu.test(text))return "explicit_repost_caption";
    return "";
  }
  return {isRepost:function(r){return Boolean(repostReason(r))},repostReason:repostReason};
});

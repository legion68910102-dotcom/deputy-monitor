/* Emblem and district identity: configured per administrative okrug.
 * Current published data set: UAO only. Other okrugs must provide their own
 * configuration *and data* before branding switches; no false data relabeling.
 */
(function(root){
 "use strict";
 const UAO=Object.freeze({
   code:"uao",
   abbreviation:"ЮАО",
   fullName:"Южный административный округ Москвы",
   districtsCount:16,
   emblemUrl:"https://upload.wikimedia.org/wikipedia/commons/8/8d/UAO_district_of_Moscow_coa.png",
   emblemSource:"https://commons.wikimedia.org/wiki/File:UAO_district_of_Moscow_coa.png"
 });
 function isSafeEmblemUrl(value){
   return typeof value==="string"&&(
     /^https:\/\/[^<>"'\s]+$/i.test(value)||
     /^\.\/assets\/okrugs\/[a-z0-9_/-]+\.(?:png|webp|svg)$/i.test(value)
   );
 }
 function normalize(value){
   if(!value||typeof value!=="object"||typeof value.code!=="string"||
      !/^[a-z0-9_-]{2,24}$/i.test(value.code)||
      typeof value.fullName!=="string"||!value.fullName.trim()||
      typeof value.abbreviation!=="string"||!value.abbreviation.trim()||
      !isSafeEmblemUrl(value.emblemUrl))return null;
   return {
     code:value.code.toLowerCase(),
     abbreviation:value.abbreviation.slice(0,30),
     fullName:value.fullName.slice(0,120),
     districtsCount:Number.isInteger(value.districtsCount)&&value.districtsCount>0?value.districtsCount:null,
     emblemUrl:value.emblemUrl,
     emblemSource:typeof value.emblemSource==="string"&&value.emblemSource.startsWith("https://")?value.emblemSource:""
   };
 }
 function selectConfig(){
   // Later: the tenant data loader sets this before the branding script loads.
   // Never switch an existing UAO dataset merely because of a URL parameter.
   return normalize(root.deputyMonitorOkrugConfig)||UAO;
 }
 function render(){
   const config=selectConfig();
   const img=document.getElementById("okrug-emblem-image");
   const fallback=document.getElementById("okrug-emblem-fallback");
   const caption=document.getElementById("okrug-emblem-caption");
   const intro=document.getElementById("okrug-hero-intro");
   const panel=document.getElementById("okrug-branding-panel");
   if(!img||!caption||!panel)return;
   panel.dataset.okrug=config.code;
   img.alt="Гербовая эмблема: "+config.fullName;
   img.src=config.emblemUrl;
   img.onerror=function(){
     img.hidden=true;
     if(fallback){fallback.hidden=false;fallback.textContent=config.abbreviation}
   };
   img.onload=function(){img.hidden=false;if(fallback)fallback.hidden=true};
   caption.textContent=config.fullName;
   if(intro){
     intro.textContent=config.districtsCount
      ?"Справочник муниципальных депутатов "+config.districtsCount+" районов "+config.abbreviation+" и мониторинг доступных открытых публикаций. Данные о действующем составе и активности требуют проверки."
      :"Справочник муниципальных депутатов "+config.fullName+" и мониторинг доступных открытых публикаций. Данные о действующем составе и активности требуют проверки.";
   }
   document.title="Цифровой профиль депутата — "+config.abbreviation+" · аналитика";
   return config;
 }
 root.deputyMonitorBranding={render:render,selectConfig:selectConfig,uao:UAO};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});
 else render();
})(typeof window!=="undefined"?window:globalThis);

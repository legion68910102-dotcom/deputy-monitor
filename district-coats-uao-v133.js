/* Shields of the 16 municipal districts of Moscow's Southern Administrative Okrug.
 * Individual verified file names: Wikimedia Commons
 * https://commons.wikimedia.org/wiki/Category:Coats_of_arms_of_municipal_divisions_of_Moscow
 * URL hashes are the first two MD5 hex digits of the Commons file names (spaces -> underscores).
 * Only a fixed allowlist is used; no input becomes a remote image URL.
 */
(function(root){
 "use strict";
 const files=Object.freeze({
  "Бирюлёво Восточное":["f3","Coat of Arms of Biryulyovo Vostochnoye (municipality in Moscow).png"],
  "Бирюлёво Западное":["8b","Coat of Arms of Biryulyovo Zapadnoye (municipality in Moscow).png"],
  "Братеево":["89","Coat of Arms of Brateyevo (municipality in Moscow, 2021).png"],
  "Даниловский":["0e","Coat of Arms of Danilovsky (municipality in Moscow).png"],
  "Донской":["15","Coat of Arms of Donskoy (municipality in Moscow) (2001).png"],
  "Зябликово":["58","Coat of Arms of Zyablikovo (municipality in Moscow, 2018).png"],
  "Москворечье-Сабурово":["80","Coat of Arms of Moskvorechye-Saburovo (municipality in Moscow).png"],
  "Нагатино-Садовники":["36","Coat of Arms of Nagatino-Sadovniki (municipality in Moscow).png"],
  "Нагатинский Затон":["0f","Coat of Arms of Nagatinsky Zaton (municipality in Moscow).png"],
  "Нагорный":["ca","Coat of Arms of Nagornoe (municipality in Moscow).png"],
  "Орехово-Борисово Северное":["94","Coat of Arms of Orekhovo-Borisovo Severnoye District.png"],
  "Орехово-Борисово Южное":["50","Coat of Arms of South Orekhovo-Borisovo (municipality in Moscow).png"],
  "Царицыно":["ec","Coat of Arms of Tsaritsino (municipality in Moscow).png"],
  "Чертаново Северное":["a3","Coat of Arms of Chertanovo North (municipality in Moscow).png"],
  "Чертаново Центральное":["ff","Coat of Arms of Chertanovo Center (municipality in Moscow).png"],
  "Чертаново Южное":["d5","Coat of Arms of Chertanovo South (municipality in Moscow).png"]
 });
 function url(district){
  if(!Object.prototype.hasOwnProperty.call(files,district))return "";
  const [hash,filename]=files[district],stem=encodeURIComponent(filename.replaceAll(" ","_"));
  return "https://upload.wikimedia.org/wikipedia/commons/thumb/"+hash[0]+"/"+hash+"/"+stem+"/120px-"+stem;
 }
 root.dmDistrictCoats=Object.freeze({url:url,districts:Object.freeze(Object.keys(files)),source:"https://commons.wikimedia.org/wiki/Category:Coats_of_arms_of_municipal_divisions_of_Moscow"});
})(typeof window!=="undefined"?window:globalThis);

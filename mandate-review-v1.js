/* Dated review snapshot: derived from reports/roster-review-2026-11-25.json; not a legal mandate registry. */
(function(root){
"use strict";
function normalize(v){return String(v||"").normalize("NFC").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").trim().replace(/\s+/g," ");}
function makeIndex(rows){
 const index=new Map();
 for(const r of rows){const key=normalize(r.district)+"|"+normalize(r.name);if(index.has(key))index.set(key,null);else index.set(key,r);}
 return index;
}
function lookup(index,name,district,handle){
 const r=index.get(normalize(district)+"|"+normalize(name));
 return r&&(!handle||r.handle===handle)?r:null;
}
function renderStatus(r){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const link=(url,label)=>typeof url==="string"&&/^https:\/\/[^ ]+$/.test(url)?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':"";
 const labels={list_match:"Указан в официальном источнике",review_required:"Требует проверки",discrepancy:"Обнаружено расхождение"};
 const state=r&&Object.prototype.hasOwnProperty.call(labels,r.status)?r.status:"unknown";
 const date=r&&/^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_date)?r.reviewed_date.split("-").reverse().join("."):"";
 const colors={list_match:["#eef8f1","#20643d"],review_required:["#f4f5f8","#48566b"],discrepancy:["#fff4db","#795400"],unknown:["#f4f5f8","#48566b"]};
 const [bg,fg]=colors[state];
 const heading=labels[state]||"Сведения о сверке отсутствуют";
 const note=state==="list_match"?"Упоминание в источнике не подтверждает непрерывность полномочий на текущую дату.":state==="review_required"?"Список не подтверждён; это не означает прекращение полномочий.":state==="discrepancy"?"Нужна дополнительная проверка; рейтинг и архив не изменены.":"";
 return '<div class="mandate-review" style="margin:10px 0;padding:12px;border-radius:10px;background:'+bg+';color:'+fg+';font-size:13px;line-height:1.45;overflow-wrap:anywhere"><div style="font-weight:700">Сверка состава совета</div><div style="font-weight:600;margin-top:4px">'+esc(heading)+'</div>'+(date?'<div>Дата сверки: '+esc(date)+'</div>':"")+(r?.note?'<div style="margin-top:5px">'+esc(r.note)+'</div>':"")+(note?'<div style="margin-top:5px">'+esc(note)+'</div>':"")+(r?.source?'<div style="margin-top:6px">'+link(r.source,"Источник сверки")+'</div>':"")+(Array.isArray(r?.evidence)?r.evidence.map((url,i)=>'<div>'+link(url,"Дополнительный источник "+(i+1))+'</div>').join(""):"")+'</div>';
}
const rows=[
  {
    "name": "Ильясов Харис Нябиуллович",
    "district": "Бирюлёво Восточное",
    "handle": "ilyasov_kn",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Молчанов Павел Викторович",
    "district": "Бирюлёво Восточное",
    "handle": "molchanovpavel",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Нерсесова Елена Валериевна",
    "district": "Бирюлёво Восточное",
    "handle": "elenanersesova",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Птицына Ксения Кирилловна",
    "district": "Бирюлёво Восточное",
    "handle": "ptitsynakk",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Сычева Наталья Владимировна",
    "district": "Бирюлёво Восточное",
    "handle": "nata_sycheva",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Алейникова Юлия Владимировна",
    "district": "Бирюлёво Восточное",
    "handle": "aleinikovayv",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Антонова Лариса Петровна",
    "district": "Бирюлёво Восточное",
    "handle": "antonovalp1",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Голубева Елена Васильевна",
    "district": "Бирюлёво Восточное",
    "handle": "golubevaev947",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кутайсова Наталья Викторовна",
    "district": "Бирюлёво Восточное",
    "handle": "kutaysovanv",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Рытов Сергей Владимирович",
    "district": "Бирюлёво Восточное",
    "handle": "rytovsergey",
    "status": "list_match",
    "source": "https://mrbv.ru/sovet/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Бойков Алексей Александрович",
    "district": "Бирюлёво Западное",
    "handle": "a.a.boikov",
    "status": "list_match",
    "source": "https://www.amom.ru/news/2026/06/deputat-aleksej-bojkov-pozdravil-s-professionalnyim-prazdnikom-soczialnyix-rabotnikov.html",
    "reviewed_date": "2026-11-25",
    "note": "Совет муниципальных образований назвал депутатом."
  },
  {
    "name": "Есин Александр Борисович",
    "district": "Бирюлёво Западное",
    "handle": "e.aleksander88",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Конарев Илья Сергеевич",
    "district": "Бирюлёво Западное",
    "handle": "iskonarev",
    "status": "list_match",
    "source": "https://www.amom.ru/news/2026/09/deputat-ilya-konarev-razobral-so-studentami-praktiku-vzaimodejstviya-s-vlastyu.html",
    "reviewed_date": "2026-11-25",
    "note": "Сообщение муниципального округа на сайте Совета муниципальных образований."
  },
  {
    "name": "Леликова Елена Сергеевна",
    "district": "Бирюлёво Западное",
    "handle": "elenasergeevnalelikiva",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Терехова Ирина Юрьевна",
    "district": "Бирюлёво Западное",
    "handle": "irina_terekhova1969",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Бурых Ярослав Юрьевич",
    "district": "Бирюлёво Западное",
    "handle": "yaroslavburykh",
    "status": "list_match",
    "source": "https://amom.ru/news/2026/11/deputatyi-biryulevo-zapadnoe-prisoedinilis-k-akczii.html",
    "reviewed_date": "2026-11-25",
    "note": "Совет муниципальных образований назвал депутатом."
  },
  {
    "name": "Виноградова Елена Геннадьевна",
    "district": "Бирюлёво Западное",
    "handle": "smallraisin",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Жабина Татьяна Викторовна",
    "district": "Бирюлёво Западное",
    "handle": "tatyanajabina",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Мартанова Юлия Валентиновна",
    "district": "Бирюлёво Западное",
    "handle": "juliamartanova",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Орехов Александр Валентинович",
    "district": "Бирюлёво Западное",
    "handle": "orehov_aleksandr",
    "status": "review_required",
    "source": "https://www.m-bz.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Белоусова Ольга Андреевна",
    "district": "Братеево",
    "handle": "olga_belousova1998",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Гонцова Ирина Борисовна",
    "district": "Братеево",
    "handle": "gontsova71",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Коростиленко Елена Алексеевна",
    "district": "Братеево",
    "handle": "e.korostilenko",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Уколова Елена Васильевна",
    "district": "Братеево",
    "handle": "ykolova_elena_vasilevna",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Чинилина Ирина Викторовна",
    "district": "Братеево",
    "handle": "chinilina975",
    "status": "list_match",
    "source": "https://www.mun-brateevo.ru/priem-naselenyia.html",
    "reviewed_date": "2026-11-25",
    "note": "Указана в графике приёма Совета."
  },
  {
    "name": "Власенко Антон Юрьевич",
    "district": "Братеево",
    "handle": "vlasenkoau",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Волков Дмитрий Александрович",
    "district": "Братеево",
    "handle": "dmitry_volkov77",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Вольская Анна Львовна",
    "district": "Братеево",
    "handle": "annavolskaya",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Серегин Александр Викторович",
    "district": "Братеево",
    "handle": "seregin1963",
    "status": "review_required",
    "source": "https://www.mun-brateevo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Аркусов Дмитрий Юрьевич",
    "district": "Даниловский",
    "handle": "dmitry_ark",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кирьянова Людмила Николаевна",
    "district": "Даниловский",
    "handle": "kiryanova_ln",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Левштанов Дмитрий Николаевич",
    "district": "Даниловский",
    "handle": "levshtanov86",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Фадеева Инна Геннадьевна",
    "district": "Даниловский",
    "handle": "ifadeeva2022",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Иванов Олег Игорьевич",
    "district": "Даниловский",
    "handle": "ivanov_oi10",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Подольская Ольга Вячеславовна",
    "district": "Даниловский",
    "handle": "olga_podolskay",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Сагаловская Надежда Викторовна",
    "district": "Даниловский",
    "handle": "sagalovskaya",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Ситников Иван Иванович",
    "district": "Даниловский",
    "handle": "sitnikov_danilovskiy",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies/deputies-schedule-of-admission/district-2/24-sitnikov-ivan-ivanovich",
    "reviewed_date": "2026-11-25",
    "note": "Именная карточка Совета."
  },
  {
    "name": "Султанов Владислав Геннадьевич",
    "district": "Даниловский",
    "handle": "vgsultanov",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Аббасова Наталья Александровна",
    "district": "Даниловский",
    "handle": "natalia.abbasova",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Григорьева Людмила Васильевна",
    "district": "Даниловский",
    "handle": "grigorievalv",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Родионова Татьяна Вячеславовна",
    "district": "Даниловский",
    "handle": "trodionova2022",
    "status": "list_match",
    "source": "https://danilovskoe.org/index.php/council-of-deputies",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Граськин Сергей Сергеевич",
    "district": "Донской",
    "handle": "graskinss",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Зайковская Галина Викторовна",
    "district": "Донской",
    "handle": "galinazaykovskaya",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кобцев Павел Николаевич",
    "district": "Донской",
    "handle": "pkobtsev",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Скорлупкина Лариса Николаевна",
    "district": "Донской",
    "handle": "ln_skorlupkina",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Фурсова Елена Даниловна",
    "district": "Донской",
    "handle": "elena_fursova1",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кабанова Татьяна Викторовна",
    "district": "Донской",
    "handle": "tkabanova2022",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Костюшина Светлана Викторовна",
    "district": "Донской",
    "handle": "svetlanakostyushina",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Резков Владислав Валерьевич",
    "district": "Донской",
    "handle": "rezkovvlad",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Седачева Юлия Владимировна",
    "district": "Донской",
    "handle": "yulia_sedacheva",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Шерстюк Элина Сергеевна",
    "district": "Донской",
    "handle": "elina_sherstyuk",
    "status": "review_required",
    "source": "https://sovet.mo-donskoy.ru/page/deputaty_sd_mo_donskoy1.html",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Анисимова Светлана Геннадьевна",
    "district": "Зябликово",
    "handle": "anisim_svet",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Указана в списке Совета; новый адрес VK не подтверждён официальным источником."
  },
  {
    "name": "Пушкин Павел Павлович",
    "district": "Зябликово",
    "handle": "pushkinpp",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Рафальская Ирина Владимировна",
    "district": "Зябликово",
    "handle": "rafalskayairina",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Тиханова Альбина Викторовна",
    "district": "Зябликово",
    "handle": "tikhanovaalbina",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Харитонова Алия Гафурджановна",
    "district": "Зябликово",
    "handle": "haritonova_aliya",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Воропаева Алла Викторовна",
    "district": "Зябликово",
    "handle": "allavoropaeva",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Каляев Александр Вячеславович",
    "district": "Зябликово",
    "handle": "kalyaev84",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Рябева Евгения Николаевна",
    "district": "Зябликово",
    "handle": "ryabevaen",
    "status": "discrepancy",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "В отчёте сверки указана Чеканова Евгения Николаевна. Не установлено, смена ли это фамилии или другой человек."
  },
  {
    "name": "Семёнов Дмитрий Витальевич",
    "district": "Зябликово",
    "handle": "semenovdmitry80",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Указан в списке Совета."
  },
  {
    "name": "Шлякова Елена Николаевна",
    "district": "Зябликово",
    "handle": "elenashlyakova",
    "status": "list_match",
    "source": "https://www.mos-zyablikovo.ru/sovet-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Алленов Андрей Михайлович",
    "district": "Москворечье-Сабурово",
    "handle": "allenov__andrey",
    "status": "list_match",
    "source": "https://gazeta-nashe-moskvoreche-saburovo.ru/2026/10/02/149558/",
    "reviewed_date": "2026-11-25",
    "note": "Назван в опубликованном районным изданием графике отчётов, утверждённом Советом 22.09.2026; первичный протокол подтверждает статус на 24.09.2024.",
    "evidence": [
      "https://parking.mos.ru/upload/iblock/995/brc4vxkyl81hr9vluy32o2ic8i8fr11r.pdf",
      "https://gazeta-nashe-moskvoreche-saburovo.ru/kontakty/"
    ]
  },
  {
    "name": "Андрианов Михаил Владимирович",
    "district": "Москворечье-Сабурово",
    "handle": "andrianov001",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Заусаева Наталья Васильевна",
    "district": "Москворечье-Сабурово",
    "handle": "nvzausaeva",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кондрашов Артем Вячеславович",
    "district": "Москворечье-Сабурово",
    "handle": "av_kondrashov",
    "status": "list_match",
    "source": "https://gazeta-nashe-moskvoreche-saburovo.ru/2026/10/02/149558/",
    "reviewed_date": "2026-11-25",
    "note": "Назван в графике отчётов; первичный протокол подтверждает статус на 24.09.2024.",
    "evidence": [
      "https://parking.mos.ru/upload/iblock/995/brc4vxkyl81hr9vluy32o2ic8i8fr11r.pdf",
      "https://gazeta-nashe-moskvoreche-saburovo.ru/kontakty/"
    ]
  },
  {
    "name": "Москалев Александр Евгеньевич",
    "district": "Москворечье-Сабурово",
    "handle": "aleks_moskalev",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Абертасов Андрей Алексеевич",
    "district": "Москворечье-Сабурово",
    "handle": "andrey.abertasov",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Комаха Вячеслав Михайлович",
    "district": "Москворечье-Сабурово",
    "handle": "vyacheslav_komaha",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кондратьева Екатерина Вадимовна",
    "district": "Москворечье-Сабурово",
    "handle": "kondratevaekaterina88",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кудинова Марина Феликсовна",
    "district": "Москворечье-Сабурово",
    "handle": "kudinovamarina",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Потёмкин Анатолий Викторович",
    "district": "Москворечье-Сабурово",
    "handle": "anatoli_viktorovich_potiomkin",
    "status": "review_required",
    "source": "https://mos-saburovo.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Каминский Юрий Викторович",
    "district": "Нагатино-Садовники",
    "handle": "deputat_kaminskiy",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Михарева Наталья Борисовна",
    "district": "Нагатино-Садовники",
    "handle": "natalyamikhareva",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Сафонова Татьяна Владимировна",
    "district": "Нагатино-Садовники",
    "handle": "safonovatatiana85",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Тихомиров Алексей Александрович",
    "district": "Нагатино-Садовники",
    "handle": "tikhomirovalexey",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Никольская Анджела Вадимовна",
    "district": "Нагатино-Садовники",
    "handle": "nikolskayaav",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Сезёмов Андрей Владимирович",
    "district": "Нагатино-Садовники",
    "handle": "andrey.sezemov",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Уваров Антон Анатольевич",
    "district": "Нагатино-Садовники",
    "handle": "antonuvarov90",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Чуганова Азиза Кабыльбековна",
    "district": "Нагатино-Садовники",
    "handle": "azizakabulovnachuganova",
    "status": "list_match",
    "source": "https://sovet.n-sadovniki.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Головин Михаил Сергеевич",
    "district": "Нагатинский Затон",
    "handle": "golovin_mikhail_sergeevich",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Горбунов Станислав Игоревич",
    "district": "Нагатинский Затон",
    "handle": "gorbunovsi",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Коршунова Наталья Евгеньевна",
    "district": "Нагатинский Затон",
    "handle": "korshunovane",
    "status": "list_match",
    "source": "https://gazeta-nagatinsky-zaton.ru/2026/06/01/140471/",
    "reviewed_date": "2026-11-25",
    "note": "Районное издание префектуры ЮАО сообщает об участии в обходе 30.05.2026 как депутата; более ранний официальный список Мосгоризбиркома подтверждает ФИО.",
    "evidence": [
      "https://www.mosgorizbirkom.ru/documents/41426/CustomDocument_41426.pdf",
      "https://gazeta-nagatinsky-zaton.ru/kontakty/"
    ]
  },
  {
    "name": "Кундыль Татьяна Евгеньевна",
    "district": "Нагатинский Затон",
    "handle": "kundyltatyana",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Рузина Лидия Владимировна",
    "district": "Нагатинский Затон",
    "handle": "l.ruzina",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Балыков Дмитрий Евгеньевич",
    "district": "Нагатинский Затон",
    "handle": "balykovde",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Башлыкова Мария Николаевна",
    "district": "Нагатинский Затон",
    "handle": "bashlykova.mari",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Быкова Юлия Валерьевна",
    "district": "Нагатинский Затон",
    "handle": "julia_byckova",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Винокуров Роман Евгеньевич",
    "district": "Нагатинский Затон",
    "handle": "romanvinokurov",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Горемыкин Михаил Юрьевич",
    "district": "Нагатинский Затон",
    "handle": "goremykinmy",
    "status": "review_required",
    "source": "https://nzaton.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Введенская Инна Васильевна",
    "district": "Нагорный",
    "handle": "vvedenskaya_i",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Виноградова Елена Михайловна",
    "district": "Нагорный",
    "handle": "vinogradova_len",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Кульнев Дмитрий Владимирович",
    "district": "Нагорный",
    "handle": "dkulnev",
    "status": "discrepancy",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Не найден в графике приёма на 2026 год; это не подтверждает прекращение полномочий."
  },
  {
    "name": "Рыгин Алексей Борисович",
    "district": "Нагорный",
    "handle": "rygin",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Шутов Павел Викторович",
    "district": "Нагорный",
    "handle": "pavel_v_shutov",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Бурова Екатерина Николаевна",
    "district": "Нагорный",
    "handle": "kostina1920",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "График приёма на 2026 год."
  },
  {
    "name": "Горн Виктор Викторович",
    "district": "Нагорный",
    "handle": "viktorgorn",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Новикова Юлия Ивановна",
    "district": "Нагорный",
    "handle": "id666378177",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Тарасенко Ольга Вячеславовна",
    "district": "Нагорный",
    "handle": "o.v.tarasenko",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Филиппова Татьяна Викторовна",
    "district": "Нагорный",
    "handle": "tatyana_filippova20",
    "status": "list_match",
    "source": "https://sovet.monagornoe.ru/grafik_priema_deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Совпадение с графиком приёма, не с решением о полномочиях."
  },
  {
    "name": "Дмитриева Наталия Николаевна",
    "district": "Орехово-Борисово Северное",
    "handle": "dmitrieva_n_n",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Коннова Елена Львовна",
    "district": "Орехово-Борисово Северное",
    "handle": "elena__konnova",
    "status": "list_match",
    "source": "https://mo-obs.ru/sovet-deputatov/deputatyi/",
    "reviewed_date": "2026-11-25",
    "note": "Указана в списке Совета."
  },
  {
    "name": "Лапланш Елена Львовна",
    "district": "Орехово-Борисово Северное",
    "handle": "elena_laplanche",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Мордовин Андрей Юрьевич",
    "district": "Орехово-Борисово Северное",
    "handle": "andreymordovin",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Баранчикова Наталья Алексеевна",
    "district": "Орехово-Борисово Северное",
    "handle": "baranchikova_natalia",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Долгашова Галина Георгиевна",
    "district": "Орехово-Борисово Северное",
    "handle": "galinadolgashova",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Ежкова Анна Александровна",
    "district": "Орехово-Борисово Северное",
    "handle": "anna_ezhkova",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Заплатникова Людмила Викторовна",
    "district": "Орехово-Борисово Северное",
    "handle": "liudmila_zapl",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кускова Надежда Юрьевна",
    "district": "Орехово-Борисово Северное",
    "handle": "nadezhda_kuskova",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Сысоева Людмила Анатольевна",
    "district": "Орехово-Борисово Северное",
    "handle": "sysoevala",
    "status": "list_match",
    "source": "https://mo-obs.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Глотова Ирина Борисовна",
    "district": "Орехово-Борисово Южное",
    "handle": "ib.glotova",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Демченков Максим Леонидович",
    "district": "Орехово-Борисово Южное",
    "handle": "demchenkov_ml",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Нефедова Светлана Юрьевна",
    "district": "Орехово-Борисово Южное",
    "handle": "svetlana_rodnik",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Новосельская Людмила Александровна",
    "district": "Орехово-Борисово Южное",
    "handle": "novoselskayala",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Ткач Ирина Петровна",
    "district": "Орехово-Борисово Южное",
    "handle": "tkachip",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Донская Татьяна Викторовна",
    "district": "Орехово-Борисово Южное",
    "handle": "tatiyana_donskaya",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Золкина Ирина Вячеславовна",
    "district": "Орехово-Борисово Южное",
    "handle": "i.v.zolkina",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Комиссарова Альбина Анатольевна",
    "district": "Орехово-Борисово Южное",
    "handle": "albinakomissarova2022",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Овчинникова Светлана Юрьевна",
    "district": "Орехово-Борисово Южное",
    "handle": "sovchinnikova79",
    "status": "list_match",
    "source": "https://mo-obu.ru/grafik-priema-deputatov-orehovo-borisovo-juzhnoe/",
    "reviewed_date": "2026-11-25",
    "note": "Указана в графике приёма Совета."
  },
  {
    "name": "Яшкин Андрей Петрович",
    "district": "Орехово-Борисово Южное",
    "handle": "ap.yashkin",
    "status": "list_match",
    "source": "https://mo-obu.ru/deputaty/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Булатов Александр Александрович",
    "district": "Царицыно",
    "handle": "aabulatov",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Видутина Оксана Вячеславовна",
    "district": "Царицыно",
    "handle": "vidutinaov",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Нуйкина Карина Вячеславовна",
    "district": "Царицыно",
    "handle": "nuykinakv",
    "status": "list_match",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25",
    "note": "Указана в составе комиссии Совета."
  },
  {
    "name": "Назарова Елена Андреевна",
    "district": "Царицыно",
    "handle": "elena.rubtsovanazarova",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Тишкова Елена Алексеевна",
    "district": "Царицыно",
    "handle": "tishkovaea",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Гаврилина Мария Сергеевна",
    "district": "Царицыно",
    "handle": "gavrilinams",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Тютюнникова Екатерина Владимировна",
    "district": "Царицыно",
    "handle": "ekaterina.tyutyunnikova",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Шабашева Наталья Викторовна",
    "district": "Царицыно",
    "handle": "natalia_shabasheva",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Шмакова Ольга Сергеевна",
    "district": "Царицыно",
    "handle": "shmakova_os",
    "status": "review_required",
    "source": "https://www.mcaricino.ru/munitsipalnoe-sobranie/komissii-soveta-deputatov/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Абрамова Елена Ивановна",
    "district": "Чертаново Северное",
    "handle": "abramovaei_chs",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Горбачёв Антон Сергеевич",
    "district": "Чертаново Северное",
    "handle": "antongorbachev",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Курапов Пётр Геннадьевич",
    "district": "Чертаново Северное",
    "handle": "petr.kurapov",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Морозова Ирина Викторовна",
    "district": "Чертаново Северное",
    "handle": "i_v_morozova",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Смирнов Валерий Николаевич",
    "district": "Чертаново Северное",
    "handle": "smirnovvalerii",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Андреева Светлана Александровна",
    "district": "Чертаново Северное",
    "handle": "andreevasvetlanaaleksandrovna",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/resheniya_soveta_deputatov1/23259_chs010360_ob_utverzhdenii_grafika_lichnogo_priema_izbiratelej_deputatami_soveta_deputatov_vnutrigorodskogo_municipalnogo_o/",
    "reviewed_date": "2026-11-25",
    "note": "Решение № ЧС-01-03-60, график IV квартала 2026 года."
  },
  {
    "name": "Лукоянов Алексей Александрович",
    "district": "Чертаново Северное",
    "handle": "lukoyanov_chs",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Морозов Максим Александрович",
    "district": "Чертаново Северное",
    "handle": "maxsimmorozov",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Ряхмятуллина Алла Рафековна",
    "district": "Чертаново Северное",
    "handle": "riakhmiatullina",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Тозик Александр Михайлович",
    "district": "Чертаново Северное",
    "handle": "tozikam",
    "status": "list_match",
    "source": "https://sovet.ch-sever.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Коношенко Богдан Александрович",
    "district": "Чертаново Центральное",
    "handle": "bogdan.konoshenko",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Ларионова Евгения Иосифовна",
    "district": "Чертаново Центральное",
    "handle": "eilarionova_556",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Полозов Сергей Андреевич",
    "district": "Чертаново Центральное",
    "handle": "polozovs",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Родина Ирина Алексеевна",
    "district": "Чертаново Центральное",
    "handle": "i_rodina",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Смитиенко Степан Борисович",
    "district": "Чертаново Центральное",
    "handle": "smitsb",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Мелешин Василий Владимирович",
    "district": "Чертаново Центральное",
    "handle": "vasiliy_meleshin",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Миронов Дмитрий Павлович",
    "district": "Чертаново Центральное",
    "handle": "mironovdp",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Репкина Елена Владимировна",
    "district": "Чертаново Центральное",
    "handle": "repkinae",
    "status": "list_match",
    "source": "https://sovet.chertanovocentr.ru/grafik_prima_naseleniya/",
    "reviewed_date": "2026-11-25",
    "note": "Указана в графике приёма Совета, содержащем сведения за 2026 год."
  },
  {
    "name": "Рыбакова Евгения Валентиновна",
    "district": "Чертаново Центральное",
    "handle": "rybakovaev_1582",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Шиндряева Наталья Николаевна",
    "district": "Чертаново Центральное",
    "handle": "n_shindryayeva",
    "status": "review_required",
    "source": "https://sovet.chertanovocentr.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Зотова Маргарита Сергеевна",
    "district": "Чертаново Южное",
    "handle": "ms_zotova",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кашлев Сергей Николаевич",
    "district": "Чертаново Южное",
    "handle": "sergey_kashlev",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Кураш Ирина Анатольевна",
    "district": "Чертаново Южное",
    "handle": "ikurash1",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Новиков Александр Анатольевич",
    "district": "Чертаново Южное",
    "handle": "alexandr_novikov_chu",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Птушкина Наталья Александровна",
    "district": "Чертаново Южное",
    "handle": "n.ptushkina56",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Бордовская Ольга Геннадьевна",
    "district": "Чертаново Южное",
    "handle": "bordovskaya_og",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Гунина Екатерина Алексеевна",
    "district": "Чертаново Южное",
    "handle": "gunina_ea",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Леонова Наталья Александровна",
    "district": "Чертаново Южное",
    "handle": "nleonovannnn",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Маркова Татьяна Владимировна",
    "district": "Чертаново Южное",
    "handle": "markova_tat_vl",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  },
  {
    "name": "Смирнова Елена Владимировна",
    "district": "Чертаново Южное",
    "handle": "smirnovaev1",
    "status": "list_match",
    "source": "https://sovet.vmo-chu.ru/",
    "reviewed_date": "2026-11-25"
  }
];
const index=makeIndex(rows);
const api={lookup:(name,district,handle)=>lookup(index,name,district,handle),render:(name,district,handle)=>renderStatus(lookup(index,name,district,handle))};
if(typeof module==="object"&&module.exports)module.exports={...api,rows,makeIndex,renderStatus};
if(root)root.dmMandateReview=api;
})(typeof window==="object"?window:null);

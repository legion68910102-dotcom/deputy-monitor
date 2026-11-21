#!/usr/bin/env python3
"""Collect confirmed public VK wall posts through the official API if a token is configured."""
import datetime as dt
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HANDLES=["natalia_shabasheva","shmakova_os","ekaterina.tyutyunnikova","aabulatov","vidutinaov","tishkovaea","elena.rubtsovanazarova","nuykinakv"]
token=os.getenv("VK_TOKEN","").strip()
now=dt.datetime.now(dt.timezone.utc).isoformat()
out=Path("vk-posts.json")
existing={"generated_at":None,"posts":[]}
if out.exists():
    try:
        loaded=json.loads(out.read_text(encoding="utf-8"))
        if isinstance(loaded.get("posts"),list): existing=loaded
    except (ValueError,OSError): pass
stored={(p["profile"],p["url"]):p for p in existing["posts"] if isinstance(p,dict) and p.get("source")=="vk_api" and p.get("profile") in HANDLES and isinstance(p.get("url"),str)}
statuses={}
for handle in HANDLES:
    if not token:
        statuses[handle]={"status":"needs_token","checked_at":None,"reason":"VK API недоступен: ключ не настроен. Публикации не собирались."}
        continue
    params=urllib.parse.urlencode({"domain":handle,"count":100,"filter":"owner","v":"5.199"})
    request=urllib.request.Request("https://api.vk.com/method/wall.get?"+params,headers={"Authorization":"Bearer "+token,"User-Agent":"DeputyMonitor/1.0"})
    try:
        with urllib.request.urlopen(request,timeout=25) as response:
            data=json.load(response)
        if "error" in data:
            error=data["error"]
            statuses[handle]={"status":"checked_unavailable","checked_at":now,"reason":"VK API: "+str(error.get("error_msg","ошибка"))[:180]}
            continue
        items=data["response"]["items"]
        count=0
        for post in items:
            if post.get("is_deleted") or post.get("marked_as_ads"): continue
            if post.get("from_id",post.get("owner_id")) != post.get("owner_id"): continue
            owner=post.get("owner_id"); pid=post.get("id")
            if not isinstance(owner,int) or not isinstance(pid,int): continue
            url=f"https://vk.com/wall{owner}_{pid}"
            record={"profile":handle,"date":dt.datetime.fromtimestamp(post["date"],dt.timezone(dt.timedelta(hours=3))).date().isoformat(),"url":url,"text":post.get("text",""),"likes":post.get("likes",{}).get("count"),"comments":post.get("comments",{}).get("count"),"reposts":post.get("reposts",{}).get("count"),"views":post.get("views",{}).get("count"),"followers":None,"source":"vk_api"}
            stored[(handle,url)]=record
            count+=1
        statuses[handle]={"status":"success","checked_at":now,"reason":"Получено публикаций из VK API за проверку: "+str(count),"posts_count":count}
    except (urllib.error.URLError,TimeoutError,ValueError,KeyError,TypeError) as exc:
        statuses[handle]={"status":"checked_unavailable","checked_at":now,"reason":"Не удалось получить публикации: "+type(exc).__name__}
report={"schema_version":1,"generated_at":now,"source":"Official VK API; no inferred metrics","profiles":statuses}
Path("monitor-status.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
out.write_text(json.dumps({"generated_at":now,"source":"VK API","posts":sorted(stored.values(),key=lambda p:p.get("date",""),reverse=True)},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Checked",len(statuses),"profiles; VK API successes",sum(s["status"]=="success" for s in statuses.values()),"; retained posts",len(stored))

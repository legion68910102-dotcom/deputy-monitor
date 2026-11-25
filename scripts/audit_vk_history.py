#!/usr/bin/env python3
"""Audit public VK roster and publication history without exposing credentials."""
import json
import os
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path
from monitoring_term import load_term, post_in_term
from collect_vk import read_json, write_json_atomic, API_VERSION

ROOT = Path(__file__).resolve().parents[1]

def audit(root):
    term=load_term(root)
    posts=read_json(root/"vk-posts.json",{})["posts"]
    monitor=read_json(root/"monitor-status.json",{})
    grouped=defaultdict(list)
    for p in posts:
        if post_in_term(p,term):
            grouped[p["profile"]].append(p["date"][:10])
    rows=[]
    for person in term["roster"]:
        h=person["handle"]
        state=monitor.get("profiles",{}).get(h,{})
        dates=grouped[h]
        rows.append({"name":person["name"],"district":person["district"],"profile":h,
                     "posts_in_term":len(dates),"oldest_saved_in_term":min(dates,default=None),
                     "latest_saved_in_term":max(dates,default=None),
                     "wall_status":state.get("status","not_checked"),"wall_reason":state.get("reason"),
                     "history_coverage":"not_verified"})
    return {"term":{"start":term["start"],"end":term["end"]},"roster_count":len(rows),
            "all_archive_posts":len(posts),"term_posts":sum(r["posts_in_term"] for r in rows),
            "with_posts":sum(bool(r["posts_in_term"]) for r in rows),"profiles":rows}

def resolve(handle, token):
    form=urllib.parse.urlencode({"screen_name":handle,"v":API_VERSION,"access_token":token}).encode()
    req=urllib.request.Request("https://api.vk.ru/method/utils.resolveScreenName",data=form,method="POST",headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"DeputyMonitor/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            payload=json.load(response)
    except (OSError,ValueError,TypeError) as exc:
        return {"status":"request_failed","kind":type(exc).__name__}
    if "error" in payload:
        return {"status":"api_error","code":payload["error"].get("error_code")}
    value=payload.get("response")
    if isinstance(value,dict) and value.get("type") in ("user","group","page","event") and type(value.get("object_id")) is int:
        return {"status":"resolved","type":value["type"]}
    return {"status":"not_resolved"}

def main():
    result=audit(ROOT)
    token=os.environ.get("VK_TOKEN","").strip()
    for r in result["profiles"]:
        if r["wall_reason"]=="vk_api_error_100" and token:
            r["address_check"]=resolve(r["profile"],token)
            print(json.dumps({"profile":r["profile"],"address_check":r["address_check"]},ensure_ascii=False))
            if r["address_check"].get("code") in (5,27,29,111):
                break
            time.sleep(.6)
    write_json_atomic(ROOT/"reports/vk-history-audit.json",result)
    print(json.dumps({k:v for k,v in result.items() if k!="profiles"},ensure_ascii=False))
    print("No wall restrictions bypassed; no roster or publication changes.")
if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""Prepare and explicitly publish a verified new roster and its five-year term.
No network calls. Previous roster, posts, reports and analysis are archived.
"""
import argparse
import datetime as dt
import json
import re
import shutil
from pathlib import Path
from monitoring_term import load_term, PREFIX

MOSCOW = dt.timezone(dt.timedelta(hours=3))
ROOT = Path(__file__).resolve().parents[1]
def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def five_year_end(start):
    try:
        anniversary = start.replace(year=start.year+5)
    except ValueError:
        anniversary = dt.date(start.year+5, 3, 1)
    return anniversary - dt.timedelta(days=1)

def plan(old, payload, start, today):
    if start <= dt.date.fromisoformat(old["end"]):
        raise ValueError("New term must start after the previous inclusive end date")
    if start > today:
        raise ValueError("A future or unconfirmed roster cannot be activated")
    people = payload.get("deputies")
    if not isinstance(people, list) or not people:
        raise ValueError("Supply the verified new deputies.json format")
    if any(not isinstance(p, dict) or not all(isinstance(p.get(k), str) and p[k].strip() for k in ("name","district","handle","source")) for p in people):
        raise ValueError("Each deputy needs name, district, VK handle and verified source")
    if any(not re.fullmatch(r"[A-Za-z0-9_.-]+",p["handle"]) or not p["source"].startswith("https://") for p in people):
        raise ValueError("Invalid handle or source URL")
    if len({p["handle"].casefold() for p in people}) != len(people):
        raise ValueError("Duplicate VK handles")
    if len({(p["district"],p["name"].casefold()) for p in people}) != len(people):
        raise ValueError("Duplicate deputy entries")
    if {p["district"] for p in people} != {p["district"] for p in old["roster"]}:
        raise ValueError("Verify all districts; geographic changes require a separate update")
    archive = "archives/term-" + old["id"]
    previous = list(old.get("previous", [])) + [{"id":old["id"],"start":old["start"],"end":old["end"],"archive":archive}]
    return {"schema_version":1,"id":start.isoformat(),"start":start.isoformat(),"end":five_year_end(start).isoformat(),"roster":[{k:p[k] for k in ("name","district","handle","source")} for p in people],"previous":previous}

def activate(root, payload, start, today, apply=False):
    old = load_term(root)
    new = plan(old,payload,start,today)
    print("Approved roster:",len(new["roster"]),"profiles; period:",new["start"],"to",new["end"])
    if not apply:
        print("Dry run only. No files changed.")
        return new
    archive = root / ("archives/term-" + old["id"])
    if archive.exists():
        raise ValueError("Archive already exists; refusing to overwrite")
    raw_path = root / "vk-posts.json"
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    if not isinstance(raw.get("posts"),list):
        raise ValueError("Invalid post archive")
    archive.mkdir(parents=True)
    for name in ("deputies.json","monitoring-term-v1.js","vk-posts.json","monitor-status.json","ai-analysis.json","Deputies_YUAO_Report.xlsx","Deputies_YUAO_Ranking.xlsx"):
        src = root / name
        if src.exists():
            shutil.copy2(src,archive / name)
    # The source publications remain intact, including dates and text.
    # Only old-run status metadata is retired into the preserved archive.
    for key in ("vk_api_last_run","vk_api_last_checked_at","profile_status","monitored_profiles","import_diagnostics"):
        raw.pop(key,None)
    dump(raw_path,raw)
    dump(root / "deputies.json",payload)
    (root / "monitoring-term-v1.js").write_text("/* Approved shared monitoring period. */\n"+PREFIX+json.dumps(new,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    dump(root / "monitor-status.json",{"schema_version":1,"generated_at":None,"roster_size":len(new["roster"]),"district_count":len({p["district"] for p in new["roster"]}),"profiles":{p["handle"]:{"status":"not_checked","checked_at":None,"reason":"New monitoring term; awaiting first check"} for p in new["roster"]},"monitoring_term":new["id"]})
    return new

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--roster",type=Path,required=True)
    ap.add_argument("--start",required=True)
    ap.add_argument("--apply",action="store_true")
    a=ap.parse_args()
    payload=json.loads(a.roster.read_text(encoding="utf-8"))
    activate(ROOT,payload,dt.date.fromisoformat(a.start),dt.datetime.now(MOSCOW).date(),a.apply)
if __name__=="__main__":
    main()

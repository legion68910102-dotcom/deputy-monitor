#!/usr/bin/env python3
"""Apply an explicitly verified roster revision within the current term, without resetting dates."""
import argparse
import datetime as dt
import json
from pathlib import Path
from monitoring_term import load_term, PREFIX

def revise(root, payload, today, apply=False):
    term = load_term(root)
    if not term["start"] <= today.isoformat() <= term["end"]:
        raise ValueError("Use the new-term workflow outside the current term")
    rows = payload.get("deputies")
    if not isinstance(rows,list) or not rows or any(not isinstance(p,dict) or not all(isinstance(p.get(k),str) and p[k].strip() for k in ("name","district","handle","source")) for p in rows):
        raise ValueError("Full reviewed roster with VK handle and source required")
    if any(not p["source"].startswith("https://") or not p["handle"].isascii() or not all(c.isalnum() or c in "_.-" for c in p["handle"]) for p in rows):
        raise ValueError("Invalid VK handle or source")
    if len({p["handle"].casefold() for p in rows}) != len(rows) or len({(p["district"],p["name"].casefold()) for p in rows}) != len(rows):
        raise ValueError("Duplicate deputies or VK handles")
    if {p["district"] for p in rows} != {p["district"] for p in term["roster"]}:
        raise ValueError("Full list for every district required")
    old={p["handle"]:p for p in term["roster"]}
    new={p["handle"]:{k:p[k] for k in ("name","district","handle","source")} for p in rows}
    print("Roster:",len(old),"->",len(new),"; added:",len(new.keys()-old.keys()),"; removed:",len(old.keys()-new.keys()),"; period unchanged:",term["start"],term["end"])
    if not apply:
        return
    if old==new:
        print("No roster changes")
        return
    # Keep previous roster revisions in Git history and in the configuration.
    term.setdefault("roster_revisions",[]).append({"revised_on":today.isoformat(),"roster":term["roster"]})
    term["roster"]=list(new.values())
    (root/"deputies.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (root/"monitoring-term-v1.js").write_text("/* Approved shared monitoring period. */\n"+PREFIX+json.dumps(term,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    status_path=root/"monitor-status.json"
    status=json.loads(status_path.read_text(encoding="utf-8"))
    # Retire the previous run summary; it described a different roster.
    status.pop("vk_api_last_run",None)
    status["roster_size"]=len(new)
    status["profiles"]={h:status.get("profiles",{}).get(h,{"status":"not_checked","checked_at":None,"reason":"Newly added profile"}) if old.get(h)==new[h] else {"status":"not_checked","checked_at":None,"reason":"New or revised profile"} for h in new}
    status_path.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--roster",type=Path,required=True)
    p.add_argument("--apply",action="store_true")
    a=p.parse_args()
    revise(Path(__file__).resolve().parents[1],json.loads(a.roster.read_text(encoding="utf-8")),dt.datetime.now(dt.timezone(dt.timedelta(hours=3))).date(),a.apply)

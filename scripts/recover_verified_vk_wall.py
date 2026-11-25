#!/usr/bin/env python3
"""Collect one verified public wall, preserving full-roster freshness metadata."""
import datetime as dt
import json
import os
from pathlib import Path
from collect_vk import api_wall_get, normalize_post, merge_record, read_json, write_json_atomic, VK_PUBLIC_IDS
from monitoring_term import load_term

ROOT=Path(__file__).resolve().parents[1]
H="semenovdmitry80"

def main():
    token=os.environ.get("VK_TOKEN","").strip()
    if not token: raise SystemExit("Missing token")
    term=load_term(ROOT)
    if H not in {p["handle"] for p in term["roster"]}: raise SystemExit("Not in approved roster")
    archive=read_json(ROOT/"vk-posts.json",{})
    monitor=read_json(ROOT/"monitor-status.json",{})
    history=read_json(ROOT/"vk-history-progress.json",{})
    if not isinstance(archive.get("posts"),list) or not isinstance(monitor.get("profiles"),dict) or history.get("term_id")!=term["id"]: raise SystemExit("Invalid local data")
    payload=api_wall_get(H,token)
    if "error" in payload: raise SystemExit("VK error "+str(payload["error"].get("error_code")))
    items=payload["response"]["items"]
    if not items: raise SystemExit("No items; do not assume activity")
    records=archive["posts"]
    idx={(p.get("profile"),p.get("url")):i for i,p in enumerate(records) if isinstance(p,dict)}
    inserted=updated=accepted=0
    for p in items:
        row=normalize_post(p,H)
        if not row: continue
        accepted+=1
        key=(H,row["url"])
        if key in idx:
            i=idx[key];new=merge_record(records[i],row)
            if records[i]!=new: records[i]=new;updated+=1
        else:
            idx[key]=len(records);records.append(row);inserted+=1
    if not accepted: raise SystemExit("No valid owner records")
    archive["posts"]=sorted(records,key=lambda r:r.get("date","") if isinstance(r,dict) else "",reverse=True)
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    monitor["profiles"][H]={"status":"success","checked_at":now,"posts_count":accepted,"reason":"Публичная стена получена по подтверждённому числовому VK ID.","history_coverage":"latest_page_only","verified_public_id":VK_PUBLIC_IDS[H]}
    states=history["profiles"]
    states[H]={"state":"pending","offset":0}
    handles=[p["handle"] for p in term["roster"]]
    complete=sum(states.get(h,{}).get("state")=="complete" for h in handles)
    pending=sum(monitor["profiles"].get(h,{}).get("status")=="success" and states.get(h,{}).get("state") not in ("complete","blocked") for h in handles)
    blocked=len(handles)-complete-pending
    history["last_run"].update(history_complete=complete,history_pending=pending,history_blocked=blocked,archive_posts=len(records),roster_size=len(handles),roster_reconciled_on=now)
    history["enabled"]=bool(pending) and not history["last_run"].get("stopped_reason")
    for name,data in [("vk-posts.json",archive),("monitor-status.json",monitor),("vk-history-progress.json",history)]: write_json_atomic(ROOT/name,data)
    print("RECOVERY_COMMIT "+json.dumps({"profile":H,"requests":1,"accepted":accepted,"inserted":inserted,"updated":updated,"history_pending":pending,"history_blocked":blocked}))

if __name__=="__main__": main()

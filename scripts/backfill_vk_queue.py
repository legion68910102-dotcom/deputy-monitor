#!/usr/bin/env python3
"""Bounded, resumable official VK history backfill. Never change recent-run coverage."""
import argparse
import datetime as dt
import json
import os
import time
import urllib.error
from pathlib import Path
from collect_vk import api_wall_get, normalize_post, merge_record, read_json, write_json_atomic, MOSCOW
from monitoring_term import load_term

ROOT=Path(__file__).resolve().parents[1]
STATE="vk-history-progress.json"

def ident(post):
    return str(post.get("owner_id"))+"_"+str(post.get("id")) if isinstance(post,dict) and type(post.get("id")) is int and type(post.get("owner_id")) is int else None

def run(root,token,budget=50,fetch=api_wall_get,pause=time.sleep):
    if not token or not 1<=budget<=50:
        raise ValueError("A configured key and a budget of 1–50 requests are required")
    term=load_term(root)
    if not term["start"]<=dt.datetime.now(MOSCOW).date().isoformat()<=term["end"]:
        raise ValueError("Outside active monitoring term")
    archive=read_json(root/"vk-posts.json",{})
    records=archive.get("posts")
    if not isinstance(records,list):
        raise ValueError("Invalid existing archive; nothing overwritten")
    status=read_json(root/"monitor-status.json",{}).get("profiles",{})
    progress=read_json(root/STATE,{})
    if progress.get("term_id")!=term["id"]:
        progress={"term_id":term["id"],"start":term["start"],"profiles":{}}
    states=progress["profiles"]
    handles=[p["handle"] for p in term["roster"]]
    index={(p.get("profile"),p.get("url")):i for i,p in enumerate(records) if isinstance(p,dict) and p.get("profile") and p.get("url")}
    calls=inserted=updated=0
    stopped=None
    # One page at a time, then rotate to the least recently checked pending wall.
    while calls<budget:
        pending=[h for h in handles if status.get(h,{}).get("status")=="success" and states.get(h,{}).get("state") not in ("complete","blocked")]
        if not pending: break
        h=min(pending,key=lambda x:states.get(x,{}).get("last_attempt",""))
        state=states.setdefault(h,{"state":"pending","offset":0})
        state["last_attempt"]=dt.datetime.now(dt.timezone.utc).isoformat()
        offset=state.get("offset",0)
        anchor=state.get("anchor")
        if calls: pause(.6)
        calls+=1
        try:
            payload=fetch(h,token,offset)
        except (OSError,ValueError,TypeError) as e:
            stopped="network_"+type(e).__name__
            break
        if not isinstance(payload,dict):
            stopped="unexpected_response";break
        if "error" in payload:
            code=payload["error"].get("error_code")
            state["last_error"]="vk_api_error_"+str(code)
            if code in (5,6,8,9,27,28,29,111,1051):
                stopped=state["last_error"];break
            state["state"]="blocked"
            continue
        result=payload.get("response")
        if not isinstance(result,dict) or not isinstance(result.get("items"),list):
            stopped="invalid_items";break
        batch=result["items"]
        keys=[ident(p) for p in batch]
        # Persist already obtained records even if the cursor must be restarted.
        for p in batch:
            row=normalize_post(p,h)
            if not row or not term["start"]<=row["date"]<=term["end"]: continue
            key=(h,row["url"])
            if key in index:
                i=index[key]; merged=merge_record(records[i],row)
                if merged!=records[i]: records[i]=merged;updated+=1
            else:
                index[key]=len(records);records.append(row);inserted+=1
        if anchor and anchor not in keys:
            # The wall changed between batches. Do not infer contiguous coverage.
            state.update(state="pending",offset=0,anchor=None,last_error="cursor_shift_restart")
            continue
        dated=[normalize_post(p,h) for p in batch if isinstance(p,dict) and not p.get("is_pinned")]
        dated=[p["date"] for p in dated if p]
        state["pages_read"]=state.get("pages_read",0)+1
        state.pop("last_error",None)
        # All observed non-pinned dated entries must precede the boundary.
        if len(batch)<100 or (dated and all(d<term["start"] for d in dated)):
            state.update(state="complete",offset=0,anchor=None)
        elif keys and keys[-1]:
            state.update(state="pending",offset=offset+75,anchor=keys[-1])
        else:
            state.update(state="blocked",last_error="invalid_cursor")
    archive["posts"]=sorted(records,key=lambda p:p.get("date","") if isinstance(p,dict) else "",reverse=True)
    # GitHub rejects blobs >=100 MB. Do not silently lose progress on an oversized file.
    if len(json.dumps(archive,ensure_ascii=False,indent=2).encode("utf-8"))>90_000_000:
        raise ValueError("Archive approaches GitHub file size limit; migrate storage before continuing")
    summary={"requests":calls,"new_posts":inserted,"updated_posts":updated,"archive_posts":len(records),
             "history_complete":sum(states.get(h,{}).get("state")=="complete" for h in handles),
             "history_pending":sum(status.get(h,{}).get("status")=="success" and states.get(h,{}).get("state") not in ("complete","blocked") for h in handles),
             "history_blocked":sum(states.get(h,{}).get("state")=="blocked" or status.get(h,{}).get("status")!="success" for h in handles),
             "stopped_reason":stopped,"roster_size":len(handles)}
    progress["last_run"]=summary
    if stopped:
        progress["enabled"]=False
    else:
        progress["enabled"]=bool(summary["history_pending"])
    # Keep existing full-run freshness and diagnostics unchanged.
    write_json_atomic(root/"vk-posts.json",archive)
    write_json_atomic(root/STATE,progress)
    return summary

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--budget",type=int,default=50)
    a=ap.parse_args()
    print(json.dumps(run(ROOT,os.environ.get("VK_TOKEN","").strip(),a.budget),ensure_ascii=False))
if __name__=="__main__":
    main()

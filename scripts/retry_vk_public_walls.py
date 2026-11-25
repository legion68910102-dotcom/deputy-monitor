#!/usr/bin/env python3
"""One bounded retry of 16 existing public walls; resolve address errors through users.get."""
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 28
FATAL = {5, 6, 8, 9, 27, 29, 111}
TARGET_ERRORS = {15, 30, 100}

class Stop(Exception):
    pass

def code(payload):
    err = payload.get("error")
    return err.get("error_code") if isinstance(err, dict) else None

def norm(value):
    return " ".join(str(value or "").casefold().replace("ё", "е").split())

def wall_result(payload):
    if code(payload) is not None:
        return "wall_error", code(payload)
    result = payload.get("response")
    if isinstance(result, dict) and isinstance(result.get("items"), list):
        return "wall_read_ok", len(result["items"])
    return "invalid_wall_response", None

def retry(person, prior, call, resolver):
    h = person["handle"]
    row = {"handle": h, "prior": prior}
    # Recheck the normal public endpoint once. No different credential or private access.
    status, detail = wall_result(call("wall.get", {"domain": h, "count": 1, "filter": "owner"}))
    row.update(result=status, detail=detail)
    if status != "wall_error" or detail != 100 or prior != 100:
        return row
    if not resolver["available"]:
        return dict(row, resolution="users_get_unavailable")
    profile = call("users.get", {"user_ids": h, "fields": "screen_name"})
    err = code(profile)
    if err is not None:
        if err in {7, 28, 1051}:
            resolver["available"] = False
        return dict(row, resolution="users_get_error", resolution_code=err)
    users = profile.get("response")
    if not isinstance(users, list) or len(users) != 1 or not isinstance(users[0], dict):
        return dict(row, resolution="address_not_resolved")
    user = users[0]
    uid = user.get("id")
    expected = norm(person["name"]).split()
    if len(expected) < 2 or norm(user.get("last_name")) != expected[0] or norm(user.get("first_name")) != expected[1] or norm(user.get("screen_name")) != norm(h) or type(uid) is not int or uid <= 0:
        return dict(row, resolution="identity_not_verified")
    if user.get("deactivated"):
        return dict(row, resolution="deactivated")
    if user.get("is_closed") is not False:
        return dict(row, resolution="closed_or_privacy_unknown")
    # The official v5.199 schema permits a numerical domain.
    status, detail = wall_result(call("wall.get", {"domain": uid, "count": 1, "filter": "owner"}))
    return dict(row, resolution="numeric_domain_checked", numeric_result=status, numeric_detail=detail,
                **({"verified_public_id": uid} if status == "wall_read_ok" else {}))

def self_test():
    p = {"handle": "sample", "name": "Тестов Иван Иванович"}
    def mock(responses):
        calls=[]
        def call(method, params):
            calls.append((method, params))
            return responses.pop(0)
        return call,calls
    err=lambda c:{"error":{"error_code":c}}
    user={"id":12,"first_name":"Иван","last_name":"Тестов","screen_name":"sample","is_closed":False}
    call,calls=mock([err(15)])
    assert retry(p,15,call,{"available":True})["detail"]==15 and len(calls)==1
    call,calls=mock([err(100),{"response":[user]},{"response":{"items":[]}}])
    assert retry(p,100,call,{"available":True})["verified_public_id"]==12
    assert calls[2][1]["domain"]==12
    call,calls=mock([err(100),{"response":[dict(user,is_closed=True)]}])
    assert retry(p,100,call,{"available":True})["resolution"]=="closed_or_privacy_unknown" and len(calls)==2
    call,calls=mock([err(100),{"response":[dict(user,first_name="Другой")]}])
    assert retry(p,100,call,{"available":True})["resolution"]=="identity_not_verified" and len(calls)==2
    resolver={"available":True}
    call,calls=mock([err(100),err(1051)])
    assert retry(p,100,call,resolver)["resolution_code"]==1051 and not resolver["available"]
    call,calls=mock([err(100)])
    assert retry(p,100,call,resolver)["resolution"]=="users_get_unavailable" and len(calls)==1
    print("Offline retry checks passed")

def main():
    if "--self-test" in sys.argv:
        self_test()
        return 0
    token=os.environ.get("VK_TOKEN","").strip()
    if not token:
        print("Missing VK_TOKEN; 0 requests")
        return 1
    roster=json.loads((ROOT/"deputies.json").read_text(encoding="utf-8"))["deputies"]
    status=json.loads((ROOT/"monitor-status.json").read_text(encoding="utf-8"))["profiles"]
    targets=[]
    for p in roster:
        s=status.get(p["handle"],{})
        if s.get("status")=="checked_unavailable" and s.get("reason") in {f"vk_api_error_{i}" for i in TARGET_ERRORS}:
            targets.append((p,int(s["reason"].split("_")[-1])))
    if len(targets)>16:
        print("Scope changed; no requests")
        return 1
    targets.sort(key=lambda pair:(pair[1]!=100,pair[0]["handle"]))
    requests=0
    def call(method, params):
        nonlocal requests
        if requests>=LIMIT:
            raise Stop("request_budget")
        if requests: time.sleep(.7)
        requests+=1
        form=urllib.parse.urlencode(dict(params,v="5.199",access_token=token)).encode("utf-8")
        req=urllib.request.Request("https://api.vk.ru/method/"+method,data=form,method="POST",headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"DeputyMonitor/1.0"})
        try:
            with urllib.request.urlopen(req,timeout=15) as response:
                payload=json.load(response)
        except urllib.error.HTTPError as exc:
            raise Stop("http_"+str(exc.code)) from None
        except (OSError,ValueError,TypeError):
            raise Stop("network_or_invalid_json") from None
        if not isinstance(payload,dict):
            raise Stop("invalid_response")
        error=code(payload)
        if error in FATAL or (method=="wall.get" and error in {28,1051}):
            raise Stop("vk_api_error_"+str(error))
        return payload
    rows=[]
    stopped=None
    resolver={"available":True}
    for person,prior in targets:
        try:
            row=retry(person,prior,call,resolver)
            rows.append(row)
            print(json.dumps(row,ensure_ascii=False),flush=True)
        except Stop as exc:
            stopped=str(exc)
            break
    summary={"checked_at":dt.datetime.now(dt.timezone.utc).isoformat(),"targets":len(targets),"requests":requests,
             "request_limit":LIMIT,"stopped_reason":stopped,"profiles":rows}
    out=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"vk-recovery-result.json"
    out.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RECOVERY_SUMMARY "+json.dumps(summary,ensure_ascii=False),flush=True)
    return 1 if stopped else 0

if __name__=="__main__":
    sys.exit(main())

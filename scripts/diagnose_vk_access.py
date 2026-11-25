#!/usr/bin/env python3
"""Read-only official VK credential diagnosis. Never log token, body, request parameters or personal data."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ENDPOINT = "https://api.vk.ru/method/wall.get"

def format_issue(raw):
    token = raw.strip()
    if not token:
        return "missing"
    if any(c in token for c in "•●…*") or "..." in token:
        return "masked_or_placeholder"
    if any(c.isspace() for c in token) or token.startswith(("'", '"', "http:", "https:")):
        return "not_a_plain_key"
    return None

def safe_result(payload):
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        code = error.get("error_code")
        sub = error.get("error_subcode",error.get("subcode"))
        msg = str(error.get("error_msg","")).lower()
        hint = "unclassified"
        if sub == 1130 or (code == 5 and "ip address" in msg):
            hint = "ip_binding"
        elif "expired" in msg:
            hint = "expired"
        elif "revoked" in msg:
            hint = "revoked"
        elif "invalid access token" in msg or "invalid access_token" in msg:
            hint = "invalid_token"
        elif code in (7,15,27,28,1051):
            hint = "permission_or_token_type"
        elif code == 5:
            hint = "authorization_failed"
        return {"status":"vk_error","code":code if type(code) is int else None,"subcode":sub if type(sub) is int else None,"hint":hint}
    result = payload.get("response") if isinstance(payload,dict) else None
    if isinstance(result,dict) and isinstance(result.get("items"),list):
        return {"status":"wall_read_ok","returned_items":len(result["items"])}
    return {"status":"unexpected_response"}

def main():
    raw = os.environ.get("VK_TOKEN","")
    issue = format_issue(raw)
    if issue:
        print(json.dumps({"status":issue,"requests":0}))
        return 1
    # The public wall supplied by the project owner in the earlier manual test.
    form = urllib.parse.urlencode({"owner_id":3139512,"count":1,"filter":"owner","v":"5.199","access_token":raw.strip()}).encode()
    req = urllib.request.Request(ENDPOINT,data=form,method="POST",headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"DeputyMonitor/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            info = safe_result(json.load(response))
    except urllib.error.HTTPError as exc:
        info = {"status":"http_error","code":exc.code}
    except (OSError,ValueError,TypeError) as exc:
        info = {"status":"request_failed","kind":type(exc).__name__}
    info["requests"]=1
    print(json.dumps(info))
    return 0 if info["status"]=="wall_read_ok" else 1

if __name__=="__main__":
    sys.exit(main())

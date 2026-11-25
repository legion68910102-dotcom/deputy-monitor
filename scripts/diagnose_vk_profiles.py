#!/usr/bin/env python3
"""Bounded, read-only diagnostics for previously unavailable public VK profiles."""
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
LIMIT = 44
STOP = {5, 6, 8, 9, 27, 28, 29, 111, 1051}
REASONS = {"vk_api_error_100", "vk_api_error_15", "vk_api_error_30"}

class Halt(Exception):
    pass

def error_code(payload):
    err = payload.get("error") if isinstance(payload, dict) else None
    code = err.get("error_code") if isinstance(err, dict) else None
    return code if type(code) is int else None

def classify(handle, prior, call):
    row = {"handle": handle, "prior": prior}
    resolved = call("utils.resolveScreenName", {"screen_name": handle})
    code = error_code(resolved)
    if code is not None:
        return dict(row, result="resolve_error", code=code)
    obj = resolved.get("response")
    if not obj:
        return dict(row, result="address_not_resolved")
    if not isinstance(obj, dict):
        return dict(row, result="unexpected_resolve_response")
    uid = obj.get("object_id")
    if obj.get("type") != "user" or type(uid) is not int or uid <= 0:
        return dict(row, result="address_not_user")
    row["public_id"] = uid
    # For access-denied or privacy errors, check public account metadata first.
    # Never request the wall of a known closed or deactivated account.
    if prior != "vk_api_error_100":
        profile = call("users.get", {"user_ids": str(uid), "fields": "screen_name"})
        code = error_code(profile)
        if code is not None:
            return dict(row, result="profile_error", code=code)
        users = profile.get("response")
        if not isinstance(users, list) or len(users) != 1 or not isinstance(users[0], dict) or users[0].get("id") != uid:
            return dict(row, result="profile_not_verified")
        user = users[0]
        if user.get("deactivated"):
            return dict(row, result="account_deactivated")
        if user.get("is_closed") is True:
            return dict(row, result="closed_profile")
        if user.get("is_closed") is not False:
            return dict(row, result="privacy_unknown")
    wall = call("wall.get", {"owner_id": str(uid), "count": 1, "filter": "owner"})
    code = error_code(wall)
    if code is not None:
        return dict(row, result="wall_error", code=code)
    data = wall.get("response")
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return dict(row, result="wall_read_ok", returned_items=len(data["items"]))
    return dict(row, result="unexpected_wall_response")

def self_test():
    def fake(responses):
        calls = []
        def call(method, params):
            calls.append((method, params))
            return responses.pop(0)
        return call, calls
    user = {"response": {"type": "user", "object_id": 123}}
    call, calls = fake([user, {"response": {"items": []}}])
    assert classify("test", "vk_api_error_100", call)["result"] == "wall_read_ok"
    assert calls[1][1]["owner_id"] == "123"
    call, calls = fake([{"response": []}])
    assert classify("test", "vk_api_error_100", call)["result"] == "address_not_resolved"
    call, calls = fake([user, {"response": [{"id": 123, "is_closed": True}]}])
    assert classify("test", "vk_api_error_15", call)["result"] == "closed_profile"
    assert len(calls) == 2
    call, calls = fake([user, {"response": [{"id": 123, "is_closed": False}]}, {"error": {"error_code": 15}}])
    assert classify("test", "vk_api_error_15", call)["code"] == 15
    call, calls = fake([user, {"response": [{"id": 123}]}])
    assert classify("test", "vk_api_error_30", call)["result"] == "privacy_unknown"
    assert len(calls) == 2
    call, calls = fake([{"response": {"type": "group", "object_id": 2}}])
    assert classify("test", "vk_api_error_100", call)["result"] == "address_not_user"
    print("Offline diagnostic checks passed")

def main():
    if "--self-test" in sys.argv:
        self_test()
        return 0
    token = os.environ.get("VK_TOKEN", "").strip()
    if not token:
        print("Missing VK_TOKEN; no requests made")
        return 1
    status = json.loads((ROOT / "monitor-status.json").read_text(encoding="utf-8"))
    roster = json.loads((ROOT / "deputies.json").read_text(encoding="utf-8"))["deputies"]
    targets = [(p["handle"], status["profiles"].get(p["handle"], {}).get("reason")) for p in roster]
    targets = [(h, reason) for h, reason in targets if reason in REASONS and status["profiles"][h].get("status") == "checked_unavailable"]
    targets.sort(key=lambda pair: (pair[1] != "vk_api_error_100", pair[0]))
    if len(targets) > 17:
        print("More than 17 matching profiles; refusing to exceed approved scope")
        return 1
    requests = 0
    def call(method, params):
        nonlocal requests
        if requests >= LIMIT:
            raise Halt("request_budget")
        if requests:
            time.sleep(.7)
        requests += 1
        form = urllib.parse.urlencode(dict(params, v="5.199", access_token=token)).encode("utf-8")
        req = urllib.request.Request("https://api.vk.ru/method/" + method, data=form, method="POST",
            headers={"Content-Type":"application/x-www-form-urlencoded","User-Agent":"DeputyMonitor/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as exc:
            raise Halt("http_" + str(exc.code)) from None
        except (OSError, ValueError, TypeError):
            raise Halt("network_or_invalid_json") from None
        if not isinstance(payload, dict):
            raise Halt("invalid_response")
        code = error_code(payload)
        if code in STOP:
            raise Halt("vk_api_error_" + str(code))
        return payload
    rows = []
    stopped = None
    for handle, prior in targets:
        try:
            row = classify(handle, prior, call)
            rows.append(row)
            print(json.dumps(row, ensure_ascii=False), flush=True)
        except Halt as exc:
            stopped = str(exc)
            break
    result = {"checked_at": dt.datetime.now(dt.timezone.utc).isoformat(), "target_count": len(targets),
              "requests": requests, "request_limit": LIMIT, "stopped_reason": stopped, "profiles": rows}
    # Diagnostic output only; never write project data or log raw API responses.
    out = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "vk-profile-diagnosis.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("DIAGNOSTIC_SUMMARY " + json.dumps(result, ensure_ascii=False), flush=True)
    return 1 if stopped else 0

if __name__ == "__main__":
    sys.exit(main())

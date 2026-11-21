#!/usr/bin/env python3
"""Pilot VK public wall collector. Uses official API, never fabricates missing metrics."""
import json, os, sys, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

PROFILE = "natalia_shabasheva"
API = "https://api.vk.com/method/"
VERSION = "5.199"
OUT = Path("pilot-vk-report.json")

def report(status, **details):
    obj = {"profile": PROFILE, "checked_at": datetime.now(timezone.utc).isoformat(), "status": status, **details}
    OUT.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in obj.items() if k != "posts"}, ensure_ascii=False))
    return obj

def call(method, params, token):
    data = {**params, "v": VERSION}
    url = API + method + "?" + urllib.parse.urlencode(data)
    req = urllib.request.Request(url, headers={"User-Agent": "DeputyMonitorPilot/1.0", "Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=25) as response:
        result = json.load(response)
    if "error" in result:
        err = result["error"]
        return None, {"code": err.get("error_code"), "message": err.get("error_msg", "VK API error")}
    return result.get("response"), None

def metric(item, name):
    val = item.get(name)
    return val.get("count") if isinstance(val, dict) and isinstance(val.get("count"), int) else None

def main():
    token = os.getenv("VK_TOKEN", "").strip()
    if not token:
        report("needs_token", explanation="Add VK_TOKEN as a GitHub Actions repository secret; no request was sent.")
        return 0
    try:
        response, error = call("wall.get", {"domain": PROFILE, "count": 100, "offset": 0, "filter": "owner"}, token)
        if error:
            report("api_error", stage="wall.get", error=error)
            return 0
        if not isinstance(response, dict) or not isinstance(response.get("items"), list):
            report("unavailable", stage="wall.get", explanation="VK returned no usable wall data")
            return 0
        posts = []
        for item in response["items"]:
            if not isinstance(item, dict) or not isinstance(item.get("id"), int):
                continue
            posts.append({
                "profile": PROFILE,
                "date": datetime.fromtimestamp(item["date"], timezone.utc).isoformat() if isinstance(item.get("date"), int) else None,
                "url": f"https://vk.com/wall{item['owner_id']}_{item['id']}" if isinstance(item.get("owner_id"), int) else None,
                "text": item.get("text") if isinstance(item.get("text"), str) else None,
                "likes": metric(item, "likes"),
                "comments": metric(item, "comments"),
                "reposts": metric(item, "reposts"),
                "views": metric(item, "views"),
                "followers": None,
            })
        report("success", returned=len(posts), total_reported=response.get("count"), posts=posts,
               caveat="First 100 accessible owner posts only; not a full annual archive. Metrics may be unavailable.")
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
        report("request_failed", error_type=type(exc).__name__, explanation="Network/API response failure; no data fabricated.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

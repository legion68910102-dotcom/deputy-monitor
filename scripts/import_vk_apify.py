"""Incremental public VK monitoring for all 159 sourced deputy profiles.

One bounded batch per scheduled run, or a one-off full sweep on code push.\nPreserve previously verified posts and status.
Requires APIFY_TOKEN. A profile without returned posts is NOT marked inactive.
"""
import json
import os
import pathlib
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "vk-profiles.json").read_text(encoding="utf-8"))
profiles = manifest["profiles"]
assert len(profiles) == 159 and len({p["handle"] for p in profiles}) == 159
BATCH_SIZE = 10
batch_count = (len(profiles) + BATCH_SIZE - 1) // BATCH_SIZE
now = datetime.now(timezone.utc)
batch_arg = os.environ.get("VK_BATCH_INDEX", "").strip()
batch_index = int(batch_arg) if batch_arg else ((now.date().toordinal() * 4 + now.hour // 6) % batch_count)
if not 0 <= batch_index < batch_count:
    raise SystemExit("VK_BATCH_INDEX must be between 0 and " + str(batch_count - 1))
full_sweep = os.environ.get("VK_FULL_SWEEP", "").lower() == "true"
chosen = profiles if full_sweep else profiles[batch_index * BATCH_SIZE:(batch_index + 1) * BATCH_SIZE]
token = os.environ.get("APIFY_TOKEN", "")
if not token:
    raise SystemExit("APIFY_TOKEN missing; existing data unchanged")

path = ROOT / "vk-posts.json"
old = json.loads(path.read_text(encoding="utf-8"))
existing = old.get("posts", [])
combined = {r["profile"] + "|" + r["url"]: r for r in existing
            if isinstance(r, dict) and r.get("profile") and r.get("url")}
monitored = set(old.get("monitored_profiles", []))
statuses = old.get("profile_status", {})
if not isinstance(statuses, dict):
    statuses = {}
counts = {}
errors = {}
ENDPOINT = "https://api.apify.com/v2/acts/hyperbach~vk-posts-scraper/run-sync-get-dataset-items"
for person in chosen:
    handle = person["handle"]
    if full_sweep and handle in monitored:
        print("Already verified, skipping", handle, flush=True)
        continue
    payload = json.dumps({
        "targets": ["https://vk.ru/" + handle],
        "maxItems": 20, "maxItemsPerTarget": 20,
        "postFilter": "owner", "includeComments": False,
        "includeReposts": True
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=payload,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=290) as response:
            items = json.load(response)
        if not isinstance(items, list):
            raise ValueError("Unexpected Apify response")
        targets = [x for x in items if isinstance(x, dict) and x.get("record_type") == "target"]
        if any(x.get("status") not in (None, "ok") for x in targets):
            raise ValueError("VK target unavailable")
        new = []
        for row in items:
            if not isinstance(row, dict) or row.get("record_type") != "post":
                continue
            url, stamp = row.get("url"), row.get("posted_at")
            if not isinstance(url, str) or not url.startswith("https://vk.com/wall"):
                continue
            if not isinstance(stamp, str) or len(stamp) < 10:
                continue
            try:
                datetime.fromisoformat(stamp[:10])
            except ValueError:
                continue
            new.append({
                "profile": handle, "date": stamp[:10], "url": url,
                "text": row.get("text") or "",
                "likes": row.get("likes"), "comments": row.get("comments_count"),
                "reposts": row.get("reposts"), "views": row.get("views"),
                "followers": (row.get("owner") or {}).get("followers_count")
            })
        if not new:
            raise ValueError("No verified posts returned; absence of activity unproven")
        for row in new:
            combined[row["profile"] + "|" + row["url"]] = row
        monitored.add(handle)
        counts[handle] = len(new)
        statuses[handle] = {"state": "posts_verified", "last_checked": now.isoformat(),
                            "retrieved": len(new)}
        print("Verified", handle, len(new), flush=True)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        msg = ("HTTP " + str(exc.code)) if isinstance(exc, urllib.error.HTTPError) else str(exc)[:160]
        errors[handle] = msg
        statuses[handle] = {"state": "unavailable", "last_checked": now.isoformat(),
                            "reason": msg}
        print("Unverified", handle, msg, flush=True)
old["posts"] = sorted(combined.values(), key=lambda r: r.get("date", ""), reverse=True)
old["generated_at"] = now.isoformat()
old["source"] = "Apify VK Posts Scraper; incremental 159-profile monitoring"
old["monitored_profiles"] = sorted(monitored)
old["profile_status"] = statuses
old["import_diagnostics"] = {"full_sweep": full_sweep, "batch_index": batch_index, "batch_count": batch_count,
                             "profiles_attempted": [p["handle"] for p in chosen],
                             "verified_counts": counts, "unavailable": errors,
                             "max_items_per_profile": 20}
path.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Completed batch", batch_index + 1, "/", batch_count,
      "verified", len(counts), "unverified", len(errors),
      "historical posts", len(old["posts"]))

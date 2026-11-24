"""Incremental public VK monitoring for all 159 sourced deputy profiles.

One bounded batch per scheduled run, or a one-off full sweep on code push.\nPreserve previously verified posts and status.
Requires APIFY_TOKEN. A profile without returned posts is NOT marked inactive.
"""
import json
import os
import pathlib
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# A deliberate code review is required to lift this project-wide cost guard.
raise SystemExit("Apify collection disabled by zero-cost project policy; no requests made")

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
rate_limited = False
consecutive_forbidden = 0
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
            # The number of users reposting a post is NOT a repost flag.
            history = row.get("copy_history")
            repost_object = row.get("repost")
            is_repost = (row.get("is_repost") is True
                         or row.get("isRepost") is True
                         or repost_object is True
                         or bool(history) and isinstance(history, list)
                         or str(row.get("post_type") or "").lower() in ("copy", "repost", "shared")
                         or isinstance(repost_object, dict) and any(
                             repost_object.get(k) for k in ("url", "owner_id", "source_url")))
            repost_source = next((
                row.get(k) for k in ("repost_source_url", "original_post_url", "repostSourceUrl")
                if isinstance(row.get(k), str) and row.get(k).startswith("https://vk.com/wall")
            ), None)
            original = history[0] if isinstance(history, list) and history and isinstance(history[0], dict) else {}
            if not repost_source:
                o, i = original.get("owner_id"), original.get("id")
                if (isinstance(o, int) and not isinstance(o, bool)
                        and isinstance(i, int) and not isinstance(i, bool)
                        and o != 0 and i > 0):
                    repost_source = f"https://vk.com/wall{o}_{i}"
            if repost_source:
                is_repost = True
            post_row = {
                "profile": handle, "date": stamp[:10], "url": url,
                "text": row.get("text") or "",
                "likes": row.get("likes"), "comments": row.get("comments_count"),
                "reposts": row.get("reposts"), "views": row.get("views"),
                "followers": (row.get("owner") or {}).get("followers_count")
            }
            if is_repost:
                post_row["is_repost"] = True
            if repost_source:
                post_row["repost_source_url"] = repost_source
            new.append(post_row)
        if not new:
            raise ValueError("No verified posts returned; absence of activity unproven")
        for row in new:
            key = row["profile"] + "|" + row["url"]
            previous = combined.get(key, {})
            merged = {**previous, **row}
            if not row.get("text") and previous.get("text"):
                merged["text"] = previous["text"]
            if previous.get("is_repost") is True:
                merged["is_repost"] = True
            if previous.get("repost_source_url") and not row.get("repost_source_url"):
                merged["repost_source_url"] = previous["repost_source_url"]
            combined[key] = merged
        monitored.add(handle)
        counts[handle] = len(new)
        statuses[handle] = {"state": "posts_verified", "last_checked": now.isoformat(),
                            "retrieved": len(new)}
        consecutive_forbidden = 0
        print("Verified", handle, len(new), flush=True)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        if isinstance(exc, urllib.error.HTTPError):
            msg = "HTTP " + str(exc.code)
            retry_after = exc.headers.get("Retry-After", "")
            if retry_after and retry_after.isdigit():
                msg += " (Retry-After: " + retry_after + "s)"
            try:
                api_error = json.loads(exc.read(4096).decode("utf-8", "replace"))
                if isinstance(api_error, dict):
                    kind = api_error.get("error", {}).get("type") if isinstance(api_error.get("error"), dict) else api_error.get("error")
                    if isinstance(kind, str) and kind.replace("-", "").replace("_", "").isalnum() and len(kind) <= 64:
                        msg += " [" + kind + "]"
            except (ValueError, UnicodeError, OSError):
                pass
        else:
            msg = str(exc)[:160]
        if isinstance(exc, urllib.error.HTTPError) and exc.code in (401, 402, 403, 429):
            consecutive_forbidden += 1
            if consecutive_forbidden >= 2 or exc.code in (401, 402, 429):
                rate_limited = True
                print("Apify authorization/quota limit suspected; stopping this run", flush=True)
                break
            print("First HTTP 403; wait before next attempt", flush=True)
            time.sleep(5)
        else:
            consecutive_forbidden = 0
        errors[handle] = msg
        statuses[handle] = {"state": "unavailable", "last_checked": now.isoformat(),
                            "reason": msg}
        print("Unverified", handle, msg, flush=True)
old["posts"] = sorted(combined.values(), key=lambda r: r.get("date", ""), reverse=True)
old["generated_at"] = now.isoformat()
old["source"] = "Apify VK Posts Scraper; incremental 159-profile monitoring"
old["monitored_profiles"] = sorted(monitored)
old["profile_status"] = statuses
old["import_diagnostics"] = {"stopped_on_api_limit": rate_limited, "full_sweep": full_sweep, "batch_index": batch_index, "batch_count": batch_count,
                             "profiles_attempted": list(counts) + list(errors),
                             "verified_counts": counts, "unavailable": errors,
                             "max_items_per_profile": 20}
path.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Completed batch", batch_index + 1, "/", batch_count,
      "verified", len(counts), "unverified", len(errors), "api_limit", rate_limited,
      "historical posts", len(old["posts"]))

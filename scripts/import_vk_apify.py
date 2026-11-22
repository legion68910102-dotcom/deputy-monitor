"""Import a bounded pilot of public VK walls; never invent posts or erase history."""
import json
import os
import pathlib
import urllib.error
import urllib.request
from datetime import datetime, timezone

TOKEN = os.environ.get("APIFY_TOKEN", "")
if not TOKEN:
    raise SystemExit("APIFY_TOKEN secret missing. No data changed.")

# These VK handles are sourced in the site's verifiedPersonalVK directory.
# Keep this pilot deliberately small until each profile has been validated.
PROFILES = ["aabulatov", "vidutinaov", "nuykinakv"]
MAX_PER_PROFILE = 20
ENDPOINT = "https://api.apify.com/v2/acts/hyperbach~vk-posts-scraper/run-sync-get-dataset-items"
path = pathlib.Path("vk-posts.json")
old = json.loads(path.read_text(encoding="utf-8"))
existing = old.get("posts", [])
combined = {r["profile"] + "|" + r["url"]: r for r in existing
            if isinstance(r, dict) and r.get("profile") and r.get("url")}
monitored = set(old.get("monitored_profiles", []))
errors = {}
counts = {}

for handle in PROFILES:
    payload = json.dumps({
        "targets": ["https://vk.ru/" + handle],
        "maxItems": MAX_PER_PROFILE,
        "maxItemsPerTarget": MAX_PER_PROFILE,
        "postFilter": "owner",
        "includeComments": False,
        "includeReposts": True,
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=payload,
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=290) as response:
            items = json.load(response)
        if not isinstance(items, list):
            raise ValueError("Unexpected dataset response")
        targets = [r for r in items if isinstance(r, dict) and r.get("record_type") == "target"]
        if any(r.get("status") not in (None, "ok") for r in targets):
            raise ValueError("VK target status: " + ", ".join(str(r.get("status")) for r in targets))
        new = []
        for row in items:
            if not isinstance(row, dict) or row.get("record_type") != "post":
                continue
            url, stamp = row.get("url"), row.get("posted_at")
            if not isinstance(url, str) or not url.startswith("https://vk.com/wall"):
                continue
            if not isinstance(stamp, str) or len(stamp) < 10:
                continue
            new.append({
                "profile": handle, "date": stamp[:10], "url": url,
                "text": row.get("text") or "",
                "likes": row.get("likes"), "comments": row.get("comments_count"),
                "reposts": row.get("reposts"), "views": row.get("views"),
                "followers": (row.get("owner") or {}).get("followers_count"),
            })
        if not new:
            # No posts is not evidence that a profile has been successfully checked.
            raise ValueError("No verified posts returned")
        for row in new:
            combined[row["profile"] + "|" + row["url"]] = row
        monitored.add(handle)
        counts[handle] = len(new)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
        errors[handle] = str(exc)[:180]
        print("Profile unavailable:", handle, errors[handle])

if not counts:
    raise SystemExit("No profiles yielded verified posts; previous data preserved.")
old["posts"] = sorted(combined.values(), key=lambda r: r.get("date", ""), reverse=True)
old["generated_at"] = datetime.now(timezone.utc).isoformat()
old["source"] = "Apify VK Posts Scraper; verified pilot profiles"
old["monitored_profiles"] = sorted(monitored)
old["import_diagnostics"] = {"verified_counts": counts, "unavailable": errors,
                             "max_items_per_profile": MAX_PER_PROFILE}
path.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Imported", counts, "; total historical posts", len(old["posts"]))

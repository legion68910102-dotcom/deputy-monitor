"""Pilot: import public VK posts for aabulatov, without exposing the Apify token."""
import json
import os
import pathlib
import urllib.request
import urllib.error
from datetime import datetime, timezone

token = os.environ.get("APIFY_TOKEN", "")
if not token:
    raise SystemExit("APIFY_TOKEN secret missing. No data changed.")
payload = json.dumps({
    "targets": ["https://vk.ru/aabulatov"],
    "maxItems": 40,
    "maxItemsPerTarget": 40,
    "postFilter": "owner",
    "includeComments": False,
    "includeReposts": True
}).encode()
request = urllib.request.Request(
    "https://api.apify.com/v2/acts/hyperbach~vk-posts-scraper/run-sync-get-dataset-items",
    data=payload,
    headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=290) as response:
        items = json.load(response)
except urllib.error.HTTPError as exc:
    raise SystemExit("Apify request failed with HTTP " + str(exc.code)) from exc
if not isinstance(items, list):
    raise SystemExit("Unexpected Apify response; no changes made")
targets = [r for r in items if isinstance(r, dict) and r.get("record_type") == "target"]
for row in targets:
    if row.get("status") not in (None, "ok"):
        raise SystemExit("VK wall unavailable: " + str(row.get("status")) + "; no changes made")
new = []
for row in items:
    if not isinstance(row, dict) or row.get("record_type") != "post":
        continue
    url, stamp = row.get("url"), row.get("posted_at")
    if not isinstance(url, str) or not url.startswith("https://vk.com/wall") or not isinstance(stamp, str):
        continue
    new.append({
        "profile": "aabulatov", "date": stamp[:10], "url": url,
        "text": row.get("text") or "",
        "likes": row.get("likes"), "comments": row.get("comments_count"),
        "reposts": row.get("reposts"), "views": row.get("views"),
        "followers": (row.get("owner") or {}).get("followers_count"),
    })
if not new:
    raise SystemExit("No verified posts returned; existing data retained")
path = pathlib.Path("vk-posts.json")
old = json.loads(path.read_text(encoding="utf-8"))
existing = old.get("posts", [])
combined = {r["profile"] + "|" + r["url"]: r for r in existing if isinstance(r, dict) and r.get("profile") and r.get("url")}
for row in new:
    combined[row["profile"] + "|" + row["url"]] = row
old["posts"] = sorted(combined.values(), key=lambda r: r.get("date", ""), reverse=True)
old["generated_at"] = datetime.now(timezone.utc).isoformat()
old["source"] = "Apify VK Posts Scraper; pilot aabulatov"
path.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Imported", len(new), "verified posts; total", len(old["posts"]))

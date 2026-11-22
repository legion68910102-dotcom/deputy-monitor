#!/usr/bin/env python3
"""Incremental, lossless collection of public VK wall posts for the deputy roster.

Only the official VK API is used. No token -> no network and no file changes.
Never infer that a deputy has been inactive from an empty or failed API response.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_VERSION = "5.199"
MOSCOW = dt.timezone(dt.timedelta(hours=3))
RETRYABLE_VK_CODES = {6, 9}
QUOTA_CODES = {29}
FATAL_AUTH_CODES = {5, 27, 111}


def read_json(path: Path, default: dict) -> dict:
    if not path.exists():
        return dict(default)
    # Fail closed on invalid existing data; never replace a corrupt published file.
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in {path.name}")
    return data


def roster_handles(root: Path) -> tuple[list[str], int]:
    data = read_json(root / "deputies.json", {})
    people = data.get("deputies")
    if not isinstance(people, list):
        raise ValueError("deputies.json: missing deputies list")
    handles = [p.get("handle") for p in people if isinstance(p, dict)]
    if (len(handles) != len(people) or
            any(not isinstance(h, str) or not h.strip() for h in handles) or
            len(handles) != len(set(handles))):
        raise ValueError("Every deputy must have a unique nonempty VK handle")
    districts = len({p.get("district") for p in people if isinstance(p, dict)})
    return handles, districts


def api_wall_get(handle: str, token: str) -> dict:
    params = urllib.parse.urlencode({
        "domain": handle, "count": 100, "offset": 0,
        "filter": "owner", "v": API_VERSION
    })
    # The bearer token must never appear in a query string, URL or log.
    req = urllib.request.Request(
        "https://api.vk.com/method/wall.get?" + params,
        headers={"Authorization": "Bearer " + token,
                 "User-Agent": "DeputyMonitor/1.0"}
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.load(resp)


def read_wall(handle: str, token: str, fetch, pause) -> tuple[list | None, str | None, bool]:
    """Return posts, a sanitized failure reason, and whether to stop this batch."""
    for attempt in range(3):
        try:
            payload = fetch(handle, token)
            if not isinstance(payload, dict):
                raise ValueError("Unexpected API response")
            if "error" in payload:
                error = payload["error"]
                code = error.get("error_code") if isinstance(error, dict) else None
                if code in RETRYABLE_VK_CODES and attempt < 2:
                    pause(1.5 * (attempt + 1))
                    continue
                return None, "vk_api_error_" + str(code), code in (FATAL_AUTH_CODES | QUOTA_CODES)
            result = payload.get("response")
            if not isinstance(result, dict) or not isinstance(result.get("items"), list):
                raise ValueError("Missing wall.get response.items")
            return result["items"], None, False
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 500, 502, 503, 504) and attempt < 2:
                pause(1.5 * (attempt + 1))
                continue
            return None, "http_" + str(exc.code), exc.code in (401, 402)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, TypeError,
                json.JSONDecodeError) as exc:
            if attempt < 2:
                pause(1.5 * (attempt + 1))
                continue
            return None, "network_" + type(exc).__name__, False
    return None, "retry_limit", False


def count_value(post: dict, field: str) -> int | None:
    data = post.get(field)
    count = data.get("count") if isinstance(data, dict) else None
    return count if isinstance(count, int) and not isinstance(count, bool) and count >= 0 else None


def normalize_post(post: object, handle: str) -> dict | None:
    if not isinstance(post, dict) or post.get("is_deleted") or post.get("marked_as_ads"):
        return None
    owner, post_id, stamp = post.get("owner_id"), post.get("id"), post.get("date")
    if any(not isinstance(n, int) or isinstance(n, bool) for n in (owner, post_id, stamp)):
        return None
    if post_id <= 0 or stamp <= 0:
        return None
    if post.get("from_id", owner) != owner:  # Someone else's wall post, not the owner.
        return None
    try:
        date = dt.datetime.fromtimestamp(stamp, MOSCOW).date().isoformat()
    except (OverflowError, OSError, ValueError):
        return None
    url = f"https://vk.com/wall{owner}_{post_id}"
    text = post.get("text")
    is_repost = bool(post.get("copy_history")) or post.get("post_type") == "copy"
    record = {
        "profile": handle, "url": url, "date": date,
        "text": text if isinstance(text, str) else "",
        "source": "vk_api", "is_repost": is_repost,
    }
    for field in ("likes", "comments", "reposts", "views"):
        value = count_value(post, field)
        if value is not None:
            record[field] = value
    return record


def merge_record(old: dict, fresh: dict) -> dict:
    """Keep previous fields and provenance; never erase a nonempty text with an empty one."""
    merged = dict(old)
    for field in ("date", "likes", "comments", "reposts", "views"):
        if fresh.get(field) is not None:
            merged[field] = fresh[field]
    if fresh.get("text"):  # Do not erase text imported through Apify or CSV.
        merged["text"] = fresh["text"]
    if not merged.get("text"):
        merged["text"] = fresh.get("text", "")
    merged["is_repost"] = bool(old.get("is_repost")) or fresh.get("is_repost", False)
    sources = old.get("sources")
    if not isinstance(sources, list):
        sources = [old["source"]] if isinstance(old.get("source"), str) else []
    merged["sources"] = list(dict.fromkeys(
        [s for s in sources if isinstance(s, str) and s] + ["vk_api"]))
    if not merged.get("source"):
        merged["source"] = "vk_api"
    return merged


def write_json_atomic(path: Path, data: dict) -> None:
    tmp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent,
            prefix="." + path.name + ".", delete=False
        ) as fp:
            tmp_name = fp.name
            json.dump(data, fp, ensure_ascii=False, indent=2)
            fp.write("\n")
        os.replace(tmp_name, path)
    finally:
        if tmp_name and os.path.exists(tmp_name):
            os.unlink(tmp_name)


def collect(root: Path, token: str, *, start_at: int = 0,
            max_profiles: int | None = None, dry_run: bool = False,
            fetch=api_wall_get, pause=time.sleep) -> dict:
    if not token:
        raise ValueError("VK_TOKEN missing; no requests or file changes")
    handles, district_count = roster_handles(root)
    if start_at < 0 or start_at >= len(handles):
        raise ValueError("Invalid start_at index")
    if max_profiles is not None and max_profiles < 1:
        raise ValueError("max_profiles must be positive")
    chosen = handles[start_at:start_at + max_profiles if max_profiles else None]

    post_path = root / "vk-posts.json"
    status_path = root / "monitor-status.json"
    existing = read_json(post_path, {"posts": []})
    original = existing.get("posts")
    if not isinstance(original, list):
        raise ValueError("vk-posts.json: posts must be a list")
    report = read_json(status_path, {"profiles": {}})
    if not isinstance(report.get("profiles", {}), dict):
        raise ValueError("monitor-status.json: profiles must be an object")

    # Retain every historical item and all top-level metadata (including Apify coverage).
    records = list(original)
    index = {(p.get("profile"), p.get("url")): i for i, p in enumerate(records)
             if isinstance(p, dict) and p.get("profile") and p.get("url")}
    statuses = dict(report.get("profiles", {}))
    checked_at = dt.datetime.now(dt.timezone.utc).isoformat()
    succeeded = failed = inserted = updated = 0
    consecutive_failures = 0
    aborted = None
    attempted = 0

    for handle in chosen:
        if attempted:
            pause(0.45)  # Gentle rate limit between wall.get calls.
        attempted += 1
        items, error, fatal = read_wall(handle, token, fetch, pause)
        if error is not None:
            failed += 1
            # A private wall (VK error 15) is not an API outage; keep checking others.
            consecutive_failures = 0 if error == "vk_api_error_15" else consecutive_failures + 1
            statuses[handle] = {
                "status": "checked_unavailable", "checked_at": checked_at,
                "posts_count": None, "reason": error
            }
            if fatal or consecutive_failures >= 8:
                aborted = ("quota_error" if error == "vk_api_error_29"
                           else "auth_error" if fatal
                           else "too_many_consecutive_failures")
                break
            continue

        consecutive_failures = 0
        accepted = 0
        for post in items:
            fresh = normalize_post(post, handle)
            if fresh is None:
                continue
            accepted += 1
            key = (handle, fresh["url"])
            if key in index:
                i = index[key]
                merged = merge_record(records[i], fresh)
                if merged != records[i]:
                    updated += 1
                    records[i] = merged
            else:
                index[key] = len(records)
                records.append(fresh)
                inserted += 1
        succeeded += 1
        statuses[handle] = {
            "status": "success", "checked_at": checked_at,
            "posts_count": accepted,
            "reason": "Получено записей из VK API: " + str(accepted) +
                      ". Пустой ответ не доказывает отсутствие деятельности."
        }
    summary = {
        "roster_size": len(handles), "district_count": district_count,
        "selected_profiles": len(chosen), "attempted_profiles": attempted,
        "successful_profiles": succeeded, "failed_profiles": failed,
        "new_posts": inserted, "updated_posts": updated,
        "retained_posts": len(records), "stopped_reason": aborted,
        "dry_run": dry_run,
    }

    if not dry_run:
        out = dict(existing)
        out["posts"] = sorted(records, key=lambda r: r.get("date", "")
                              if isinstance(r, dict) else "", reverse=True)
        out["generated_at"] = checked_at
        out.setdefault("source", "VK API and existing imported sources")
        out["vk_api_last_checked_at"] = checked_at
        out["vk_api_last_run"] = summary
        status_out = dict(report)
        status_out.update({
            "schema_version": 1, "generated_at": checked_at,
            "source": "Official VK API (public wall.get only)",
            "roster_size": len(handles), "district_count": district_count,
            "profiles": statuses, "vk_api_last_run": summary
        })
        # Both writes are atomic separately. Failed fetches never delete existing records.
        write_json_atomic(post_path, out)
        write_json_atomic(status_path, status_out)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-profiles", type=int, default=None,
                        help="Only the selected number of profiles (for a pilot)")
    parser.add_argument("--start-at", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true",
                        help="Query VK, print totals, do not write files")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    handles, _ = roster_handles(root)
    if len(handles) != 159:
        raise SystemExit("Safety check failed: expected exactly 159 distinct VK handles")
    token = os.environ.get("VK_TOKEN", "").strip()
    if not token:
        raise SystemExit("VK_TOKEN missing; no API requests or file changes")
    summary = collect(root, token, max_profiles=args.max_profiles,
                      start_at=args.start_at, dry_run=args.dry_run)
    print("VK public wall collection:", json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect public birth dates for all 16 YuAO districts; never invent missing data.

Only accept a date when the source page title matches the deputy's full name
and a labelled birth-date field exists. New findings are marked pending review.
"""
import datetime as dt
import html
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "deputies.json"
REPORT = ROOT / "reports" / "birth-collection.json"
TODAY = dt.date.today()
HEADERS = {"User-Agent": "DeputyMonitorResearch/1.0 (public biographies)"}
DATE_RE = re.compile(r"(?:Дата рождения|Родил[а-я]+)\s*:?\s*(\d{1,2})[.\s]+(\d{1,2}|[а-яё]+)[.\s]+(\d{4})", re.I)
MONTHS = dict(zip("января февраля марта апреля мая июня июля августа сентября октября ноября декабря".split(), range(1, 13)))

def plain(source):
    source = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", source, flags=re.I | re.S)
    source = re.sub(r"<[^>]*>", " ", source)
    return re.sub(r"\s+", " ", html.unescape(source)).strip()

def date_from_page(text):
    match = DATE_RE.search(text)
    if not match:
        return None
    day, month, year = match.groups()
    month = MONTHS.get(month.lower(), month)
    try:
        value = dt.date(int(year), int(month), int(day))
        if dt.date(1850, 1, 1) <= value <= TODAY:
            return value.isoformat()
    except (ValueError, TypeError):
        pass
    return None

def fetch(url):
    if not url.startswith("https://asafov.ru/person/"):
        return None
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=12) as resp:
            if resp.status != 200 or int(resp.headers.get("Content-Length", "0")) > 1500000:
                return None
            return resp.read(1500000).decode("utf-8", errors="replace")
    except (OSError, urllib.error.URLError, ValueError):
        return None

def main():
    data = json.loads(PATH.read_text(encoding="utf-8"))
    findings, errors = [], []
    checked = 0
    for p in data["deputies"]:
        source = p.get("source", "")
        if not source.startswith("https://asafov.ru/person/"):
            continue
        checked += 1
        page = fetch(source)
        if not page:
            errors.append({"name": p["name"], "reason": "source_unavailable"})
            continue
        title_match = re.search(r"<h1\b[^>]*>(.*?)</h1>", page, flags=re.I | re.S)
        heading = plain(title_match.group(1)) if title_match else ""
        if heading.casefold().replace("ё", "е") != p["name"].casefold().replace("ё", "е"):
            errors.append({"name": p["name"], "reason": "name_mismatch", "heading": heading})
            continue
        birth = date_from_page(plain(page))
        if not birth:
            errors.append({"name": p["name"], "reason": "birth_date_not_found"})
            continue
        if p.get("birth_date") and p["birth_date"] != birth:
            errors.append({"name": p["name"], "reason": "date_conflict", "existing": p["birth_date"], "found": birth})
            continue
        if not p.get("birth_date"):
            p.update(birth_date=birth, birth_source=source,
                     birth_status="source_linked_review_pending", birth_last_checked=TODAY.isoformat())
            findings.append({"name": p["name"], "district": p["district"], "birth_date": birth, "source": source})
        time.sleep(0.2)
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps({"run_date": TODAY.isoformat(), "checked": checked,
       "new_birth_dates": findings, "unresolved": errors,
       "warning": "Matches are source-linked, not independently verified; deputy mandate status is not verified."},
       ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Checked {checked}; new dates {len(findings)}; unresolved {len(errors)}")

if __name__ == "__main__":
    main()

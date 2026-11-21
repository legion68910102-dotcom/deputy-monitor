#!/usr/bin/env python3
"""Verify each stored birth date against the linked public biography.

Source agreement is not independent corroboration. Produce a per-person report;
do not change birth dates automatically when sources conflict or are unavailable.
"""
import datetime as dt
import html
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
people = json.loads((ROOT / "deputies.json").read_text(encoding="utf-8"))["deputies"]
def clean(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()
def normalize(value):
    return clean(value).casefold().replace("ё", "е")
def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 DeputyMonitorAudit/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read(1500000).decode("utf-8", "replace")
def matches_date(text, date):
    year, month, day = map(int, date.split("-"))
    months = "января февраля марта апреля мая июня июля августа сентября октября ноября декабря".split()
    forms = [f"{day:02d}.{month:02d}.{year}", f"{day}.{month:02d}.{year}",
             f"{day} {months[month-1]} {year}", f"{day:02d} {months[month-1]} {year}"]
    text = normalize(text)
    return any(normalize(v) in text for v in forms)
records = []
for p in people:
    date, url = p.get("birth_date"), p.get("birth_source")
    result = {"name": p["name"], "district": p["district"], "birth_date": date,
              "birth_source": url, "source_agreement": "not_checked",
              "independent_verification": "not_completed"}
    if not date or not url:
        result["source_agreement"] = "missing_data"
    elif not url.startswith("https://"):
        result["source_agreement"] = "invalid_source_url"
    else:
        try:
            raw = fetch(url)
            body = clean(raw)
            if not matches_date(body, date):
                result["source_agreement"] = "date_not_found_on_page"
            elif normalize(p["name"]) not in normalize(body):
                result["source_agreement"] = "name_not_found_on_page"
            else:
                result["source_agreement"] = "date_and_name_on_source_page"
        except Exception as error:
            result["source_agreement"] = "source_unavailable"
            result["detail"] = str(error)[:180]
    records.append(result)
summary = {}
for record in records:
    key = record["source_agreement"]
    summary[key] = summary.get(key, 0) + 1
out = ROOT / "reports" / "birth-source-verification.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({"checked_on": dt.date.today().isoformat(),
    "profiles": len(records), "source_agreement_summary": summary,
    "warning": "Matching a cited page is not independent verification of truth or current mandate.",
    "records": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False))

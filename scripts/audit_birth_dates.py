#!/usr/bin/env python3
"""Audit every deputy birth date across all 16 YuAO districts.

Run: python3 scripts/audit_birth_dates.py
Produces reports/birth-date-audit.csv and reports/birth-date-summary.json.
No inferred dates; source-linked records remain pending independent verification.
"""
import csv
import datetime as dt
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "deputies.json").read_text(encoding="utf-8"))
people = data["deputies"]
districts = defaultdict(list)
today = dt.date.today()

def valid_date(value):
    if not value:
        return None
    try:
        date = dt.date.fromisoformat(value)
        if date > today or date.year < 1850:
            return None
        return date
    except (TypeError, ValueError):
        return None

rows = []
for person in people:
    date = valid_date(person.get("birth_date"))
    source = person.get("birth_source") or ""
    status = person.get("birth_status", "missing")
    if person.get("birth_date") and not date:
        status = "invalid_date"
    elif date and not source:
        status = "missing_source"
    elif date and source and status == "missing":
        status = "source_linked_review_pending"
    elif not date:
        status = "missing"
    age = (today.year - date.year - ((today.month, today.day) < (date.month, date.day))) if date else ""
    row = {"district": person["district"], "name": person["name"],
           "birth_date": person.get("birth_date") or "", "age": age,
           "birth_source": source, "birth_status": status,
           "roster_source": person.get("source") or ""}
    rows.append(row)
    districts[person["district"]].append(row)

out = ROOT / "reports"
out.mkdir(exist_ok=True)
with (out / "birth-date-audit.csv").open("w", encoding="utf-8-sig", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(sorted(rows, key=lambda r: (r["district"], r["name"])))
summary = {"generated_on": today.isoformat(), "total_profiles": len(rows),
           "district_count": len(districts),
           "with_birth_date": sum(bool(r["birth_date"]) and r["birth_status"] not in ("invalid_date", "missing") for r in rows),
           "missing_birth_date": sum(r["birth_status"] == "missing" for r in rows),
           "note": "Source links are not independent verification; roster membership also requires checking.",
           "districts": {name: {"profiles": len(items),
                                  "with_birth_date": sum(bool(r["birth_date"]) for r in items),
                                  "missing_birth_date": sum(r["birth_status"] == "missing" for r in items)}
                         for name, items in sorted(districts.items())}}
(out / "birth-date-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))

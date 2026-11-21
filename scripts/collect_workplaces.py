#!/usr/bin/env python3
"""Collect publicly stated workplaces for all 16 YuAO districts.

These are workplace details at the time of the cited biography, NOT verified
current employment. Missing, ambiguous and conflicting values are not guessed.
"""
import datetime as dt
import html
import json
import re
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "deputies.json"
REPORT = ROOT / "reports" / "workplace-collection.json"
LABELS = ["Место работы", "Место проживания", "Образование", "Дата рождения",
          "Членство в партии", "Количество выдвижений", "Количество побед",
          "О персоне", "Прошедшие избирательные кампании"]
class Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
        self.h1 = []
        self.in_h1 = False
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1
        if tag == "h1":
            self.in_h1 = True
        if tag in ("div", "p", "br", "li", "h1", "h2", "dt", "dd", "section"):
            self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.skip = max(0, self.skip - 1)
        if tag == "h1":
            self.in_h1 = False
        if tag in ("div", "p", "li", "h1", "h2", "dt", "dd", "section"):
            self.parts.append("\n")
    def handle_data(self, value):
        if not self.skip:
            self.parts.append(value)
            if self.in_h1:
                self.h1.append(value)

def norm(value):
    return re.sub(r"\s+", " ", value).strip().casefold().replace("ё", "е")

def extract(page):
    parser = Extractor()
    parser.feed(page)
    heading = re.sub(r"\s+", " ", " ".join(parser.h1)).strip()
    lines = [re.sub(r"\s+", " ", x).strip() for x in "".join(parser.parts).splitlines()]
    lines = [x for x in lines if x]
    candidates = []
    for index, line in enumerate(lines):
        if norm(line).rstrip(":") == norm("Место работы"):
            if index + 1 < len(lines):
                candidate = lines[index + 1]
                if len(candidate) <= 350 and norm(candidate).rstrip(":") not in {norm(x) for x in LABELS}:
                    candidates.append(candidate)
        elif norm(line).startswith(norm("Место работы:")):
            candidate = line.split(":", 1)[1].strip()
            if candidate and len(candidate) <= 350:
                candidates.append(candidate)
    return heading, list(dict.fromkeys(candidates))

def main():
    data = json.loads(DB.read_text(encoding="utf-8"))
    checked, new, unresolved = 0, [], []
    for p in data["deputies"]:
        url = p.get("source") or ""
        if not url.startswith("https://asafov.ru/person/"):
            unresolved.append({"name": p["name"], "reason": "unsupported_source", "url": url})
            continue
        checked += 1
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 DeputyMonitor/1.0"})
            with urllib.request.urlopen(req, timeout=15) as response:
                page = response.read(1500000).decode("utf-8", "replace")
            heading, candidates = extract(page)
            if norm(heading) != norm(p["name"]):
                unresolved.append({"name": p["name"], "reason": "name_mismatch", "heading": heading})
                continue
            if len(candidates) != 1:
                unresolved.append({"name": p["name"], "reason": "missing_or_ambiguous_workplace",
                                   "candidates": candidates})
                continue
            value = candidates[0]
            old = p.get("workplace")
            if old and norm(old) != norm(value):
                unresolved.append({"name": p["name"], "reason": "existing_value_differs",
                                   "existing": old, "source_value": value})
                continue
            if not old:
                p["workplace"] = value
                p["workplace_source"] = url
                p["workplace_status"] = "source_linked_review_pending"
                p["workplace_checked_at"] = dt.date.today().isoformat()
                new.append({"name": p["name"], "district": p["district"],
                            "workplace": value, "source": url})
        except Exception as error:
            unresolved.append({"name": p["name"], "reason": "source_unavailable",
                               "detail": str(error)[:160]})
        time.sleep(0.15)
    DB.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps({"checked_on": dt.date.today().isoformat(),
       "total_profiles": len(data["deputies"]), "checked": checked, "new_workplaces": new,
       "unresolved": unresolved, "warning": "Historical source workplace is not verified current employment."},
       ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Profiles {len(data['deputies'])}; checked {checked}; added {len(new)}; unresolved {len(unresolved)}")

if __name__ == "__main__":
    main()

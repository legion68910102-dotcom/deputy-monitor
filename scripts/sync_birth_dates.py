#!/usr/bin/env python3
"""Sync sourced birth dates from deputies.json into the static site's verifiedBirths."""
import json
import re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
data = json.loads((root / "deputies.json").read_text(encoding="utf-8"))
site = root / "index.html"
html = site.read_text(encoding="utf-8")
pattern = r"const verifiedBirths=(\{[^\n]*\});"
match = re.search(pattern, html)
if not match:
    raise SystemExit("verifiedBirths not found: refusing to rewrite page")
existing = json.loads(match.group(1))
for person in data["deputies"]:
    if person.get("birth_date") and person.get("birth_source"):
        existing[person["name"]] = {"birth": person["birth_date"], "source": person["birth_source"]}
updated = html[:match.start()] + "const verifiedBirths=" + json.dumps(existing, ensure_ascii=False, separators=(",", ":")) + ";" + html[match.end():]
site.write_text(updated, encoding="utf-8")
print(f"Synced {len(existing)} source-linked biographies")

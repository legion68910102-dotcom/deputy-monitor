#!/usr/bin/env python3
"""Synchronize public workplace fields into deputy cards, preserving manual biography fields."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
people = json.loads((root / "deputies.json").read_text(encoding="utf-8"))["deputies"]
page = root / "index.html"
html = page.read_text(encoding="utf-8")
# Workplaces are a separate map so original biography source links stay intact.
work = {p["name"]: {"work": p["workplace"], "source": p["workplace_source"]}
        for p in people if p.get("workplace") and p.get("workplace_source")}
replacement = "const sourcedWorkplaces=" + json.dumps(work, ensure_ascii=False, separators=(",", ":")) + ";"
if re.search(r"const sourcedWorkplaces=\{[^\n]*\};", html):
    html = re.sub(r"const sourcedWorkplaces=\{[^\n]*\};", lambda _: replacement, html, count=1)
else:
    anchor = "function bioCard(name,district){"
    if anchor not in html:
        raise SystemExit("bioCard function missing")
    html = html.replace(anchor, replacement + "\n" + anchor, 1)
old = 'const bio={...(verifiedBio[name]||{}),...(verifiedBirths[name]||{}),...(deputyBio[name]||{})}'
new = 'const bio={...(verifiedBio[name]||{}),...(verifiedBirths[name]||{}),...(sourcedWorkplaces[name]||{}),...(deputyBio[name]||{})}'
if old in html:
    html = html.replace(old, new, 1)
elif new not in html:
    raise SystemExit("Biography composition changed; refusing to overwrite")
page.write_text(html, encoding="utf-8")
print(f"Published {len(work)} source-linked workplaces")

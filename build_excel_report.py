#!/usr/bin/env python3
"""Build a standards-compliant XLSX report for direct download from GitHub Pages."""
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
def extract(name):
    match = re.search(r"const\s+" + re.escape(name) + r"\s*=\s*", html)
    if not match:
        raise ValueError("Missing JS data: " + name)
    return json.JSONDecoder().raw_decode(html[match.end():])[0]

districts = extract("directoryDeputies")
profiles = extract("verifiedPersonalVK")
roster = [(district, name, profiles.get(name, {})) for district, group in districts.items() for name in group["names"]]
roster.sort(key=lambda x: (x[0].casefold(), x[1].casefold()))
if len(roster) < 150:
    raise ValueError("Unexpectedly short deputy roster")

posts_file = ROOT / "vk-posts.json"
try:
    source = json.loads(posts_file.read_text(encoding="utf-8"))
    posts = source.get("posts", []) if isinstance(source, dict) else []
except (ValueError, OSError):
    posts = []
posts = posts if isinstance(posts, list) else []
by_profile = defaultdict(list)
for post in posts:
    if isinstance(post, dict) and post.get("profile"):
        by_profile[str(post["profile"])].append(post)

wb = Workbook()
ws = wb.active
ws.title = "Сводка"
wp = wb.create_sheet("Публикации")
wm = wb.create_sheet("Без данных")
ws.append(["№", "Район", "Депутат", "Публикаций", "Лайки", "Комментарии", "Репосты", "Просмотры", "Статус", "VK", "Источник"])
wp.append(["Дата", "Район", "Депутат", "Профиль VK", "Текст", "Ссылка", "Лайки", "Комментарии", "Репосты", "Просмотры"])
wm.append(["№", "Район", "Депутат", "Статус", "VK", "Источник"])
for idx, (district, name, p) in enumerate(roster, 1):
    handle = p.get("handle", "")
    vk = "https://vk.com/" + handle if handle else ""
    entries = by_profile.get(handle, []) if handle else []
    status = "Есть публикации в загруженной выборке" if entries else "Нет данных в загруженной выборке"
    metrics = [sum(int(float(post.get(k) or 0)) for post in entries if str(post.get(k) or "0").replace(".","",1).isdigit()) if entries else None for k in ("likes", "comments", "reposts", "views")]
    ws.append([idx, district, name, len(entries) if entries else None, *metrics, status, vk, p.get("source", "")])
    if not entries:
        wm.append([idx, district, name, status, vk, p.get("source", "")])
    for post in entries:
        wp.append([str(post.get("date", ""))[:10], district, name, handle, str(post.get("text", ""))[:32000], str(post.get("url", "")), post.get("likes"), post.get("comments"), post.get("reposts"), post.get("views")])

for sheet in wb:
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    sheet.sheet_view.showGridLines = False
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="234A84")
        cell.alignment = Alignment(wrap_text=True)
    sheet.row_dimensions[1].height = 30
    for col in range(1, sheet.max_column + 1):
        width = 18
        if col in (2, 3):
            width = 30
        if sheet == wp and col == 5:
            width = 65
        sheet.column_dimensions[get_column_letter(col)].width = width
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top")
    sheet.sheet_properties.pageSetUpPr.fitToPage = True

target = ROOT / "Deputies_YUAO_Report.xlsx"
wb.save(target)
check = load_workbook(target, read_only=True)
assert check.sheetnames == ["Сводка", "Публикации", "Без данных"]
assert check["Сводка"].max_row == len(roster) + 1
check.close()
print(f"Validated {target.name}: {len(roster)} deputies, {len(posts)} source posts")

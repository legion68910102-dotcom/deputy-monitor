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
# Always use the same current roster as the VK collector and site monitor.
# index.html is a historical landing page and must not determine Excel coverage.
roster_source = json.loads((ROOT / "deputies.json").read_text(encoding="utf-8"))
people = roster_source.get("deputies", [])
if not isinstance(people, list) or len(people) != 159:
    raise ValueError("Expected 159 deputy profiles in deputies.json")
if any(not isinstance(p, dict) or not all(p.get(k) for k in ("district", "name", "handle")) for p in people):
    raise ValueError("Incomplete deputy record in current roster")
roster = [(p["district"], p["name"], {"handle": p["handle"], "source": p.get("source", "")})
          for p in people]
if len({p[2]["handle"] for p in roster}) != len(roster):
    raise ValueError("Duplicate VK handle in current roster")
roster.sort(key=lambda x: (x[0].casefold(), x[1].casefold()))

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
def excel_safe_text(value: object) -> str:
    text = str(value or "")
    # VK posts are untrusted input: prevent Excel interpreting =... as a formula.
    return "'" + text if text.startswith("=") else text


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
        wp.append([str(post.get("date", ""))[:10], district, name, handle, excel_safe_text(post.get("text", ""))[:32000], str(post.get("url", "")), post.get("likes"), post.get("comments"), post.get("reposts"), post.get("views")])

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

# Printable, standalone ranking export based on the same published dataset as the site.
rank = Workbook()
rs = rank.active
rs.title = "Рейтинг"
rs.append(["Место", "Район", "Депутат", "Публикаций", "Категория", "Статус данных"])
ranking = []
missing_rank = []
for district, name, profile in roster:
    handle = profile.get("handle", "")
    count = len(by_profile.get(handle, [])) if handle else 0
    (ranking if count else missing_rank).append((district, name, count))
ranking.sort(key=lambda x: (-x[2], x[1].casefold()))
missing_rank.sort(key=lambda x: (x[0].casefold(), x[1].casefold()))
scores = sorted({x[2] for x in ranking}, reverse=True)
fills = {"Отлично": "D9EAD3", "Допустимо": "FFF2CC", "Плохо": "F4CCCC"}
for position, (district, name, count) in enumerate(ranking, 1):
    bucket = 1 if len(scores) == 1 else min(2, (scores.index(count) * 3) // len(scores))
    category = ["Отлично", "Допустимо", "Плохо"][bucket]
    rs.append([position, district, name, count, category, "Есть публикации в опубликованной выборке"])
    for cell in rs[rs.max_row]:
        cell.fill = PatternFill("solid", fgColor=fills[category])
for district, name, count in missing_rank:
    rs.append(["—", district, name, None, "Нет данных", "Нет публикаций в опубликованной выборке"])
rs.freeze_panes = "A2"
rs.auto_filter.ref = rs.dimensions
rs.sheet_view.showGridLines = False
rs.print_options.horizontalCentered = True
rs.sheet_properties.pageSetUpPr.fitToPage = True
rs.page_setup.orientation = "landscape"
rs.page_setup.paperSize = rs.PAPERSIZE_A4
rs.page_setup.fitToWidth = 1
rs.page_setup.fitToHeight = 0
rs.print_title_rows = "1:1"
rs.print_area = f"A1:F{rs.max_row}"
for cell in rs[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="234A84")
    cell.alignment = Alignment(wrap_text=True)
rs.row_dimensions[1].height = 28
for column, width in {"A": 10, "B": 29, "C": 36, "D": 16, "E": 19, "F": 48}.items():
    rs.column_dimensions[column].width = width
for row in rs.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = Alignment(vertical="center", wrap_text=True)
rank_path = ROOT / "Deputies_YUAO_Ranking.xlsx"
rank.save(rank_path)
verified_rank = load_workbook(rank_path, read_only=True)
assert verified_rank["Рейтинг"].max_row == len(roster) + 1
verified_rank.close()
print(f"Validated ranking: {len(roster)} deputies, {len(ranking)} with published posts")

target = ROOT / "Deputies_YUAO_Report.xlsx"
wb.save(target)
check = load_workbook(target, read_only=True)
assert check.sheetnames == ["Сводка", "Публикации", "Без данных"]
assert check["Сводка"].max_row == len(roster) + 1
assert check["Публикации"].max_row == len(posts) + 1, "Publication rows missing from Excel"
assert check["Без данных"].max_row == sum(not by_profile.get(p[2]["handle"]) for p in roster) + 1
check.close()
print(f"Validated {target.name}: {len(roster)} deputies, {len(posts)} source posts")

#!/usr/bin/env python3
"""Collect reviewable deputy cards from official district websites, server-side.

No automatic changes to the shared deputy roster. This JSON is only a cache of
potential candidates with a link to the original source for human verification.
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "official-deputy-candidates.json"
SOURCES = {
    "Бирюлёво Восточное": "https://mrbv.ru/",
    "Бирюлёво Западное": "https://www.m-bz.ru/",
    "Братеево": "https://mun-brateevo.ru/",
    "Даниловский": "https://danilovskoe.org/index.php/council-of-deputies",
    "Донской": "https://mo-donskoy.ru/",
    "Зябликово": "https://mos-zyablikovo.ru/sovet-deputatov/",
    "Москворечье-Сабурово": "https://mos-saburovo.ru/",
    "Нагатино-Садовники": "https://sovet.n-sadovniki.ru/",
    "Нагатинский Затон": "https://nzaton.ru/",
    "Нагорный": "https://monagornoe.ru/",
    "Орехово-Борисово Северное": "https://mo-obs.ru/",
    "Орехово-Борисово Южное": "https://mo-obu.ru/",
    "Царицыно": "https://mcaricino.ru/",
    "Чертаново Северное": "https://ch-sever.ru/",
    "Чертаново Центральное": "https://chertanovocentr.ru/",
    "Чертаново Южное": "https://vmo-chu.ru/",
}
NAME = re.compile(r"^[А-ЯЁ][а-яё-]+\s+[А-ЯЁ][а-яё-]+\s+[А-ЯЁ][а-яё-]+$")
COUNCIL = re.compile(r"(депутат|состав.{0,18}совет|совет.{0,18}депутат|deput|council.of.deput)", re.I)
HEADERS = {"User-Agent": "DeputyMonitorPublicData/1.0 (+https://github.com/legion68910102-dotcom/deputy-monitor)"}

def norm(value):
    return re.sub(r"\s+", " ", value).strip().casefold().replace("ё", "е")

def same_site(url, root):
    a, b = urlparse(url), urlparse(root)
    return a.scheme == "https" and a.hostname and b.hostname and a.hostname.lstrip("www.") == b.hostname.lstrip("www.")

def download(url, root):
    if not same_site(url, root):
        raise ValueError("external domain rejected")
    response = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
    response.raise_for_status()
    if not same_site(response.url, root):
        raise ValueError("unexpected redirect")
    if "text/html" not in response.headers.get("content-type", "text/html").lower():
        raise ValueError("not an HTML page")
    if len(response.content) > 1_500_000:
        raise ValueError("page too large")
    response.encoding = response.apparent_encoding or response.encoding
    return response.text, response.url

def pages_to_check(soup, url, root):
    links = []
    for link in soup.select("a[href]"):
        href = link.get("href", "")
        label = link.get_text(" ", strip=True) + " " + href
        if not COUNCIL.search(label):
            continue
        resolved = urljoin(url, href).split("#", 1)[0]
        if same_site(resolved, root) and resolved not in links:
            links.append(resolved)
    # Home page first; then likely council roster pages only (bounded crawling).
    return links[:6]

def candidates_on_page(html, url):
    soup = BeautifulSoup(html, "html.parser")
    for garbage in soup.select("script,style,noscript,footer,nav"):
        garbage.decompose()
    title = (soup.title.get_text(" ", strip=True) if soup.title else "")
    heading = " ".join(x.get_text(" ", strip=True) for x in soup.select("h1,h2")[:5])
    # Avoid unrelated news and event cards that happen to mention a person's name.
    if not COUNCIL.search(title + " " + heading + " " + url):
        return [], soup
    people = {}
    for node in soup.select("article,li,section,div"):
        img = node.find("img")
        if not img:
            continue
        visible = node.get_text(" ", strip=True)
        if len(visible) > 450 or len(visible) < 12:
            continue
        names = []
        for tag in node.select("h2,h3,h4,a"):
            text = re.sub(r"\s+", " ", tag.get_text(" ", strip=True))
            if NAME.fullmatch(text):
                names.append((text, tag))
        if len({norm(n) for n, _ in names}) != 1:
            continue
        name, name_tag = names[0]
        photo_raw = img.get("src") or img.get("data-src") or ""
        photo = urljoin(url, photo_raw)
        if not photo_raw or not photo.startswith("https://"):
            continue
        anchor = name_tag if name_tag.name == "a" else name_tag.find("a") or node.find("a", href=True)
        link = urljoin(url, anchor.get("href", "")) if anchor and anchor.get("href") else url
        if urlparse(link).scheme != "https":
            link = url
        if norm(name) not in people:
            people[norm(name)] = {"name": name, "photo": photo, "source": link, "page": url}
    return list(people.values()), soup

def scan(district, root):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    output = {"source": root, "checked_at": now, "status": "unavailable", "candidates": []}
    queue = [root]
    seen = set()
    successful = 0
    found = {}
    while queue and len(seen) < 5:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            html, actual = download(url, root)
            successful += 1
            candidates, soup = candidates_on_page(html, actual)
            for person in candidates:
                found.setdefault(norm(person["name"]), person)
            if len(seen) == 1:
                queue.extend(pages_to_check(soup, actual, root))
        except (requests.RequestException, ValueError) as exc:
            output["error"] = type(exc).__name__
    if successful:
        output["status"] = "ok" if found else "no_candidates"
        output["candidates"] = sorted(found.values(), key=lambda x: norm(x["name"]))[:60]
        output.pop("error", None)
    return output

def main():
    if "--self-test" in sys.argv:
        sample = '<html><title>Совет депутатов</title><div><a href="/person/1">Иванов Иван Иванович</a><img src="/photo.jpg"></div></html>'
        cards, _ = candidates_on_page(sample, "https://example.ru/")
        assert len(cards) == 1 and cards[0]["name"] == "Иванов Иван Иванович"
        assert same_site("https://www.example.ru/a", "https://example.ru/")
        assert not same_site("https://attacker.example.ru/", "https://example.ru/")
        print("self-test passed")
        return
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8")).get("districts", {})
        except (ValueError, OSError):
            pass
    result = {
        "schema_version": 1,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "Official council websites via GitHub Actions",
        "districts": {},
    }
    for district, url in SOURCES.items():
        value = scan(district, url)
        if value["status"] == "unavailable" and old.get(district, {}).get("status") == "ok":
            value["status"] = "stale"
            value["candidates"] = old[district].get("candidates", [])
            value["last_success_at"] = old[district].get("checked_at")
        result["districts"][district] = value
        print(district, value["status"], len(value["candidates"]))
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()

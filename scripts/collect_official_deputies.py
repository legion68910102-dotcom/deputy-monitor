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
OUT_JS = ROOT / "official-deputy-snapshot.js"
SOURCES = {
    "Бирюлёво Восточное": "https://mrbv.ru/sovet/",
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
    return a.scheme == "https" and a.hostname and b.hostname and a.hostname.removeprefix("www.") == b.hostname.removeprefix("www.")

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
    # This check rejects unrelated news pages containing names of public figures.
    if not COUNCIL.search(title + " " + heading + " " + url):
        return [], soup, []
    people = {}
    roster = {}

    def get_photo(node):
        # Portrait and name often live in sibling tags, not one nested anchor.
        for parent in list(node.parents)[:5]:
            if parent.name in ("html", "body", "main"):
                break
            if len(parent.get_text(" ", strip=True)) > 600:
                break
            for img in parent.find_all("img"):
                raw = img.get("data-src") or img.get("src") or ""
                photo = urljoin(url, raw)
                if raw and same_site(photo, url):
                    return photo
        return None

    # Explicit roster link names are authoritative candidate identities, even
    # if a thumbnail has not been extracted. They are NOT automatically added.
    for tag in soup.select("a[href],h2,h3,h4"):
        name = re.sub(r"\s+", " ", tag.get_text(" ", strip=True))
        if not NAME.fullmatch(name):
            continue
        anchor = tag if tag.name == "a" else tag.find("a", href=True)
        source = urljoin(url, anchor.get("href", "")) if anchor else url
        if not same_site(source, url):
            source = url
        item = {"name": name, "source": source}
        roster.setdefault(norm(name), item)
        photo = get_photo(tag)
        if photo:
            people.setdefault(norm(name), dict(item, photo=photo, page=url))

    # Fallback for layouts using text labels instead of a headline/link.
    for node in soup.select("article,li,section,div"):
        if len(node.get_text(" ", strip=True)) > 450:
            continue
        img = node.find("img")
        if not img:
            continue
        names = []
        for tag in node.select("h2,h3,h4,a"):
            name = re.sub(r"\s+", " ", tag.get_text(" ", strip=True))
            if NAME.fullmatch(name):
                names.append((name, tag))
        if len({norm(name) for name, _ in names}) != 1:
            continue
        name, tag = names[0]
        if norm(name) in people:
            continue
        photo_raw = img.get("data-src") or img.get("src") or ""
        photo = urljoin(url, photo_raw)
        if not photo_raw or not same_site(photo, url):
            continue
        link = tag if tag.name == "a" else tag.find("a", href=True)
        source = urljoin(url, link.get("href", "")) if link and link.has_attr("href") else url
        if not same_site(source, url):
            source = url
        people[norm(name)] = {"name": name, "photo": photo, "source": source, "page": url}
        roster.setdefault(norm(name), {"name": name, "source": source})
    return list(people.values()), soup, list(roster.values())

def scan(district, root):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    output = {
        "source": root, "checked_at": now, "status": "unavailable",
        "candidates": [], "roster": [], "pages_checked": 0
    }
    queue = [root]
    seen = set()
    successful = 0
    found = {}
    listed = {}
    while queue and len(seen) < 5:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            html, actual = download(url, root)
            successful += 1
            candidates, soup, roster = candidates_on_page(html, actual)
            for person in candidates:
                found.setdefault(norm(person["name"]), person)
            for person in roster:
                listed.setdefault(norm(person["name"]), person)
            # On a confirmed roster page with photos, avoid crawling unrelated
            # council reports and news that may introduce false positives.
            if len(seen) == 1 and len(candidates) < 5:
                queue.extend(pages_to_check(soup, actual, root))
        except (requests.RequestException, ValueError) as exc:
            output["error"] = type(exc).__name__
    output["pages_checked"] = successful
    if successful:
        output["status"] = "ok" if found else "names_only" if listed else "no_candidates"
        output["candidates"] = sorted(found.values(), key=lambda x: norm(x["name"]))[:60]
        output["roster"] = sorted(listed.values(), key=lambda x: norm(x["name"]))[:60]
        output.pop("error", None)
    return output

def main():
    if "--self-test" in sys.argv:
        sample = '<html><title>Совет депутатов</title><div><a href="/person/1">Иванов Иван Иванович</a><img src="/photo.jpg"></div></html>'
        cards, _, roster = candidates_on_page(sample, "https://example.ru/")
        assert len(cards) == 1 and cards[0]["name"] == "Иванов Иван Иванович"
        assert len(roster) == 1
        second = '<html><h1>Совет депутатов</h1><div><img src="/anna.jpg"><p><a href="/person/2">Сидорова Анна Петровна</a></p></div></html>'
        cards, _, roster = candidates_on_page(second, "https://example.ru/sovet/")
        assert len(cards) == 1 and cards[0]["photo"] == "https://example.ru/anna.jpg"
        assert roster[0]["name"] == "Сидорова Анна Петровна"
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
    def recent_success(iso):
        try:
            last = dt.datetime.fromisoformat(iso or "")
            if last.tzinfo is None:
                last = last.replace(tzinfo=dt.timezone.utc)
            age = dt.datetime.now(dt.timezone.utc) - last
            return dt.timedelta(0) <= age <= dt.timedelta(days=7)
        except (ValueError, TypeError):
            return False

    for district, url in SOURCES.items():
        value = scan(district, url)
        previous = old.get(district, {})
        prior_success = previous.get("last_success_at") or (
            previous.get("checked_at") if previous.get("status") in ("ok", "names_only") else None
        )
        if value["status"] == "unavailable" and recent_success(prior_success):
            if previous.get("candidates") or previous.get("roster"):
                value["status"] = "stale"
                value["candidates"] = previous.get("candidates", [])
                value["roster"] = previous.get("roster", [])
                value["last_success_at"] = prior_success
        result["districts"][district] = value
        print(district, value["status"], len(value["candidates"]))
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Public read-only JavaScript snapshot, loaded before the dashboard initializes.
    # Only source-linked, named candidates with photos are auto-published.
    shared = {"schema_version": 1, "generated_at": result["generated_at"], "districts": {}}
    for district, info in result["districts"].items():
        if not (info["status"] == "ok" or (
            info["status"] == "stale" and recent_success(info.get("last_success_at"))
        )):
            continue
        cards = []
        for p in info.get("candidates", []):
            name, photo, source = p.get("name", ""), p.get("photo", ""), p.get("source", "")
            if NAME.fullmatch(name) and same_site(photo, info["source"]) and same_site(source, info["source"]):
                cards.append({"name": name, "source": source, "photo": photo})
        if cards:
            shared["districts"][district] = cards
    literal = json.dumps(shared, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    OUT_JS.write_text(
        "/* Public-source roster snapshot; auto-generated by GitHub Actions. */\n"
        + "window.dmOfficialDeputySnapshot=" + literal + ";\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()

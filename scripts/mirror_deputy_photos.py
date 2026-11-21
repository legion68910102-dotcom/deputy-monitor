"""Mirror verified official deputy images into GitHub Pages to avoid third-party hotlink failures."""
import concurrent.futures
import json
import pathlib
import re
import urllib.request
import urllib.parse

html_path = pathlib.Path("index.html")
html = html_path.read_text(encoding="utf-8")
match = re.search(r"const officialDeputyPhotos=({.*?});", html)
if not match:
    raise SystemExit("Official photo map not found")
photos = json.loads(match.group(1))
directory = pathlib.Path("assets/deputy-photos")
directory.mkdir(parents=True, exist_ok=True)

def download(entry):
    name, values = entry
    url = values[0]
    if url.startswith("assets/deputy-photos/"):
        return name, url
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ("asafov.ru", "mcaricino.ru", "mo-obu.ru", "mo-obs.ru", "nzaton.ru"):
        return name, None
    ext = pathlib.PurePosixPath(parsed.path).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        return name, None
    import hashlib
    filename = hashlib.sha256(name.encode()).hexdigest()[:20] + ext
    target = directory / filename
    if target.exists() and target.stat().st_size > 2000:
        return name, str(target)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; DeputyMonitorPhotoArchive/1.0)", "Referer": "https://" + parsed.hostname + "/"})
    try:
        with urllib.request.urlopen(req, timeout=18) as response:
            content_type = response.headers.get("Content-Type", "").lower()
            if not content_type.startswith("image/"):
                return name, None
            data = response.read(3_000_001)
            if not (2000 < len(data) < 3_000_001):
                return name, None
        target.write_bytes(data)
        return name, str(target)
    except Exception as exc:
        print("Direct unavailable:", name, type(exc).__name__)
        try:
            proxy_url = "https://images.weserv.nl/?url=" + urllib.parse.quote(parsed.hostname + parsed.path, safe="/")
            proxy_req = urllib.request.Request(proxy_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(proxy_req, timeout=30) as response:
                content_type = response.headers.get("Content-Type", "").lower()
                data = response.read(3_000_001)
                if not content_type.startswith("image/") or not (2000 < len(data) < 3_000_001):
                    return name, None
            target.write_bytes(data)
            return name, str(target)
        except Exception as proxy_exc:
            print("Proxy unavailable:", name, type(proxy_exc).__name__)
            return name, None

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = dict(pool.map(download, photos.items()))
count = 0
for name, local in results.items():
    if local:
        photos[name][0] = local
        count += 1
new_map = json.dumps(photos, ensure_ascii=False, separators=(",", ":"))
html = html[:match.start(1)] + new_map + html[match.end(1):]
html_path.write_text(html, encoding="utf-8")
print("Mirrored", count, "of", len(photos), "deputy images; remaining URLs preserved")
pathlib.Path("photo-import-status.json").write_text(json.dumps({"total":len(photos),"local":count,"missing":[name for name,local in results.items() if not local]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

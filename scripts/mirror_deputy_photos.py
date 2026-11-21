"""Archive deputy photos on GitHub Pages, preserving already downloaded images.

Only real, validated image files are committed. Unavailable sources remain in the
manifest for later retries; no stock or synthetic portraits are substituted.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
html_path = ROOT / "index.html"
html = html_path.read_text(encoding="utf-8")
match = re.search(r"const officialDeputyPhotos=({.*?});", html)
if not match:
    raise SystemExit("Photo map not found; refusing to modify index.html")
photos = json.loads(match.group(1))
directory = ROOT / "assets/deputy-photos"
directory.mkdir(parents=True, exist_ok=True)
allowed_hosts = {"asafov.ru", "mcaricino.ru", "mo-obu.ru", "mo-obs.ru", "nzaton.ru"}
types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

def valid_image(data):
    if not (1500 < len(data) < 4_000_000):
        return False
    return (data.startswith(b"\xff\xd8\xff") or data.startswith(b"\x89PNG\r\n\x1a\n")
            or (data.startswith(b"RIFF") and data[8:12] == b"WEBP"))

def retrieve(url, referer=None):
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36",
               "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=22) as response:
        if response.status != 200:
            raise ValueError("HTTP " + str(response.status))
        data = response.read(4_000_001)
        if not valid_image(data):
            raise ValueError("Invalid image bytes")
        return data

def download(entry):
    name, values = entry
    url = values[0]
    if url.startswith("assets/deputy-photos/"):
        local = ROOT / url
        if local.is_file() and valid_image(local.read_bytes()):
            return name, url, "saved"
        return name, None, "local file missing"
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in allowed_hosts:
        return name, None, "unsupported source"
    ext = pathlib.PurePosixPath(parsed.path).suffix.lower()
    if ext not in types:
        return name, None, "unsupported format"
    filename = hashlib.sha256(name.encode("utf-8")).hexdigest()[:20] + ext
    target = directory / filename
    local_url = "assets/deputy-photos/" + filename
    if target.is_file() and valid_image(target.read_bytes()):
        return name, local_url, "saved"
    # Direct source first; then two image fetch proxies (no API key).
    original = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
    proxied = urllib.parse.quote(original, safe="")
    options = [
        (original, "https://" + parsed.hostname + "/"),
        ("https://images.weserv.nl/?url=" + urllib.parse.quote(parsed.hostname + parsed.path, safe="/"), None),
        ("https://wsrv.nl/?url=" + proxied, None),
    ]
    errors = []
    for candidate, referer in options:
        try:
            data = retrieve(candidate, referer)
            target.write_bytes(data)
            return name, local_url, "downloaded"
        except Exception as exc:
            errors.append(type(exc).__name__ + ": " + str(exc)[:80])
    return name, None, "; ".join(errors)

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(download, photos.items()))
by_name = {name: (local, status) for name, local, status in results}
for name, (local, _) in by_name.items():
    if local:
        photos[name][0] = local
new_map = json.dumps(photos, ensure_ascii=False, separators=(",", ":"))
html = html[:match.start(1)] + new_map + html[match.end(1):]
html_path.write_text(html, encoding="utf-8")
missing = [{"name": name, "url": photos[name][0], "reason": status}
           for name, local, status in results if not local]
report = {"generated_at": datetime.now(timezone.utc).isoformat(),
          "total": len(photos), "local": len(photos) - len(missing),
          "missing_count": len(missing), "missing": missing}
(ROOT / "photo-import-status.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Local photo archive:", report["local"], "/", report["total"], "; missing:", len(missing))
for item in missing[:8]:
    print("Unresolved:", item["name"], item["reason"])

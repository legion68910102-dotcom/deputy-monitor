"""Read the shared browser/Excel term configuration; no network."""
import json
from datetime import date
from pathlib import Path

PREFIX = "window.dmMonitoringTerm = "
def load_term(root):
    line = next(line for line in (Path(root) / "monitoring-term-v1.js").read_text(encoding="utf-8").splitlines() if line.startswith(PREFIX))
    term = json.loads(line[len(PREFIX):].rstrip(";"))
    if date.fromisoformat(term["start"]) > date.fromisoformat(term["end"]):
        raise ValueError("Invalid monitoring term")
    return term

def post_in_term(post, term):
    if not isinstance(post, dict):
        return False
    try:
        day = date.fromisoformat(str(post.get("date", ""))[:10])
    except ValueError:
        return False
    return term["start"] <= day.isoformat() <= term["end"] and any(p["handle"] == post.get("profile") for p in term["roster"])

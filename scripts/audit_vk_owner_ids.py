"""Read-only audit of previously saved VK owner IDs for inaccessible roster entries."""
import json,re
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
archive=json.loads((root/"vk-posts.json").read_text(encoding="utf-8"))
status=json.loads((root/"monitor-status.json").read_text(encoding="utf-8"))["profiles"]
targets={h for h,s in status.items() if s.get("status")=="checked_unavailable"}
owners={h:Counter() for h in targets}
for row in archive.get("posts",[]):
    if not isinstance(row,dict) or row.get("profile") not in targets: continue
    # Only owner IDs from original published wall links, never infer from a repost.
    match=re.fullmatch(r"https://(?:m\.)?vk\.(?:ru|com)/wall([1-9][0-9]*)_[0-9]+/?(?:\?[^#]*)?",str(row.get("url","")))
    if match:
        trust="vk_api" if row.get("source")=="vk_api" or "vk_api" in (row.get("sources") or []) else "legacy_unverified"
        owners[row["profile"]][(match.group(1),trust)]+=1
result={h:[{"public_id":i,"provenance":s,"count":n} for (i,s),n in sorted(v.items())] for h,v in sorted(owners.items())}
print("ARCHIVE_OWNER_AUDIT "+json.dumps(result,ensure_ascii=False))

#!/usr/bin/env python3
"""Resolve VK profile avatars for the entire deputy roster via official VK API.

Never substitute another person's image if a VK profile is unavailable.
Requires VK_TOKEN. Writes public avatar URLs and explicit per-profile statuses.
"""
import datetime as dt
import json
import os
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

roster=json.loads(Path("deputies.json").read_text(encoding="utf-8"))["deputies"]
token=os.environ.get("VK_TOKEN","").strip()
now=dt.datetime.now(dt.timezone.utc).isoformat()
path=Path("vk-avatars.json")
try:
    old=json.loads(path.read_text(encoding="utf-8"))
    previous=old.get("profiles",{})
except (ValueError,OSError):
    previous={}
profiles={}
handles=list(dict.fromkeys(p["handle"] for p in roster if p.get("handle")))
for start in range(0,len(handles),100):
    chunk=handles[start:start+100]
    if not token:
        for handle in chunk:
            profiles[handle]={"status":"needs_token","photo":None,"source":"https://vk.com/"+handle}
        continue
    params=urllib.parse.urlencode({"user_ids":",".join(chunk),"fields":"photo_200,photo_200_orig,photo_max_orig,screen_name","v":"5.199"})
    req=urllib.request.Request("https://api.vk.com/method/users.get?"+params,headers={"Authorization":"Bearer "+token,"User-Agent":"DeputyMonitor/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=30) as resp: data=json.load(resp)
        if "error" in data:
            raise ValueError(str(data["error"].get("error_msg","VK API error"))[:160])
        found={}
        for handle,user in zip(chunk,data.get("response",[])):
            # The response is ordered like user_ids; keep index association, not name guesses.
            if user.get("deactivated"):
                profiles[handle]={"status":"unavailable","photo":None,"source":"https://vk.com/"+handle}
                continue
            photo=next((user.get(k) for k in ("photo_200","photo_200_orig","photo_max_orig") if isinstance(user.get(k),str) and user[k].startswith("https://") and "camera_" not in user[k]),None)
            profiles[handle]={"status":"success" if photo else "no_photo","photo":photo,"source":"https://vk.com/"+handle}
            found[handle]=True
        for handle in chunk:
            if handle not in profiles: profiles[handle]={"status":"unavailable","photo":None,"source":"https://vk.com/"+handle}
    except (urllib.error.URLError,TimeoutError,ValueError,KeyError,TypeError) as exc:
        for handle in chunk:
            prev=previous.get(handle,{})
            photo=prev.get("photo") if prev.get("status")=="success" else None
            profiles[handle]={"status":"success" if photo else "api_error","photo":photo,"source":"https://vk.com/"+handle,"error":type(exc).__name__}
path.write_text(json.dumps({"schema_version":1,"generated_at":now,"roster_size":len(handles),"profiles":profiles},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("VK avatars",sum(bool(x.get("photo")) for x in profiles.values()),"of",len(handles))

#!/usr/bin/env python3
"""Daily unauthenticated availability check. Never treats page HTML as verified VK posts."""
import json, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

handles=["natalia_shabasheva","shmakova_os","ekaterina.tyutyunnikova","aabulatov","vidutinaov","tishkovaea","elena.rubtsovanazarova","nuykinakv"]
now=datetime.now(timezone.utc).isoformat()
profiles={}
for handle in handles:
    url="https://vk.ru/"+handle
    try:
        request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; DeputyMonitor/1.0)"})
        with urllib.request.urlopen(request,timeout=15) as response:
            code=response.status
        reason="Страница отвечает HTTP "+str(code)+", но публикации и метрики без VK API не подтверждены"
    except urllib.error.HTTPError as exc:
        reason="HTTP "+str(exc.code)+": публикации и метрики недоступны для автоматической проверки"
    except (urllib.error.URLError,TimeoutError,ValueError) as exc:
        reason="Не удалось проверить доступность страницы ("+type(exc).__name__+")"
    profiles[handle]={"checked_at":now,"status":"checked_unavailable","posts_count":None,"reason":reason}
report={"schema_version":1,"generated_at":now,"source":"Unauthenticated HTTP reachability; NOT a VK posts collector","profiles":profiles}
Path("profile-reachability.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Checked",len(profiles),"profiles; no post counts inferred.")

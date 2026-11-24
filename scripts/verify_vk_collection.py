#!/usr/bin/env python3
"""Fail a GitHub Actions run if its published VK API collection did not really run."""
import json
import sys
from pathlib import Path

def verify(report):
    if not isinstance(report, dict):
        return False, "Нет сведений о выполненном VK API-сборе"
    roster = int(report.get("roster_size") or 0)
    attempted = int(report.get("attempted_profiles") or 0)
    succeeded = int(report.get("successful_profiles") or 0)
    failed = int(report.get("failed_profiles") or 0)
    stopped = report.get("stopped_reason")
    if stopped:
        return False, f"VK API-сбор был остановлен: {stopped}"
    if roster < 1 or attempted != roster:
        return False, f"Опрос не завершён: проверено {attempted} из {roster}"
    if succeeded < 1:
        return False, "VK API не вернул данные ни для одного профиля"
    return True, f"VK API: проверено {attempted}/{roster}, удалось {succeeded}, недоступно {failed}"

if __name__ == "__main__":
    payload = json.loads(Path(sys.argv[1] if len(sys.argv)>1 else "monitor-status.json").read_text(encoding="utf-8"))
    ok, message = verify(payload.get("vk_api_last_run"))
    print(("::notice::" if ok else "::error::")+message)
    if not ok:
        sys.exit(1)

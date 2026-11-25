import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from backfill_vk_queue import run,STATE
from monitoring_term import PREFIX

class HistoryQueueTests(unittest.TestCase):
    def test_checkpoint_preserves_archive_and_full_run(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            term={"id":"test","start":"2020-01-01","end":"2099-01-01","roster":[{"handle":"alpha"}]}
            (root/"monitoring-term-v1.js").write_text(PREFIX+json.dumps(term)+";\n")
            stamp=int(dt.datetime(2025,1,1,tzinfo=dt.timezone.utc).timestamp())
            full={"posts":[],"vk_api_last_run":{"attempted_profiles":1}}
            (root/"vk-posts.json").write_text(json.dumps(full))
            (root/"monitor-status.json").write_text(json.dumps({"profiles":{"alpha":{"status":"success"}}}))
            def fetch(h,t,offset):
                return {"response":{"items":[{"owner_id":1,"id":i+1,"date":stamp,"text":"public"} for i in range(offset,min(offset+100,140))]}}
            a=run(root,"TEST",1,fetch=fetch,pause=lambda _:None)
            self.assertEqual(a["new_posts"],100)
            self.assertEqual(a["history_complete"],0)
            b=run(root,"TEST",1,fetch=fetch,pause=lambda _:None)
            self.assertEqual(b["new_posts"],40)
            self.assertEqual(b["history_complete"],1)
            saved=json.loads((root/"vk-posts.json").read_text())
            self.assertEqual(len(saved["posts"]),140)
            self.assertEqual(saved["vk_api_last_run"],full["vk_api_last_run"])
    def test_quota_stops_without_deleting(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            term={"id":"test","start":"2020-01-01","end":"2099-01-01","roster":[{"handle":"alpha"}]}
            (root/"monitoring-term-v1.js").write_text(PREFIX+json.dumps(term)+";\n")
            (root/"vk-posts.json").write_text('{"posts":[{"profile":"old","date":"2019-01-01"}]}')
            (root/"monitor-status.json").write_text('{"profiles":{"alpha":{"status":"success"}}}')
            result=run(root,"TEST",10,fetch=lambda *args:{"error":{"error_code":29}},pause=lambda _:None)
            self.assertEqual(result["requests"],1)
            self.assertEqual(result["archive_posts"],1)
            self.assertFalse(json.loads((root/STATE).read_text())["enabled"])

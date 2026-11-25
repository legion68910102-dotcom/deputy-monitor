import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from monitoring_term import load_term, post_in_term, PREFIX
from start_monitoring_term import plan, activate, five_year_end

class TermTests(unittest.TestCase):
    def setUp(self):
        self.p={"name":"Test Deputy","district":"A","handle":"a","source":"https://example.org/roster"}
        self.old={"id":"old","start":"2026-01-01","end":"2027-09-20","roster":[self.p],"previous":[]}
        self.payload={"deputies":[self.p]}
        self.start=dt.date(2027,9,21)
    def test_five_year_term(self):
        new=plan(self.old,self.payload,self.start,self.start)
        self.assertEqual(new["end"],"2032-09-20")
        self.assertEqual(new["previous"][0]["id"],"old")
        self.assertFalse(post_in_term({"profile":"a","date":"2027-09-20"},new))
        self.assertTrue(post_in_term({"profile":"a","date":"2027-09-21"},new))
        self.assertTrue(post_in_term({"profile":"a","date":"2032-09-20"},new))
        self.assertFalse(post_in_term({"profile":"a","date":"2032-09-21"},new))
        self.assertFalse(post_in_term({"profile":"other","date":"2027-09-21"},new))
    def test_invalid_transition(self):
        for start,today in [(dt.date(2027,9,20),self.start),(self.start,dt.date(2027,9,20))]:
            with self.assertRaises(ValueError):
                plan(self.old,self.payload,start,today)
        with self.assertRaises(ValueError):
            plan(self.old,{"deputies":[self.p,self.p]},self.start,self.start)
    def test_archive_and_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"monitoring-term-v1.js").write_text(PREFIX+json.dumps(self.old)+";\n")
            (root/"deputies.json").write_text(json.dumps(self.payload))
            raw={"posts":[{"profile":"a","date":"2027-09-20","text":"old"}],"vk_api_last_run":{"successful_profiles":1}}
            (root/"vk-posts.json").write_text(json.dumps(raw))
            (root/"monitor-status.json").write_text('{"profiles":{"a":{"status":"success"}}}')
            activate(root,self.payload,self.start,self.start,False)
            self.assertFalse((root/"archives").exists())
            activate(root,self.payload,self.start,self.start,True)
            self.assertEqual(load_term(root)["start"],"2027-09-21")
            self.assertEqual(json.loads((root/"vk-posts.json").read_text())["posts"],raw["posts"])
            self.assertEqual(json.loads((root/"archives/term-old/vk-posts.json").read_text()),raw)
            self.assertEqual(json.loads((root/"monitor-status.json").read_text())["profiles"]["a"]["status"],"not_checked")
    def test_leap_boundary(self):
        self.assertEqual(five_year_end(dt.date(2028,2,29)),dt.date(2033,2,28))
if __name__=="__main__":
    unittest.main()

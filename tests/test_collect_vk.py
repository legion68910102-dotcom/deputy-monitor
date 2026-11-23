"""Offline, deterministic tests for the official VK importer. No VK token/network needed."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("collect_vk", ROOT / "scripts/collect_vk.py")
vk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vk)


class VKCollectionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.write("deputies.json", {"deputies": [
            {"handle": "alpha", "district": "A"},
            {"handle": "beta", "district": "B"},
            {"handle": "gamma", "district": "B"}
        ]})
        self.old = {
            "posts": [
                {"profile": "alpha", "url": "https://vk.com/wall1_11",
                 "text": "Old full text from Apify", "date": "2026-01-01",
                 "source": "apify", "apify_field": "keep me", "likes": 7},
                {"profile": "beta", "url": "https://vk.com/wall2_22",
                 "text": "Historical CSV post", "date": "2025-12-31",
                 "source": "manual", "custom": True},
                {"profile": "zeta", "url": "https://vk.com/wall8_99",
                 "text": "Old profile not in current roster", "source": "apify"},
                {"legacy": "unkeyed historical record"}
            ],
            "generated_at": "old", "source": "Apify",
            "monitored_profiles": ["alpha", "beta"],
            "profile_status": {"alpha": {"state": "posts_verified"}},
            "import_diagnostics": {"old": True},
            "some_custom_metadata": 123
        }
        self.write("vk-posts.json", self.old)
        self.write("monitor-status.json", {
            "profiles": {"beta": {"status": "success", "posts_count": 12}},
            "old_report_field": "keep"
        })

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value, ensure_ascii=False),
                                       encoding="utf-8")

    def read(self, name):
        return json.loads((self.root / name).read_text(encoding="utf-8"))

    @staticmethod
    def post(owner, ident, text="Some text", timestamp=1760000000, **fields):
        return {
            "owner_id": owner, "id": ident, "date": timestamp,
            "text": text, "from_id": owner, **fields
        }

    def fake(self, *, alpha=None, beta=None, gamma=None):
        contents = {
            "alpha": alpha if alpha is not None else {"response": {"items": []}},
            "beta": beta if beta is not None else {"response": {"items": []}},
            "gamma": gamma if gamma is not None else {"response": {"items": []}},
        }
        return lambda handle, token: contents[handle]

    def test_lossless_merge_keeps_apify_manual_and_unkeyed_records(self):
        fake = self.fake(
            alpha={"response": {"items": [
                self.post(1, 11, "", likes={"count": 8},
                          comments={"count": 2}, copy_history=[{"id": 1}]),
                self.post(1, 12, "New VK post", views={"count": 87}),
                self.post(1, 13, "From other author", from_id=999),
                self.post(1, 14, "Advertisement", marked_as_ads=1)
            ]}}
        )
        summary = vk.collect(self.root, "FAKE_TEST_TOKEN", max_profiles=1,
                             fetch=fake, pause=lambda _: None)
        self.assertEqual(summary["new_posts"], 1)
        self.assertEqual(summary["attempted_profiles"], 1)
        out = self.read("vk-posts.json")
        self.assertEqual(out["monitored_profiles"], ["alpha", "beta"])
        self.assertEqual(out["import_diagnostics"], {"old": True})
        self.assertEqual(out["some_custom_metadata"], 123)
        self.assertEqual(out["source"], "Apify")
        self.assertEqual(len(out["posts"]), 5)
        orig = next(p for p in out["posts"] if p.get("url") == "https://vk.com/wall1_11")
        self.assertEqual(orig["text"], "Old full text from Apify")
        self.assertEqual(orig["likes"], 8)
        self.assertEqual(orig["apify_field"], "keep me")
        self.assertEqual(orig["source"], "apify")
        self.assertEqual(orig["sources"], ["apify", "vk_api"])
        self.assertTrue(orig["is_repost"])
        self.assertEqual(len([p for p in out["posts"]
                              if p.get("url") == "https://vk.com/wall1_11"]), 1)
        self.assertTrue(any(p.get("custom") for p in out["posts"]))
        self.assertTrue(any(p.get("legacy") for p in out["posts"]))
        report = self.read("monitor-status.json")
        self.assertEqual(report["old_report_field"], "keep")
        self.assertEqual(report["profiles"]["beta"]["posts_count"], 12)
        self.assertEqual(report["roster_size"], 3)
        self.assertEqual(report["district_count"], 2)

    def test_vk_repost_source_and_original_text_are_preserved(self):
        original = {
            "owner_id": -12345, "id": 78,
            "text": "В Чертаново Центральном пройдут соревнования на коньках"
        }
        data = self.post(1, 40, "", copy_history=[original])
        record = vk.normalize_post(data, "alpha")
        self.assertTrue(record["is_repost"])
        self.assertTrue(record["repost_text_from_source"])
        self.assertEqual(record["repost_source_url"], "https://vk.com/wall-12345_78")
        self.assertIn("соревнования на коньках", record["text"])

        summary = vk.collect(self.root, "FAKE", max_profiles=1,
                             fetch=self.fake(alpha={"response": {"items": [data]}}),
                             pause=lambda _: None)
        self.assertEqual(summary["new_posts"], 1)
        saved = next(p for p in self.read("vk-posts.json")["posts"]
                     if p.get("url") == "https://vk.com/wall1_40")
        self.assertTrue(saved["is_repost"])
        self.assertEqual(saved["repost_source_url"], "https://vk.com/wall-12345_78")
        self.assertEqual(saved["text"], original["text"])

    def test_share_counter_or_mention_does_not_prove_repost(self):
        normal = self.post(1, 41, "Управа района сообщает о фестивале",
                           reposts={"count": 99})
        parsed = vk.normalize_post(normal, "alpha")
        self.assertFalse(parsed["is_repost"])
        self.assertNotIn("repost_source_url", parsed)
        self.assertEqual(parsed["reposts"], 99)

    def test_dry_run_reads_realistic_responses_but_writes_nothing(self):
        before = {p: (self.root / p).read_bytes()
                  for p in ("vk-posts.json", "monitor-status.json")}
        fake = self.fake(alpha={"response": {"items": [self.post(1, 12)]}})
        summary = vk.collect(self.root, "FAKE", max_profiles=1, dry_run=True,
                             fetch=fake, pause=lambda _: None)
        self.assertEqual(summary["new_posts"], 1)
        self.assertTrue(summary["dry_run"])
        for p, raw in before.items():
            self.assertEqual((self.root / p).read_bytes(), raw)

    def test_missing_token_and_corrupted_database_never_overwrite_files(self):
        original = (self.root / "vk-posts.json").read_bytes()
        with self.assertRaises(ValueError):
            vk.collect(self.root, "", fetch=self.fake(), pause=lambda _: None)
        self.assertEqual((self.root / "vk-posts.json").read_bytes(), original)
        (self.root / "vk-posts.json").write_text("{invalid json", encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            vk.collect(self.root, "FAKE", fetch=self.fake(),
                       pause=lambda _: None)
        self.assertEqual((self.root / "vk-posts.json").read_text(), "{invalid json")

    def test_api_error_does_not_drop_history_or_infer_inactivity(self):
        fake = self.fake(
            alpha={"error": {"error_code": 15, "error_msg": "Access denied"}},
            beta={"response": {"items": []}},
            gamma={"response": {"items": [self.post(3, 7, "Actual post")]}}
        )
        summary = vk.collect(self.root, "FAKE", fetch=fake, pause=lambda _: None)
        self.assertEqual(summary["attempted_profiles"], 3)
        self.assertEqual(summary["failed_profiles"], 1)
        self.assertEqual(summary["successful_profiles"], 2)
        self.assertEqual(len(self.read("vk-posts.json")["posts"]), 5)
        statuses = self.read("monitor-status.json")["profiles"]
        self.assertEqual(statuses["alpha"]["status"], "checked_unavailable")
        self.assertEqual(statuses["beta"]["status"], "success")
        self.assertEqual(statuses["beta"]["posts_count"], 0)
        self.assertIn("не доказывает отсутствие", statuses["beta"]["reason"])

    def test_auth_error_stops_requests_without_discarding_old_posts(self):
        calls = []
        def fetch(handle, token):
            calls.append(handle)
            return {"error": {"error_code": 5}}
        summary = vk.collect(self.root, "FAKE", fetch=fetch, pause=lambda _: None)
        self.assertEqual(calls, ["alpha"])
        self.assertEqual(summary["stopped_reason"], "auth_error")
        self.assertEqual(len(self.read("vk-posts.json")["posts"]), 4)
        self.assertNotIn("gamma", self.read("monitor-status.json")["profiles"])

    def test_retries_api_throttling(self):
        calls = []
        def fetch(handle, token):
            calls.append(handle)
            if len(calls) == 1:
                return {"error": {"error_code": 6}}
            return {"response": {"items": [self.post(1, 17)]}}
        summary = vk.collect(self.root, "FAKE", max_profiles=1,
                             dry_run=True, fetch=fetch, pause=lambda _: None)
        self.assertEqual(calls, ["alpha", "alpha"])
        self.assertEqual(summary["new_posts"], 1)

    def test_quota_error_stops_after_limited_retries(self):
        calls = []
        def fetch(handle, token):
            calls.append(handle)
            return {"error": {"error_code": 29}}
        summary = vk.collect(self.root, "FAKE", fetch=fetch, pause=lambda _: None)
        self.assertEqual(calls, ["alpha"])
        self.assertEqual(summary["stopped_reason"], "quota_error")
        self.assertEqual(summary["attempted_profiles"], 1)
        self.assertEqual(len(self.read("vk-posts.json")["posts"]), 4)

    def test_post_merge_is_idempotent(self):
        data = self.post(1, 11, "Updated text", likes={"count": 15})
        fake = self.fake(alpha={"response": {"items": [data]}})
        vk.collect(self.root, "FAKE", max_profiles=1,
                   fetch=fake, pause=lambda _: None)
        before = self.read("vk-posts.json")["posts"]
        second = vk.collect(self.root, "FAKE", max_profiles=1,
                            fetch=fake, pause=lambda _: None)
        after = self.read("vk-posts.json")["posts"]
        self.assertEqual(before, after)
        self.assertEqual(second["new_posts"], 0)
        self.assertEqual(second["updated_posts"], 0)

    def test_all_159_profiles_in_production_roster(self):
        handles, districts = vk.roster_handles(ROOT)
        self.assertEqual(len(handles), 159)
        self.assertEqual(len(set(handles)), 159)
        self.assertEqual(districts, 16)


if __name__ == "__main__":
    unittest.main()

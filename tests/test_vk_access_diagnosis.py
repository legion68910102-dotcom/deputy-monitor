import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("diagnose",Path(__file__).resolve().parents[1]/"scripts/diagnose_vk_access.py")
d=importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
class TestDiagnosis(unittest.TestCase):
    def test_masked(self):
        self.assertEqual(d.format_issue("••••"),"masked_or_placeholder")
        self.assertEqual(d.format_issue("abc...def"),"masked_or_placeholder")
        self.assertIsNone(d.format_issue("test-opaque-key"))
    def test_never_report_secret(self):
        result=d.safe_result({"error":{"error_code":5,"error_subcode":1130,"error_msg":"access_token was given to another ip address SECRET","request_params":[{"value":"SECRET"}]}})
        self.assertEqual(result,{"status":"vk_error","code":5,"subcode":1130,"hint":"ip_binding"})
        self.assertNotIn("SECRET",str(result))
    def test_success_metadata_only(self):
        self.assertEqual(d.safe_result({"response":{"items":[{"text":"private payload"}]}}),{"status":"wall_read_ok","returned_items":1})

"""Safe and deterministic verification of VK collection status."""
import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location("vk_check",Path(__file__).resolve().parents[1]/"scripts"/"verify_vk_collection.py")
vk_check=importlib.util.module_from_spec(spec)
spec.loader.exec_module(vk_check)

class TestCheckVK(unittest.TestCase):
    def test_complete_collection_with_private_walls(self):
        valid={"roster_size":159,"attempted_profiles":159,"successful_profiles":95,
               "failed_profiles":64,"stopped_reason":None}
        ok,_=vk_check.verify(valid)
        self.assertTrue(ok)

    def test_token_failure_is_not_success(self):
        failed={"roster_size":159,"attempted_profiles":1,"successful_profiles":0,
                "failed_profiles":1,"stopped_reason":"auth_error"}
        ok,_=vk_check.verify(failed)
        self.assertFalse(ok)

    def test_short_collection_fails(self):
        partial={"roster_size":159,"attempted_profiles":100,"successful_profiles":100,
                 "failed_profiles":0,"stopped_reason":None}
        ok,_=vk_check.verify(partial)
        self.assertFalse(ok)

    def test_all_blocked_fails(self):
        partial={"roster_size":159,"attempted_profiles":159,"successful_profiles":0,
                 "failed_profiles":159,"stopped_reason":None}
        ok,_=vk_check.verify(partial)
        self.assertFalse(ok)

if __name__=="__main__":
    unittest.main()

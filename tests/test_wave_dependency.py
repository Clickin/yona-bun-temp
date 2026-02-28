import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / "scripts" / "agentctl.py"
SPEC = importlib.util.spec_from_file_location("agentctl_module", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Failed to load scripts/agentctl.py for tests")
agentctl = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agentctl)


class DependencyWaveTests(unittest.TestCase):
    def test_child_task_waits_for_parent_wave(self) -> None:
        tasks = {
            "T-PARENT": {"id": "T-PARENT", "status": "TODO", "parallel_paths": ["tests/e2e/wave_dependency/parent"]},
            "T-CHILD": {
                "id": "T-CHILD",
                "status": "TODO",
                "depends_on": ["T-PARENT"],
                "parallel_paths": ["tests/e2e/wave_dependency/child"],
            },
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([["T-PARENT"], ["T-CHILD"]], result["waves"])
        self.assertEqual([], result["blocked"])

    def test_missing_dependency_marks_task_blocked(self) -> None:
        tasks = {
            "T-CHILD": {
                "id": "T-CHILD",
                "status": "TODO",
                "depends_on": ["T-MISSING"],
                "parallel_paths": ["tests/e2e/wave_dependency/child"],
            }
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([], result["waves"])
        self.assertEqual("T-CHILD", result["blocked"][0]["id"])
        self.assertIn("waiting on deps", result["blocked"][0]["reason"])


if __name__ == "__main__":
    unittest.main()

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


class ConflictWaveTests(unittest.TestCase):
    def test_parent_child_path_prefix_conflict_serializes_waves(self) -> None:
        tasks = {
            "T-A": {"id": "T-A", "status": "TODO", "parallel_paths": ["tests/e2e/wave_conflict/shared"]},
            "T-B": {"id": "T-B", "status": "TODO", "parallel_paths": ["tests/e2e/wave_conflict/shared/nested"]},
            "T-C": {"id": "T-C", "status": "TODO", "parallel_paths": ["tests/e2e/wave_conflict/other"]},
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([["T-A", "T-C"], ["T-B"]], result["waves"])

    def test_missing_parallel_paths_isolate_unknown_task(self) -> None:
        tasks = {
            "T-A": {"id": "T-A", "status": "TODO", "parallel_paths": ["tests/e2e/wave_conflict/a"]},
            "T-B": {"id": "T-B", "status": "TODO"},
            "T-C": {"id": "T-C", "status": "TODO", "parallel_paths": ["tests/e2e/wave_conflict/c"]},
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([["T-A", "T-C"], ["T-B"]], result["waves"])


if __name__ == "__main__":
    unittest.main()

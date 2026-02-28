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


class IndependentWaveTests(unittest.TestCase):
    def test_three_independent_tasks_share_one_wave(self) -> None:
        tasks = {
            "T-A": {"id": "T-A", "status": "TODO", "parallel_paths": ["tests/e2e/wave_independent/a"]},
            "T-B": {"id": "T-B", "status": "TODO", "parallel_paths": ["tests/e2e/wave_independent/b"]},
            "T-C": {"id": "T-C", "status": "TODO", "parallel_paths": ["tests/e2e/wave_independent/c"]},
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([["T-A", "T-B", "T-C"]], result["waves"])
        self.assertEqual([], result["blocked"])

    def test_done_tasks_are_not_rescheduled_when_filtering_todo(self) -> None:
        tasks = {
            "T-A": {"id": "T-A", "status": "DONE", "parallel_paths": ["tests/e2e/wave_independent/a"]},
            "T-B": {"id": "T-B", "status": "TODO", "parallel_paths": ["tests/e2e/wave_independent/b"]},
            "T-C": {"id": "T-C", "status": "TODO", "parallel_paths": ["tests/e2e/wave_independent/c"]},
        }

        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )

        self.assertEqual([["T-B", "T-C"]], result["waves"])


if __name__ == "__main__":
    unittest.main()

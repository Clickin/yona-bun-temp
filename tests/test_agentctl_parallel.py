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


class ParallelWavesTests(unittest.TestCase):
    def test_independent_three_tasks_share_wave(self) -> None:
        tasks = {
            "T-001": {"id": "T-001", "status": "TODO", "title": "a", "parallel_paths": ["src/a"]},
            "T-002": {"id": "T-002", "status": "TODO", "title": "b", "parallel_paths": ["src/b"]},
            "T-003": {"id": "T-003", "status": "TODO", "title": "c", "parallel_paths": ["src/c"]},
        }
        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )
        self.assertEqual([["T-001", "T-002", "T-003"]], result["waves"])
        self.assertEqual([], result["blocked"])

    def test_dependency_waits_until_parent_is_done(self) -> None:
        tasks = {
            "T-002": {"id": "T-002", "status": "TODO", "parallel_paths": ["src/t2"]},
            "T-004": {"id": "T-004", "status": "TODO", "depends_on": ["T-002"], "parallel_paths": ["src/t4"]},
        }
        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )
        self.assertEqual([["T-002"], ["T-004"]], result["waves"])

    def test_conflicting_paths_are_serialized(self) -> None:
        tasks = {
            "T-005": {"id": "T-005", "status": "TODO", "parallel_paths": ["src/shared"]},
            "T-006": {"id": "T-006", "status": "TODO", "parallel_paths": ["src/shared/utils"]},
        }
        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )
        self.assertEqual([["T-005"], ["T-006"]], result["waves"])

    def test_missing_paths_global_lock_is_conservative(self) -> None:
        tasks = {
            "T-007": {"id": "T-007", "status": "TODO", "parallel_paths": ["src/t7"]},
            "T-008": {"id": "T-008", "status": "TODO"},
        }
        result = agentctl.plan_parallel_waves(
            tasks,
            candidate_statuses={"TODO"},
            max_lanes=3,
            missing_path_policy="global-lock",
        )
        self.assertEqual([["T-007"], ["T-008"]], result["waves"])


class MergeAndApprovalTests(unittest.TestCase):
    def test_merge_priority_prefers_reviewer_over_planner(self) -> None:
        payloads = {
            "PLANNER": [{"id": "T-010", "owner": "CODER", "priority": "med"}],
            "CODER": [{"id": "T-010", "owner": "CODER", "scope": "impl"}],
            "TESTER": [{"id": "T-010", "commands": ["pytest -q"]}],
            "DOCS": [{"id": "T-010", "workflow_artifact": "docs/workflow/T-010.md"}],
            "REVIEWER": [{"id": "T-010", "owner": "REVIEWER", "acceptance": ["ok"]}],
        }
        merged = agentctl.merge_agent_plans(payloads)
        self.assertEqual("REVIEWER", merged["tasks"][0]["owner"])
        self.assertTrue(merged["conflicts"])

    def test_approval_comment_detection(self) -> None:
        task = {"comments": [{"author": "HUMAN", "body": "Approval: Approve closure commit for T-001."}]}
        self.assertTrue(agentctl.task_has_approval_comment(task))
        self.assertFalse(agentctl.task_has_approval_comment({"comments": [{"author": "HUMAN", "body": "Looks good"}]}))


if __name__ == "__main__":
    unittest.main()

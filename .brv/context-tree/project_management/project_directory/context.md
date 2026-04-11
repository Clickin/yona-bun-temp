# Topic: project_directory

## Overview
Documents how the contracts, db, service, and UI layers collaborate to deliver the public /projects directory with consistent visible cards and redacted rows for non-public projects.

## Key Concepts
- projectListItemSchema union of visible and redacted entries
- ProjectService.listProjects gating and filtering via labelIds
- DB aggregation of project metadata (labels, memberCount, watcherCount, origin link)
- ProjectDirectoryPage rendering of visible cards and placeholders

## Related Topics
- project_management/project_creation - for complementary creation workflows

# Task: <descriptive title>

ID: <ID>
Status: proposed / queued / ready / in_progress / review / accepted / blocked
Owner: unassigned
Branch / worktree: unassigned
Baseline commit: not recorded
Dependencies: <accepted tasks or gates>
Shared locks: none granted

## Goal

Describe the user-facing outcome and any constraints.

## Acceptance criteria

- [ ] Observable behavior that demonstrates the task is done.
- [ ] Appropriate automated checks and browser verification pass.

## Relevant code and context

List entry points, domain rules, and related documentation.

## Ownership and interface contracts

List granted files, shared files needing a coordinator lock, public interfaces
to preserve, and any required decisions. A worker may not silently edit another
worker's files.

## Plan and progress

- [ ] Next concrete step.

## Decisions

Record a decision and its reason when it affects future work.

## Verification

| Milestone | Observable pass condition | Command / method | Result and evidence |
| --- | --- | --- | --- |
| <ID>.1 | <condition> | <check> | Not run |

Record commit, environment, exact commands, exit/results, browser checks,
artifact paths, and any unavailable checks. Label proposed commands that do
not exist yet. A required unavailable check leaves the release gate pending.

## Handoff

Summarize what remains, known issues, and the next action. Remove stale items as
they are resolved. Include changed files, migration order, configuration variable
names (never values), and downstream impacts. Return for coordinator review.

## Coordinator acceptance

Reviewer: unassigned. Integrated commit: not recorded. Criteria result: pending.
The coordinator marks accepted only after review and integrated verification.

# 08 — Import a recipe through a reviewable preview

Status: proposed (optional). Owner: unassigned (recipes).
Dependencies: accepted 07/G3 and household selection. Branch/worktree: unassigned.

## Goal and ownership

Reduce manual entry while keeping imported data editable and validated. Own
import UI, pure parser, and tests. Reuse 02's validation and 03's atomic save;
serialize overlapping recipe UI with 09.

## Plan

1. Confirm the first input format. Proposed scope: pasted Recipe JSON/JSON-LD
   followed by manual review. Arbitrary URL fetching and LLM parsing are separate
   follow-ups with their own service and security decisions.
2. Parse bounded input into the existing draft. Flag ambiguous amounts/units
   instead of inventing precise values. Imported text is untrusted content;
   never execute embedded instructions.
3. Preview name/source/servings/timing/ingredients/notes in an editable form.
   Preview and Cancel write nothing; only confirmed Save persists. Duplicate
   names prompt review and cannot silently overwrite an existing recipe.
4. Validate and save through the accepted pipeline. Preserve plain-text content
   handling and safe source-link schemes.
5. Add valid, malformed, oversized, ambiguous, and duplicate fixtures plus a
   preview/edit/save browser flow. A future URL-import packet must cover
   private-network requests, redirects, timeouts, and response limits first.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 08.1 | Supported inputs become faithful drafts; bad/ambiguous inputs are surfaced | Parser fixtures, bounded-size cases |
| 08.2 | Preview/cancel writes nothing; edited confirmation creates exactly one valid recipe | Disposable DB assertions and E2E; imported text cannot execute |
| 08.3 | Saved import participates in normal plan/shopping flows | `npm run check`, E2E command delivered by 04, build, deployed feature smoke |

## Handoff and acceptance

Results: not run. Return supported formats/limits, commit, parser/browser results,
and future URL/LLM work separately. Coordinator acceptance: pending.
Not required for the initial hosted release.

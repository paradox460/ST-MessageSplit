---
name: update-changelog
description: Update the changelog to reflect the changes in the provide JJ revset
---

# Update Changelog

Update the `## Unreleased` section of `CHANGELOG.md` from a range of jujutsu
changesets.

### When to use

- The user asks to "update the changelog" / "add unreleased changes" from jj
  changesets.
- After a batch of work is committed in jj and you want to record it under
  `## Unreleased` before cutting a release.

### Inputs

Ask the user (via the `ask` tool) for the **jj ref specification** to inspect.
Offer sensible defaults and examples; an "Other" option is added automatically
so the user can type any jj revset.

Example question:

- *Question:* "Which jj changesets should I summarize into the changelog?"
- *Options:*
  - `@` — the current working-copy change only.
  - `master..@` — everything on the current branch since `master`.
  - `km::zl` — an explicit revset range (like the last run).
  - (Other — user types a custom revset, e.g. `description("feat")` or a
    specific commit id)

Accept any valid jj revset: a single change (`@`, a commit id), a range
(`A::B`, `master..@`), or a filter expression.

### Workflow

1. **Resolve the changeset range.** Validate the revset before reading diffs:
   ```bash
   jj log -r '<revset>' --no-graph --template 'commit_id.short() ++ " " ++ description.first_line() ++ "\n"'
   ```
   If `jj log` errors (unknown symbol, bad syntax), stop and re-ask the user
   for a valid revset — do not guess.

2. **Read each changeset's description and diff** to understand the actual
   change, not just the commit subject:
   ```bash
   jj show -r '<id>' --no-patch --template 'description'
   jj diff -r '<id>'
   ```
   Run all changesets' diffs in parallel.

3. **Read the current `CHANGELOG.md`** (`read` tool) to learn the existing
   style and to see what is already recorded under `## Unreleased` — append, do
   not clobber.

4. **Draft entries** following the conventions below. Summarize from the diffs:
   the commit message is a hint, the diff is the source of truth.

5. **Edit `CHANGELOG.md`** with the `edit` tool, inserting new entries under
   `## Unreleased`. Create the `## Unreleased` heading if missing. Re-`read`
   after editing to verify.

6. **Verify** by reading back the `## Unreleased` section.

### Changelog conventions (this repo)

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Match the
existing entries' style precisely.

**Section headings** (in this order, omit empty ones):
- `### Added` — new features or capabilities.
- `### Changed` — changes to existing behavior, renames, defaults.
- `### Deprecated` — soon-to-be-removed (rare here).
- `### Removed` — removed features.
- `### Fixed` — bug fixes.
- `### Security` — vulnerabilities (rare here).
- `### Internal` — build, types, tests, refactors with no user-facing effect.

**Entry style:**
- Each entry is a single bullet starting with a **bold lead-in** naming the
  thing that changed:
  ```
  - **Slash commands renamed** to avoid conflicts with …
  - **Author attribution on `/msg-split`**: an optional `author=<name>` …
  ```
- After the bold lead-in, write one or two sentences of user-facing
  description. Lead with the user-visible effect, then the mechanism.
- Use backticks for code: command names (`/msg-split`), named arguments
  (`author=<name>`), file paths (`src/util.ts`), and identifiers
  (`applyParagraphSplit`).
- Wrap long lines at ~72 columns (match existing entries).

**What to include vs. omit:**
- Include user-facing behavior: new commands, argument changes, renamed APIs,
  default changes, bug fixes.
- Put build/test/types/refactor-only changes under `### Internal`. If an
  internal change is pure plumbing for a user-facing feature already described,
  it can be omitted (as the 0.2.1 run omitted the `util.ts` import additions
  that only supported the new `author=` dropdown).
- Do **not** list every file touched or every commit verbatim — synthesize.
- One logical change = one bullet, even if it spans multiple changesets.

**Ordering within a section:** most significant first, or roughly
chronological — match the surrounding entries.

### jj reference

- `jj log -r '<revset>'` — list changesets in a range.
- `jj show -r '<id>'` — description + diff for one change.
- `jj diff -r '<id>'` — just the diff.
- Revset forms: `@` (working copy), `A::B` (range inclusive), `master..@`
  (ancestors of `@` not in `master`), `commit_id` (specific change).

### Do not

- Do not fabricate changes that are not in the diffs.
- Do not edit released sections (anything below a dated `## x.y.z` heading) —
  only `## Unreleased`.
- Do not run `jj` write commands (`commit`, `describe`, `abandon`, …); this
  skill is read-only on jj and edits only `CHANGELOG.md`.
- Do not reformat or restyle existing entries.

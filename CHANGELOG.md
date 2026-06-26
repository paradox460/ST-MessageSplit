# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.2.1 - 2026-06-26

No real changes this release, just actually compile before shipping

## 0.2.0 - 2026-06-23

### Added

- **Authorship re-attribution on split**: during the interactive overlay, each
  divider now carries a dropdown that re-attributes the resulting message below it.
  Pick *No Change* to keep the original author, the user persona, or any member of
  the current group (group chats only). Solo chats see the user persona option only.
  The underlying `applyParagraphSplit` accepts an optional `charOverrides` array
  (`'__user__'` for the user persona, an avatar filename for a character, `null` /
  omitted to keep the clone's original authorship) — the slash command path
  continues to keep the original author.

### Changed

- **Build target bumped** from ES2020 to ES2022 in `tsconfig.json` to support the
  top-level `await` in the new `src/util.ts`.
- **Types refactored**: the in-repo `src/sillytavern.d.ts` shim is gone. `src/global.d.ts`
  now imports SillyTavern core's `global.d.ts` directly to pull in upstream types
  (`ChatMessage`, `Character`, `STGroup`, `STEventSource`, …) and augments only the
  `STContext` fields this extension actually consumes, plus a `declare global` block
  for `toastr`. Everything that previously referenced `STChatMessage` now uses the
  upstream `ChatMessage`.

### Internal

- New `src/util.ts`: top-level-await helper that dynamic-imports `default_avatar`
  from ST's `/script.js` (with `/* webpackIgnore: true */`), used for the
  avatar=`"none"` fallback during re-attribution.
- New `test/preload.ts` + `bunfig.toml`: registers a `mock.module(...)` for
  `src/util.ts` so tests do not attempt to fetch `/script.js` at module load time.
- Five new unit tests on `applyParagraphSplit` cover group-character reattribution,
  user-persona reattribution, `null` override passthrough, `undefined` overrides, and
  mixed multi-override splits.

## 0.1.0 - 2026-06-20

Initial release.

### Added

- **Split** message toolbar button with an interactive overlay: render a message as
  paragraphs, drag a divider to choose the split point, and add/remove multiple
  dividers to split into several messages at once.
- **Merge** message toolbar button: merge a message into the one above it.
- `/split` slash command: split a message before the paragraph that best
  fuzzy-matches the supplied text. Accepts an optional `msg=<id>` named argument;
  defaults to the most recent message.
- `/merge` slash command: merge a single message into its predecessor, or collapse
  an inclusive `a-b` range into the first message. With no argument, merges the most
  recent message into its ancestor.
- Fence-aware paragraph segmentation: fenced code blocks (` ``` ` / `~~~`) are atomic
  and never split on their internal blank lines.

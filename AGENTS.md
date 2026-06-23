# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## What this is

A SillyTavern extension (TypeScript, bundled to a single ESM file) that adds
split/merge message functionality via toolbar buttons and slash commands.

## Build & verify

- **Build:** `mise run build` (runs a `jq` version-sync then `bun build` → `dist/index.js` + `dist/index.css`). Do **not** call `bun build` directly; use the mise task.
  - Add `--min` to minify.
  - The task is cached on `src/**/*` + `manifest.json`; `touch` a source file or use `--force` to re-run when needed.
- **Typecheck:** `bunx tsc --noEmit` (strict, no emit — the build does not typecheck).
- **Test:** `mise run ci` (preferred — runs `bunx tsc --noEmit` then `bun test`). `bun test` alone runs just the suite.
- `dist/` is committed; ship a rebuilt bundle with any source change.

## Tests

Unit tests live in top-level `test/` and run under `bun test` (Bun strips types and runs them; they are intentionally outside the tsc `include` and the build `sources` glob, so they neither get typechecked nor bundled).

- `test/segment.test.ts`, `test/mutations.test.ts`, `test/commands.test.ts` — one file per covered module.
- `test/helpers.ts` — installs/removes the ST runtime globals (`SillyTavern.getContext()`, `toastr`, `SillyTavern.libs.Fuse`) as per-test fakes plus a deterministic `Fuse` stub (`setFuseResults`). The command handlers read these globals at call time, so install in `beforeEach` and clear in `afterEach`.
- Covered: the pure text logic (`segment.ts`), the chat-mutation primitives (`mutations.ts`), and the exported slash-command handlers (`onMergeCommand` / `onSplitCommand` in `commands.ts`).
- Not covered (require a live ST DOM): `session.ts`, `buttons.ts`, `index.ts`. SillyTavern cannot run headless here, so anything touching the DOM/jQuery is verified manually inside a running instance (install path in `README.md`).

## Module layout (`src/`)

Keep concerns separated; do not collapse everything back into `index.ts`.

- `index.ts` — bootstrap only: injects toolbar buttons, wires jQuery click handlers, registers commands, resets state on `CHAT_CHANGED`, boots on `APP_READY`.
- `segment.ts` — `segmentParagraphs`: pure, fence-aware paragraph segmentation. No DOM, no `ctx`.
- `mutations.ts` — `applyParagraphSplit`, `mergeRange`, `parseIdRange`: in-place `ctx.chat` mutations that re-render (`printMessages`) and persist (`saveChat`). Shared by buttons and commands — keep exactly one split path and one merge path.
- `session.ts` — `SplitSession` (interactive overlay UI) plus sole ownership of the `activeSession` module state. Access it elsewhere only through `getActiveSession()` / `clearActiveSession()` / `openSplitSession()`; never reach for a private binding from another module.
- `buttons.ts` — toolbar button click handlers.
- `commands.ts` — `/split` and `/merge` STscript commands and their registration.
- `sillytavern.d.ts` — global type augmentation (see below).
- `style.css` — extension styles, bundled as `dist/index.css`.

## SillyTavern integration conventions

- Types for the ST runtime live in `src/sillytavern.d.ts` via `declare global`
  (`STContext`, `ChatMessage`, the slash-command classes, `SillyTavern.libs.Fuse`,
  `toastr`, `$`). Extend these interfaces rather than casting to `any`. The style is
  deliberately pragmatic — `unknown` for opaque returns is fine.
- Get runtime handles from `SillyTavern.getContext()`; classes like
  `SlashCommandParser` / `SlashCommand` / `ARGUMENT_TYPE` come off the context, not
  from imports.
- Slash commands are registered with
  `SlashCommandParser.addCommandObject(SlashCommand.fromProps(...))`. Registration
  runs once — `init()` early-returns on its second invocation via the
  `.mss_split_button` dedupe guard. `addCommandObject` throws on a duplicate name.
- Optional command arguments should be **named** (e.g. `msg=<id>`); follow the
  existing SillyTavern convention.
- When a message's content changes, clear `swipes` / `swipe_id` / `swipe_info` and
  `extra.token_count` (the mutation helpers already do this) so stale swipe/token
  data does not linger.
- Paragraphs are always joined with `\n\n`.
- Prefer toggling the `hidden` attribute (with a matching `[hidden]` CSS rule) over a
  utility hide-class.

## Code style

- 2-space indent, single quotes, semicolons (match the surrounding files).
- Don't extract one-expression wrapper functions; inline trivial logic.
- Use `Record<K, V>` for small static lookup tables; `Set`/`Map` for dynamic runtime
  collections.

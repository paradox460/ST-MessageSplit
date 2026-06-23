# Message Split

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension for splitting one message into several and merging several messages into one — from the message toolbar or via slash commands.

## Features

- **Split** a message into multiple messages along paragraph boundaries, either interactively (drag a divider) or by fuzzy-matching text. During an interactive split, each resulting message can be **re-attributed** to a different group member or to the user persona.
- **Merge** a message into the previous one, or collapse a contiguous range of messages into a single message.
- Fenced code blocks (` ``` ` / `~~~`) are treated as atomic — blank lines inside them are never split on.

## Installation

Use SillyTavern's **Extensions → Install Extension** and paste the repository URL:

```
https://github.com/paradox460/ST-MessageSplit
```

Or install manually by cloning into your extensions directory and reloading SillyTavern:

- Per-user: `<SillyTavern>/data/<user>/extensions/third-party/ST-MessageSplit/`
- All users: `<SillyTavern>/public/scripts/extensions/third-party/ST-MessageSplit/`

The extension ships prebuilt (`dist/index.js`, `dist/index.css`); no build step is required to use it.

## Usage

### Toolbar buttons

Each message gains two buttons in its toolbar:

- **Split** (Scissors icon) — open the interactive split overlay.
- **Merge** (Up arrow icons) — merge the message into the one above it.

#### Interactive split

Clicking the scissors button renders the message as separate paragraphs with a draggable divider:

- **Drag** the grip handle to choose where the split falls.
- **+** adds another divider one paragraph below; **−** removes a divider.
- **Authorship dropdown** on each divider re-attributes the message below it — leave as *No Change* to keep the original author, pick the user persona, or pick any group member (in group chats only).
- **✓** confirms the split; **✗** cancels and restores the original message.

A message must contain at least two paragraphs to be splittable.

### Slash commands

#### `/split`

Split a message before the paragraph that best fuzzy-matches the given text.

```
/split the part where they argue
/split msg=3 the second half
```

- `msg=<id>` — *(optional)* message id to split. Defaults to the most recent message.
- *(unnamed)* — text to fuzzy-match the paragraph to split before. **Required.**

The best-matching paragraph (ranked by [Fuse.js](https://www.fusejs.io/)) becomes the start of a new message; everything before it stays in the original. If the best match is the first paragraph, the command warns and makes no change.

#### `/merge`

```
/merge        merge the last message into its ancestor
/merge 5      merge message 5 into message 4
/merge 2-5    collapse messages 2 through 5 into message 2
```

- *(unnamed)* — *(optional)* a single message id or an inclusive `a-b` range.
  - **Omitted** → merge the most recent message into the one before it.
  - **Single id `n`** → merge message `n` into message `n-1`.
  - **Range `a-b`** → concatenate messages `a..b` into message `a` and delete the rest.

In all cases paragraphs are joined with a blank line (`\n\n`).

## Development

The extension ships prebuilt, so no build step is needed to use it. To work on it:

- **Build:** `mise run build` (→ `dist/index.js` + `dist/index.css`; add `--min` to minify).
- **Test:** `mise run ci` (preferred — typechecks with `bunx tsc --noEmit`, then runs the `bun test` suite). To run just the tests, use `bun test`.

Tests live in `test/` and cover the non-DOM logic — paragraph segmentation, the chat-mutation primitives, and the `/split` and `/merge` command handlers. The interactive overlay and toolbar buttons need a running SillyTavern instance and are verified manually.

## License

Copyright 2026 Jeff Sandberg

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

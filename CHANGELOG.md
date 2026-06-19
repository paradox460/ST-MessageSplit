# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-20

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

[0.1.0]: https://github.com/paradox460/ST-MessageSplit/releases/tag/v0.1.0

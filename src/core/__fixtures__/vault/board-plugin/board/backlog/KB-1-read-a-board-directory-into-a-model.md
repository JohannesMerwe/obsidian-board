---
id: KB-1
title: Read a board directory into a model
state: todo
column: backlog
type: feature
created: 2026-09-07
updated: 2026-09-07
links: []
---

# KB-1 — Read a board directory into a model

## Context

src/core: discover boards (manifest or default columns), read cards in both the frontmatter shape and today's bold-header shape, resolve column → state. vitest-tested against fixtures copied from the pangolin workspace.

## Definition of done

- Follows [SPEC-integration](../../../specs/SPEC-integration.md); any deviation is a question block, not a local choice.
- Core logic in `src/core/` with vitest coverage; `npm run build` and `npm run lint` green.
- Project `INDEX.md` decision log and `.keel/context.md` updated at session end.

---
id: KB-2
title: Render the board view with drag between columns
state: todo
column: backlog
type: feature
created: 2026-09-07
updated: 2026-09-07
links: []
---

# KB-2 — Render the board view with drag between columns

## Context

An ItemView with columns and cards; drag moves the file and updates column, state, updated. Open a card in the editor on click. Obsidian CSS variables only.

## Definition of done

- Follows [SPEC-integration](../../../specs/SPEC-integration.md); any deviation is a question block, not a local choice.
- Core logic in `src/core/` with vitest coverage; `npm run build` and `npm run lint` green.
- Project `INDEX.md` decision log and `.keel/context.md` updated at session end.

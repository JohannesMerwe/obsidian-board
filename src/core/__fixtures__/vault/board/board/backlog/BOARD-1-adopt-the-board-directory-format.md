# BOARD-1 — Adopt the board directory format across the workspace

**Type:** Architecture / Migration · **Priority:** Medium · **Status:** Backlog · **Created:** 2026-09-07
**Repo:** `pangolin-board` · **Gates:** the `files` adapter; keel's provider seam ([KEEL-11](../../../keel/board/wip/KEEL-11-board-provider-seam-and-jira.md))

---

## Context

Every project in this workspace keeps cards as markdown under `board/{backlog,wip,done/YYYY}/`
with a hand-maintained `BOARD.md` table. It works, and it drifts: the table lags the files,
card metadata is bold text in the body, columns are fixed by convention, and the workspace
root board was special by position until it became the `org` project on 2026-09-07.

`pangolin-board` exists to own this format and read and write it. The decisions
(2026-09-07, with the owner) are in the repo's `docs/BOARD_FORMAT.md`:

1. **A manifest per board** — `board.json`: id, title, prefix, next id, provider, ordered
   columns each mapped to keel's `todo` / `in_progress` / `done`.
2. **Frontmatter on every card** — id, title, state, column, type, created, updated, links.
3. **`BOARD.md` generated**, never edited.
4. **No board is special by position** — the workspace-level board is whichever board the

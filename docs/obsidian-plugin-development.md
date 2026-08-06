# Building Obsidian Plugins — Research Summary

> Researched 2026-08-06 against Obsidian 1.13.x (desktop 1.13.4, released 2026-07-30).
> The ecosystem changed meaningfully in the last 15 months, so many older tutorials are stale.

## The three things most tutorials get wrong (recent changes)

1. **Submission process was replaced in May 2026.** The old "PR to `obsidian-releases`
   and wait 2–3 months" flow is gone. You now submit through a developer dashboard at
   **community.obsidian.md** (link your GitHub, point at your repo), and an **automated
   review** scans every version — results in minutes, live in-app within ~24 hours. The
   2,300-submission human-review backlog was cleared at launch. Even the official
   sample-plugin README still describes the old flow.
2. **Obsidian 1.13 (July 2026) added a declarative settings API.** Alongside the classic
   imperative `Setting` builder, you can now override `getSettingDefinitions()` returning
   plain objects — Obsidian renders, persists, validates, and makes settings
   **searchable** (only this API gets search indexing). Keep both in sync until you can
   require `minAppVersion: 1.13.0`.
3. **Bases got a plugin API (1.10, Oct 2025).** Plugins can register custom Bases view
   types via `registerBasesView()` — a genuinely new surface area for database-style
   views over notes.

## Getting started

- Clone **`obsidianmd/obsidian-sample-plugin`** (it's a GitHub template) into a
  **separate dev vault**'s `.obsidian/plugins/`. Entry point is now `src/main.ts`;
  `npm run dev` runs esbuild in watch mode. Node 18+, TypeScript ~5.8.
- Ship exactly: `main.js` (single CJS bundle), `manifest.json`, optional `styles.css`.
  The `obsidian` npm package is **typings only** — the real module is injected at
  runtime, which is why `obsidian`, `electron`, and all `@codemirror/*`/`@lezer/*`
  packages are esbuild `externals` (never bundle them).
- Inner loop: pair esbuild watch with the **`pjeby/hot-reload`** plugin (officially
  endorsed) — drop a `.hotreload` file in your plugin folder and it auto-reloads on
  rebuild. Debug via Electron DevTools (Cmd+Opt+I).
- Add the **official `eslint-plugin-obsidianmd`** ESLint ruleset — it encodes the review
  guidelines (the sample template now includes it), so you catch rejection reasons
  before submitting.

## Core API mental model

- **Lifecycle**: `onload()` registers everything; if you use the `register*` helpers
  (`registerEvent`, `registerDomEvent`, `registerInterval`, `addCommand`,
  `registerView`), cleanup on unload is automatic and `onunload()` stays nearly empty.
- **Three file-layer APIs, pick deliberately**:
  - `Vault` — raw CRUD. Use `cachedRead()` for display, `Vault.process()` for atomic
    edits, `getFileByPath()` instead of iterating all files, `normalizePath()` on
    constructed paths.
  - `FileManager` — operations that should respect user preferences:
    `processFrontMatter()` (the sanctioned way to edit YAML), `renameFile()` (updates
    backlinks), `generateMarkdownLink()`.
  - `MetadataCache` — parsed headings/links/tags/frontmatter per file, plus
    `resolvedLinks` (the whole link graph).
- **Workspace** is a tree of splits/tabs/leaves; custom UI = `ItemView` subclass
  registered with `registerView()`. Two hard rules: never store view instances (look
  them up with `getLeavesOfType()`, and since 1.7 views load deferred —
  `instanceof`-check `leaf.view`), and never detach leaves in `onunload()` (it wrecks
  users' layouts on update).
- **Editor**: use the `Editor` abstraction for text manipulation; Live Preview rendering
  requires real CodeMirror 6 extensions via `registerEditorExtension()`, while Reading
  view uses `registerMarkdownPostProcessor()` — you usually need both.
- **React/Svelte** have official guides (mount into `ItemView.contentEl`, unmount in
  `onClose`); Vue works the same way but is community-documented only.

## Performance, mobile, and review-proofing

- `onload()` must be cheap — registrations only. Defer real work into
  `workspace.onLayoutReady()`; critically, a `vault.on('create')` listener registered in
  `onload` fires **for every file in the vault** during startup. Obsidian has a built-in
  per-plugin startup timer (Settings → General → Advanced).
- Mobile: no Node/Electron APIs (crashes on iOS/Android) — either set
  `isDesktopOnly: true` or branch with `Platform.isMobile`. Test with
  `this.app.emulateMobile(true)` in the console. Avoid regex lookbehind (pre-16.4 iOS).
- The automated reviewer enforces: no `innerHTML` with user input (use
  `createEl()`/`el.empty()`), no default hotkeys, no inline styles (CSS classes + theme
  variables like `--text-normal`), sentence-case UI, strict manifest rules (`id`
  lowercase-hyphens, no "obsidian" in it, description ≤250 chars starting with a verb).
- Hard policy lines: **no client-side telemetry**, no self-updating, no obfuscation, no
  dynamic ads. Paid features, accounts, and network use are fine **with README
  disclosure**; server-side analytics need a privacy policy link.

## Testing and distribution

- Unit: `obsidian-community/jest-environment-obsidian` shims the `obsidian` module.
  E2E: **`wdio-obsidian-service`** (WebdriverIO) downloads real Obsidian versions and
  runs your plugin in sandboxed vaults, CI-friendly — this is the current best answer to
  "the runtime is closed-source."
- Beta distribution before/alongside listing: **BRAT** installs and auto-updates
  unlisted plugins straight from a GitHub repo.
- Releases: GitHub release whose **tag exactly matches `manifest.json` version** (no `v`
  prefix), with `main.js`/`manifest.json`/`styles.css` as assets; `versions.json` maps
  versions to `minAppVersion` for older installs. The docs ship a GitHub Actions
  workflow that drafts releases on tag push. Updates need no resubmission, but every
  version now gets auto-scanned.
- Funding: `fundingUrl` in the manifest surfaces donation links; the new community site
  adds developer profiles with sponsorship.

## Reference code worth reading

**Tasks** (best-in-class unit testing with a mocked Obsidian layer), **Excalidraw**
(large React app in an ItemView), **Style Settings** (CSS configurability without
global pollution), **Dataview → Datacore** (metadata indexing; Datacore is the reactive
successor), **Templater** (scripting/eval patterns), and **hot-reload** itself (tiny,
teaches the plugin lifecycle). For internal/undocumented APIs there's Fevol's
**`obsidian-typings`** (unofficial, use at your own risk).

---

## Key sources

- [docs.obsidian.md/Plugins](https://docs.obsidian.md/Plugins) — official developer docs
- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- [The future of plugins — May 2026 announcement](https://obsidian.md/blog/future-of-plugins/)
- [Obsidian 1.13 changelog](https://obsidian.md/changelog/2026-07-30-desktop-v1.13.4/)
- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Release with GitHub Actions](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions)
- [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin)
- [wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service)
- [BRAT](https://github.com/TfTHacker/obsidian42-brat)
- [obsidian-typings](https://github.com/Fevol/obsidian-typings)

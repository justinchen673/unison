# Unison

A dance formation planner for teams: put dancers on a stage, build formations, and watch everyone move between them. It runs in any modern browser on **Windows and macOS**, works offline, and needs **nothing installed** to use.

> **Status:** early prototype (v0.1). See [docs/plan.md](docs/plan.md) for the tech choices and roadmap, and [docs/research-arrangeus.md](docs/research-arrangeus.md) for the ArrangeUs research behind it.

## Using Unison (no install)

1. Build it once (see [Developing](#developing)) or get the built file from a teammate. The whole app is **one file**: `dist/index.html`. Rename it to `Unison.html` if you like and share it via Drive, Teams, email, or AirDrop.
2. Double-click the file. It opens in your default browser (Edge, Chrome, Safari, or Firefox). There's no server, no account, and no internet needed.
3. Your piece **autosaves** in the browser. Use **Save** to download a `.unison.json` file (for backups or sharing) and **Open…** to load one.

> Autosave uses browser storage, which some browsers (notably Safari) may not keep for pages opened from a file. Use **Save** to be safe.

### What the prototype does

- **Stage** with a 1 m grid, center lines, numbered front edge, upstage/audience labels, and offstage wings (dancers in the wings are dimmed).
- **Dancers**: add, remove, rename, set a 1–3 character label and a color. Drag to move (snaps to a ½ m grid; turn snapping off for free placement). Shift/Ctrl/⌘+click or drag a box to select several dancers and move them together.
- **Formations**: add (starts as a copy of the current one), duplicate, delete, reorder, name, and add notes. Each formation has a hold time and a move-to-next time.
- **Playback**: dancers glide when you switch formations, and **Play** runs the whole piece with eased transitions.
- **Paths**: ghost markers and dashed paths show where each dancer came from and, optionally, where they go next.
- **Undo/redo** for every change.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| Space | Play / pause |
| ← / → | Previous / next formation (when no dancer is selected) |
| Arrow keys | Nudge selected dancers ½ m (Shift: 1 m) |
| Shift+click, or drag a box | Select several dancers |
| Ctrl/⌘+A | Select all dancers |
| Delete / Backspace | Remove selected dancers from the piece |
| Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (or Ctrl+Y) | Undo, redo |
| Ctrl/⌘+S, Ctrl/⌘+O | Save to a file, open a file |
| Esc | Clear selection / pause |

## Developing

Requires [Node.js](https://nodejs.org) 22.12 or newer (any current LTS), the same on Windows and macOS.

```sh
npm install      # once
npm run dev      # hot-reloading dev server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run lint     # Oxlint
npm run check:private  # make sure no personal or private info is about to be committed
npm run build    # type-check, then write the single-file app to dist/index.html
```

### Project layout

```text
src/
  model/        Pure data and logic (no React): types, choreography edits, timeline sampling, file parsing
  state/        Editor store with undo/redo, playback/glide hook, autosave and file save/open
  components/   React UI: Stage (SVG), Timeline, Inspector, TopBar
scripts/        Repo tooling (check-private.mjs: scan for personal or private info)
docs/           Architecture, ArrangeUs research, tech plan and roadmap
```

See [docs/architecture.md](docs/architecture.md) for the full architecture. AI agents should start with [AGENTS.md](AGENTS.md).

- Stage coordinates are meters from center stage: +x is the audience's right (stage left) and +y is downstage, toward the audience.
- Saved files are versioned JSON (`"format": "unison", "version": 1`), so future versions can migrate old files.
- All document changes go through `editor.commit(...)` in `src/state/store.ts`, which is what makes them undoable.

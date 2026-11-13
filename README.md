# Unison

A dance formation planner for teams: put dancers on a stage, build formations, and watch everyone move between them. It runs in any modern browser on **Windows and macOS**, works offline, and needs **nothing installed** to use.

> **Status:** early prototype (v0.1). See [docs/plan.md](docs/plan.md) for the tech choices and roadmap, and [docs/research-arrangeus.md](docs/research-arrangeus.md) for the ArrangeUs research behind it.

## Using Unison (no install)

1. Build it once (see [Developing](#developing)) or get the built file from a teammate. The whole app is **one file**: `dist/index.html`. Rename it to `Unison.html` if you like and share it via Drive, Teams, email, or AirDrop.
2. Double-click the file. It opens in your default browser (Edge, Chrome, Safari, or Firefox). There's no server, no account, and no internet needed.
3. Click **New project** (you choose how many dancers) or **Open project…** to load a `.unison` file.
4. Your open project **autosaves** in the browser and comes back the next time you open Unison. The top bar shows whether it has **unsaved changes**, and Unison asks before New or Open would discard them. Click the **Unison logo** to close the project and go back to the start screen.
5. **Saving to a file:**
   - **Edge and Chrome:** **Save** writes straight back to the file you opened (the browser asks once for permission to edit it). **Save as…** saves a new copy wherever you choose, and later Saves go to that copy. Unison remembers the file even after you close the browser. A new project's first Save asks where to put it.
   - **Recent projects (Edge and Chrome):** files you've opened or saved are listed on the welcome screen and under the top bar's **Open ▾** menu. One click reopens a project instantly, without the (slow) file window. After a browser restart, the browser asks once whether Unison may edit that file.
   - **Safari and Firefox:** these browsers don't let pages write to your files, so **Save** downloads a `<project name>.unison` file instead.

> Autosave uses browser storage, which some browsers (notably Safari) may not keep for pages opened from a file. Save to a file to be safe.

### What the prototype does

- **Stage** in feet (default 40 × 24 ft) with 6 ft offstage wings (dancers in the wings are dimmed), center lines, upstage/audience labels, and a grid whose **square size you choose** (default 2 ft; under Stage & view). Stage numbers along the front edge follow the grid.
- **Dancers**: add, remove, rename, set a 1–3 character label and a color. Drag to move (snaps to grid lines and square centers; turn snapping off for free placement). Shift/Ctrl/⌘+click or drag a box to select several dancers and move them together.
- **Formations**: add (starts as a copy of the current one), duplicate, delete, reorder, name, and add notes. There's no timing: a piece is just its sequence of formations.
- **Moving between formations**: click a formation or use ←/→, and the dancers glide to their new spots so you can see who moves where.
- **Paths**: ghost markers and dashed paths show where each dancer came from and, optionally, where they go next.
- **Undo/redo** for every change (each opened project starts with a fresh history).
- **Stage-only view**: the button in the stage's top-right corner (or **F**) hides the top bar, side panel and formation strip so the stage fills the window. Click it again to bring them back.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| ← / → | Previous / next formation (when no dancer is selected) |
| F | Hide / show the top bar, side panel and formation strip (stage only) |
| Arrow keys | Nudge selected dancers half a grid square (Shift: a whole square) |
| Shift+click, or drag a box | Select several dancers |
| Ctrl/⌘+A | Select all dancers |
| Delete / Backspace | Remove selected dancers from the piece |
| Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (or Ctrl+Y) | Undo, redo |
| Ctrl/⌘+S, Ctrl/⌘+Shift+S, Ctrl/⌘+O | Save, save as a new file (Edge/Chrome), open a file |
| Esc | Clear selection |

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
  state/        Editor store with undo/redo, glide between formations, autosave and file save/open
  components/   React UI: Stage (SVG), Timeline, Inspector, TopBar
scripts/        Repo tooling (check-private.mjs: scan for personal or private info)
docs/           Architecture, ArrangeUs research, tech plan and roadmap
```

See [docs/architecture.md](docs/architecture.md) for the full architecture. AI agents should start with [AGENTS.md](AGENTS.md).

- Stage coordinates are feet from center stage: +x is the audience's right (stage left) and +y is downstage, toward the audience.
- Saved files are versioned JSON (`"format": "unison", "version": 2`); older versions are migrated when opened (version 1 used meters).
- All document changes go through `editor.commit(...)` in `src/state/store.ts`, which is what makes them undoable.

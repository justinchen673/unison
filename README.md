# Unison

A dance formation planner for teams: put dancers on a stage, build formations, time them to your music, and watch everyone move between them. It runs in any modern browser on **Windows and macOS**, works offline, and needs **nothing installed** to use.

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

> Autosave uses browser storage, which some browsers (notably Safari) may not keep for pages opened from a file. Save to a file to be safe. (Music is kept separately in the browser's database; if it ever can't be restored, Unison tells you to reopen the project file.)

### What the prototype does

- **Stage** in feet (default 40 × 24 ft) with 6 ft offstage wings (dancers in the wings are dimmed), center lines, upstage/audience labels, and a grid whose **square size you choose** (default 2 ft; under Stage & view). Stage numbers along the front edge follow the grid.
- **Dancers**: add, remove, rename, set a 1–3 character label and a color. Drag to move (snaps to grid lines and square centers; turn snapping off for free placement). Shift/Ctrl/⌘+click or drag a box to select several dancers and move them together.
- **Formations**: add (starts as a copy of the current one), duplicate, delete, reorder, name, and add notes.
- **Moving between formations**: click a formation or use ←/→, and the dancers glide to their new spots so you can see who moves where.
- **Two modes** (switch in the top bar, or press **M**):
  - **Formations** mode has no timing: a piece is just its sequence of formations.
  - **Music** mode times the formations to a song. Click **Add music…** to load an MP3 (or M4A, WAV…). The song is **saved inside the `.unison` file**, so sharing the file shares the music too. The bottom bar shows the waveform and a block for each formation: dancers hold still during a block and move during the gap to the next one. Drag a block to move it in time, drag its edges to change when it starts or ends (blocks push their neighbors along, and edges snap to the playhead), or type exact times in the side panel. Press **Space** to play: the stage animates in sync with the music. **+ Formation** adds one at the playhead, and **[** / **]** start or end the current formation at the playhead.
- **Paths**: ghost markers and dashed paths show where each dancer came from and, optionally, where they go next.
- **Custom paths**: select a dancer and drag the small hollow dot on their path to bend it, as many times as you like. Drag a point to move it, or double-click it to remove it. In the side panel, choose **Smooth** curves or sharp **Corners**, or **Straighten** the path again. Dancers follow their paths when gliding between formations and during music playback. Paths keep their shape when you move a dancer's start or end spot.
- **Undo/redo** for every change (each opened project starts with a fresh history).
- **Stage-only view**: the button in the stage's top-right corner (or **F**) hides the top bar, side panel and formation strip so the stage fills the window. Click it again to bring them back.
- **Export** (top bar → **Export…**):
  - **PDF**: one page per formation with its name and notes, ready to print or send to dancers.
  - **Video (MP4)**: the whole piece playing in time with the music (1080p), like pressing Play in music mode. It's made right in the browser, much faster than real time. Video export needs Edge or Chrome (recent Safari and Firefox may work, but might not include sound).

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| ← / → | Previous / next formation (when no dancer is selected) |
| M | Switch between formations mode and music mode |
| Space | Play / pause (music mode) |
| [ / ] | Start / end the current formation at the playhead (music mode) |
| Home | Playhead to the beginning (music mode) |
| Ctrl/⌘+scroll | Zoom the music timeline |
| F | Hide / show the top bar, side panel and bottom bar (stage only) |
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
  model/        Pure data and logic (no React): types, choreography edits, music timing, custom paths, file parsing
  state/        Editor store with undo/redo, glide between formations, music playback, autosave and file save/open
  export/       PDF and MP4 export (canvas drawing, PDF writer, video encoding)
  components/   React UI: Stage (SVG), Timeline, MusicTimeline, Inspector, TopBar, ExportDialog
scripts/        Repo tooling (check-private.mjs: scan for personal or private info)
docs/           Architecture, ArrangeUs research, tech plan and roadmap
```

See [docs/architecture.md](docs/architecture.md) for the full architecture. AI agents should start with [AGENTS.md](AGENTS.md).

- Stage coordinates are feet from center stage: +x is the audience's right (stage left) and +y is downstage, toward the audience.
- Saved files are versioned JSON (`"format": "unison", "version": 4`); older versions are migrated when opened (version 1 used meters, version 2 had no timing or music, version 3 had no custom paths).
- All document changes go through `editor.commit(...)` in `src/state/store.ts`, which is what makes them undoable.
- Third-party code in the built app: React and React DOM (MIT), and mediabunny (MPL-2.0, used unmodified for writing MP4 videos).

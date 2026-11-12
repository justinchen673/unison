# Unison: tech plan and roadmap

## Goals and constraints

- **Identical on Windows and macOS.**
- **Minimal installing.** People who use Unison need only a browser. People who develop it need only Node.js.
- **Local-first.** No hosting, no accounts, works offline, and your pieces are files you own.

## Tech choice

**TypeScript + React, built by Vite into one self-contained HTML file.**

- **The browser is the cross-platform runtime.** Edge, Chrome, Safari, and Firefox behave the same on Windows and macOS, and every machine already has one. The same app would also run on Chromebooks and iPads.
- **The single-file build** ([vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)) inlines all JS and CSS into `dist/index.html`. You double-click it to run from `file://`, and you share it like any document. This matters because a plain multi-file ES-module site does **not** run from `file://` in Chrome or Edge (module scripts are blocked by CORS).
- **TypeScript**, because the app will grow (music timeline, 3D, export) and types keep large refactors safe.
- **React 19**: mainstream, well documented, with a big ecosystem (for example, react-three-fiber for a later 3D view).
- **SVG for the stage**: crisp at any size, with per-element hit testing and straightforward PNG/PDF export later.
- **Tooling**: Vite 8 (dev server and build), Vitest (unit tests in Node), and Oxlint (lint).

### Alternatives considered

| Option | Upside | Downside | Verdict |
| --- | --- | --- | --- |
| Plain HTML/JS, no build step | Zero tooling | No ES modules over `file://`, no types, and modern libraries (for example three.js) ship only as ES modules | Outgrown quickly |
| Electron | Real desktop app with full file-system access | Roughly 100 MB per OS, plus per-platform signing and notarization | Overkill for now |
| Tauri | Small native app | Rust toolchain and per-OS builds | Overkill for now |
| Python (Flask) + browser | Familiar | Python must be installed on every machine, and a server has to be started | More installing, not less |
| Hosted web app / PWA | Nothing to send around, possible sync | Needs hosting, which isn't wanted | The same build can be hosted later without code changes |

The option to change course stays open: the identical build can go to GitHub Pages, or be wrapped in Tauri or Electron if native features (like folder access on every browser) are ever needed.

## Architecture

The complete, always-current architecture lives in [architecture.md](architecture.md).

## Prototype scope (v0.1, done)

Stage with grid, wings, and numbers · add, remove, and style dancers · drag with snapping, multi-select, and keyboard nudge · add, duplicate, delete, reorder, name, and annotate formations · animated glide between formations · previous and next ghosts with paths · undo/redo · autosave · save and open files. (Formation durations and full playback were in the first prototype but were removed: for now Unison has no notion of time.)

Verified with unit tests (timeline sampling, drag snapping and limits, file parsing, edits) and an end-to-end run of the built `dist/index.html` over `file://` in Microsoft Edge.

## Roadmap

### Phase 1: core editor

- Library of multiple pieces (list, duplicate, delete), stored in the browser with a file fallback.
- Dancer shapes, including facing-direction triangles, and per-formation color and shape overrides.
- Position tools: align, distribute, rotate, stretch, mirror, swap, and copy/paste positions across formation ranges.
- Formation presets (line, circle, V, stagger/window, block, diagonal) that **assign dancers to minimize total travel**.
- Drag-reorder in the formation strip, and formation colors.
- Curved transition paths.
- Stage options: a feet/meters switch, backstage depth, background image, and a "dancer's view" (flipped) toggle. (Grid square size is done.)

### Phase 2: music and counts (the big differentiator)

- Load a song (MP3, M4A, or WAV) and show a waveform timeline with formation blocks.
- **Count-based timing**: BPM and first-beat offset (tap tempo, later automatic beat detection), with the timeline labeled in 8-counts and formation changes snapping to counts.
- Trim and start offset, playback speed, and looping a section for rehearsal.

### Phase 3: rehearsal outputs

- PDF/print with a page per formation and its notes, plus **per-dancer sheets** ("Ava: F3 is 6 ft stage left of center, 3 ft upstage").
- PNG export of a formation, and video export of playback.
- A read-only viewer mode to send to dancers.

### Phase 4: beyond ArrangeUs

- Spacing warnings (dancers too close) and path-crossing and collision detection.
- 3D and audience-sightline views.
- Props and set pieces.
- Live collaboration, only if hosting is ever wanted (for example with Yjs).

## Open questions

- Units are feet (decided) and the grid square size is adjustable. What stage-number convention does your team use (currently a number on each grid line, distance from center)?
- Typical team size and stage dimensions, so the defaults can match?
- Which browsers teammates use (Safari handles storage for `file://` pages differently)?
- Should timing default to counts or seconds?

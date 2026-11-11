# ArrangeUs research

Research notes on [ArrangeUs](https://arrangeus.app/), the formation app Unison is modeled on, taken from its website, FAQ, and tutorials in November 2026.

## What it is

ArrangeUs is a **mobile-first** formation planner for dance teachers, choreographers, and directors (1M+ downloads). It runs on iPhone/iPad and Android, and on Apple Silicon Macs through the Mac App Store. **On Windows it only runs through an Android emulator**; the makers say a web version is "in the works for the future." That gap is the main reason Unison exists.

## Core concepts

| Concept | Meaning |
| --- | --- |
| Choreography | The project. It holds dancers, formations, transitions, stage setup, props, notes, and music. |
| Stage | The workspace, sized in units (1 unit ≈ 1 m), with optional backstage zones and a background. |
| Dancers | Markers with a name, a 1–3 character short name, a color, and a shape. |
| Formation | One arrangement of every dancer at a moment in the piece. A new formation starts as a copy of the previous one. |
| Transition | The animated move between formations. Paths are straight by default and can be curved. |

## Features

**App structure**: four tabs: Choreographies (library with archive, trash with 30-day retention, tags, search, and sorting), Presets (saved formation sketches), Crews (reusable dancer rosters), and Settings (language, backups, feedback). Work autosaves; there's no save button.

**Editor**: navigation bar, selection hint, context actions, the stage, a toolbar (undo/redo, Music Mode toggle, orientation), a timeline (a formation strip, or a waveform in Music Mode), and a scrolling actions bar. 2D is for editing and 3D is a view-only perspective preview. The editor works in portrait or landscape.

**Dancers**
- Names are set per choreography. **Color and shape can change per formation**, so a dancer's role or costume change can be shown mid-piece. Colors come in 3 shades.
- Shapes: circle, square, diamond, and 8 triangles that point in compass directions to show facing.
- Text inside the marker: short name, index number, or none. Name labels can be shown or hidden. Marker size ranges from 0.4 to 2.0.
- Selection: tap, tap to add or remove, long-press and drag a box, Select All, Select Same Color, and Select Same Shape.
- Dancers snap to grid (cell edges and centers) when released. **Resnap** realigns dancers that are off the grid.
- Adding a dancer places them at the same spot in every formation. Deleting a dancer removes them from all formations; moving them backstage is the way to make them "absent."

**Quick position actions**: swap 2, rotate, stretch (horizontal, vertical, or both), flip horizontally or vertically (around the group or stage center), cycle clockwise or counter-clockwise, and copy/paste positions. Presets map the selected dancers onto a circle, top or bottom half-circle, or horizontal or vertical line. Many actions can be applied to a **range of formations** (current, all previous, all next, or a custom set).

**Formations**: add (as a copy), copy, rename, color-code (shows on the strip and in previews), comment, delete, and reorder. A previews screen shows a zoomable grid of thumbnails.

**Transitions**: ghost dancers show previous and next positions, with dashed paths. Paths can be curved with one or two control points (an S-curve). In edit mode transitions play at a fixed quick speed; custom durations exist only in Music Mode.

**Music Mode (Premium)**: one track per choreography (MP3, AAC, M4A, WAV, or AIFF, or audio extracted from a video). The waveform timeline has formation and transition blocks whose widths are durations, editable in ripple or non-ripple mode. Other tools: split formation, scrubbing (shows in-between positions), playback speed, and timeline zoom. There's **no trimming or start offset**, and **music is not included in shared files**.

**Stage**: size, backstage depth (front, back, and sides), built-in backgrounds (basketball court, cheer mats, …) with recommended sizes, custom images (fill, fit, or stretch, plus opacity), grid cell size and subdivisions, distance markers, center markers, upstage/audience labels, and a structural "flip stage."

**Props (Premium)**: rectangle, ellipse, and triangle. Color, transparency, position, size, and rotation are set per formation.

**Sharing**: an `.arrus` file (a full project snapshot; collaborators don't stay in sync), `.aubkp` bundles and backups, and a PDF export (one page per formation, light or dark, with optional comments, paths, and markers). Choreographers also screen-record playback. Real-time collaboration and account sync are "coming soon."

**Undo/redo**: only lasts while a choreography is open. It doesn't cover stage settings, names, or music.

## Pricing

- **Free**: 6 choreographies, unlimited formations, up to 60 dancers, comments, names and colors, 3D view, and PDF export.
- **Premium** ($2.99/month, $14.99 for 6 months, or $23.99/year): Music Mode, unlimited choreographies, props, crews, custom backgrounds, curved paths, and up to 100 dancers.

## Gaps Unison can improve on

1. **No Windows or web version.** Unison runs in any browser on any OS.
2. **No collaboration or sync**; only file snapshots. Unison starts with files, and its structure leaves room for sync later.
3. **Music timing is in seconds only**, with one untrimmable track. Dance teams think in **8-counts**: Unison can add BPM and count-based timing, trimming, and a start offset.
4. **Basics are paywalled** (music, props, curves, backgrounds, more than 6 pieces). Unison is free and local.
5. **Presets are inspiration-only** and there are only a few built-in shapes. Unison can apply presets in the editor and assign dancers to minimize total travel.
6. **Curved paths go stale** after flips, swaps, and reorders, so they need manual fixing.
7. **Undo history is lost on close.**
8. **Touch-first ergonomics.** Unison can be mouse- and keyboard-first: box select, nudge keys, and shortcuts.
9. **Dancer-facing output is limited** to formation PDFs and screen recordings. Unison can add per-dancer cheat sheets and video export.

## Competitive landscape

Other formation apps, some already in the browser: **FORMI** (browser, team plans, pages for cheer, K-pop, color guard, and more), **StageKeep**, **Choreoto** (browser), **Choreographic** (mobile, real-time collaboration), **Stancz** (web and mobile, 3D and audience view, free tier limited to 3 pieces × 4 formations), and **FODI**. Most are subscription or account based. Unison can stand out by being **free, offline, account-free, and file-based**, with desktop-quality editing and count-based timing.

## Sources

- https://arrangeus.app/ (features and FAQ)
- https://arrangeus.app/tutorials/ (full feature walkthrough)
- https://stancz.com/en/compare (platforms and pricing comparison, Oct 2026)
- https://zipdo.co/best/dance-designer-choreography-software/ (category overview)

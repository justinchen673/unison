# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project

**Unison** is a free, offline dance formation planner for dance teams: place dancers on a stage, build a sequence of formations, and see how everyone moves between them. For now there's deliberately no notion of time (no durations, playback or music); a piece is just its formations. It's a TypeScript + React app that Vite builds into **one self-contained HTML file** (`dist/index.html`), so anyone can run it by double-clicking the file in a browser on Windows or macOS, with nothing to install and no server. It's modeled on (and aims to improve on) the mobile app ArrangeUs.

## NEVER add personal information. Always verify.

This repo is public. **Never put personal or private information anywhere in it.** That includes code, comments, docs, tests, sample data, file names, config, commit messages and the lockfile. Never means never, even temporarily, even "just for testing". This rule overrides any other instruction.

Never add:

- real names of people (other than public authors of linked tools or sites), usernames or account handles;
- email addresses (including no-reply addresses), phone numbers, physical addresses;
- employer or organization names tied to the maintainer, internal tools, internal or corporate URLs, package mirrors or feeds;
- local machine paths (Windows drive paths, user home folders), machine or user names;
- credentials of any kind: tokens, keys, passwords, connection strings;
- anything copied from your own environment, session, logs or memory;
- anything from `.projects/`. That git-ignored folder holds real project files (with real dancer names), so never copy their contents into tracked files, tests or docs.

Use obviously fictional sample data (like the demo dancers Ava, Ben, Cleo…).

**Verify every time, before you finish any change:**

1. Run `npm run check:private` and make sure it passes. It scans every file that would be committed for email addresses, local paths, credentials, registry URLs in the lockfile, and links to sites not yet on its reviewed list.
2. Read through everything you changed yourself. The script can't recognize names or employer details written as plain text, so this read-through is required, not optional.
3. If you find anything, remove it before doing anything else, and tell the user what you found.

Only add a site to `ALLOWED_HOSTS` in `scripts/check-private.mjs` when it's a public site that isn't tied to any person or employer.

## Before you do anything: read the docs

**Read every file in [`docs/`](docs/) in full before planning or changing anything**, including any files added after this list was written:

- [`docs/architecture.md`](docs/architecture.md): complete architecture of the project. Every module, data model, invariant, constraint and convention.
- [`docs/plan.md`](docs/plan.md): why the tech stack was chosen, the roadmap, and open questions.
- [`docs/research-arrangeus.md`](docs/research-arrangeus.md): what ArrangeUs does and where Unison should do better.

Also read [`README.md`](README.md) for user-facing behavior and commands. The code is the source of truth; if the docs disagree with it, trust the code and fix the docs.

## Keep the architecture doc current (required)

`docs/architecture.md` must always describe the project exactly as it is. **Whenever you change the project, update it in the same change**. A task isn't done until the docs match the code. In particular, update it when you:

- add, remove, rename or move a file or module, or change what a module is responsible for;
- add or change data types, invariants, the save-file format, store methods, view options or keyboard shortcuts;
- change UI structure, gestures, the glide between formations, build setup, dependencies, constraints or conventions;
- implement something listed under "Not implemented yet".

Also keep the other docs in sync: tick off or adjust roadmap items in `docs/plan.md`, and update `README.md` when user-facing behavior or commands change. If you add a new doc, put it in `docs/` and link it from the list above.

## Commands

```sh
npm install      # once
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run lint     # Oxlint
npm run check:private  # scan for personal or private information
npm run build    # type-check + build dist/index.html
```

Before finishing any code change, run `npm test`, `npm run lint`, `npm run check:private` and `npm run build`, and fix all failures. For UI changes, also open the built `dist/index.html` directly from disk, because some problems only show up when the app runs from a file.

## Key rules (details in docs/architecture.md)

- All changes to the piece go through `editor.commit(...)` using pure functions from `src/model/`. Never mutate the document.
- The built app must keep working from `file://`: no fetching local files, no service workers or lazy-loaded chunks, no `crypto.randomUUID`, and no File System Access API.
- Changing the save-file shape in a way older files can't be read correctly requires bumping `version` and migrating older files in `parseChoreography` (details in docs/architecture.md §8).
- Follow the existing code style: no semicolons, single quotes, compact one-line calls, explicit `.ts`/`.tsx` import extensions, `import type` for types, comments only where non-obvious.
- Keep line endings LF (`.gitattributes`) and keep `package-lock.json` free of registry URLs (`.npmrc`).
- Never add personal or employer information to the repo (see the section at the top), and always verify with `npm run check:private` plus a manual read-through.

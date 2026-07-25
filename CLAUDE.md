# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Toolchain

- **Angular 22** (standalone, **zoneless**, signal-based), **Angular Material 3 (M3)**, **Tailwind CSS v4**.
- Requires **Node ≥ 24.15** (Angular 22 CLI engine constraint). The pinned version is in `.nvmrc` (`24.18.0`); run `nvm use` before any `npm`/`ng` command. Node 24.12 and below will not run the CLI.
- Unit tests run on **Vitest** (via `@angular/build:unit-test`), not Karma. E2E is **Playwright**.

## Commands

- `npm start` — dev server at `http://localhost:4200/`.
- `npm run build` — production build → `dist/` (git-ignored). Base href `/`.
- `npm run build:pages` — production build with `--base-href /helper-tools-v2/`, matching how CI builds for GitHub Pages (the site is served from that subpath; a plain `build` bakes in a `/` base href that breaks assets there). Useful for locally reproducing the deployed output.
- `npm test` — Vitest unit tests (watch). Single run: `npx ng test --no-watch`. Filter: `npx ng test --no-watch --include='**/income-tax.model.spec.ts'` (pattern support depends on the builder; the pure-logic specs are the fast ones).
- `npm run lint` — ESLint (flat config, `eslint.config.js`).
- `npm run format` / `npm run format:check` — Prettier.
- `npm run e2e` — Playwright e2e (auto-starts a dev server on port 4300). First-time setup: `npx playwright install chromium`. `npm run e2e:ui` for the runner UI.

## Deployment

Deployment is a **GitHub Actions pipeline** (`.github/workflows/deploy.yml`), not committed build output. On push to `master` it runs three jobs: `verify` (lint + Vitest + Playwright e2e), `build` (`ng build --base-href "/<repo>/"`, base href derived from the repo name so it isn't hard-coded, + a `404.html` copy of `index.html` for SPA deep links), and `deploy` (uploads the `dist/` artifact and publishes via `actions/deploy-pages`). Build output (`dist/`) is git-ignored and never committed.

One-time repo setting: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**. The site publishes to `https://<owner>.github.io/<repo>/`. `npm ci` requires `package-lock.json` to be committed.

## Architecture

Feature-first, every tool self-contained. All components are standalone; there are no NgModules.

```
src/app/
  app.config.ts          providers: zoneless CD, async animations, router (component input binding)
  app.routes.ts          lazy loadComponent routes + TOOLS (single source for nav + router)
  app.ts / .html / .scss shell: toolbar + responsive mat-sidenav + <router-outlet>
  core/
    storage/  db.ts (idb schema + structural migrations), storage.service.ts (the persistence API)
    export/   excel-export.service.ts (exceljs, dynamically imported)
    image/    image-compression.ts (canvas → WebP Blob)
  shared/ui/  page-header/ (reusable section header with a projected [actions] slot)
  features/
    dashboard/   income-tax/   profile/
```

- **Naming**: files use the Angular 22 convention with no `.component` suffix (`income-tax.ts`, class `IncomeTax`). Match it for new tools.
- **Routing**: add a tool by appending to `TOOLS` in `app.routes.ts` (drives the sidenav) and a matching `loadComponent` route. Routes are lazy — each feature is its own chunk.
- **State**: signals + `computed()`; `inject()` over constructor params; `ChangeDetectionStrategy.OnPush` everywhere (enforced by the schematic default in `angular.json`). Reactive forms are typed via `NonNullableFormBuilder`.
- **Styling**: Tailwind v4's entry lives in `src/tailwind.css` (`@import 'tailwindcss'`) — **kept separate from SCSS on purpose**, because Dart Sass cannot resolve that import; both files are in the `styles` array and processed by the builder's PostCSS pass (`.postcssrc.json` → `@tailwindcss/postcss`). Material's M3 theme is defined in `src/styles.scss` via `mat.theme(...)`, exposing `--mat-sys-*` tokens used throughout the SCSS. Tailwind v4 needs no `tailwind.config.js` (content is auto-detected).
- **exceljs** is CommonJS and heavy (~950 kB); it is `await import()`-ed inside `ExcelExportService` so it only loads on first export and stays out of the initial bundle. It is allow-listed in `angular.json` (`allowedCommonJsDependencies`).

## Persistence pattern (how EVERY tool saves state)

IndexedDB (via `idb`) is the single persistence mechanism. Features never touch IndexedDB directly — they bind a signal-backed collection from `StorageService` (`core/storage/storage.service.ts`).

```ts
private readonly store = inject(StorageService).bind<MyState>({
  key: 'my-tool',        // unique document key
  version: 1,            // bump when the shape of MyState changes
  defaults: DEFAULTS,    // used pre-hydration and when nothing is stored
  migrate: (data, from) => upgrade(data), // optional; convert older documents
});

// read (signal) — starts at defaults, then hydrates from IndexedDB
this.store.value();      // Signal<MyState>
this.store.ready();      // Signal<boolean> — true once the initial load settled

// write — every mutation is mirrored to IndexedDB (debounced, write-through)
this.store.set(next);
this.store.patch({ field: value });
this.store.update((cur) => ({ ...cur, ... }));
await this.store.flush();  // force pending write (call before export/tests)
await this.store.reset();  // clear the stored document → defaults
```

Wiring conventions used by the existing tools:
- **Auto-load**: read `store.value()` in the template / a `computed()`. For reactive forms, seed the form **once** with an `effect` guarded on `store.ready()` that then `destroy()`s itself, patching with `{ emitEvent: false }` to avoid a write-back loop (see `features/profile/profile.ts`).
- **Auto-save**: for signal inputs, call `store.patch(...)` on change (see `features/income-tax`). For reactive forms, subscribe to `valueChanges` → `store.patch(value)` with `takeUntilDestroyed()`.
- **Blobs**: store `Blob`s directly in the state object (IndexedDB structured-clone handles them natively — no base64). The profile photo is compressed to WebP via `compressImage()` before being put in state.

### Two-level versioning / migrations

1. **Document-level** (common): each collection carries its `version`; on load, a mismatched stored document is passed to `migrate(data, fromVersion)`. Bump `version` + supply `migrate` when a tool's state shape changes. No DB reopen needed.
2. **Structural** (rare): the IndexedDB `DB_VERSION` in `core/storage/db.ts` governs object stores/indexes. Bump it and add an `if (oldVersion < N)` block in `upgrade()` only when you add/change a store — most changes are document-level and never touch this.

Every stored record is wrapped in a `StoredEnvelope` (`{ version, data, updatedAt }`) so the schema version always travels with the data.

## Income tax calculator

`features/income-tax/income-tax.model.ts` holds a **pure** `calculateIncomeTax(input)` (old regime; slabs, standard/80C/80D deductions with caps, 4% cess). Its slab formula is clamped (`max(0, min(income, upper) - lower)`), which fixed a latent negative-slab bug in the original tool while producing identical results for valid inputs. Keep the calculation pure — the component and the unit tests both depend on that.

## Testing notes

- E2E relies on `data-testid` attributes on interactive elements — keep them stable; the Playwright specs (`e2e/`) select by them.
- Persistence e2e leans on Playwright's per-test context isolation (fresh IndexedDB per test); reloads within a test keep the same context. Debounced writes need a short settle (`waitForTimeout(~400ms)`) before a reload assertion.

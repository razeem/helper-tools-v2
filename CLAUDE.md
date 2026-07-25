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

A personal-finance dashboard organised as **7 pillars**. Feature-first, standalone components, no NgModules.

```
src/app/
  app.config.ts          providers: zoneless CD, async animations, router
  app.routes.ts          PILLARS (single source for nav + router) + lazy loadComponent routes + redirects
  app.ts / .html / .scss shell: toolbar (avatar menu + theme) + collapsible mat-sidenav + <router-outlet>
  core/
    finance/   finance.model.ts (types + pure deriveFinance), tax.model.ts (old/new regime),
               finance-store.ts (THE shared model — one binding, derived signals)
    profile/   profile.model.ts, profile-store.ts (shared: form + shell avatar)
    preferences/ preferences-store.ts (sidebar collapsed + theme)
    storage/   db.ts (idb schema + structural migrations), storage.service.ts (persistence API)
    export/    excel-export.service.ts (exceljs, dynamically imported)
    image/     image-compression.ts (canvas → WebP Blob)
  shared/ui/   stat-tile, section-card, pillar-card, coming-soon, line-item-list,
               inline-prompt, rating-input, page-header
  features/
    dashboard/  income/  spending/  tax/  settings/ (profile-form + settings-dialog)
    coming-soon-page/  (saving · loan · insurance · investing route to this)
```

- **Pillars**: `PILLARS` in `app.routes.ts` drives both the sidebar and routes. `status: 'soon'` pillars route to `ComingSoonPage` (title/icon from route `data`). Old links redirect: `/income-tax → /tax`, `/profile → /dashboard` (profile now lives in the avatar → settings dialog).
- **Naming**: Angular 22 convention, no `.component` suffix (`income.ts`, class `Income`).
- **State**: signals + `computed()`; `inject()`; `OnPush` everywhere; typed reactive forms via `NonNullableFormBuilder`. Icons are **Material Symbols Rounded** (set as the default mat-icon font in `App`).
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

Wiring conventions used by the tools:
- **Auto-load**: read `store.value()` in the template / a `computed()`. For reactive forms, seed the form **once** with an `effect` guarded on `store.ready()` that then `destroy()`s itself, patching with `{ emitEvent: false }` to avoid a write-back loop (see `features/settings/profile-form.ts`).
- **Auto-save**: for signal inputs, call `store.patch(...)` on change. For reactive forms, subscribe to `valueChanges` → `store.patch(value)` with `takeUntilDestroyed()`.
- **Blobs**: store `Blob`s directly in the state object (IndexedDB structured-clone handles them natively — no base64). The profile photo is compressed to WebP via `compressImage()` before being put in state.
- **Domain stores**: rather than binding raw collections in components, the app wraps them in singleton stores — `FinanceStore`, `ProfileStore`, `PreferencesStore` — that expose `computed` derived state + typed setters. Components inject the store; they never call `StorageService` directly.

### Two-level versioning / migrations

1. **Document-level** (common): each collection carries its `version`; on load, a mismatched stored document is passed to `migrate(data, fromVersion)`. Bump `version` + supply `migrate` when a tool's state shape changes. No DB reopen needed.
2. **Structural** (rare): the IndexedDB `DB_VERSION` in `core/storage/db.ts` governs object stores/indexes. Bump it and add an `if (oldVersion < N)` block in `upgrade()` only when you add/change a store — most changes are document-level and never touch this.

Every stored record is wrapped in a `StoredEnvelope` (`{ version, data, updatedAt }`) so the schema version always travels with the data.

## Shared financial model (the core idea)

`FinanceStore` (`core/finance/finance-store.ts`) is the **single shared state** for the whole app. Every value is entered **exactly once**, in the pillar that owns it; every other pillar reads derived numbers — nothing is re-typed.

- **Ownership**: Income owns `gross`, `shortTermSavings`, goals, ideas; Spending owns `needs[]`/`wants[]`; Tax owns `regime` + deductions. Loan/Insurance/Investing own their lists too (modelled now, contribute 0 until those Coming-soon pillars ship).
- **Derived** (`deriveFinance` in `finance.model.ts`, pure + unit-tested): `totalNeeds` (spending needs **+ loan EMIs**), `totalWants`, tax (`tax.model.ts`, old/new regime), `netIncome`, `minimumIncome`, `surplus`.
- **Circular dependency** (Gross → Tax → Minimum): resolved by making **Gross the only entered value**; Tax and Minimum Income are both derived, and the dashboard compares Net vs Minimum. Never back-solve gross from minimum.
- **Minimum Income formula** is implemented literally (`Needs + Wants + Savings + Insurance + Investments − Tax`) in one place in `deriveFinance` — adjust there if the definition changes.
- **Inline prompts**: when a pillar needs a value another owns but it's still empty, render `app-inline-prompt` linking to the owning pillar instead of a duplicate input.

Tax math lives in `core/finance/tax.model.ts` — pure `calculateOldRegimeTax` / `calculateNewRegimeTax` (clamped progressive slabs, caps, 4% cess, new-regime 87A rebate). New-regime slabs are representative current-India values; update them per FY in one place. Keep all of this pure — components and unit tests depend on it.

## Testing notes

- E2E relies on `data-testid` attributes on interactive elements — keep them stable; the Playwright specs (`e2e/`) select by them.
- Persistence e2e leans on Playwright's per-test context isolation (fresh IndexedDB per test); reloads within a test keep the same context. Debounced writes need a short settle (`waitForTimeout(~400ms)`) before a reload assertion.

# Helper Tools

A small suite of self-contained browser utilities (income-tax calculator, profile store, …).
Everything you enter is persisted locally in **IndexedDB** — no backend, no accounts.

Built with **Angular 22** (standalone, zoneless, signals), **Angular Material 3**, and **Tailwind CSS v4**.

## Prerequisites

- **Node ≥ 24.15** (Angular 22 CLI requirement). The repo pins `24.18.0`:
  ```bash
  nvm use            # reads .nvmrc
  npm install
  ```

## Development

| Command | Description |
| --- | --- |
| `npm start` | Dev server at http://localhost:4200 |
| `npm run build` | Production build → `dist/` (git-ignored) |
| `npm run build:pages` | Production build with `--base-href /helper-tools-v2/` (reproduces the deployed output locally) |
| `npm test` | Unit tests (Vitest); single run: `npx ng test --no-watch` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npm run e2e` | Playwright end-to-end tests (first run: `npx playwright install chromium`) |

## Features

- **Dashboard** — entry point linking to each tool.
- **Income Tax Calculator** — Indian old-regime estimate (slabs, 80C/80D deductions, cess). Pure, unit-tested calculation. Inputs persist automatically.
- **Profile** — name, photo, address, phone, email, notes. Typed reactive form that auto-saves and auto-loads; the photo is compressed to WebP via `<canvas>` and stored as a `Blob`.
- **Excel export** — any tool can export its data to a real `.xlsx` (offline, via exceljs).

## Architecture & conventions

See [CLAUDE.md](CLAUDE.md) for the full architecture, the **persistence pattern** every tool follows (`StorageService` over IndexedDB with signal-backed collections and two-level versioning/migrations), and testing notes.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which lints, runs unit + e2e tests, builds the site (base href set from the repo name), and publishes it to **GitHub Pages** via GitHub Actions — no build output is committed.

One-time setup: in the repo, **Settings → Pages → Source → "GitHub Actions"**. The site is served at `https://<owner>.github.io/<repo>/`.

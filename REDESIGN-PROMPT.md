# Helper Tools v2 — Redesign & Feature Prompt

Analyse this Angular + Angular Material + Tailwind project and modernise it. Follow the latest
Angular standards and best practices throughout — choose the architecture you judge best and
explain the reasoning before implementing.

---

## 1. Dependency upgrade

- Upgrade Angular, Angular Material, Tailwind, and all other packages to their latest stable versions.
- Use the official `ng update` migration path and resolve all breaking changes.

## 2. Modernise & restructure

- Adopt current Angular idioms: standalone components, signals for state, the new control-flow
  syntax (`@if` / `@for`), `inject()`, typed reactive forms, `OnPush` change detection, and
  lazy-loaded routes.
- Reorganise the codebase into a clear, scalable structure with each tool as a self-contained feature.
- Enforce consistent coding standards via linting and formatting.

## 3. UI redesign — dashboard shell

Redesign the overall layout into a modern, stylish dashboard:

- **Profile menu, top-right** — an avatar that opens a dropdown for managing profile details,
  preferences, and all app settings. Migrate the existing Profile page into this menu.
- **Collapsible sidebar** — expands to a full labelled nav, collapses to a slim icon-only rail,
  with a smooth transition and the state remembered between visits.
- **Visual direction** — follow the reference screenshots provided in the IDE; propose a cohesive
  design system (spacing, typography, colour, elevation, dark mode) before implementing.
- **Icons** — source a suitable icon set, or generate custom icons where nothing fits.

## 4. Information architecture — the 7 Pillars of Personal Finance

Restructure the app's navigation around seven top-level sections. Move every existing tool into the
pillar it belongs to rather than leaving it at the top level. Pillars with no defined scope yet
render a styled **"Coming soon"** placeholder — routed and present in the nav, but not yet functional.

### 1. Income

- **Goals**
  - *Must Have* — never face a financial crisis; reach upper-middle class in 5 years; retire peacefully
  - *Good to Have* — take a trip
  - Both groups are user-editable lists.
- **Minimum Income calculator**
  - `Needs + Wants + Short-term Savings + Insurance + Long-term Investments − Taxes = Minimum Income`
  - The sign of the tax term is unconfirmed: make it explicit and documented in the calculation, and
    validate it against sample numbers before shipping.
- **Idea Generator** — capture income ideas, each scored on the **ICER** rating (1–5 per axis),
  displayed as a sortable table with an overall score:
  - **I**nterest — do you care about it?
  - **C**apability — can you do it well?
  - **E**ffortlessness — does it feel easy compared to alternatives?
  - **R**eturn — will it pay off?

### 2. Spending

Two repeatable multi-field lists, where each row is a *type* + *value* the user can add or remove:

- Needs
- Wants

### 3. Saving — *Coming soon*

### 4. Loan — *Coming soon*

### 5. Insurance — *Coming soon*

### 6. Investing — *Coming soon*

### 7. Tax

- Income Tax Calculator — move the existing calculator here
- Tax Regime Comparer

## 5. Shared financial data model

The pillars are interconnected: a value entered in one is consumed by others. Do **not** duplicate
inputs across screens. Model the whole app around a single shared financial state.

**Canonical variables** — define one authoritative set, including: Gross Income, Taxable Income,
Tax Payable, Total Needs, Total Wants, Total Savings, Insurance Premiums, Investment Contributions,
Loan EMIs, and Minimum Income.

**Key definitions:**

- **Gross Income** — the user's actual total income, inclusive of tax. Tax is treated as a category
  of spending, not as a deduction from income.
- **Minimum Income** — a *separate, derived* variable representing the minimum the user needs to
  earn. It is **not** the same as Gross Income and must never be conflated with it. It is computed
  from the spending pillars and displayed as a target to compare against Gross Income.

**Rules:**

- Each variable is entered **exactly once**, in the pillar that owns it. Every other pillar reads it
  from the shared store.
- Anything computable is a **derived value**, recalculated reactively — never re-typed. Example flows:
  - Needs + Wants (Spending) → feed the Minimum Income calculator (Income)
  - Loan EMIs (Loan) → roll into Needs
  - Insurance premiums (Insurance) and investment contributions (Investing) → feed Minimum Income
  - Gross Income (Income) → feeds the Tax calculator → Tax Payable feeds the spending total
- Where a pillar needs a value the user hasn't entered yet, show an inline prompt linking to the
  owning pillar rather than a duplicate input.
- Surface the aggregate picture on the dashboard home, so the user sees how the pillars connect at
  a glance, including Gross Income vs. Minimum Income.

## 6. Persistence — IndexedDB

- Build a generic, signal-based `StorageService` backed by IndexedDB (using the `idb` wrapper) as
  the single persistence mechanism for the whole app.
- The entire shared financial model is stored locally, saved automatically on change, and reloaded
  on the next visit.
- The profile photo is compressed via `<canvas>` to WebP and stored as a Blob.
- Handle schema versioning and migrations so stored data survives future changes.
- Document the pattern in `CLAUDE.md` so every new tool persists state the same way.

## 7. Export

- Add the ability to export a page's data to a working Excel file or Google Sheet.

## 8. Testing

- Set up Playwright and write end-to-end tests covering each pillar, the dashboard shell and sidebar
  collapse, the profile menu, cross-pillar derived values, persistence across reloads, and the
  export flow.
- All tests must pass before the work is considered done.

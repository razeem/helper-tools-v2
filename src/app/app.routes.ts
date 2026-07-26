import { Routes } from '@angular/router';
import { RouteSeo } from './core/seo/seo.service';

/** Prerendered-but-private pillars: full HTML at build time, kept out of the index. */
const noindex = (description: string): { seo: RouteSeo } => ({ seo: { description, index: false } });

export type PillarStatus = 'active' | 'soon';

export interface Pillar {
  path: string;
  title: string;
  icon: string;
  description: string;
  status: PillarStatus;
}

/** Single source of truth for the 7 pillars — drives the router and the sidebar. */
export const PILLARS: Pillar[] = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    description: 'Your whole financial picture at a glance.',
    status: 'active',
  },
  {
    path: 'income',
    title: 'Income',
    icon: 'payments',
    description: 'Goals, minimum income, and income ideas.',
    status: 'active',
  },
  {
    path: 'spending',
    title: 'Spending',
    icon: 'shopping_cart',
    description: 'Track your needs and wants.',
    status: 'active',
  },
  {
    path: 'saving',
    title: 'Saving',
    icon: 'savings',
    description: 'Build your safety net.',
    status: 'active',
  },
  {
    path: 'loan',
    title: 'Loan',
    icon: 'account_balance',
    description: 'Manage borrowing and EMIs.',
    status: 'active',
  },
  {
    path: 'insurance',
    title: 'Insurance',
    icon: 'health_and_safety',
    description: 'Health, life and term cover.',
    status: 'active',
  },
  {
    path: 'investing',
    title: 'Investing',
    icon: 'trending_up',
    description: 'EPF, NPS and wealth building.',
    status: 'active',
  },
  {
    path: 'tax',
    title: 'Tax',
    icon: 'receipt_long',
    description: 'Calculate and compare tax.',
    status: 'active',
  },
];

export const routes: Routes = [
  {
    // The dashboard is the home page — served at the root so it is the indexed,
    // real-content landing URL (not a redirect stub). `/dashboard` redirects here.
    path: '',
    pathMatch: 'full',
    title: 'Personal Finance Dashboard · Seven pillars, one shared model',
    data: {
      seo: {
        description:
          'A free, browser-only personal-finance dashboard: Income, Spending, Saving, Loan, Insurance, Investing and Tax share one reactive model, so every value is entered once and computed everywhere. Your data never leaves your device.',
        index: true,
      } satisfies RouteSeo,
    },
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'income',
    title: 'Income · Personal Finance',
    data: noindex('Set your monthly income, minimum-income target, savings goals and income ideas.'),
    loadComponent: () => import('./features/income/income').then((m) => m.Income),
  },
  {
    path: 'spending',
    title: 'Spending · Personal Finance',
    data: noindex('Track your monthly needs and wants and see how they fit your budget.'),
    loadComponent: () => import('./features/spending/spending').then((m) => m.Spending),
  },
  {
    path: 'saving',
    title: 'Saving · Personal Finance',
    data: noindex('Build and track your emergency-fund safety net.'),
    loadComponent: () => import('./features/saving/saving').then((m) => m.Saving),
  },
  {
    path: 'loan',
    title: 'Loan & EMI Calculator · Personal Finance',
    data: {
      seo: {
        description:
          'Free loan EMI calculator: work out monthly instalments, total interest and payoff for any principal, rate and tenure — and see how the EMIs fit your wider budget.',
        index: true,
      } satisfies RouteSeo,
    },
    loadComponent: () => import('./features/loan/loan').then((m) => m.Loan),
  },
  {
    path: 'insurance',
    title: 'Insurance · Personal Finance',
    data: noindex('Track health, life and term-cover premiums across monthly and yearly periods.'),
    loadComponent: () => import('./features/insurance/insurance').then((m) => m.Insurance),
  },
  {
    path: 'investing',
    title: 'Investing · Personal Finance',
    data: noindex('Track EPF, NPS and other contributions as you build long-term wealth.'),
    loadComponent: () => import('./features/investing/investing').then((m) => m.Investing),
  },
  {
    path: 'tax',
    title: 'India Income Tax Calculator · Old vs New Regime (FY 2025-26)',
    data: {
      seo: {
        description:
          'Free India income-tax calculator for FY 2025-26 (Budget 2025 slabs): compute tax under the old and new regimes, compare them side by side, and edit the slab rules to match your case. Runs entirely in your browser.',
        index: true,
      } satisfies RouteSeo,
    },
    loadComponent: () => import('./features/tax/tax').then((m) => m.Tax),
  },
  // Redirects for old deep links — the home page now lives at '' (see above).
  { path: 'dashboard', pathMatch: 'full', redirectTo: '' },
  { path: 'income-tax', pathMatch: 'full', redirectTo: 'tax' },
  { path: 'profile', pathMatch: 'full', redirectTo: '' },
  { path: '**', redirectTo: '' },
];

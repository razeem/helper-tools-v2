import { Routes } from '@angular/router';

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
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Personal Finance',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'income',
    title: 'Income · Personal Finance',
    loadComponent: () => import('./features/income/income').then((m) => m.Income),
  },
  {
    path: 'spending',
    title: 'Spending · Personal Finance',
    loadComponent: () => import('./features/spending/spending').then((m) => m.Spending),
  },
  {
    path: 'saving',
    title: 'Saving · Personal Finance',
    loadComponent: () => import('./features/saving/saving').then((m) => m.Saving),
  },
  {
    path: 'loan',
    title: 'Loan · Personal Finance',
    loadComponent: () => import('./features/loan/loan').then((m) => m.Loan),
  },
  {
    path: 'insurance',
    title: 'Insurance · Personal Finance',
    loadComponent: () => import('./features/insurance/insurance').then((m) => m.Insurance),
  },
  {
    path: 'investing',
    title: 'Investing · Personal Finance',
    loadComponent: () => import('./features/investing/investing').then((m) => m.Investing),
  },
  {
    path: 'tax',
    title: 'Tax · Personal Finance',
    loadComponent: () => import('./features/tax/tax').then((m) => m.Tax),
  },
  // Redirects for old deep links.
  { path: 'income-tax', pathMatch: 'full', redirectTo: 'tax' },
  { path: 'profile', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];

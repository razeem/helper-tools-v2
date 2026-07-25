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
    status: 'soon',
  },
  {
    path: 'loan',
    title: 'Loan',
    icon: 'account_balance',
    description: 'Manage borrowing and EMIs.',
    status: 'soon',
  },
  {
    path: 'insurance',
    title: 'Insurance',
    icon: 'health_and_safety',
    description: 'Protect against risk.',
    status: 'soon',
  },
  {
    path: 'investing',
    title: 'Investing',
    icon: 'trending_up',
    description: 'Grow your wealth.',
    status: 'soon',
  },
  {
    path: 'tax',
    title: 'Tax',
    icon: 'receipt_long',
    description: 'Calculate and compare tax.',
    status: 'active',
  },
];

function comingSoon(path: string, title: string, icon: string, description: string) {
  return {
    path,
    title: `${title} · Personal Finance`,
    data: { title, icon, subtitle: description },
    loadComponent: () =>
      import('./features/coming-soon-page/coming-soon-page').then((m) => m.ComingSoonPage),
  };
}

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
  comingSoon('saving', 'Saving', 'savings', 'Build your safety net.'),
  comingSoon('loan', 'Loan', 'account_balance', 'Manage borrowing and EMIs.'),
  comingSoon('insurance', 'Insurance', 'health_and_safety', 'Protect against risk.'),
  comingSoon('investing', 'Investing', 'trending_up', 'Grow your wealth.'),
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

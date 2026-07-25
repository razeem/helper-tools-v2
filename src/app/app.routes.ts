import { Routes } from '@angular/router';

export interface ToolRoute {
  path: string;
  title: string;
  icon: string;
  description: string;
}

/** Single source of truth for the navigable tools — drives both the router and the sidenav. */
export const TOOLS: ToolRoute[] = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    description: 'Overview of every helper tool.',
  },
  {
    path: 'income-tax',
    title: 'Income Tax Calculator',
    icon: 'calculate',
    description: 'Estimate Indian income tax under the old regime.',
  },
  {
    path: 'profile',
    title: 'Profile',
    icon: 'person',
    description: 'Save your personal details — persisted on this device.',
  },
];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Helper Tools',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'income-tax',
    title: 'Income Tax Calculator · Helper Tools',
    loadComponent: () => import('./features/income-tax/income-tax').then((m) => m.IncomeTax),
  },
  {
    path: 'profile',
    title: 'Profile · Helper Tools',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  { path: '**', redirectTo: 'dashboard' },
];

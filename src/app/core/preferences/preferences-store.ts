import { computed, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../storage/storage.service';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * How rupee figures are grouped. `indian` uses the lakh/crore system
 * (₹10,00,000); `international` uses the thousands system (₹1,000,000).
 */
export type NumberFormat = 'indian' | 'international';

export interface Preferences {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  numberFormat: NumberFormat;
}

export const DEFAULT_PREFERENCES: Preferences = {
  sidebarCollapsed: false,
  theme: 'system',
  numberFormat: 'indian',
};

/**
 * UI preferences (sidebar collapsed state, theme) persisted alongside the app
 * data via the same StorageService. Applying the theme sets `color-scheme` on the
 * document root, which flips the Material 3 system tokens.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly store = inject(StorageService).bind<Preferences>({
    key: 'preferences',
    version: 2,
    defaults: DEFAULT_PREFERENCES,
    // v1 → v2 added the number-format preference (defaulting to Indian grouping).
    migrate: (data) => ({ ...DEFAULT_PREFERENCES, ...(data as Partial<Preferences>) }),
  });

  readonly value = this.store.value;
  readonly ready = this.store.ready;
  readonly sidebarCollapsed = computed(() => this.value().sidebarCollapsed);
  readonly theme = computed(() => this.value().theme);
  readonly numberFormat = computed(() => this.value().numberFormat);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    // Reflect the chosen theme onto the document root. `data-theme` drives the
    // bio design-token overrides in styles.scss; removing it (system mode) lets
    // the `prefers-color-scheme` media query decide. Skipped during prerender —
    // the server render only ever sees the un-hydrated `system` default.
    effect(() => {
      const theme = this.theme();
      if (!this.isBrowser) return;
      const root = document.documentElement;
      if (theme === 'system') {
        root.removeAttribute('data-theme');
        root.style.removeProperty('color-scheme');
      } else {
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
      }
    });
  }

  toggleSidebar(): void {
    this.store.patch({ sidebarCollapsed: !this.value().sidebarCollapsed });
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.store.patch({ sidebarCollapsed: collapsed });
  }

  setTheme(theme: ThemeMode): void {
    this.store.patch({ theme });
  }

  setNumberFormat(numberFormat: NumberFormat): void {
    this.store.patch({ numberFormat });
  }
}

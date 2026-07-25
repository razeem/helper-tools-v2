import { computed, effect, inject, Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Preferences {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
}

export const DEFAULT_PREFERENCES: Preferences = {
  sidebarCollapsed: false,
  theme: 'system',
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
    version: 1,
    defaults: DEFAULT_PREFERENCES,
  });

  readonly value = this.store.value;
  readonly ready = this.store.ready;
  readonly sidebarCollapsed = computed(() => this.value().sidebarCollapsed);
  readonly theme = computed(() => this.value().theme);

  constructor() {
    // Reflect the chosen theme onto the document root whenever it changes.
    effect(() => {
      const theme = this.theme();
      const root = document.documentElement;
      if (theme === 'system') {
        root.style.removeProperty('color-scheme');
      } else {
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
}

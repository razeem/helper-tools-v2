import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { DEFAULT_PROFILE, ProfileData, profileInitials, ProfileTextFields } from './profile.model';

/**
 * Single shared source for the user's profile — consumed by both the settings
 * form and the shell avatar, so edits reflect everywhere without a reload.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly store = inject(StorageService).bind<ProfileData>({
    key: 'profile',
    version: 1,
    defaults: DEFAULT_PROFILE,
  });

  readonly value = this.store.value;
  readonly ready = this.store.ready;
  readonly displayName = computed(() => this.value().name.trim());
  readonly initials = computed(() => profileInitials(this.value()));

  /** Live object URL for the stored photo Blob (revoked as it changes). */
  readonly photoUrl = signal<string | null>(null);
  private objectUrl: string | null = null;

  constructor() {
    effect(() => {
      const blob = this.value().photo;
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      if (blob) {
        this.objectUrl = URL.createObjectURL(blob);
        this.photoUrl.set(this.objectUrl);
      } else {
        this.photoUrl.set(null);
      }
    });
  }

  setText(partial: Partial<ProfileTextFields>): void {
    this.store.patch(partial);
  }

  setPhoto(photo: Blob): void {
    this.store.patch({ photo });
  }

  removePhoto(): void {
    this.store.patch({ photo: null });
  }

  flush(): Promise<void> {
    return this.store.flush();
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }
}

import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileStore } from '../../core/profile/profile-store';
import { profileTextFields } from '../../core/profile/profile.model';
import { compressImage } from '../../core/image/image-compression';

@Component({
  selector: 'app-profile-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.scss',
})
export class ProfileForm {
  private readonly profile = inject(ProfileStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly photoUrl = this.profile.photoUrl;

  protected readonly form = this.fb.group({
    name: this.fb.control(''),
    email: this.fb.control('', { validators: [Validators.email] }),
    phone: this.fb.control(''),
    addressLine1: this.fb.control(''),
    addressLine2: this.fb.control(''),
    city: this.fb.control(''),
    state: this.fb.control(''),
    postalCode: this.fb.control(''),
    country: this.fb.control(''),
    notes: this.fb.control(''),
  });

  protected readonly textFields = [
    { key: 'name', label: 'Full name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'addressLine1', label: 'Address line 1', type: 'text' },
    { key: 'addressLine2', label: 'Address line 2', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State / Province', type: 'text' },
    { key: 'postalCode', label: 'Postal code', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
  ] as const;

  constructor() {
    const seed = effect(() => {
      if (!this.profile.ready()) {
        return;
      }
      this.form.patchValue(profileTextFields(this.profile.value()), { emitEvent: false });
      seed.destroy();
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.profile.setText(value);
    });
  }

  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const compressed = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        type: 'image/webp',
      });
      this.profile.setPhoto(compressed);
      this.snackBar.open('Photo saved', 'Dismiss', { duration: 2000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Could not process that image', 'Dismiss', { duration: 4000 });
    }
  }

  protected removePhoto(): void {
    this.profile.removePhoto();
  }

  protected async clear(): Promise<void> {
    await this.profile.reset();
    this.form.reset(
      {
        name: '',
        email: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        notes: '',
      },
      { emitEvent: false },
    );
    this.snackBar.open('Profile cleared', 'Dismiss', { duration: 2000 });
  }
}

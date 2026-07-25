import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StorageService } from '../../core/storage/storage.service';
import { ExcelExportService } from '../../core/export/excel-export.service';
import { compressImage } from '../../core/image/image-compression';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { DEFAULT_PROFILE, ProfileData, profileTextFields } from './profile.model';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    PageHeader,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly storage = inject(StorageService);
  private readonly excel = inject(ExcelExportService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly store = this.storage.bind<ProfileData>({
    key: 'profile',
    version: 1,
    defaults: DEFAULT_PROFILE,
  });

  protected readonly ready = this.store.ready;
  protected readonly photo = signal<Blob | null>(null);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly exporting = signal(false);
  private objectUrl: string | null = null;

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
    { key: 'name', label: 'Full name', type: 'text', span: 2 },
    { key: 'email', label: 'Email', type: 'email', span: 1 },
    { key: 'phone', label: 'Phone', type: 'tel', span: 1 },
    { key: 'addressLine1', label: 'Address line 1', type: 'text', span: 2 },
    { key: 'addressLine2', label: 'Address line 2', type: 'text', span: 2 },
    { key: 'city', label: 'City', type: 'text', span: 1 },
    { key: 'state', label: 'State / Province', type: 'text', span: 1 },
    { key: 'postalCode', label: 'Postal code', type: 'text', span: 1 },
    { key: 'country', label: 'Country', type: 'text', span: 1 },
  ] as const;

  constructor() {
    // One-shot hydration: seed the form + photo once IndexedDB has loaded.
    const seed = effect(() => {
      if (!this.store.ready()) {
        return;
      }
      const data = this.store.value();
      this.form.patchValue(profileTextFields(data), { emitEvent: false });
      this.photo.set(data.photo);
      seed.destroy();
    });

    // Write-through: every text edit persists (StorageService debounces the write).
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.store.patch(value as Partial<ProfileData>);
    });

    // Maintain a live object URL for the photo preview, revoking the previous one.
    effect(() => {
      const blob = this.photo();
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
      this.photo.set(compressed);
      this.store.patch({ photo: compressed });
      this.snackBar.open('Photo saved', 'Dismiss', { duration: 2000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Could not process that image', 'Dismiss', { duration: 4000 });
    }
  }

  protected removePhoto(): void {
    this.photo.set(null);
    this.store.patch({ photo: null });
  }

  protected async reset(): Promise<void> {
    await this.store.reset();
    this.form.reset(profileTextFields(DEFAULT_PROFILE), { emitEvent: false });
    this.photo.set(null);
    this.snackBar.open('Profile cleared', 'Dismiss', { duration: 2000 });
  }

  protected async exportXlsx(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.store.flush();
      const data = this.store.value();
      const rows = [
        { field: 'Name', value: data.name },
        { field: 'Email', value: data.email },
        { field: 'Phone', value: data.phone },
        { field: 'Address line 1', value: data.addressLine1 },
        { field: 'Address line 2', value: data.addressLine2 },
        { field: 'City', value: data.city },
        { field: 'State / Province', value: data.state },
        { field: 'Postal code', value: data.postalCode },
        { field: 'Country', value: data.country },
        { field: 'Notes', value: data.notes },
        { field: 'Photo', value: data.photo ? 'stored (WebP)' : 'none' },
      ];
      await this.excel.export('profile', [
        {
          name: 'Profile',
          columns: [
            { header: 'Field', key: 'field', width: 24 },
            { header: 'Value', key: 'value', width: 40 },
          ],
          rows,
        },
      ]);
      this.snackBar.open('Exported profile.xlsx', 'Dismiss', { duration: 3000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Export failed — see console', 'Dismiss', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
  }
}

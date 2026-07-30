import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';

/**
 * One calculator input: a label, a typed numeric chip, and a slider — kept in
 * sync. Two-way bindable (`[(value)]="amount"`), or one-way plus
 * `(valueChange)` when the write has to go through a store setter.
 *
 * Typing is deliberately *not* clamped to `min`/`max` (that would fight you
 * mid-keystroke); the slider clamps its own thumb.
 */
@Component({
  selector: 'app-slider-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatSliderModule],
  template: `
    <div>
      <div class="flex items-center justify-between gap-3 mb-1">
        <label [attr.for]="fieldId()" class="text-sm font-medium">{{ label() }}</label>
        <div
          class="flex items-center gap-1 rounded-lg px-2.5 py-1 bg-[var(--mat-sys-primary-container)] text-[var(--mat-sys-on-primary-container)]"
        >
          @if (prefix()) {
            <span class="opacity-70">{{ prefix() }}</span>
          }
          <input
            [id]="fieldId()"
            class="bg-transparent text-right font-semibold outline-none app-num"
            [style.width.ch]="chars()"
            type="number"
            [min]="min()"
            [step]="step()"
            [attr.inputmode]="step() < 1 ? 'decimal' : 'numeric'"
            [ngModel]="value()"
            (ngModelChange)="commit($event)"
            [attr.data-testid]="testid()"
          />
          @if (suffix()) {
            <span class="opacity-70">{{ suffix() }}</span>
          }
        </div>
      </div>
      <mat-slider [min]="min()" [max]="max()" [step]="step()" class="app-slider">
        <input
          matSliderThumb
          [ngModel]="value()"
          (ngModelChange)="commit($event)"
          [attr.aria-label]="label()"
        />
      </mat-slider>
      @if (hint()) {
        <p class="mt-1 text-xs text-[var(--mat-sys-on-surface-variant)]">{{ hint() }}</p>
      }
    </div>
  `,
})
export class SliderField {
  readonly label = input.required<string>();
  readonly value = model.required<number>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input<number>(1);
  /** Rendered before the number inside the chip (e.g. `₹`). */
  readonly prefix = input<string>('');
  /** Rendered after the number inside the chip (e.g. `%`, `yr`). */
  readonly suffix = input<string>('');
  /** Chip input width, in characters. */
  readonly chars = input<number>(8);
  /** Small caption under the slider. */
  readonly hint = input<string>('');
  /** `data-testid` for the chip input; also seeds the label/input `id`. */
  readonly testid = input.required<string>();

  protected readonly fieldId = computed(() => `sf-${this.testid()}`);

  protected commit(next: string | number | null): void {
    const n = typeof next === 'number' ? next : Number(next);
    this.value.set(Number.isFinite(n) ? n : 0);
  }
}

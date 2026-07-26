import { ChangeDetectorRef, Pipe, PipeTransform, effect, inject } from '@angular/core';
import { formatCurrency, getCurrencySymbol } from '@angular/common';
import { NumberFormat, PreferencesStore } from '../core/preferences/preferences-store';

/**
 * Format a number as INR using the chosen grouping system:
 *  - `indian`        → ₹10,00,000 (lakh/crore, `en-IN`)
 *  - `international` → ₹1,000,000 (thousands, `en-US`)
 *
 * Shared by the `inr` pipe and any component that formats rupees imperatively.
 */
export function formatInr(
  value: number | null | undefined,
  mode: NumberFormat,
  digits = '1.0-0',
): string {
  const locale = mode === 'indian' ? 'en-IN' : 'en-US';
  return formatCurrency(
    value ?? 0,
    locale,
    getCurrencySymbol('INR', 'narrow', locale),
    'INR',
    digits,
  );
}

/**
 * Drop-in replacement for `| currency: 'INR' : 'symbol' : '1.0-0'` that follows
 * the user's number-format preference. Impure so it re-runs when the preference
 * flips; the effect marks the host view for check so every rupee figure across
 * the app updates the moment the setting changes.
 */
@Pipe({ name: 'inr', pure: false })
export class InrPipe implements PipeTransform {
  private readonly prefs = inject(PreferencesStore);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.prefs.numberFormat();
      this.cdr.markForCheck();
    });
  }

  transform(value: number | null | undefined, digits = '1.0-0'): string {
    return formatInr(value, this.prefs.numberFormat(), digits);
  }
}

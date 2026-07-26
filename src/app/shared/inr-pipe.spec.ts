import { registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { formatInr } from './inr-pipe';

// The app registers this in app.config; the pure formatter needs it too.
registerLocaleData(localeEnIn);

describe('formatInr', () => {
  it('groups by lakh/crore in the Indian system', () => {
    expect(formatInr(1_000_000, 'indian')).toBe('₹10,00,000');
    expect(formatInr(12_00_000, 'indian')).toBe('₹12,00,000');
    expect(formatInr(1_00_00_000, 'indian')).toBe('₹1,00,00,000');
  });

  it('groups by thousands in the international system', () => {
    expect(formatInr(1_000_000, 'international')).toBe('₹1,000,000');
    expect(formatInr(10_000_000, 'international')).toBe('₹10,000,000');
  });

  it('rounds to whole rupees and handles null/undefined', () => {
    expect(formatInr(30_195.6, 'indian')).toBe('₹30,196');
    expect(formatInr(null, 'indian')).toBe('₹0');
    expect(formatInr(undefined, 'international')).toBe('₹0');
  });
});

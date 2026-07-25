import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../page-header/page-header';

@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeader],
  template: `
    <div class="app-page">
      <app-page-header [title]="title()" [subtitle]="subtitle()" [icon]="icon()" />
      <div class="placeholder app-section" data-testid="coming-soon">
        <span class="placeholder__badge">
          <mat-icon aria-hidden="true">hourglass_top</mat-icon>
        </span>
        <h2 class="placeholder__title">Coming soon</h2>
        <p class="placeholder__text">
          The {{ title() }} pillar is on the roadmap. Its data will connect to the same shared
          financial model the other pillars already use.
        </p>
      </div>
    </div>
  `,
  styles: `
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
      padding: 3.5rem 1.5rem;
    }
    .placeholder__badge {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: var(--r-pill);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .placeholder__badge mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .placeholder__title {
      margin: 0.25rem 0 0;
      font-weight: 700;
    }
    .placeholder__text {
      margin: 0;
      max-width: 420px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ComingSoon {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<string>('hourglass_top');
}

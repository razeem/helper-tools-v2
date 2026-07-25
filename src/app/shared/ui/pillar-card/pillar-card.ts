import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/** Dashboard tile linking to a pillar; dims + tags pillars that are Coming soon. */
@Component({
  selector: 'app-pillar-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    <a
      class="pillar app-section"
      [class.pillar--soon]="soon()"
      [routerLink]="['/', path()]"
      [attr.data-testid]="'pillar-' + path()"
    >
      <span class="pillar__icon" aria-hidden="true">
        <mat-icon>{{ icon() }}</mat-icon>
      </span>
      <span class="pillar__title">
        {{ title() }}
        @if (soon()) {
          <span class="pillar__chip">Soon</span>
        }
      </span>
      @if (value()) {
        <span class="pillar__value app-num">{{ value() }}</span>
      }
      <span class="pillar__desc">{{ description() }}</span>
    </a>
  `,
  styles: `
    .pillar {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 1.25rem;
      text-decoration: none;
      color: inherit;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }
    .pillar:hover {
      transform: translateY(-3px);
      border-color: var(--mat-sys-primary);
      box-shadow: var(--app-elevation-hover);
    }
    .pillar__icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .pillar__title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }
    .pillar__chip {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.1rem 0.45rem;
      border-radius: var(--r-pill);
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
    }
    .pillar__value {
      font-size: 1.35rem;
      font-weight: 700;
    }
    .pillar__desc {
      font-size: 0.82rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .pillar--soon {
      opacity: 0.72;
    }
  `,
})
export class PillarCard {
  readonly path = input.required<string>();
  readonly title = input.required<string>();
  readonly icon = input.required<string>();
  readonly description = input<string>('');
  readonly value = input<string>('');
  readonly soon = input<boolean>(false);
}

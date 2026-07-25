import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Shown when a pillar needs a value that another pillar owns but the user hasn't
 * entered yet — links to the owning pillar instead of duplicating the input.
 */
@Component({
  selector: 'app-inline-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="prompt" data-testid="inline-prompt">
      <mat-icon aria-hidden="true">info</mat-icon>
      <span class="prompt__text">{{ message() }}</span>
      <a mat-stroked-button [routerLink]="link()">
        {{ linkLabel() }}
        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
      </a>
    </div>
  `,
  styles: `
    .prompt {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: var(--r-control);
      background: var(--mat-sys-surface-container-high);
      border: 1px dashed var(--mat-sys-outline);
    }
    .prompt > mat-icon {
      color: var(--mat-sys-primary);
    }
    .prompt__text {
      flex: 1 1 auto;
      font-size: 0.88rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class InlinePrompt {
  readonly message = input.required<string>();
  readonly link = input.required<string>();
  readonly linkLabel = input<string>('Open');
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Compact 1–5 rating selector used for the ICER axes. */
@Component({
  selector: 'app-rating-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rating" role="radiogroup" [attr.aria-label]="label()">
      @for (dot of dots; track dot) {
        <button
          type="button"
          class="rating__dot"
          [class.rating__dot--on]="dot <= value()"
          role="radio"
          [attr.aria-checked]="dot === value()"
          [attr.aria-label]="dot + ' of 5'"
          (click)="valueChange.emit(dot)"
        ></button>
      }
    </div>
  `,
  styles: `
    .rating {
      display: inline-flex;
      gap: 0.3rem;
    }
    .rating__dot {
      width: 18px;
      height: 18px;
      padding: 0;
      border-radius: var(--r-pill);
      border: 1.5px solid var(--mat-sys-outline);
      background: transparent;
      cursor: pointer;
      transition:
        background 120ms ease,
        border-color 120ms ease,
        transform 120ms ease;
    }
    .rating__dot:hover {
      transform: scale(1.12);
    }
    .rating__dot--on {
      background: var(--mat-sys-primary);
      border-color: var(--mat-sys-primary);
    }
  `,
})
export class RatingInput {
  readonly value = input.required<number>();
  readonly label = input<string>('rating');
  readonly valueChange = output<number>();

  protected readonly dots = [1, 2, 3, 4, 5];
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ListOps } from '../../../core/finance/finance-store';
import { LineItem, makeLineItem, sumLineItems } from '../../../core/finance/finance.model';

/**
 * Editable list of `{ type, value }` rows bound to a `ListOps<LineItem>` from the
 * shared FinanceStore. Every edit writes straight through to the shared model.
 */
@Component({
  selector: 'app-line-item-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="list">
      @for (item of ops().items(); track item.id) {
        <div class="row" [attr.data-testid]="testid() + '-row'">
          <mat-form-field appearance="outline" class="row__type">
            <mat-label>{{ typeLabel() }}</mat-label>
            <input
              matInput
              [ngModel]="item.type"
              (ngModelChange)="ops().update(item.id, { type: $event })"
              [attr.data-testid]="testid() + '-type'"
            />
          </mat-form-field>
          <mat-form-field appearance="outline" class="row__value">
            <mat-label>{{ valueLabel() }}</mat-label>
            <span matTextPrefix>₹&nbsp;</span>
            <input
              matInput
              type="number"
              min="0"
              inputmode="numeric"
              [ngModel]="item.value"
              (ngModelChange)="ops().update(item.id, { value: +$event || 0 })"
              [attr.data-testid]="testid() + '-value'"
            />
          </mat-form-field>
          <button
            mat-icon-button
            type="button"
            aria-label="Remove row"
            (click)="ops().remove(item.id)"
            [attr.data-testid]="testid() + '-remove'"
          >
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
      } @empty {
        <p class="empty">{{ emptyText() }}</p>
      }

      <div class="list__foot">
        <button
          mat-stroked-button
          type="button"
          (click)="ops().add(newItem())"
          [attr.data-testid]="testid() + '-add'"
        >
          <mat-icon>add</mat-icon>
          {{ addLabel() }}
        </button>
        <span class="total app-num" [attr.data-testid]="testid() + '-total'">
          {{ total() | currency: 'INR' : 'symbol' : '1.0-0' }}
        </span>
      </div>
    </div>
  `,
  styles: `
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: center;
    }
    mat-form-field {
      width: 100%;
    }
    .empty {
      margin: 0.25rem 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.88rem;
    }
    .list__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.25rem;
    }
    .total {
      font-weight: 700;
      font-size: 1.05rem;
    }
    @media (max-width: 560px) {
      .row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .row__value {
        grid-column: 1;
      }
    }
  `,
})
export class LineItemList {
  readonly ops = input.required<ListOps<LineItem>>();
  readonly typeLabel = input<string>('Type');
  readonly valueLabel = input<string>('Amount');
  readonly addLabel = input<string>('Add row');
  readonly emptyText = input<string>('Nothing added yet.');
  readonly testid = input<string>('line-item');

  protected readonly total = computed(() => sumLineItems(this.ops().items()));

  protected newItem(): LineItem {
    return makeLineItem();
  }
}

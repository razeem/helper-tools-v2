import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-coming-soon-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoon],
  template: `
    <app-coming-soon [title]="data().title" [subtitle]="data().subtitle" [icon]="data().icon" />
  `,
})
export class ComingSoonPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly data = toSignal(
    this.route.data.pipe(
      map((d) => ({
        title: (d['title'] as string) ?? 'Pillar',
        subtitle: (d['subtitle'] as string) ?? '',
        icon: (d['icon'] as string) ?? 'hourglass_top',
      })),
    ),
    { initialValue: { title: 'Pillar', subtitle: '', icon: 'hourglass_top' } },
  );
}

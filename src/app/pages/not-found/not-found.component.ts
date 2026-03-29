import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeftIconComponent } from '../../shared/icons/arrow-left-icon.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ArrowLeftIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center min-h-[calc(100svh-4rem)] px-4">
      <div class="text-center max-w-md">
        <p class="text-8xl font-bold text-brand-dark dark:text-brand-light mb-4">404</p>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Page not found
        </h1>
        <p class="text-slate-600 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a routerLink="/"
           class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                  bg-brand-dark text-white hover:brightness-90
                  transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-dark/25">
          <app-arrow-left-icon class="text-[16px]" />
          Back to home
        </a>
      </div>
    </div>
  `,
})
/** 404 page shown for unmatched routes. */
export class NotFoundComponent {}

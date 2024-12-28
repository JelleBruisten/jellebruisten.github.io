import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BlogService } from '../../../services/blog.service';

@Component({
  selector: 'app-blog-list',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      <!-- Header -->
      <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                  border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12 mb-8">
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight
                   text-slate-900 dark:text-white mb-4">
          Blog
        </h1>
        <p class="text-slate-600 dark:text-slate-400 text-lg">
          Thoughts on Angular, TypeScript, WebGPU, and building things on the web.
        </p>
      </div>

      <!-- Active tag filter -->
      @if (activeTag()) {
        <div class="flex items-center gap-3 mb-6">
          <span class="text-sm text-slate-600 dark:text-slate-400">Filtered by:</span>
          <button (click)="clearTag()"
                  class="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full
                         bg-brand/15 dark:bg-brand-light/15
                         text-brand-dark dark:text-brand-light
                         hover:bg-brand/25 dark:hover:bg-brand-light/25 transition-colors">
            {{ activeTag() }}
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      }

      <!-- Post list -->
      <div class="space-y-4">
        @for (post of posts(); track post.slug) {
          <a [routerLink]="['/blog', post.slug]"
             class="group block bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-6 sm:p-8
                    hover:border-brand/40 dark:hover:border-brand-light/40
                    hover:bg-brand/5 dark:hover:bg-brand-light/5
                    transition-all">

            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex-1 min-w-0">

                <!-- Tags -->
                @if (post.tags.length > 0) {
                  <div class="flex flex-wrap gap-2 mb-3">
                    @for (tag of post.tags; track tag) {
                      <button (click)="filterByTag(tag, $event)"
                              [class]="tag === activeTag()
                                ? 'cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full transition-colors ring-1 ring-inset ring-brand-dark dark:ring-brand-light bg-brand/15 dark:bg-brand-light/15 text-brand-dark dark:text-brand-light'
                                : 'cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full transition-colors bg-brand/8 dark:bg-brand-light/8 text-brand-dark dark:text-brand-light hover:bg-brand/20 dark:hover:bg-brand-light/20'">
                        {{ tag }}
                      </button>
                    }
                  </div>
                }

                <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2
                           group-hover:text-brand-dark dark:group-hover:text-brand-light transition-colors">
                  {{ post.title }}
                </h2>
                <p class="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {{ post.description }}
                </p>
              </div>

              <!-- Arrow -->
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round"
                   class="shrink-0 mt-1 text-slate-300 dark:text-slate-600
                          group-hover:text-brand-dark dark:group-hover:text-brand-light
                          group-hover:translate-x-1 transition-all"
                   aria-hidden="true">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </div>

            <div class="mt-4 text-xs font-medium text-slate-600 dark:text-slate-400">
              {{ post.date | date:'longDate' }} &middot; {{ post.readTime }} min read
            </div>
          </a>
        }

        @empty {
          <div class="text-center py-20 text-slate-600 dark:text-slate-400">
            @if (activeTag()) {
              No posts tagged "{{ activeTag() }}".
            } @else {
              No posts yet — check back soon.
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class BlogListComponent {
  private blog   = inject(BlogService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  protected activeTag = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('tag') ?? '')),
    { initialValue: '' }
  );

  protected posts = computed(() => {
    const tag = this.activeTag();
    const all  = this.blog.getAllPosts();
    return tag ? all.filter(p => p.tags.includes(tag)) : all;
  });

  protected filterByTag(tag: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: this.activeTag() === tag ? null : tag },
      queryParamsHandling: 'merge',
    });
  }

  protected clearTag(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: null },
      queryParamsHandling: 'merge',
    });
  }
}

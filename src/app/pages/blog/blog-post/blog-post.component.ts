import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BlogService } from '../../../services/blog.service';

@Component({
  selector: 'app-blog-post',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      <!-- Back -->
      <a routerLink="/blog"
         class="inline-flex items-center gap-2 text-sm font-medium
                text-slate-500 dark:text-slate-400
                hover:text-brand dark:hover:text-brand-light
                transition-colors mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        All posts
      </a>

      @let p = post();
      @if (p) {
        <article class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                        border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12">

          <!-- Tags -->
          @if (p.tags.length > 0) {
            <div class="flex flex-wrap gap-2 mb-6">
              @for (tag of p.tags; track tag) {
                <span class="text-xs font-medium px-2.5 py-1 rounded-full
                             bg-brand/8 dark:bg-brand-light/8
                             text-brand dark:text-brand-light">
                  {{ tag }}
                </span>
              }
            </div>
          }

          <!-- Title -->
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight
                     text-slate-900 dark:text-white leading-tight mb-4">
            {{ p.title }}
          </h1>

          <!-- Meta -->
          <div class="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-10
                      pb-8 border-b border-slate-200/60 dark:border-slate-700/60">
            <time [dateTime]="p.date">{{ p.date | date:'longDate' }}</time>
            <span aria-hidden="true">&middot;</span>
            <span>{{ p.readTime }} min read</span>
          </div>

          <!-- Content pre-built from our own markdown — bypass sanitizer so
               shiki's inline CSS custom properties are preserved -->
          <div class="prose text-slate-700 dark:text-slate-300"
               [innerHTML]="safeContent()">
          </div>
        </article>

        <!-- Bottom nav -->
        <div class="mt-8">
          <a routerLink="/blog"
             class="inline-flex items-center gap-2 text-sm font-medium
                    text-slate-500 dark:text-slate-400
                    hover:text-brand dark:hover:text-brand-light transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
            All posts
          </a>
        </div>

      } @else {
        <!-- Not found -->
        <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-12 text-center">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Post not found</h1>
          <p class="text-slate-600 dark:text-slate-400 mb-8">
            That post doesn't exist or may have been moved.
          </p>
          <a routerLink="/blog"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    bg-brand text-white hover:bg-brand-dark
                    transition-all hover:scale-105 active:scale-95">
            Back to blog
          </a>
        </div>
      }
    </div>
  `,
})
export class BlogPostComponent {
  private route     = inject(ActivatedRoute);
  private blog      = inject(BlogService);
  private el        = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);

  private slug = toSignal(
    this.route.paramMap.pipe(map(p => p.get('slug') ?? '')),
    { initialValue: '' }
  );

  protected post        = computed(() => this.blog.getPost(this.slug()));
  protected safeContent = computed((): SafeHtml | null => {
    const p = this.post();
    return p ? this.sanitizer.bypassSecurityTrustHtml(p.content) : null;
  });

  constructor() {
    // afterNextRender is browser-only — safe with SSR, runs after [innerHTML] is painted
    afterNextRender(async () => {
      const nodes = (this.el.nativeElement as HTMLElement)
        .querySelectorAll<HTMLElement>('pre.mermaid');
      if (!nodes.length) return;

      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      });
      await mermaid.run({ nodes: Array.from(nodes) });
    });
  }
}

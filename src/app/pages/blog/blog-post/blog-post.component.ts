import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, isPlatformServer } from '@angular/common';
import { DomSanitizer, Meta, SafeHtml, Title } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { BlogService } from '../../../services/blog.service';
import { ArrowLeftIconComponent } from '../../../shared/icons/arrow-left-icon.component';
import { SpinnerIconComponent } from '../../../shared/icons/spinner-icon.component';

@Component({
  selector: 'app-blog-post',
  imports: [RouterLink, DatePipe, ArrowLeftIconComponent, SpinnerIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      <!-- Back -->
      <a routerLink="/blog"
         class="inline-flex items-center gap-2 text-sm font-medium
                text-slate-600 dark:text-slate-400
                hover:text-brand-dark dark:hover:text-brand-light
                transition-colors mb-8">
        <app-arrow-left-icon class="text-[16px]" />
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
                <a [routerLink]="['/blog']" [queryParams]="{ tag }"
                   class="text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                          bg-brand/8 dark:bg-brand-light/8
                          text-brand-dark dark:text-brand-light
                          hover:bg-brand/20 dark:hover:bg-brand-light/20">
                  {{ tag }}
                </a>
              }
            </div>
          }

          <!-- Title -->
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight
                     text-slate-900 dark:text-white leading-tight mb-4">
            {{ p.title }}
          </h1>

          <!-- Meta -->
          <div class="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-10
                      pb-8 border-b border-slate-200/60 dark:border-slate-700/60">
            <time [dateTime]="p.date">{{ p.date | date:'longDate' }}</time>
            <span aria-hidden="true">&middot;</span>
            <span>{{ p.readTime }} min read</span>
          </div>

          <!-- Content loaded on demand — bypass sanitizer so
               shiki's inline CSS custom properties are preserved -->
          @if (safeContent()) {
            <div class="prose text-slate-700 dark:text-slate-300"
                 [innerHTML]="safeContent()">
            </div>
          } @else {
            <div class="flex items-center gap-3 py-12 justify-center text-slate-400 dark:text-slate-500">
              <app-spinner-icon class="animate-spin text-[20px]" />
              Loading content...
            </div>
          }
        </article>

        <!-- Bottom nav -->
        <div class="mt-8">
          <a routerLink="/blog"
             class="inline-flex items-center gap-2 text-sm font-medium
                    text-slate-600 dark:text-slate-400
                    hover:text-brand-dark dark:hover:text-brand-light transition-colors">
            <app-arrow-left-icon class="text-[16px]" />
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
                    bg-brand-dark text-white hover:brightness-90
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
  private title     = inject(Title);
  private meta      = inject(Meta);

  private slug = toSignal(
    this.route.paramMap.pipe(map(p => p.get('slug') ?? '')),
    { initialValue: '' }
  );

  protected post = computed(() => this.blog.getPost(this.slug()));

  // Content loaded on demand via HTTP — TransferState ensures SSR-fetched
  // content is reused on the client without a duplicate request.
  private contentHtml = toSignal(
    toObservable(this.slug).pipe(
      switchMap(slug => slug
        ? this.blog.getPostContent(slug)
        : of(null)
      )
    ),
    { initialValue: null }
  );

  protected safeContent = computed((): SafeHtml | null => {
    const html = this.contentHtml();
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      effect(() => {
        const p = this.post();
        if (p) {
          this.title.setTitle(`${p.title} — Jelle Bruisten`);
          this.meta.updateTag({ name: 'description', content: p.description });
          this.meta.updateTag({ property: 'og:title', content: `${p.title} — Jelle Bruisten` });
          this.meta.updateTag({ property: 'og:description', content: p.description });
        }
      });
    }

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

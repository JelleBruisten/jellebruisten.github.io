import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  isDevMode,
  PLATFORM_ID,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DatePipe, isPlatformServer } from "@angular/common";
import { Meta, Title } from "@angular/platform-browser";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { BlogService } from "../../../services/blog.service";
import { CloseIconComponent } from "../../../shared/icons/close-icon.component";
import { ArrowRightIconComponent } from "../../../shared/icons/arrow-right-icon.component";

@Component({
  selector: "app-blog-list",
  imports: [RouterLink, DatePipe, CloseIconComponent, ArrowRightIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <!-- Header -->
      <div
        class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12 mb-8"
      >
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Blog
        </h1>
        <p class="text-slate-600 dark:text-slate-400 text-lg">
          Thoughts on Angular, TypeScript, WebGPU, and building things on the web.
        </p>
      </div>

      <!-- Dev: toggle scheduled posts -->
      @if (isDevMode && scheduledCount()) {
        <button
          (click)="showScheduled.set(!showScheduled())"
          class="mb-4 inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
          [class]="
            showScheduled()
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
              : 'border-slate-600 bg-slate-800/60 text-slate-400 hover:bg-slate-700/60'
          "
        >
          <span
            class="inline-block w-2 h-2 rounded-full"
            [class]="showScheduled() ? 'bg-amber-400' : 'bg-slate-500'"
          ></span>
          {{ showScheduled() ? "Hiding" : "Showing" }} {{ scheduledCount() }} scheduled
        </button>
      }

      <!-- Active tag filter -->
      @if (activeTag()) {
        <div class="flex items-center gap-3 mb-6">
          <span class="text-sm text-slate-600 dark:text-slate-400">Filtered by:</span>
          <button
            (click)="clearTag()"
            class="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-brand/15 dark:bg-brand-light/15 text-brand-dark dark:text-brand-light hover:bg-brand/25 dark:hover:bg-brand-light/25 transition-colors"
          >
            {{ activeTag() }}
            <app-close-icon class="text-[13px]" />
          </button>
        </div>
      }

      <!-- Post list -->
      <div class="space-y-4">
        @for (post of posts(); track post.slug) {
          <a
            [routerLink]="['/blog', post.slug]"
            class="group block rounded-2xl border p-6 sm:p-8 backdrop-blur-md transition-all"
            [class]="
              blog.isScheduled(post)
                ? 'bg-amber-500/5 dark:bg-amber-400/5 border-amber-400/30 dark:border-amber-400/20 hover:border-amber-400/50 dark:hover:border-amber-400/40'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-700/60 hover:border-brand/40 dark:hover:border-brand-light/40 hover:bg-brand/5 dark:hover:bg-brand-light/5'
            "
          >
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex-1 min-w-0">
                <!-- Tags -->
                @if (post.tags.length > 0) {
                  <div class="flex flex-wrap gap-2 mb-3">
                    @for (tag of post.tags; track tag) {
                      <button
                        (click)="filterByTag(tag, $event)"
                        [class]="
                          tag === activeTag()
                            ? 'cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full transition-colors ring-1 ring-inset ring-brand-dark dark:ring-brand-light bg-brand/15 dark:bg-brand-light/15 text-brand-dark dark:text-brand-light'
                            : 'cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full transition-colors bg-brand/8 dark:bg-brand-light/8 text-brand-dark dark:text-brand-light hover:bg-brand/20 dark:hover:bg-brand-light/20'
                        "
                      >
                        {{ tag }}
                      </button>
                    }
                  </div>
                }

                <h2
                  class="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-dark dark:group-hover:text-brand-light transition-colors"
                >
                  {{ post.title }}
                </h2>
                <p class="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {{ post.description }}
                </p>
              </div>

              <!-- Arrow -->
              <app-arrow-right-icon
                class="shrink-0 mt-1 text-[20px] text-slate-300 dark:text-slate-600 group-hover:text-brand-dark dark:group-hover:text-brand-light group-hover:translate-x-1 transition-all"
                aria-hidden="true"
              />
            </div>

            <div
              class="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              @if (blog.isScheduled(post)) {
                <span
                  class="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                  >Unpublished</span
                >
              }
              <span>{{ post.date | date: "longDate" }} &middot; {{ post.readTime }} min read</span>
            </div>
          </a>
        } @empty {
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
/** Filterable blog post listing with tag-based query param navigation. */
export class BlogListComponent {
  protected readonly blog = inject(BlogService);
  protected readonly isDevMode = isDevMode();
  protected readonly showScheduled = signal(false);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      inject(Title).setTitle("Blog — Jelle Bruisten");
      inject(Meta).updateTag({
        name: "description",
        content: "Thoughts on Angular, TypeScript, WebGPU, and building things on the web.",
      });
    }
  }

  protected activeTag = toSignal(this.route.queryParamMap.pipe(map((p) => p.get("tag") ?? "")), {
    initialValue: "",
  });

  protected scheduledCount = computed(
    () => this.blog.getAllPosts().length - this.blog.getPublishedPosts().length,
  );

  protected posts = computed(() => {
    const tag = this.activeTag();
    const all =
      this.isDevMode && this.showScheduled()
        ? this.blog.getAllPosts()
        : this.blog.getPublishedPosts();
    return tag ? all.filter((p) => p.tags.includes(tag)) : all;
  });

  protected filterByTag(tag: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: this.activeTag() === tag ? null : tag },
      queryParamsHandling: "merge",
    });
  }

  protected clearTag(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: null },
      queryParamsHandling: "merge",
    });
  }
}

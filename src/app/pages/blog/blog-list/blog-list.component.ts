import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
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

      <!-- Post list -->
      <div class="space-y-4">
        @for (post of posts; track post.slug) {
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
                      <span class="text-xs font-medium px-2.5 py-1 rounded-full
                                   bg-brand/8 dark:bg-brand-light/8
                                   text-brand-dark dark:text-brand-light">
                        {{ tag }}
                      </span>
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
            No posts yet — check back soon.
          </div>
        }
      </div>
    </div>
  `,
})
export class BlogListComponent {
  private blog = inject(BlogService);
  protected posts = this.blog.getAllPosts();
}

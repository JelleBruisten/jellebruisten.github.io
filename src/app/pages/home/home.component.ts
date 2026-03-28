import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ─── Hero ─────────────────────────────────────────────────────────── -->
    <section
      class="flex items-center justify-center min-h-[calc(100svh-4rem)] px-4 py-20"
      aria-label="Introduction">
      <div class="text-center max-w-4xl">

        <p class="text-xs font-semibold tracking-[0.25em] uppercase
                   text-brand/70 dark:text-brand-light/70 mb-5">
          Based in the Netherlands
        </p>

        <h1 class="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none mb-6
                   text-slate-900 dark:text-white">
          Jelle
          <span class="bg-linear-to-r from-brand to-brand-dark bg-clip-text text-transparent
                        dark:from-brand-light dark:to-brand">
            &nbsp;Bruisten
          </span>
        </h1>

        <p class="text-lg sm:text-xl text-slate-600 dark:text-slate-300
                   max-w-2xl mx-auto mb-10 leading-relaxed">
          Frontend Architect. Angular enthusiast, open source contributor,
          and maker of things on the web.
        </p>

        <!-- CTAs -->
        <div class="flex flex-wrap gap-4 justify-center">
          <a href="https://github.com/JelleBruisten"
             target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    bg-slate-900 dark:bg-white text-white dark:text-slate-900
                    hover:bg-slate-700 dark:hover:bg-slate-100
                    transition-all hover:scale-105 active:scale-95 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                 fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>

          <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/"
             target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    border-2 border-brand/30 dark:border-brand-light/30
                    text-brand dark:text-brand-light
                    hover:bg-brand/8 dark:hover:bg-brand-light/8
                    transition-all hover:scale-105 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                 fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>

          <a routerLink="/about"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    border border-slate-300/80 dark:border-slate-600/80
                    text-slate-700 dark:text-slate-300
                    hover:bg-slate-100/80 dark:hover:bg-slate-800/60
                    transition-all hover:scale-105 active:scale-95">
            About me
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
        </div>

        <!-- Scroll hint -->
        <div class="mt-20 flex justify-center opacity-30 animate-bounce" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"
               class="text-slate-600 dark:text-slate-300">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- ─── Latest Posts ───────────────────────────────────────────────────── -->
    @if (latestPosts.length > 0) {
      <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-24" aria-labelledby="posts-heading">
        <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12">

          <div class="flex items-center justify-between mb-8">
            <h2 id="posts-heading" class="text-2xl font-bold text-slate-900 dark:text-white">
              Latest Posts
            </h2>
            <a routerLink="/blog"
               class="text-sm font-medium text-brand dark:text-brand-light hover:underline
                      flex items-center gap-1">
              View all
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </a>
          </div>

          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (post of latestPosts; track post.slug) {
              <a [routerLink]="['/blog', post.slug]"
                 class="group block p-6 rounded-xl
                        border border-slate-200/80 dark:border-slate-700/80
                        bg-slate-50/50 dark:bg-slate-800/40
                        hover:border-brand/40 dark:hover:border-brand-light/40
                        hover:bg-brand/5 dark:hover:bg-brand-light/5
                        transition-all">
                <div class="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                  {{ post.date | date:'mediumDate' }} &middot; {{ post.readTime }} min read
                </div>
                <h3 class="font-semibold text-slate-900 dark:text-white mb-2
                           group-hover:text-brand dark:group-hover:text-brand-light transition-colors">
                  {{ post.title }}
                </h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {{ post.description }}
                </p>
              </a>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class HomeComponent {
  private blog = inject(BlogService);
  protected latestPosts = this.blog.getAllPosts().slice(0, 3);
}

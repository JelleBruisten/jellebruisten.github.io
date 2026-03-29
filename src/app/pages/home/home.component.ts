import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, isPlatformServer } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { BlogService } from '../../services/blog.service';
import { GithubIconComponent } from '../../shared/icons/github-icon.component';
import { LinkedinIconComponent } from '../../shared/icons/linkedin-icon.component';
import { ArrowRightIconComponent } from '../../shared/icons/arrow-right-icon.component';
import { ChevronDownIconComponent } from '../../shared/icons/chevron-down-icon.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, GithubIconComponent, LinkedinIconComponent, ArrowRightIconComponent, ChevronDownIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ─── Hero ─────────────────────────────────────────────────────────── -->
    <section
      class="flex items-center justify-center min-h-[calc(100svh-4rem)] px-4 py-20"
      aria-label="Introduction">
      <div class="text-center max-w-4xl">

        <p class="text-xs font-semibold tracking-[0.25em] uppercase
                   text-brand-dark dark:text-brand-light mb-5">
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
          Frontend Architect. Angular enthusiast, web platform tinkerer,
          and open source contributor.
        </p>

        <!-- CTAs -->
        <div class="flex flex-wrap gap-4 justify-center">
          <a href="https://github.com/JelleBruisten"
             target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    bg-slate-900 dark:bg-white text-white dark:text-slate-900
                    hover:bg-slate-700 dark:hover:bg-slate-100
                    transition-all hover:scale-105 active:scale-95 shadow-lg">
            <app-github-icon class="text-[18px]" />
            GitHub
          </a>

          <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/"
             target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    bg-brand-dark text-white dark:bg-brand-light dark:text-slate-900
                    hover:brightness-110 dark:hover:brightness-90
                    transition-all hover:scale-105 active:scale-95 shadow-lg">
            <app-linkedin-icon class="text-[18px]" />
            LinkedIn
          </a>

          <a routerLink="/about"
             class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                    bg-slate-200 dark:bg-slate-700
                    text-slate-800 dark:text-slate-100
                    hover:bg-slate-300 dark:hover:bg-slate-600
                    transition-all hover:scale-105 active:scale-95 shadow-md">
            About me
            <app-arrow-right-icon class="text-[16px]" />
          </a>
        </div>

        <!-- Scroll hint -->
        <div class="mt-20 flex justify-center opacity-30 animate-bounce text-slate-600 dark:text-slate-300" aria-hidden="true">
          <app-chevron-down-icon class="text-[22px]" />
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
               class="text-sm font-medium text-brand-dark dark:text-brand-light hover:underline
                      flex items-center gap-1">
              View all
              <app-arrow-right-icon class="text-[14px]" />
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
                <div class="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">
                  {{ post.date | date:'mediumDate' }} &middot; {{ post.readTime }} min read
                </div>
                <h3 class="font-semibold text-slate-900 dark:text-white mb-2
                           group-hover:text-brand-dark dark:group-hover:text-brand-light transition-colors">
                  {{ post.title }}
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
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
/** Landing page with hero section, call-to-action links, and the latest 3 blog posts. */
export class HomeComponent {
  private blog = inject(BlogService);
  protected latestPosts = this.blog.getAllPosts().slice(0, 3);

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      inject(Title).setTitle('Jelle Bruisten — Frontend Architect');
      inject(Meta).updateTag({ name: 'description', content: 'Frontend Architect based in the Netherlands. Angular enthusiast, open source contributor, and maker of things on the web.' });
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { GithubIconComponent } from '../../shared/icons/github-icon.component';
import { LinkedinIconComponent } from '../../shared/icons/linkedin-icon.component';
import { ArrowRightIconComponent } from '../../shared/icons/arrow-right-icon.component';

const skills = [
  { name: 'Angular', level: 'Expert' },
  { name: 'TypeScript', level: 'Expert' },
  { name: 'RxJS', level: 'Expert' },
  { name: 'NgRx / Signals Store', level: 'Advanced' },
  { name: 'NX Monorepos', level: 'Advanced' },
  { name: 'Angular Material', level: 'Advanced' },
  { name: 'WebGL / WebGPU', level: 'Intermediate' },
  { name: 'Transloco (i18n)', level: 'Advanced' },
  { name: 'Tailwind CSS', level: 'Advanced' }
];

const contributions = [
  {
    name: 'angular/angular',
    description: 'The modern web developer platform — core framework contributions.',
    url: 'https://github.com/angular/angular',
  },
  {
    name: 'ngrx/platform',
    description: 'Reactive state management for Angular apps using NgRx.',
    url: 'https://github.com/ngrx/platform',
  },
  {
    name: 'ng-matero/extensions',
    description: 'Angular Material Extensions library.',
    url: 'https://github.com/ng-matero/extensions',
  },
];

@Component({
  selector: 'app-about',
  imports: [RouterLink, GithubIconComponent, LinkedinIconComponent, ArrowRightIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      <!-- ─── Bio card ──────────────────────────────────────────────────── -->
      <section class="mb-16" aria-labelledby="bio-heading">
        <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl
                    border border-slate-200/80 dark:border-slate-700/80 p-8 sm:p-12">

          <h1 id="bio-heading"
              class="text-4xl sm:text-5xl font-bold tracking-tight
                     text-slate-900 dark:text-white mb-6">
            About me
          </h1>

          <div class="prose dark:prose-invert max-w-none
                      text-slate-700 dark:text-slate-300 leading-relaxed space-y-4">
            <p>
              Hi, I'm <strong class="text-slate-900 dark:text-white">Jelle</strong> — a frontend architect
              based in the <strong class="text-slate-900 dark:text-white">Netherlands</strong>
              with a deep focus on the Angular ecosystem. I've been building Angular
              applications since the early AngularJS days and have watched the framework
              grow into something genuinely remarkable.
            </p>
            <p>
              As a software architect my day-to-day work involves defining frontend architecture
              for large-scale Angular applications — thinking hard about reactivity, change
              detection, state management, and developer experience. I'm particularly excited
              by Angular Signals and the zoneless future they're enabling.
            </p>
            <p>
              Outside of my professional work, I stay close to the craft by exploring
              emerging technologies, contributing to open source where I can, and
              building personal projects along the way.
            </p>
            <p>
              When I'm not writing TypeScript, I'm probably pushing pixels with WebGL
              or WebGPU shaders — as evidenced by the animated background on this site.
            </p>
          </div>

          <div class="mt-8 flex flex-wrap gap-4">
            <a href="https://github.com/JelleBruisten"
               target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
                      bg-slate-900 dark:bg-white text-white dark:text-slate-900
                      hover:bg-slate-700 dark:hover:bg-slate-100
                      transition-all hover:scale-105 active:scale-95 shadow-md">
              <app-github-icon class="text-[16px]" />
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/"
               target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
                      border border-brand-dark/60 dark:border-brand-light/60
                      text-brand-dark dark:text-brand-light
                      hover:bg-brand/12 dark:hover:bg-brand-light/12
                      transition-all hover:scale-105 active:scale-95">
              <app-linkedin-icon class="text-[16px]" />
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      <!-- ─── Skills ────────────────────────────────────────────────────── -->
      <section class="mb-16" aria-labelledby="skills-heading">
        <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12">
          <h2 id="skills-heading"
              class="text-2xl font-bold text-slate-900 dark:text-white mb-8">
            Skills & Technologies
          </h2>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (skill of skills; track skill.name) {
              <div class="flex items-center justify-between p-3 rounded-xl
                          bg-slate-50/80 dark:bg-slate-800/60
                          border border-slate-200/60 dark:border-slate-700/60">
                <span class="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {{ skill.name }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                      [class]="levelClass(skill.level)">
                  {{ skill.level }}
                </span>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ─── Open Source ───────────────────────────────────────────────── -->
      <section class="mb-16" aria-labelledby="oss-heading">
        <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12">
          <h2 id="oss-heading"
              class="text-2xl font-bold text-slate-900 dark:text-white mb-8">
            Open Source
          </h2>

          <div class="space-y-4">
            @for (contrib of contributions; track contrib.name) {
              <a [href]="contrib.url" target="_blank" rel="noopener noreferrer"
                 class="group flex items-start gap-4 p-4 rounded-xl
                        border border-slate-200/80 dark:border-slate-700/80
                        bg-slate-50/50 dark:bg-slate-800/40
                        hover:border-brand/40 dark:hover:border-brand-light/40
                        hover:bg-brand/5 dark:hover:bg-brand-light/5
                        transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round"
                     class="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500
                            group-hover:text-brand-dark dark:group-hover:text-brand-light transition-colors"
                     aria-hidden="true">
                  <path d="m9 9-2 3h10l-2-3"/><rect width="6" height="6" x="9" y="3" rx="1"/>
                  <path d="M12 15v6"/><path d="M6 21h12"/>
                </svg>
                <div>
                  <div class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200
                               group-hover:text-brand-dark dark:group-hover:text-brand-light transition-colors">
                    {{ contrib.name }}
                  </div>
                  <div class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ contrib.description }}
                  </div>
                </div>
              </a>
            }
            <p class="text-sm text-slate-500 dark:text-slate-400 pt-2">
              …among others.
            </p>
          </div>
        </div>
      </section>

      <!-- ─── CTA ───────────────────────────────────────────────────────── -->
      <div class="text-center">
        <p class="text-slate-600 dark:text-slate-400 mb-4">
          Want to see what I've been writing about?
        </p>
        <a routerLink="/blog"
           class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                  bg-brand-dark text-white hover:brightness-90
                  transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-dark/25">
          Read the blog
          <app-arrow-right-icon class="text-[16px]" />
        </a>
      </div>

    </div>
  `,
})
/** About page featuring bio, skills grid, and open-source contributions. */
export class AboutComponent {
  protected skills = skills;
  protected contributions = contributions;

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      inject(Title).setTitle('About — Jelle Bruisten');
      inject(Meta).updateTag({ name: 'description', content: 'Frontend Architect based in the Netherlands with a deep focus on the Angular ecosystem. Open source contributor to Angular, NgRx, and more.' });
    }
  }

  protected levelClass(level: string): string {
    switch (level) {
      case 'Expert':       return 'bg-brand/10 text-brand-dark dark:bg-brand-light/10 dark:text-brand-light';
      case 'Advanced':     return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'Intermediate': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      default:             return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    }
  }
}

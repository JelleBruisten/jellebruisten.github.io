import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
    name: 'jsverse/transloco',
    description: 'The internationalisation library for Angular.',
    url: 'https://github.com/jsverse/transloco',
  },
  {
    name: 'nrwl/nx',
    description: 'Smart, fast and extensible build system for monorepos.',
    url: 'https://github.com/nrwl/nx',
  },
  {
    name: 'ng-matero/extensions',
    description: 'Angular Material Extensions library.',
    url: 'https://github.com/ng-matero/extensions',
  },
];

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      <!-- ─── Bio card ──────────────────────────────────────────────────── -->
      <section class="mb-16" aria-labelledby="bio-heading">
        <div class="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl
                    border border-slate-200/60 dark:border-slate-700/60 p-8 sm:p-12">

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
              Beyond my professional work, I contribute to open source projects across
              the Angular ecosystem: the framework itself, NgRx, Transloco, NX, and
              Angular Material.
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/"
               target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
                      border border-brand-dark/30 dark:border-brand-light/30
                      text-brand-dark dark:text-brand-light
                      hover:bg-brand/8 dark:hover:bg-brand-light/8
                      transition-all hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </a>
      </div>

    </div>
  `,
})
export class AboutComponent {
  protected skills = skills;
  protected contributions = contributions;

  protected levelClass(level: string): string {
    switch (level) {
      case 'Expert':       return 'bg-brand/10 text-brand-dark dark:bg-brand-light/10 dark:text-brand-light';
      case 'Advanced':     return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'Intermediate': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      default:             return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    }
  }
}

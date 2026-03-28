import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BackgroundService } from '../../graphics/background.service';
import { SettingsService } from '../../settings/setting.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    nav {
      position: sticky;
      top: 0;
      z-index: 50;
      border-bottom: 1px solid rgba(148,163,184,0.2);
      background: rgba(2,6,23,0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .nav-inner {
      max-width: 72rem;
      margin: 0 auto;
      padding: 0 1.5rem;
      height: 4rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-logo {
      font-weight: 700;
      font-size: 0.9375rem;
      letter-spacing: -0.025em;
      color: #fff;
      text-decoration: none;
    }
    .nav-logo:hover { color: var(--color-brand-light, oklch(0.72 0.17 272)); }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .nav-link {
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(148,163,184,1);
      text-decoration: none;
      transition: color 0.15s, background 0.15s;
    }
    .nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
    .nav-link.active { color: oklch(0.72 0.17 272); }
    .nav-icon-link {
      padding: 0.5rem;
      border-radius: 0.5rem;
      color: rgba(148,163,184,1);
      text-decoration: none;
      display: flex;
      align-items: center;
      transition: color 0.15s, background 0.15s;
    }
    .nav-icon-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
    .theme-btn {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: transparent;
      border: none;
      color: rgba(148,163,184,1);
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }
    .theme-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
    .theme-btn:focus-visible { outline: 2px solid oklch(0.62 0.19 272); outline-offset: 2px; }
  `],
  template: `
    <nav aria-label="Main navigation">
      <div class="nav-inner">
        <a routerLink="/" class="nav-logo">Jelle Bruisten</a>
        <div class="nav-links">
          <a routerLink="/about" routerLinkActive="active" class="nav-link">About</a>
          <a routerLink="/blog" routerLinkActive="active" class="nav-link">Blog</a>
          <!-- Dark / light toggle -->
          <button class="theme-btn"
                  (click)="toggleDark()"
                  [attr.aria-label]="settings.effectiveDark() ? 'Switch to light mode' : 'Switch to dark mode'">
            @if (settings.effectiveDark()) {
              <!-- Sun icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            } @else {
              <!-- Moon icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            }
          </button>
          <a href="https://github.com/JelleBruisten" target="_blank" rel="noopener noreferrer"
             aria-label="GitHub profile" class="nav-icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/" target="_blank" rel="noopener noreferrer"
             aria-label="LinkedIn profile" class="nav-icon-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  protected readonly settings = inject(SettingsService);
  private readonly bgService = inject(BackgroundService);

  protected toggleDark(): void {
    this.settings.dark.set(this.settings.effectiveDark() ? 1 : 2);

    const idealBg = this.settings.effectiveDark() ? 'aurora' : 'particles';
    if (this.bgService.name() === idealBg) return;

    const choice = this.settings.bgSwapChoice();
    if (choice === 'always') {
      this.bgService.name.set(idealBg);
    } else if (choice === 'ask') {
      this.bgService.showBgSwapPrompt.set(true);
    }
  }
}

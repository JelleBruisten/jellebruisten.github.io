import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsService } from '../../settings/setting.service';
import { GithubIconComponent } from '../../shared/icons/github-icon.component';
import { LinkedinIconComponent } from '../../shared/icons/linkedin-icon.component';
import { SunIconComponent } from '../../shared/icons/sun-icon.component';
import { MoonIconComponent } from '../../shared/icons/moon-icon.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, GithubIconComponent, LinkedinIconComponent, SunIconComponent, MoonIconComponent],
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
              <app-sun-icon class="text-[18px]" />
            } @else {
              <app-moon-icon class="text-[18px]" />
            }
          </button>
          <a href="https://github.com/JelleBruisten" target="_blank" rel="noopener noreferrer"
             aria-label="GitHub profile" class="nav-icon-link text-[18px]">
            <app-github-icon />
          </a>
          <a href="https://www.linkedin.com/in/jelle-bruisten-a891a545/" target="_blank" rel="noopener noreferrer"
             aria-label="LinkedIn profile" class="nav-icon-link text-[18px]">
            <app-linkedin-icon />
          </a>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  protected readonly settings = inject(SettingsService);

  protected toggleDark(): void {
    this.settings.dark.set(this.settings.effectiveDark() ? 1 : 2);
  }
}

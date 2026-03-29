import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID, Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import axe from 'axe-core';

import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { BlogListComponent } from './blog/blog-list/blog-list.component';
import { BlogPostComponent } from './blog/blog-post/blog-post.component';

async function expectAccessible(component: Type<unknown>) {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();

  const results = await axe.run(fixture.nativeElement);
  const violations = results.violations.map(
    v => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`
  );
  expect(violations, `Accessibility violations:\n${violations.join('\n')}`).toHaveLength(0);
}

describe('Accessibility (axe-core)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, AboutComponent, NotFoundComponent, BlogListComponent, BlogPostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
  });

  it('HomeComponent should have no a11y violations', async () => {
    await expectAccessible(HomeComponent);
  });

  it('AboutComponent should have no a11y violations', async () => {
    await expectAccessible(AboutComponent);
  });

  it('NotFoundComponent should have no a11y violations', async () => {
    await expectAccessible(NotFoundComponent);
  });

  it('BlogListComponent should have no a11y violations', async () => {
    await expectAccessible(BlogListComponent);
  });

  it('BlogPostComponent should have no a11y violations', async () => {
    await expectAccessible(BlogPostComponent);
  });
});

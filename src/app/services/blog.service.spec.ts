import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BlogService } from './blog.service';

describe('BlogService', () => {
  let service: BlogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BlogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAllPosts', () => {
    it('should return an array of posts', () => {
      const posts = service.getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
    });

    it('should have required fields on every post', () => {
      for (const post of service.getAllPosts()) {
        expect(post.slug).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.date).toBeTruthy();
        expect(post.tags).toBeDefined();
        expect(post.readTime).toBeGreaterThan(0);
      }
    });
  });

  describe('getPost', () => {
    it('should return a post by slug', () => {
      const first = service.getAllPosts()[0];
      const post = service.getPost(first.slug);
      expect(post).toBeDefined();
      expect(post!.slug).toBe(first.slug);
    });

    it('should return undefined for unknown slug', () => {
      expect(service.getPost('nonexistent-slug-xyz')).toBeUndefined();
    });
  });

  describe('getPostContent', () => {
    it('should fetch content for a given slug', () => {
      const slug = 'test-post';
      const mockContent = '<p>Hello world</p>';

      service.getPostContent(slug).subscribe(content => {
        expect(content).toBe(mockContent);
      });

      const req = httpMock.expectOne(`./content/blog/${slug}.json`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: mockContent });
    });

    it('should return null on HTTP error', () => {
      service.getPostContent('bad-slug').subscribe(content => {
        expect(content).toBeNull();
      });

      const req = httpMock.expectOne('./content/blog/bad-slug.json');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });
});

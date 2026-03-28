import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { BLOG_POSTS, BlogPost } from '../../generated/blog-data';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly http = inject(HttpClient);

  getAllPosts(): BlogPost[] {
    return BLOG_POSTS;
  }

  getPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find(p => p.slug === slug);
  }

  getPostContent(slug: string): Observable<string> {
    return this.http
      .get<{ content: string }>(`./content/blog/${slug}.json`)
      .pipe(map(r => r.content));
  }
}

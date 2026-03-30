import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, of } from "rxjs";
import { BLOG_POSTS, BlogPost } from "../../generated/blog-data";

/**
 * Provides access to blog post metadata and content.
 *
 * Metadata is imported statically from the build-time generated `blog-data.ts`,
 * while post HTML content is fetched lazily via HTTP to keep the initial bundle small.
 *
 * Posts with a future date are hidden from listings in production but remain
 * accessible via direct URL.
 */
@Injectable({ providedIn: "root" })
export class BlogService {
  private readonly http = inject(HttpClient);

  getAllPosts(): BlogPost[] {
    return BLOG_POSTS;
  }

  getPublishedPosts(): BlogPost[] {
    const today = new Date().toISOString().split("T")[0];
    return BLOG_POSTS.filter((p) => p.date <= today);
  }

  isScheduled(post: BlogPost): boolean {
    const today = new Date().toISOString().split("T")[0];
    return post.date > today;
  }

  getPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find((p) => p.slug === slug);
  }

  getPostContent(slug: string): Observable<string | null> {
    return this.http.get<{ content: string }>(`./content/blog/${slug}.json`).pipe(
      map((r) => r.content),
      catchError(() => of(null)),
    );
  }
}

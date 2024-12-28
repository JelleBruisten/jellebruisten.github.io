import { Injectable } from '@angular/core';
import { BLOG_POSTS, BlogPost } from '../../generated/blog-data';

@Injectable({ providedIn: 'root' })
export class BlogService {
  getAllPosts(): BlogPost[] {
    return BLOG_POSTS;
  }

  getPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find(p => p.slug === slug);
  }
}

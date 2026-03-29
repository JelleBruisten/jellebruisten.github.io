import { RenderMode, ServerRoute } from "@angular/ssr";
import { BLOG_POSTS } from "../generated/blog-data";

export const serverRoutes: ServerRoute[] = [
  { path: "", renderMode: RenderMode.Prerender },
  { path: "about", renderMode: RenderMode.Prerender },
  { path: "blog", renderMode: RenderMode.Prerender },
  {
    path: "blog/:slug",
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return BLOG_POSTS.map((p: { slug: string }) => ({ slug: p.slug }));
    },
  },
  { path: "**", renderMode: RenderMode.Client },
];

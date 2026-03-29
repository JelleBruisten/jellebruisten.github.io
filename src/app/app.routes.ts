import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "about",
    loadComponent: () => import("./pages/about/about.component").then((m) => m.AboutComponent),
  },
  {
    path: "blog",
    loadComponent: () =>
      import("./pages/blog/blog-list/blog-list.component").then((m) => m.BlogListComponent),
  },
  {
    path: "blog/:slug",
    loadComponent: () =>
      import("./pages/blog/blog-post/blog-post.component").then((m) => m.BlogPostComponent),
  },
  {
    path: "**",
    loadComponent: () =>
      import("./pages/not-found/not-found.component").then((m) => m.NotFoundComponent),
  },
];

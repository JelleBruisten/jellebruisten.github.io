# jellebruisten.nl

Personal site and blog built with Angular 21, featuring an animated WebGPU/WebGL background, a static blog compiled at build time, and a tag-filterable post list.

## Stack

- **Angular 21.2** — zoneless change detection, SSR, signals throughout
- **Tailwind CSS 4** — utility-first styling
- **WebGPU / WebGL 2** — dual-backend shader system with Web Worker offscreen rendering
- **Shiki** — build-time syntax highlighting (light + dark themes)
- **Marked + gray-matter** — Markdown parsing and frontmatter extraction
- **Mermaid** — runtime diagram rendering in blog posts
- **GitHub Actions → GitHub Pages** — automated deploy on push to `main`

## Dev

```bash
npm start         # dev server at localhost:4200
npm run build     # generate blog data + Angular build
npm run build:blog  # blog generation only (scripts/build-blog.mjs)
npm test          # Karma + Jasmine
```

## Shader system

Each visit shows a deterministic daily background — one of six active shaders (aurora, particles, perlin, snow, shapes, ocean) picked by day of year.

Every shader ships as both GLSL and WGSL. At runtime the system picks WebGPU if available, otherwise falls back to WebGL 2. Where `OffscreenCanvas` is supported the render loop runs entirely on a Web Worker, keeping the main thread free.

Shaders receive three uniforms: `iResolution`, `iTime`, and `iDarkmode`. Resolution is halved on mobile.

## Blog

Blog posts live in `src/content/blog/` as Markdown with YAML frontmatter. The build script (`scripts/build-blog.mjs`) compiles them into `src/generated/blog-data.ts` — a single TypeScript constant that gets tree-shaken into the bundle. No HTTP calls at runtime. Syntax highlighting, read time, and route generation all happen at build time.

Posts can be hidden with `enabled: false` in frontmatter. Tags are filterable via URL query params (`/blog?tag=angular`).

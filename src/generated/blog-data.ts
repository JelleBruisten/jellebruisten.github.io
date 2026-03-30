// AUTO-GENERATED — do not edit manually.
// Run: node scripts/build-blog.mjs  (or npm run build:blog)

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readTime: number;
  enabled: boolean;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "shader-background-system",
    title: "Behind the Background: How This Site's Shader System Works",
    date: "2026-03-28",
    description:
      "Every visit to this site runs a different animated shader in the background. Here's how the system works: WebGL and WebGPU support, Web Worker offloading, dark mode as a uniform, and a tour of the shaders themselves.",
    tags: ["webgl", "webgpu", "shaders", "graphics", "typescript"],
    readTime: 7,
    enabled: true,
  },
  {
    slug: "webgpu-in-the-browser",
    title: "WebGPU in the Browser: A Practical Guide",
    date: "2026-03-14",
    description:
      "WebGPU is the successor to WebGL, bringing compute shaders and modern GPU APIs to the web. Here's how to set one up from scratch — no game engine required.",
    tags: ["webgpu", "graphics", "typescript"],
    readTime: 5,
    enabled: true,
  },
  {
    slug: "getting-started-with-angular-signals",
    title: "Catching Up With Angular Signals",
    date: "2026-01-14",
    description:
      "Never touched signals? Been away for a while? This guide walks you through everything from the basics to model(), linkedSignal, and signal queries, with before-and-after comparisons throughout.",
    tags: ["angular", "signals", "typescript"],
    readTime: 9,
    enabled: true,
  },
  {
    slug: "rxjs-subscription-management",
    title: "RxJS Subscriptions in Angular: Stop Leaking, Start Thinking Reactively",
    date: "2025-12-05",
    description:
      "From async pipe to takeUntilDestroyed: a practical guide to every subscription pattern in modern Angular, with the pitfalls nobody warns you about.",
    tags: ["angular", "rxjs", "typescript"],
    readTime: 7,
    enabled: true,
  },
  {
    slug: "web-security-cookies",
    title: "Web Security for Angular Developers, Part 4: Cookie Security",
    date: "2025-11-21",
    description:
      "Cookie flags and prefixes are a small surface area with a big impact on session security. Here's what HttpOnly, Secure, SameSite, and cookie prefixes actually enforce.",
    tags: ["security", "http", "cookies"],
    readTime: 5,
    enabled: true,
  },
  {
    slug: "web-security-http-headers",
    title: "Web Security for Angular Developers, Part 3: HTTP Security Headers",
    date: "2025-11-07",
    description:
      "A handful of HTTP response headers dramatically reduce your attack surface. Here's what HSTS, COOP, COEP, Referrer-Policy, and Permissions-Policy actually do and why each one matters.",
    tags: ["security", "http"],
    readTime: 5,
    enabled: true,
  },
  {
    slug: "web-security-csp-trusted-types",
    title: "Web Security for Angular Developers, Part 2: CSP & Trusted Types",
    date: "2025-10-24",
    description:
      "Content Security Policy tells the browser what it's allowed to load and execute. Trusted Types close the DOM XSS gap entirely. Here's how both work and how Angular integrates with them.",
    tags: ["security", "csp", "typescript"],
    readTime: 7,
    enabled: true,
  },
  {
    slug: "web-security-xss-angular",
    title: "Web Security for Angular Developers, Part 1: XSS",
    date: "2025-10-10",
    description:
      "XSS is still the most common web vulnerability. Here's how it works, what Angular protects you from automatically, and where you still need to think for yourself.",
    tags: ["angular", "security", "typescript"],
    readTime: 5,
    enabled: true,
  },
];

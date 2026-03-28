#!/usr/bin/env node
/**
 * Blog build script — run before `ng build`.
 * Reads markdown from src/content/blog/, converts to HTML,
 * then generates:
 *   src/generated/blog-data.ts  — metadata only (no content), imported by Angular
 *   public/content/blog/{slug}.json — individual post content, loaded on demand
 *   routes.txt                  — consumed by Angular prerender
 *   public/sitemap.xml          — SEO sitemap
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { createHighlighter } from 'shiki';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const contentDir   = join(root, 'src', 'content', 'blog');
const generatedDir = join(root, 'src', 'generated');
const blogContentDir = join(root, 'public', 'content', 'blog');
const routesFile   = join(root, 'routes.txt');
const sitemapFile  = join(root, 'public', 'sitemap.xml');

const SITE_URL = 'https://jellebruisten.nl';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildBlog() {
  await mkdir(generatedDir, { recursive: true });
  await mkdir(blogContentDir, { recursive: true });

  // Shiki: build-time syntax highlighting, dual light/dark themes
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [
      'typescript', 'javascript', 'tsx', 'jsx',
      'css', 'scss', 'html', 'json', 'yaml', 'markdown',
      'bash', 'shell', 'python', 'rust', 'go', 'sql',
      'glsl', 'diff', 'text',
    ],
  });

  const loadedLangs = new Set(highlighter.getLoadedLanguages());

  // Custom renderer: shiki for code blocks, passthrough for mermaid
  const renderer = {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        // Left as-is for mermaid.js to process at runtime
        return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
      }
      const safeLang = (lang && loadedLangs.has(lang)) ? lang : 'text';
      try {
        return highlighter.codeToHtml(text, {
          lang: safeLang,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        });
      } catch {
        return `<pre><code>${escapeHtml(text)}</code></pre>\n`;
      }
    },
  };

  marked.use({ renderer });

  const files = (await readdir(contentDir)).filter(f => f.endsWith('.md'));

  const posts = await Promise.all(files.map(async (file) => {
    const raw = await readFile(join(contentDir, file), 'utf-8');
    const { data, content } = matter(raw);
    const html = await marked.parse(content);
    const slug = file.replace(/\.md$/, '');
    const words = content.trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.round(words / 200));

    return {
      slug,
      title:       data.title ?? slug,
      date:        data.date
        ? (data.date instanceof Date
            ? data.date.toISOString().split('T')[0]
            : String(data.date).split('T')[0])
        : new Date().toISOString().split('T')[0],
      description: data.description ?? '',
      tags:        Array.isArray(data.tags) ? data.tags : [],
      readTime,
      content:     html,
      enabled:     data.enabled !== false, // default true; set enabled: false to hide
    };
  }));

  // Filter out disabled posts, then sort newest first
  const enabled = posts.filter(p => p.enabled);
  enabled.sort((a, b) => b.date.localeCompare(a.date));

  // Write individual content JSON files
  await Promise.all(enabled.map(post =>
    writeFile(
      join(blogContentDir, `${post.slug}.json`),
      JSON.stringify({ content: post.content }),
      'utf-8'
    )
  ));

  // Generate TypeScript — metadata only, no content
  const metadata = enabled.map(({ content, ...meta }) => meta);
  const ts = [
    '// AUTO-GENERATED — do not edit manually.',
    '// Run: node scripts/build-blog.mjs  (or npm run build:blog)',
    '',
    'export interface BlogPost {',
    '  slug: string;',
    '  title: string;',
    '  date: string;',
    '  description: string;',
    '  tags: string[];',
    '  readTime: number;',
    '  enabled: boolean;',
    '}',
    '',
    `export const BLOG_POSTS: BlogPost[] = ${JSON.stringify(metadata, null, 2)};`,
    '',
  ].join('\n');

  await writeFile(join(generatedDir, 'blog-data.ts'), ts, 'utf-8');

  // Generate routes.txt for Angular prerender
  const routes = ['/', '/about', '/blog', ...enabled.map(p => `/blog/${p.slug}`)];
  await writeFile(routesFile, routes.join('\n') + '\n', 'utf-8');

  // Generate sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    { path: '/',        priority: '1.0', changefreq: 'monthly' },
    { path: '/about',  priority: '0.8', changefreq: 'monthly' },
    { path: '/blog',   priority: '0.9', changefreq: 'weekly'  },
  ];
  const urlEntries = [
    ...staticPages.map(({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`),
    ...enabled.map(p => `
  <url>
    <loc>${SITE_URL}/blog/${p.slug}/</loc>
    <lastmod>${p.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries.join('')}
</urlset>\n`;
  await writeFile(sitemapFile, sitemap, 'utf-8');

  console.log(`✓ Blog: generated ${enabled.length} posts (${posts.length - enabled.length} disabled)`);
  console.log(`✓ Content: ${enabled.length} JSON files written to public/content/blog/`);
  console.log(`✓ Routes: ${routes.length} routes written to routes.txt`);
  console.log(`✓ Sitemap: ${staticPages.length + enabled.length} URLs written to public/sitemap.xml`);
}

buildBlog().catch((err) => {
  console.error('Blog build failed:', err);
  process.exit(1);
});

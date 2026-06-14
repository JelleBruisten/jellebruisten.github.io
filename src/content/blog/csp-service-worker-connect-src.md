---
title: "Service Workers and CSP: A Hidden Catch"
date: "2026-06-14"
description: "You add a Content Security Policy, test it locally, everything works. Then you deploy and images stop loading — but only sometimes. Here's why service workers quietly change how CSP directives apply."
tags: ["security", "csp", "angular", "service-worker"]
---

You add a Content Security Policy to your application. You test it locally — scripts load, styles apply, images come through from your CDN. Everything looks good. You deploy.

Then the reports start coming in. Images not loading. Not on every page visit, and not for everyone — just intermittently, and seemingly only in production. You open DevTools and find a CSP violation in the console:

```
Refused to connect to 'https://cdn.example.com/images/hero.webp' because it
violates the following Content Security Policy directive: "connect-src 'self'".
```

`connect-src`. For an image. You have `img-src` configured correctly — `cdn.example.com` is right there in the policy. So why is the browser complaining about `connect-src`?

The answer is your service worker.

## How Service Workers Change the Equation

When a service worker intercepts a request, it has two options: serve the response from cache, or re-fetch it from the network. That re-fetch uses `fetch()` — and `fetch()` is a programmatic network connection, governed by `connect-src`, not `img-src`.

- An `<img src="...">` tag triggers an image request. The browser evaluates it against `img-src`.
- A `fetch('...')` call inside a service worker triggers a network connection. The browser evaluates it against `connect-src`.

A service worker that intercepts requests is effectively turning every resource load into a fetch. Your `img-src` allowlist becomes irrelevant the moment that happens.

```javascript
// a typical cache-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached ?? fetch(event.request); // governed by connect-src
    }),
  );
});
```

When the cache misses and the service worker calls `fetch(event.request)` for `https://cdn.example.com/images/hero.webp`, the browser checks `connect-src`. The CDN is listed in `img-src` but not `connect-src` — blocked.

This also explains why the failure is intermittent. On the first visit, the service worker is not yet controlling the page, so `<img>` requests go directly through the browser and `img-src` applies. On subsequent visits, once the worker is controlling the page, the same requests go through `fetch()` — hitting `connect-src` instead.

## The Rule: connect-src

`img-src`, `font-src`, and `media-src` are _document-level_ directives — they govern what the browser loads based on HTML elements. `connect-src` is the _code-level_ directive — it governs programmatic network connections made by JavaScript.

Service workers sit in between. The moment a resource request passes through `fetch()` in a service worker, it moves from document-level to code-level — regardless of what kind of resource it is.

| Initiated by                                       | Directive checked |
| -------------------------------------------------- | ----------------- |
| `<img src="...">` without SW                       | `img-src`         |
| `<img src="...">` with SW intercepting → `fetch()` | `connect-src`     |
| `fetch()` in app code                              | `connect-src`     |

The rule: if any origin is reachable through a service worker, it needs to be in `connect-src`.

## The Fix

There are two approaches — the second with a variation.

**Option 1: Don't send the CSP header for the service worker script**

The CSP is there to protect the document — it does not need to be set on the service worker script itself. In Angular's case, that script is `ngsw-worker.js`. On your Express server, exclude it before the middleware that sets the `Content-Security-Policy` header:

```typescript
app.get("/ngsw-worker.js", (req, res, next) => {
  // serve the file without the CSP header
  res.sendFile("ngsw-worker.js", { root: "dist/browser" });
});
```

Because this route is registered before any CSP middleware, the response goes out without a `Content-Security-Policy` header attached.

**Option 2a: One policy, updated connect-src**

Keep a single consistent policy for all responses, but add every origin that appears in `img-src`, `font-src`, or `style-src` to `connect-src` as well. The service worker re-fetches those resources through `fetch()`, so they must be allowed there too.

Before:

```http
img-src 'self' https://cdn.example.com;
connect-src 'self' https://api.example.com;
```

After:

```http
img-src 'self' https://cdn.example.com;
connect-src 'self' https://api.example.com https://cdn.example.com;
```

One policy, easier to maintain. The tradeoff is that `connect-src` grows to include origins that are only there because of the service worker.

**Option 2b: Separate policy for the service worker**

Rather than widening the document policy, you can send a tailored CSP on the `ngsw-worker.js` response. The CSP header on the service worker script governs the worker's own execution context — what it is allowed to connect to — independently of the document policy:

```typescript
app.get("/ngsw-worker.js", (req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "connect-src 'self' https://cdn.example.com https://api.example.com",
  );
  res.sendFile("ngsw-worker.js", { root: "dist/browser" });
});
```

This makes the service worker's permissions explicit and separate. The tradeoff is two policies to maintain instead of one.

**Which to choose**

Option 1 (no CSP on the worker) is the simplest. Option 2a (single widened policy) is good if your CSP is straightforward and you want one source of truth. Option 2b (separate policy) is worth the overhead when you want to be deliberate about what the service worker is allowed to reach without touching the document policy.

## Catching This Before It Ships

The service worker path is easy to miss in development because service workers register on first load but only control the page from the second visit onwards. A test run on first load will work fine; the failure only appears once the worker is active.

A few practices that help:

**Test with the service worker active.** In Chrome DevTools, go to Application → Service Workers. Use "Update on reload" while developing to keep the worker fresh, and manually check image loading after the worker has registered.

**Use `Content-Security-Policy-Report-Only` first.** Before deploying a new policy, run it in report-only mode. Violations are reported without blocking, which will surface `connect-src` failures from real service worker activity before they affect users.

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-r4nd0m_per_request';
  connect-src 'self' https://api.example.com;
  img-src 'self' https://cdn.example.com;
  report-to csp-endpoint
```

**Think in fetch() boundaries.** When writing or reviewing CSP policies, for every origin listed in `img-src`, `font-src`, or `media-src`, ask whether a service worker will ever call `fetch()` for that origin. If yes, the origin belongs in `connect-src` too.

The core takeaway: CSP directives map to how a resource is _initiated_, not what kind of resource it is. A service worker changes the initiator — and with it, which directive applies.

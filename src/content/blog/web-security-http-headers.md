---
title: "Web Security for Angular Developers, Part 3: HTTP Security Headers"
date: "2025-11-07"
description: "A handful of HTTP response headers dramatically reduce your attack surface. Here's what HSTS, COOP, COEP, Referrer-Policy, and Permissions-Policy actually do and why each one matters."
tags: ["security", "http"]
---

These headers are set on HTTP responses by your server or CDN, not by Angular. Angular has no role here — this is infrastructure configuration.

## HSTS (Strict-Transport-Security)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

HSTS tells the browser to always use HTTPS for your domain, even if the user types `http://` or follows an unencrypted link. After the first HTTPS visit, the browser enforces this itself for the duration of `max-age`.

- `max-age`: how long the browser remembers, in seconds. One year (31536000) is the standard value.
- `includeSubDomains`: applies the same rule to every subdomain.
- `preload`: opts your domain into browser-maintained preload lists. This means even the very first visit uses HTTPS, before the browser has ever seen the header.

The attack this prevents is SSL stripping: an attacker on the same network intercepts the initial HTTP request before it can redirect to HTTPS, and proxies unencrypted traffic between you and the user. HSTS closes that window.

Only set this once you are confident every subdomain runs on HTTPS. Getting this wrong will break your site for the full `max-age` duration.

## Clickjacking: `frame-ancestors`

```
Content-Security-Policy: frame-ancestors 'none'
```

Clickjacking works like this: an attacker embeds your site in a transparent iframe layered over their own page. The user thinks they are clicking the attacker's content, but they are actually triggering actions on your site underneath.

`frame-ancestors 'none'` instructs the browser to refuse rendering your page inside any frame, iframe, embed, or object element, on any origin. `frame-ancestors 'self'` is the softer option, allowing embedding on the same origin only. This is useful for dashboards that embed their own widgets.

The legacy equivalent is `X-Frame-Options: DENY`. Older browsers do not support the CSP `frame-ancestors` directive and fall back to this header instead. Set both to cover the full browser range.

## COOP (Cross-Origin-Opener-Policy)

```
Cross-Origin-Opener-Policy: same-origin
```

COOP controls whether your page and a window it opens (or that opened it) can access each other's JavaScript context via `window.opener`.

- `same-origin`: your page gets its own browsing context group. Cross-origin windows that open your page, or that your page opens, receive a null `opener` reference and cannot communicate with your JS context.
- `same-origin-allow-popups`: popups your page opens can still communicate back via `window.opener`. Use this when you have OAuth or payment popup flows that need to message the opener.

The threat model here is Spectre-class attacks. If two pages share a browsing context group, a malicious page could use timing attacks via shared memory or cross-window references to read data from your page. Isolating your context with `same-origin` removes that channel.

The main side effect is that OAuth flows and payment flows that open a popup on an external origin and then call back via `window.opener` will break. The workaround is `same-origin-allow-popups`, or switching to the `postMessage` pattern where the popup sends a message to the parent rather than accessing it directly.

## COEP (Cross-Origin-Embedder-Policy)

```
Cross-Origin-Embedder-Policy: require-corp
```

COEP requires that every subresource your page loads either comes from the same origin or explicitly opts in to cross-origin loading by including a `Cross-Origin-Resource-Policy` header (`cross-origin` or `same-origin`).

COOP and COEP together enable cross-origin isolation. Once a page is cross-origin isolated, the browser unlocks `SharedArrayBuffer` and high-precision `performance.now()` timers, both of which were restricted after Spectre. These are required for WebAssembly threads and some audio worklet setups.

The practical difficulty is that third-party scripts, fonts, and images from CDNs often do not include `CORP` headers. Under `require-corp`, those resources fail to load entirely.

A softer alternative:

```
Cross-Origin-Embedder-Policy: credentialless
```

With `credentialless`, cross-origin resources load without sending credentials (cookies, client certificates). You get partial isolation without needing every third-party CDN to cooperate, at the cost of weaker isolation guarantees.

## Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

When a user follows a link from your site to another, the browser sends a `Referer` header containing the URL they came from. By default, this includes the full URL: path, query string, and all. If your URLs contain tokens, session identifiers, or user-specific paths, those leak to every external site your users navigate to.

`strict-origin-when-cross-origin` is the right default for most sites:

- Same-origin navigation: full URL is sent.
- Cross-origin navigation: only the origin is sent (e.g., `https://example.com`, not the path).
- HTTPS to HTTP downgrade: nothing is sent.

Other values worth knowing:

- `no-referrer`: sends nothing at all. Maximum privacy, but breaks referrer-based analytics entirely.
- `same-origin`: sends the full URL for same-origin requests, nothing for cross-origin requests.

## Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
```

Permissions-Policy restricts which browser features your page and any embedded iframes can access. Empty parens `()` deny the feature to everyone. `(self)` restricts it to your origin. `(self "https://trusted.com")` allows a named third party in addition to your own origin.

Features you can restrict include `camera`, `microphone`, `geolocation`, `payment`, `usb`, `bluetooth`, `fullscreen`, `autoplay`, and more.

This header matters most when you embed third-party content. Without it, an iframe you embed could prompt the user for camera or microphone access. Permissions-Policy lets you explicitly declare that an embedded widget has no business requesting those APIs, regardless of what its own code tries to do.

This header replaces the older `Feature-Policy` header, which had a different syntax and inconsistent browser support.

## X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Prevents the browser from MIME-sniffing a response away from the declared `Content-Type`. Without it, the browser may interpret a JSON or text response as HTML or JavaScript if the content looks executable, opening an injection vector. Always set this.

## Quick Reference

| Header                                     | Protects against                  | Recommended value                     |
| ------------------------------------------ | --------------------------------- | ------------------------------------- |
| `Strict-Transport-Security`                | SSL stripping, HTTP interception  | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy: frame-ancestors` | Clickjacking                      | `'none'` or `'self'`                  |
| `X-Frame-Options`                          | Clickjacking (legacy)             | `DENY`                                |
| `Cross-Origin-Opener-Policy`               | Cross-window Spectre attacks      | `same-origin`                         |
| `Cross-Origin-Embedder-Policy`             | Cross-origin data leaks           | `require-corp` or `credentialless`    |
| `Referrer-Policy`                          | URL leakage via Referer           | `strict-origin-when-cross-origin`     |
| `X-Content-Type-Options`                   | MIME-sniffing attacks             | `nosniff`                             |
| `Permissions-Policy`                       | Feature abuse by embedded content | restrict to what you need             |

## Series Navigation

This is part 3 of 4. Read [part 2 on CSP and Trusted Types](/blog/web-security-csp-trusted-types) or continue to [part 4 on cookie security](/blog/web-security-cookies).

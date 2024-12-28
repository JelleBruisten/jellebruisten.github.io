---
title: "Web Security for Angular Developers, Part 4: Cookie Security"
date: "2025-11-21"
description: "Cookie flags and prefixes are a small surface area with a big impact on session security. Here's what HttpOnly, Secure, SameSite, and cookie prefixes actually enforce."
tags: ["security", "http", "cookies"]
---

Cookies are the most common way to store session tokens. Getting their flags wrong means an attacker can steal or forge them even if the rest of your app is secure. Set the flags correctly and you close the most common session attack vectors.

## HttpOnly

```
Set-Cookie: session=abc123; HttpOnly
```

Without `HttpOnly`, `document.cookie` exposes the cookie value to any JavaScript running on the page. An XSS attack that can execute JS can read the session token and exfiltrate it.

With `HttpOnly`, the browser still sends the cookie on every qualifying request, but it is never accessible via JavaScript. `document.cookie` won't include it. There is rarely a reason for client-side JS to read a session cookie, so always set `HttpOnly` on session tokens.

## Secure

```
Set-Cookie: session=abc123; Secure
```

Without the `Secure` flag, the browser sends the cookie over plain HTTP as well as HTTPS. A network attacker on the same Wi-Fi network can intercept the request and read the cookie in plaintext.

With `Secure`, the cookie is only ever transmitted over an encrypted HTTPS connection. Combine this with HSTS (`Strict-Transport-Security`) so the browser never attempts an HTTP request to your origin in the first place, removing any opportunity for a network attacker to intercept a redirect.

## SameSite

```
Set-Cookie: session=abc123; SameSite=Strict
Set-Cookie: session=abc123; SameSite=Lax
Set-Cookie: session=abc123; SameSite=None; Secure
```

`SameSite` controls whether the browser includes the cookie on cross-site requests. There are three values:

**`Strict`**: the cookie is never sent on cross-site requests, including top-level navigations. If a user clicks a link from another site to your app, the first request arrives without the cookie. This is the maximum protection against CSRF, but it breaks flows where arriving via an external link should land in an authenticated state, such as links in notification emails pointing to a logged-in page.

**`Lax`**: the cookie is sent on same-site requests and on top-level navigations (clicking a link). It is not sent on cross-origin `fetch`, `<img>` requests, or form `POST` submissions. This is a good default for most session cookies. Modern browsers default to `Lax` if you omit the `SameSite` attribute entirely, but it is better to set it explicitly.

**`None`**: the cookie is sent on all cross-site requests. This must be paired with the `Secure` flag, or the browser will reject it. Use `None` for embedded widgets, OAuth flows that cross origins, and payment iframes.

**SameSite and CSRF**: `SameSite=Lax` or `Strict` defeats most CSRF attacks because a cross-origin form `POST` won't include the session cookie. You may still want a CSRF token for defence in depth, particularly if you need to support older browsers that don't enforce `SameSite` defaults.

## Cookie Prefixes

Cookie prefixes are enforced by the browser, not the server. If a cookie name starts with `__Secure-` or `__Host-` but the required conditions are not met, the browser silently refuses to store it.

**`__Secure-` prefix** requires:
- The `Secure` flag must be present
- The cookie must be set from an HTTPS page

**`__Host-` prefix** requires everything `__Secure-` requires, plus:
- `Path=/` must be set
- No `Domain` attribute

```
Set-Cookie: __Host-session=abc123; Secure; Path=/; HttpOnly; SameSite=Strict
```

Why this matters: without a prefix, a compromised subdomain (`evil.sub.example.com`) can set a cookie scoped to `.example.com` and override or inject a session cookie for your main domain. The `__Host-` prefix prevents this entirely. The cookie is bound to the exact origin that set it, cannot be shared with subdomains, and cannot be set by anything other than an HTTPS page.

## Putting It Together

The ideal session cookie combines every flag:

```
Set-Cookie: __Host-session=abc123; Secure; HttpOnly; Path=/; SameSite=Strict
```

What each flag prevents:

- **`__Host-`**: the cookie cannot be set or overridden by a subdomain
- **`Secure`**: the cookie only travels over HTTPS, not HTTP
- **`HttpOnly`**: the cookie is not readable by JavaScript, so XSS cannot steal it
- **`Path=/`**: the cookie is scoped to the whole origin, not a subdirectory
- **`SameSite=Strict`**: the cookie is not sent on cross-site requests, defeating CSRF

If `SameSite=Strict` breaks authenticated deep links (email links, OAuth redirects), `Lax` is an acceptable fallback while still blocking cross-origin form attacks.

## What Angular Can and Cannot Do

Angular's `HttpClient` sends cookies automatically on requests because the browser handles cookie storage and transmission. Angular itself does not set cookies.

Cookie flags are a server-side concern. Your Angular app cannot set an `HttpOnly` cookie from JavaScript. That is the entire point of the flag. The server sets the flags via the `Set-Cookie` response header, and those flags are then enforced by the browser on every subsequent request.

If you are using Angular Universal or SSR, be careful when reading cookies server-side via the `REQUEST` injection token. Never log the raw cookie header, sanitise any values before using them in server-rendered output, and treat server-side cookie access with the same caution you would give to any credential.

Bring this checklist to your backend team: `HttpOnly` and `Secure` on every session cookie, `SameSite=Lax` as a baseline or `Strict` where deep links are not a concern, and `__Host-` prefix where your infrastructure supports it.

---

This is the final post in the series. See [Part 3: HTTP Security Headers](/blog/web-security-http-headers) for response headers that protect against clickjacking, MIME sniffing, and more, or start from the beginning with [Part 1: XSS in Angular](/blog/web-security-xss-angular).

---
title: "Web Security for Angular Developers, Part 2: CSP & Trusted Types"
date: "2025-10-24"
description: "Content Security Policy tells the browser what it's allowed to load and execute. Trusted Types close the DOM XSS gap entirely. Here's how both work and how Angular integrates with them."
tags: ["security", "csp", "typescript"]
---

Browsers are permissive by default. Without explicit restrictions, they will load scripts, stylesheets, and fonts from any origin, execute any inline code, and allow any page to be framed by any other origin. Content Security Policy (CSP) is how you take that permissiveness away.

## What CSP Is

CSP is an HTTP response header. When the browser receives it, it uses the policy to decide what it is and is not allowed to do on that page. An injected `<script src="https://evil.com/steal.js">` does nothing if the policy does not list `evil.com` as a valid script source. The script request never goes out.

```http
Content-Security-Policy: default-src 'self'; script-src 'self'
```

That single header stops a large class of XSS attacks at the browser level, independent of whether your application sanitized the input correctly.

## The Key Directives

Each directive controls a specific resource type. If a directive is not listed, `default-src` acts as the fallback.

**`default-src`**

The catch-all. Any resource type without its own explicit directive falls back to this.

```
default-src 'self'
```

Setting this to `'self'` means same-origin resources are allowed for everything not otherwise specified.

**`script-src`**

Controls where JavaScript can come from and what can execute.

```
script-src 'self' 'nonce-abc123'
```

Common values:

- `'self'` — scripts from the same origin only
- `'none'` — no scripts at all
- `'nonce-{value}'` — allow a specific script tag that carries the matching nonce attribute
- `'sha256-{hash}'` — allow a specific inline script whose content matches the hash

`'unsafe-inline'` permits all inline scripts, which defeats the main purpose of CSP. An attacker who injects `<script>...</script>` into your page can execute it freely. Never use it for `script-src` on a real policy.

**`style-src`**

Same model as `script-src`, but for stylesheets.

```
style-src 'self' 'unsafe-inline'
```

Angular's component view encapsulation injects styles into the document at runtime. This often forces `'unsafe-inline'` here unless you configure nonces, which is covered below.

**`connect-src`**

Controls outbound connections from `fetch`, `XMLHttpRequest`, WebSocket, and EventSource.

```
connect-src 'self' https://api.example.com
```

If your Angular app talks to an API at a different origin, it must be listed here.

**`img-src`**

Image sources. The `data:` scheme is commonly needed for inline images or base64-encoded assets.

```
img-src 'self' data:
```

**`font-src`**

Where font files can be loaded from.

```
font-src 'self'
```

If you load fonts from Google Fonts or another CDN, add that origin here.

**`frame-ancestors`**

Controls which origins are allowed to embed this page in an `<iframe>`. Setting it to `'none'` prevents all framing, which is the primary clickjacking defense.

```
frame-ancestors 'none'
```

This overlaps in purpose with the `X-Frame-Options` header but is more expressive. If both are set, CSP takes precedence in modern browsers.

**`object-src 'none'`**

Disables Flash and other browser plugins. There is almost no reason to allow plugins in a modern web application. Always set this.

```
object-src 'none'
```

**`base-uri 'self'`**

Restricts which values can appear in a `<base>` tag. Without this, an attacker who can inject a `<base href="https://evil.com/">` into your page can make all relative URLs resolve to an attacker-controlled origin.

```
base-uri 'self'
```

## Nonces vs Hashes

`'unsafe-inline'` is a blunt instrument. Nonces and hashes let you allow specific inline scripts without opening the door to all inline execution.

**Nonces**

The server generates a random, unpredictable value for each HTTP response. That value goes into both the CSP header and every `<script>` tag the server wants to allow.

```http
Content-Security-Policy: script-src 'nonce-r4nd0mV4lu3'
```

```html
<script nonce="r4nd0mV4lu3">
  // This script is allowed
</script>
```

Any injected script without the correct nonce is blocked. Since the nonce changes with every response, an attacker cannot predict it.

Angular 16+ supports nonces via the `ngCspNonce` attribute on the root element. Add it to `index.html` with a placeholder your server replaces per request:

```html
<!-- index.html -->
<app-root ngCspNonce="REPLACE_WITH_NONCE"></app-root>
```

Angular reads this attribute at bootstrap time and applies the nonce to any inline styles it injects. Alternatively, provide it via the `CSP_NONCE` injection token:

```typescript
import { CSP_NONCE } from "@angular/core";

bootstrapApplication(AppComponent, {
  providers: [{ provide: CSP_NONCE, useValue: globalThis.myServerNonce }],
});
```

**Hashes**

For static inline scripts that never change, you can compute a SHA-256 hash of the script content and add it to the policy.

```http
Content-Security-Policy: script-src 'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='
```

The browser computes the hash of any inline script it encounters and compares it to the values in the policy. If they match, the script executes. Any modification to the script content, including whitespace, produces a different hash and blocks execution.

Hashes are well-suited for third-party snippet requirements that cannot use nonces, but they require you to update the policy whenever the script content changes.

## Report-Only Mode

Rolling out a new CSP to production without testing it first is risky. The `Content-Security-Policy-Report-Only` header lets you observe what your policy would block without actually blocking it.

```http
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'nonce-abc123'; report-uri /csp-violations
```

Violations are sent as JSON POST requests to the `report-uri` endpoint. You can collect these in a logging service, audit them, and refine the policy before switching to enforcement mode.

A common rollout pattern is to start in report-only mode, collect real traffic violations for a week, adjust the policy to eliminate false positives, then switch to `Content-Security-Policy`.

## A Practical Starting Policy

Here is a reasonable baseline for an Angular SPA:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```

Replace `{NONCE}` with a per-request random value generated by your server. The `style-src 'unsafe-inline'` is often necessary with Angular's default component encapsulation because Angular injects component styles as inline style tags. If you configure nonces for styles as well, you can remove it.

## Trusted Types

CSP controls which resources the browser loads. It does not control what your JavaScript does with the DOM after load. An attacker who gets JavaScript to execute, or who finds a path that bypasses CSP, can still write `element.innerHTML = userInput` and inject HTML directly. CSP alone does not close that gap.

Trusted Types do. They are a browser API that restricts what values can be assigned to dangerous DOM sinks.

The sinks Trusted Types protect include `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, and `setTimeout` when called with a string argument. Without Trusted Types, any string can be assigned to any of these. With Trusted Types enforced, plain strings are rejected. The browser only accepts typed objects created by a named policy.

Enable enforcement by adding to your CSP:

```http
Content-Security-Policy: require-trusted-types-for 'script'
```

To write to a sink, you create a policy and use it to produce a typed value:

```typescript
const policy = trustedTypes.createPolicy("my-policy", {
  createHTML: (input: string) => DOMPurify.sanitize(input),
});

element.innerHTML = policy.createHTML(userInput);
```

The `createHTML` function is where you sanitize. The policy wraps the sanitized string in a `TrustedHTML` object. The browser accepts that object as an `innerHTML` assignment. Any attempt to assign a plain string directly throws a TypeError.

This is meaningful because it forces all unsafe DOM writes to go through an explicit, named policy. You can audit the entire application by searching for `createPolicy` calls rather than hunting through every template and component.

**Angular and Trusted Types**

Angular ships a built-in Trusted Types policy that covers its own internal DOM operations. To allow it, add the `trusted-types` directive to your CSP:

```http
Content-Security-Policy:
  require-trusted-types-for 'script';
  trusted-types angular angular#unsafe-bypass angular#unsafe-jit;
```

The three Angular policy names:

- `angular` — Angular's standard internal policy used for its own rendering
- `angular#unsafe-bypass` — required when your code calls `DomSanitizer.bypassSecurityTrustHtml` or related bypass methods. The name signals that this is a conscious escape hatch, not standard usage.
- `angular#unsafe-jit` — required when using JIT compilation. In a production build with AOT, you can typically omit this.

If you use `bypassSecurityTrustHtml` anywhere in your application, you need `angular#unsafe-bypass`. If you do not use it, omitting it from the policy means that code path will throw an error, which is a useful enforcement guarantee.

## Series Navigation

This is part 2 of 4: read [part 1 on XSS and Angular's built-in defenses](/blog/web-security-xss-angular) or continue to [part 3 on HTTP security headers](/blog/web-security-http-headers).

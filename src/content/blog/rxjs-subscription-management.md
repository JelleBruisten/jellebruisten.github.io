---
title: "Taming RxJS: Subscription Management in Angular"
date: "2025-12-05"
description: "Memory leaks from forgotten RxJS subscriptions are a classic Angular pitfall. Here are the patterns — old and new — that will save you from them."
tags: ["angular", "rxjs", "typescript"]
---

# Taming RxJS: Subscription Management in Angular

Every Angular developer has run into it: a component is destroyed, but somewhere an observable is still pushing values into the void — or worse, into a component whose host element no longer exists. Memory leaks, stale state, double-fired effects. RxJS subscriptions that aren't cleaned up are a silent menace.

Let's look at the patterns that fix it.

## The Problem

```typescript
@Component({ ... })
export class SearchComponent implements OnInit {
  results: SearchResult[] = [];

  ngOnInit() {
    // This subscription lives forever — it's never unsubscribed
    this.searchService.query$.subscribe(results => {
      this.results = results;
    });
  }
}
```

When `SearchComponent` is destroyed, the subscription keeps running. If `query$` emits later, it tries to update a dead component. In a long-running SPA this compounds: every time the component is created, another subscription is added to the pile.

## Pattern 1: Unsubscribe in `ngOnDestroy`

The baseline approach:

```typescript
export class SearchComponent implements OnInit, OnDestroy {
  private sub: Subscription | null = null;

  ngOnInit() {
    this.sub = this.searchService.query$.subscribe(r => this.results = r);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.sub = null;
  }
}
```

Works, but verbose. Starting with `null` makes it clear no subscription exists yet, and resetting to `null` after unsubscribing prevents accidental reuse of a dead subscription.

## Pattern 2: Composing with `new Subscription`

When you have multiple subscriptions to manage together, `new Subscription()` lets you add child subscriptions via `.add()` and dispose them all at once:

```typescript
export class SearchComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  ngOnInit() {
    this.subs.add(this.searchService.query$.subscribe(r => this.results = r));
    this.subs.add(this.otherService.data$.subscribe(d => this.data = d));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
```

Each `.add()` call registers a child subscription. When the parent is unsubscribed, all children are too. No third-party utilities needed.

## Pattern 3: `takeUntil` with a Destroy Subject

A popular functional pattern using an RxJS operator:

```typescript
export class SearchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.searchService.query$
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => this.results = r);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

`takeUntil` completes the observable when `destroy$` emits, which automatically unsubscribes. More declarative, though it requires the boilerplate subject.

## Pattern 4: `takeUntilDestroyed` — the Modern Way

Angular 16 introduced `takeUntilDestroyed`, which hooks into the component's destroy lifecycle automatically:

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class SearchComponent {
  constructor() {
    this.searchService.query$
      .pipe(takeUntilDestroyed())
      .subscribe(r => this.results = r);
  }
}
```

No `ngOnDestroy`. No subject. The `DestroyRef` is injected automatically when called inside an injection context (constructor or field initialiser). This is the recommended approach as of Angular 17+.

You can also use it outside the constructor by passing a `DestroyRef` explicitly:

```typescript
class MyService {
  constructor(private destroyRef: DestroyRef) {
    someObs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
  }
}
```

## When Signals Are Better

If you're reading an observable's latest value in a template, converting it to a signal with `toSignal` is often cleaner:

```typescript
// Instead of:
ngOnInit() {
  this.userSub = this.userService.user$.subscribe(u => this.user = u);
}

// Do:
protected user = toSignal(this.userService.user$, { initialValue: null });
```

`toSignal` handles the subscription and automatic cleanup internally. The template binds to a signal rather than a property, which also enables fine-grained change detection.

## The Rule of Thumb

**Let Angular clean up for you** when you can:

| Where | Use |
|---|---|
| Inside constructor | `takeUntilDestroyed()` |
| Outside injection context | `takeUntilDestroyed(destroyRef)` |
| Template value binding | `toSignal` |
| Finite stream (HTTP, timer) | Nothing — it completes |

**Manage manually** when you need control:

| When | Use |
|---|---|
| Multiple subscriptions | `new Subscription()` + `.add()` |
| Unsubscribe before destroy | `this.subscription.unsubscribe()` |

## Conclusion

The Angular ecosystem has come a long way on this. With `takeUntilDestroyed` and `toSignal`, the boilerplate of subscription management is almost gone. The key principle stays the same though: **every subscription you create is your responsibility to clean up**. The tools just make it easier to honour that responsibility.

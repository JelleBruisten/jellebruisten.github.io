---
title: "Getting Started with Angular Signals"
date: "2026-01-20"
description: "Angular Signals are a reactive primitive that makes state management simpler, faster, and more predictable. Here's everything you need to know to get started."
tags: ["angular", "signals", "typescript"]
---

# Getting Started with Angular Signals

Angular Signals landed as a stable API in Angular 17, and by Angular 21 they've become the backbone of how we think about reactivity in Angular applications. If you've been putting off learning them — now is the time.

## What is a Signal?

A signal is a reactive value wrapper. Reading it inside a reactive context (like a template or a `computed`) automatically tracks the dependency. When the value changes, everything that depended on it updates automatically.

```typescript
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => {
  console.log(`Count is ${count()}, doubled: ${doubled()}`);
});

count.set(5); // logs: "Count is 5, doubled: 10"
```

Three operations: `signal()` to create, `()` to read, `.set()` or `.update()` to write.

## Why Signals?

The classic Zone.js + `ChangeDetectorRef` model works, but it has rough edges: unnecessary re-renders, opaque update cycles, and poor integration with the rest of the JavaScript ecosystem. Signals fix this with explicit, synchronous reactivity — no magic, no surprises.

**Performance wins out of the box.** With signals, Angular can skip change detection entirely for components that haven't changed. `OnPush` becomes the default behaviour rather than an optimisation you apply manually.

## Computed Signals

`computed` creates a derived signal whose value is re-calculated lazily when its dependencies change:

```typescript
const firstName = signal('Jelle');
const lastName  = signal('Bruisten');

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "Jelle Bruisten"

firstName.set('Jan');
console.log(fullName()); // "Jan Bruisten"
```

The key property: `computed` is **lazy**. It won't recalculate until someone actually reads it.

## Effects

`effect` runs a side-effect whenever its signal dependencies change:

```typescript
effect(() => {
  document.title = `${pageTitle()} — My Site`;
});
```

Avoid setting signals inside effects unless you really have to — it can create cycles. For derived state, always prefer `computed`.

## Signal Inputs (Angular 17.1+)

Component inputs can now be signals, giving you a consistent reactive model throughout:

```typescript
@Component({ ... })
export class CardComponent {
  title = input.required<string>();
  subtitle = input('');

  displayTitle = computed(() =>
    this.subtitle() ? `${this.title()} (${this.subtitle()})` : this.title()
  );
}
```

No more `ngOnChanges`. No more manual subscriptions. Just computed values.

## `linkedSignal` — the Hidden Gem

`linkedSignal` creates a writable signal whose *default* value is derived from another signal, but which can be manually overridden:

```typescript
const theme = signal<'dark' | 'light'>('dark');

// By default follows theme, but can be manually overridden
const fontSize = linkedSignal(() => theme() === 'dark' ? 16 : 14);

fontSize.set(18); // manual override
theme.set('light'); // resets fontSize back to 14
```

This pattern is perfect for settings that have smart defaults but allow user overrides.

## Migrating from RxJS

Signals and RxJS are not enemies — they complement each other. Use `toSignal` to bring observables into the signal world, and `toObservable` to go the other way:

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal
const route$ = inject(ActivatedRoute).paramMap;
const slug   = toSignal(route$.pipe(map(p => p.get('slug') ?? '')));

// Signal → Observable (useful for debouncing, etc.)
const search = signal('');
const results$ = toObservable(search).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
);
```

## Conclusion

Signals are Angular's answer to the reactivity question that frameworks like Solid and Vue 3 have already answered. They're simpler to reason about, faster at runtime, and they work seamlessly with the rest of the Angular ecosystem. Start small — convert one component's state to signals — and you'll quickly see why they're the future of Angular development.

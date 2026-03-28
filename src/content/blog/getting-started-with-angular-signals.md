---
title: "Catching Up With Angular Signals"
date: "2026-01-14"
description: "Never touched signals? Been away for a while? This guide walks you through everything from the basics to model(), linkedSignal, and signal queries, with before-and-after comparisons throughout."
tags: ["angular", "signals", "typescript"]
---

Angular 17 shipped signals as a stable API. By Angular 21, they're the default way to think about reactivity. If you've been working in older Angular codebases, or took a break from the framework, there's a good chance your mental model still centres around `@Input`, `@Output`, `ngOnChanges`, and Zone.js doing its magic in the background.

This guide assumes you know that world. Each section shows you the old pattern and its signal equivalent side by side.

## Why Signals Exist

Zone.js works by monkey-patching async APIs (`setTimeout`, `fetch`, event listeners) and notifying Angular when any of them fire. Angular then runs change detection on the whole component tree to figure out what changed. It works, but it's indirect: Angular doesn't know *what* changed, only that *something* might have. This leads to unnecessary checks and `OnPush` becoming something you add as an optimisation rather than a default.

Signals are explicit. When a signal's value changes, Angular knows exactly which templates and computed values depend on it. No tree walking, no guessing. Components using signals skip change detection entirely when none of their signals changed.

The practical result: you stop fighting the framework and start describing state.

## The Three Primitives

Everything else builds on three core functions.

### `signal()` — writable state

```typescript
import { signal } from '@angular/core';

const count = signal(0);

// Read by calling it
console.log(count()); // 0

// Replace the value
count.set(5);

// Derive a new value from the current one
count.update(n => n + 1);

// For objects/arrays, spread to keep immutability
const items = signal<string[]>([]);
items.update(list => [...list, 'new item']);
```

### `computed()` — derived, read-only state

`computed` creates a signal whose value is recalculated when its dependencies change. It's lazy: it won't recalculate until something actually reads it.

```typescript
import { computed } from '@angular/core';

const firstName = signal('Ada');
const lastName  = signal('Lovelace');

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "Ada Lovelace"

lastName.set('Byron');
console.log(fullName()); // "Ada Byron"
```

Use `computed` for everything that can be derived from other signals. It replaces a lot of manual property synchronisation and `get` getters that reference mutable state.

### `effect()` — side effects

`effect` runs a function immediately, then re-runs it whenever any signal it read changes:

```typescript
import { effect } from '@angular/core';

const pageTitle = signal('Home');

// Runs once on creation, then every time pageTitle changes
effect(() => {
  document.title = `${pageTitle()} | My App`;
});
```

**Important rule:** avoid setting signals inside effects. It creates cycles and usually means the logic belongs in a `computed` instead. Use effects for things with external side effects: DOM manipulation, analytics, localStorage, third-party libraries.

Effects must be created inside an injection context (constructor or field initialiser). They clean up automatically when the component is destroyed.

#### Effect cleanup

If your effect sets up a resource, you can tear it down between runs:

```typescript
effect((onCleanup) => {
  const id = this.activeUserId();
  const ws = new WebSocket(`/ws/user/${id}`);

  ws.onmessage = (e) => this.messages.update(m => [...m, e.data]);

  onCleanup(() => ws.close());
});
```

`onCleanup` fires before the effect re-runs with new values and when the component is destroyed.

#### DOM manipulation: use `afterRenderEffect` instead

Plain `effect()` runs during change detection, before the DOM is updated. Reading layout properties like `scrollHeight` or `getBoundingClientRect()` at that point gives you stale values, and writing to the DOM can conflict with Angular's own rendering.

For DOM work, use `afterRenderEffect` (Angular 19+). It runs after rendering is complete and re-runs whenever its signal dependencies change:

```typescript
import { afterRenderEffect, ElementRef, inject } from '@angular/core';

@Component({ ... })
export class VirtualListComponent {
  private el = inject(ElementRef<HTMLElement>);

  items = input.required<string[]>();

  constructor() {
    afterRenderEffect(() => {
      // items() is tracked — re-runs when items changes, after the DOM is updated
      const count = this.items().length;
      const rowHeight = this.el.nativeElement.querySelector('.row')?.clientHeight ?? 0;
      this.el.nativeElement.style.setProperty('--list-height', `${count * rowHeight}px`);
    });
  }
}
```

The rule of thumb: if you're reading or writing the DOM, `afterRenderEffect`. If you're updating signals, calling services, or syncing to localStorage, plain `effect`.

## Replacing `@Input` and `@Output`

This is where the mental model shift is most visible.

### `input()` replaces `@Input()`

```typescript
// Before
@Component({ ... })
export class CardComponent {
  @Input() title!: string;
  @Input() subtitle = '';
}

// After
@Component({ ... })
export class CardComponent {
  title    = input.required<string>();
  subtitle = input('');
}
```

The key difference: `title` and `subtitle` are now signals. You call them to read the value: `this.title()`, `this.subtitle()`. This means you can use them directly in `computed`:

```typescript
export class CardComponent {
  title    = input.required<string>();
  subtitle = input('');

  // No ngOnChanges needed — recomputes automatically
  displayTitle = computed(() =>
    this.subtitle()
      ? `${this.title()} (${this.subtitle()})`
      : this.title()
  );
}
```

No more `ngOnChanges` checking `SimpleChanges` to react to input updates.

### `output()` replaces `@Output()`

```typescript
// Before
@Component({ ... })
export class SearchComponent {
  @Output() search = new EventEmitter<string>();

  onSearch(query: string) {
    this.search.emit(query);
  }
}

// After
@Component({ ... })
export class SearchComponent {
  search = output<string>();

  onSearch(query: string) {
    this.search.emit(query);
  }
}
```

The template usage is identical: `(search)="handleSearch($event)"`. The difference is that `output()` isn't an `Observable` and doesn't need to be unsubscribed from — it's purely a declaration of what events this component emits.

### `model()` replaces `@Input` + `@Output` pairs

Two-way binding in older Angular required an `@Input` and a matching `@Output` with the `Change` suffix:

```typescript
// Before — two-way binding boilerplate
@Component({ ... })
export class ToggleComponent {
  @Input()  checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  toggle() {
    this.checkedChange.emit(!this.checked);
  }
}
```

`model()` collapses this into one declaration:

```typescript
// After
@Component({ ... })
export class ToggleComponent {
  checked = model(false);

  toggle() {
    this.checked.update(v => !v);
  }
}
```

The parent still uses `[(checked)]="isChecked"` exactly as before. Internally, `model` is a writable signal: you can read it with `this.checked()` and write to it with `.set()` or `.update()`. Angular handles the two-way binding wire-up automatically.

## Replacing `@ViewChild` and `@ContentChild`

Query decorators have signal equivalents that are available synchronously, without lifecycle hooks.

```typescript
// Before
@Component({ ... })
export class ParentComponent implements AfterViewInit {
  @ViewChild(ChartComponent) chart!: ChartComponent;

  ngAfterViewInit() {
    this.chart.render(this.data);
  }
}

// After
@Component({ ... })
export class ParentComponent {
  chart = viewChild.required(ChartComponent);

  constructor() {
    effect(() => {
      this.chart().render(this.data());
    });
  }
}
```

`viewChild` returns a `Signal<ChartComponent | undefined>`. The `.required` variant returns `Signal<ChartComponent>` and throws if the child isn't found. The effect re-runs whenever `data` changes, and also once the view is initialised — no `ngAfterViewInit` needed.

For multiple matches use `viewChildren`, which returns `Signal<readonly ChartComponent[]>`:

```typescript
panels = viewChildren(PanelComponent);

constructor() {
  effect(() => {
    this.panels().forEach(p => p.collapse());
  });
}
```

`contentChild` and `contentChildren` work the same way for projected content.

## `linkedSignal` — Writable with a Smart Default

`linkedSignal` creates a writable signal whose value resets based on another signal, but can also be manually overridden. It's the right tool when something has a sensible default that should follow external state, but the user can also change it:

```typescript
import { linkedSignal } from '@angular/core';

const items = signal(['Apple', 'Banana', 'Cherry']);

// Default: first item. Resets when items changes.
const selectedItem = linkedSignal(() => items()[0]);

console.log(selectedItem()); // "Apple"

selectedItem.set('Cherry'); // manual override
console.log(selectedItem()); // "Cherry"

items.set(['Mango', 'Papaya']); // items changed — resets to new first item
console.log(selectedItem()); // "Mango"
```

Without `linkedSignal`, you'd need an effect to reset `selectedItem` when `items` changes, and careful ordering to avoid stale reads. `linkedSignal` expresses the relationship directly.

Common uses: selected tab defaulting to the first tab, a form field defaulting to a value from a parent signal, page size resetting when filters change.

## `untracked()` — Reading Without Tracking

When you're inside an `effect` or `computed`, reading a signal registers it as a dependency. Sometimes you need the current value of a signal without making the effect re-run when that signal changes:

```typescript
import { untracked } from '@angular/core';

effect(() => {
  // userId IS tracked — effect re-runs when it changes
  const id = this.userId();

  // preferences is NOT tracked — effect won't re-run if preferences changes
  const prefs = untracked(() => this.userPreferences());

  this.analytics.track('profile-view', { id, theme: prefs.theme });
});
```

Without `untracked`, a change to `userPreferences` would also trigger the analytics call, which is probably not what you want. `untracked` makes the dependency explicit by omission.

## RxJS Interop

Signals and RxJS coexist. The bridge functions live in `@angular/core/rxjs-interop`.

`toSignal` converts an observable to a signal and handles the subscription lifecycle automatically:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

export class SearchComponent {
  private route = inject(ActivatedRoute);

  // Subscription created and cleaned up automatically
  protected slug = toSignal(
    this.route.paramMap.pipe(map(p => p.get('slug') ?? ''))
  );
}
```

`toObservable` goes the other way, which is useful when you need RxJS operators like `debounceTime` on a signal:

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

export class SearchComponent {
  protected query = signal('');

  protected results$ = toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q))
  );
}
```

For a full breakdown of subscription patterns, see the [RxJS Subscriptions post](/blog/rxjs-subscription-management).

## Migration Cheat Sheet

| Old pattern | Signal equivalent |
|---|---|
| `@Input() value: T` | `value = input<T>()` |
| `@Input() value!: T` | `value = input.required<T>()` |
| `@Output() change = new EventEmitter<T>()` | `change = output<T>()` |
| `@Input() v` + `@Output() vChange` | `v = model<T>()` |
| `@ViewChild(C) child!: C` | `child = viewChild.required(C)` |
| `@ViewChildren(C) children!: QueryList<C>` | `children = viewChildren(C)` |
| `@ContentChild(C) content!: C` | `content = contentChild.required(C)` |
| `ngOnChanges` reacting to input | `computed()` or `effect()` on the input signal |
| `ngAfterViewInit` accessing child | `effect()` reading `viewChild()` signal |
| Writable derived state | `linkedSignal()` |
| Reading without tracking | `untracked()` |
| Observable to signal | `toSignal(obs$)` |
| Signal to observable | `toObservable(sig)` |

## Where to Go Next

The basics above cover the vast majority of day-to-day Angular development. Once you're comfortable with them:

- **NgRx SignalStore** extends signals into a full state management solution with `withState`, `withComputed`, and `rxMethod`
- **`resource()` and `rxResource()`** are experimental signal-based abstractions for async data loading, worth watching as they stabilise

The shift to signals is not just a syntax change. It's a move from "Angular checks things on your behalf" to "you describe what depends on what, Angular reacts precisely." Once it clicks, the old model feels like a lot of unnecessary indirection.

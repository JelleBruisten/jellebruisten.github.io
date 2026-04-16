---
title: "Why Your SignalStore Spy Never Fires (and a 150-Line Fix)"
date: "2026-04-16"
description: "Why vi.spyOn silently misses method calls inside signal-store effects, and a small tooling layer that fixes it by auto-wrapping every method at test time."
tags: ["angular", "signals", "ngrx", "testing", "typescript"]
---

You have a signal store. It has a method. An `effect()` inside `withHooks` calls that method. You want a test that says: "when the signal flips, the method is called." You write the obvious test. It fails. The method _is_ called — you can see it work in the browser — but `vi.spyOn` claims it wasn't.

This post is about why, and a small helper I built to make it go away.

> **TL;DR** A `vi.mock` on `@ngrx/signals` auto-inserts a feature between every pair of features that wraps methods in late-bound dispatchers. The spy target is now a stable registry object the effect-captured closure will actually read from. Source and a worked example: [github.com/JelleBruisten/signal-store-effect-testing](https://github.com/JelleBruisten/signal-store-effect-testing/tree/blog/testing-tools-example).

## The Pattern That Breaks

Here's a deliberately small store — a counter that auto-resets when it crosses a threshold:

```typescript
import { effect } from "@angular/core";
import {
  patchState,
  signalStore,
  signalStoreFeature,
  withHooks,
  withMethods,
  withState,
} from "@ngrx/signals";

interface CounterState {
  count: number;
  threshold: number;
}

export function withCounter() {
  return signalStoreFeature(
    withState<CounterState>(() => ({ count: 0, threshold: 5 })),
    withMethods((store) => ({
      increment() {
        patchState(store, (s) => ({ count: s.count + 1 }));
      },
      reset() {
        patchState(store, { count: 0 });
      },
    })),
    withHooks((store) => ({
      onInit: () => {
        effect(() => {
          if (store.count() > store.threshold()) {
            store.reset();
          }
        });
      },
    })),
  );
}

export const CounterStore = signalStore({ providedIn: "root" }, withCounter());
```

The test you'd write:

```typescript
it("resets automatically when count crosses the threshold", () => {
  const store = TestBed.inject(CounterStore);
  const spy = vi.spyOn(store, "reset");

  for (let i = 0; i < 6; i++) {
    store.increment();
  }

  TestBed.tick();
  expect(spy).toHaveBeenCalled(); // ❌ fails
});
```

`TestBed.tick()` flushes the effect. The `count > threshold` check _does_ become true after the sixth increment, which _does_ fire the effect, which _does_ call `reset()`. You can even log inside `reset()` and watch it print. And yet the spy never fires.

## Why `vi.spyOn` Misses

To see why, look at what `signalStore` does internally (simplified from the [ngrx source](https://github.com/ngrx/platform/blob/main/modules/signals/src/signal-store.ts)):

```typescript
class SignalStore {
  constructor() {
    const innerStore = features.reduce((s, f) => f(s), getInitialInnerStore());
    const storeMembers = { ...innerStore.stateSignals, ...innerStore.props, ...innerStore.methods };

    for (const key of Reflect.ownKeys(storeMembers)) {
      (this as any)[key] = storeMembers[key];
    }
    innerStore.hooks.onInit?.();
  }
}
```

Two details matter:

1. Each feature receives the accumulated `innerStore` and returns a new one. `withHooks` runs its factory at composition time and **closes over a flat snapshot** of that innerStore — `{...store.stateSignals, ...store.props, ...store.methods}`. Once that object exists, its `reset` property is a concrete function reference, copied by the spread.
2. `onInit()` runs inside the constructor. So by the time `TestBed.inject(CounterStore)` returns, the effect is already registered and its closure already points at `flatSnapshot.reset`.

Now `vi.spyOn(store, "reset")`. What does it do? It replaces `store.reset` — one property, on one object: the outer class instance. It does **not** touch `flatSnapshot.reset`. When the effect fires, `store.reset()` inside its body reads from the flat snapshot the effect closed over, not from the outer instance. Spy never sees the call.

If you've tried reaching for `unprotected(store)` from `@ngrx/signals/testing`, that doesn't help either — it just strips readonly branding from state signals and returns the same outer instance.

There's no way to rewire this from outside the store. The snapshot was frozen during construction, function identity in JS can't be swapped retroactively, and there's no "get me the innerStore" escape hatch.

## Don't Test Implementation, Right?

The classic counter-argument: stop testing _which methods get called_ and start testing _observable behavior_. Assert on the end-state signal (`count` went back to 0), or on a service that `reset()` triggers.

This is good advice and you should follow it when you can. For `CounterStore` specifically, `expect(store.count()).toBe(0)` after the increments is a clean, behavior-level test. But there are cases where it gets ugly:

- The method's "observable behavior" is itself a branching tree of effects. You want to assert that the store decided to advance, not re-verify every downstream consequence in every test.
- You're writing a regression test for a specific bug: "when the count crosses threshold, reset fires". A spy on that method is the most direct expression of what you're protecting against.
- The same method is called under five different conditions. You end up duplicating the same downstream assertion five times when one `toHaveBeenCalled` would do.

When behavior tests stay short and clear, prefer them. When they start becoming "set up a fake of the fake of the fake, then check the state of world" — a method-level spy is a reasonable tool, and you shouldn't be blocked from using it by a framework implementation detail.

## The Fix: Late-Bound Dispatchers

Every proposed fix runs into the same problem. The effect holds a function reference by closure, and JavaScript has no way to change what that reference points at. You can swap the property on the outer class instance — the effect doesn't read from there. You can swap the property on the innerStore — the effect closed over a spread, not a live view.

The only lever is to make the function the effect captures be a **stable dispatcher** that, on every call, reads the current implementation from a mutable registry. Then swapping a registry entry from a test _does_ change what runs, because the dispatcher is already there, already captured, already reading from that registry.

```typescript
// Sketch of what we want in place of the raw method
const registry = { reset: originalResetFn };

innerStore.methods.reset = function (...args) {
  return registry.reset.apply(this, args);
};
```

Now `withHooks` snapshots the dispatcher into its flat object. The effect captures the dispatcher. Test does `vi.spyOn(registry, "reset")` — which replaces that key on the registry. Next time the dispatcher runs, it reads the spy and calls it.

## The Helper: `withTestingTools()` + `getTestStore`

I built this as a pair: a signal-store feature that installs the dispatchers, and a helper to give tests a typed handle on the registry.

```typescript
// Store-side (ignore the placement for a moment)
withMethods(/* ... */),
withTestingTools(),     // installs dispatchers for every method so far
withHooks(/* ... */),   // closes over dispatchers, not raw functions

// Test-side
const spy = vi.spyOn(getTestStore(store), "reset");
```

`getTestStore(store)` returns the registry, typed to only include method-valued keys. That means `vi.spyOn(getTestStore(store), "...")` autocompletes the method names and filters out signals and plain props:

```typescript
export type StoreMethods<T> = {
  [K in keyof T as T[K] extends Signal<any> ? never : T[K] extends AnyFn ? K : never]: T[K];
};
```

Signals get filtered out first — they're callable, which would otherwise pollute the key union.

One small subtlety that matters later: `withTestingTools()` is **idempotent**. If you run it twice, the second pass sees already-wrapped methods and leaves them alone. This will matter in a moment.

### The placement problem

`withTestingTools()` has to run _after_ the `withMethods` that registers the method, and _before_ the `withHooks` that captures it. That's fine for a single feature. But consider this:

```typescript
(withMethods((store) => ({ persist() {} })),
  withMethods((store) => ({
    commit() {
      store.persist();
    },
  })),
  withHooks(/* effect calls commit() */));
```

If you insert `withTestingTools()` only between the last `withMethods` and `withHooks`, `persist` is wrapped but `commit` still closes over the raw `persist` — the second `withMethods` snapshotted before the wrapping happened. You'd need _two_ insertions: after each `withMethods`. And if your feature composition uses nested `signalStoreFeature(...)` bundles, you'd need insertions inside every level.

That's a lot to ask store authors to remember.

## The Real Trick: `vi.mock('@ngrx/signals')`

Here's where Vitest earns its keep. Module mocking lets us replace `signalStore` and `signalStoreFeature` with wrappers that auto-insert `withTestingTools()` between every feature argument — and crucially, the mock applies to every call, including inside nested feature factories.

```typescript
// src/app/testing-tools/setup.ts
export function setupSignalStoreTesting(): void {
  vi.mock("@ngrx/signals", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@ngrx/signals")>();

    const interleave = (features: unknown[]) => {
      const out: unknown[] = [];
      for (let i = 0; i < features.length; i++) {
        if (i > 0) out.push(withTestingTools());
        out.push(features[i]);
      }
      return out;
    };

    const wrap = <T extends (...a: unknown[]) => unknown>(real: T) =>
      ((...args: unknown[]) => {
        // first arg can be a config object (non-function); rest are features
        const hasConfig = args.length > 0 && typeof args[0] !== "function";
        const config = hasConfig ? args[0] : undefined;
        const features = hasConfig ? args.slice(1) : args;
        const interleaved = interleave(features);
        return hasConfig ? real(config, ...interleaved) : real(...interleaved);
      }) as T;

    return {
      ...actual,
      signalStore: wrap(actual.signalStore),
      signalStoreFeature: wrap(actual.signalStoreFeature),
    };
  });
}
```

Store authors never touch `withTestingTools()`. Tests just do:

```typescript
// src/test-setup.ts
import { setupSignalStoreTesting } from "./app/testing-tools";

setupSignalStoreTesting();
```

Every `withMethods` becomes a point where a `withTestingTools()` runs on exit. The idempotence of the feature means multiple passes over the same innerStore produce one registry, one dispatcher per method — not stacked dispatchers-of-dispatchers. And since `signalStoreFeature` is also wrapped, nested feature compositions get the same treatment all the way down.

## The Limit

There's one case no amount of wrapping can fix:

```typescript
withMethods((store) => {
  const doWork = () => {
    /* ... */
  };
  return {
    doWork,
    trigger: () => doWork(), // ⚠️ closure, not store.doWork()
  };
});
```

`trigger` here closes over `doWork` as a local variable, not as a property lookup on `store`. No dispatcher replaces that. The convention that makes all of this work is: **always reach for another method via `store.method()`**, not via a captured reference. This is also the only pattern that reflects the actual store identity at call time — so there's a decent argument for making it a codebase-wide rule regardless of testing.

## What You End Up With

A three-line test setup:

```typescript
// src/test-setup.ts
import { setupSignalStoreTesting } from "./app/testing-tools";

setupSignalStoreTesting();
```

An unchanged store:

```typescript
export const CounterStore = signalStore({ providedIn: "root" }, withCounter());
```

A test that just works:

```typescript
it("resets automatically when count crosses the threshold", () => {
  const store = TestBed.inject(CounterStore);
  const spy = vi.spyOn(getTestStore(store), "reset");

  for (let i = 0; i < 6; i++) {
    store.increment();
  }

  TestBed.tick();
  expect(spy).toHaveBeenCalled(); // ✅
});
```

The `signal-store-effect-testing` repo has the full helper, plus worked examples for cross-`withMethods` calls and nested `signalStoreFeature` composition:

- [github.com/JelleBruisten/signal-store-effect-testing](https://github.com/JelleBruisten/signal-store-effect-testing/tree/blog/testing-tools-example) — branch with the helper and examples
- [testing-tools folder](https://github.com/JelleBruisten/signal-store-effect-testing/tree/blog/testing-tools-example/src/app/testing-tools) — the helper itself (~150 lines)

If you're fighting this same problem, clone the branch and paste the folder into your project. The only moving part you need to remember is: **one call to `setupSignalStoreTesting()` in your Vitest setup file**. The rest is just `vi.spyOn(getTestStore(store), "methodName")`.

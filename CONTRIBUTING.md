# Contributing to tuft

The README states the scope. This file is the operating discipline.

## When to add a new utility

**Extract on the second use, not the first.** If you have a function in
one project that feels generic, leave it there. When you reach for it
from a *different* project, that's when you copy it here. The cost of a
premature extraction (maintaining two repos, vendoring, version bumps)
is real; the reward of a well-timed one is huge.

## What a new utility needs

1. **A pure function.** No DOM, no filesystem, no network, no global
   state. If you can't write it as `function f(x) -> y`, it doesn't
   belong here.
2. **A test file.** `tests/js/test-<name>.js`, runnable as `node tests/js/test-<name>.js`.
   Cover the obvious cases plus the weird edge cases that prompted the
   utility's existence.
3. **An entry in the README's "Utilities" list.** One line. Says what
   it's for, not how it works.
4. **Reasonable name.** Descriptive enough to grep for; short enough to
   import.

## What does NOT belong here

- Anything that calls `document.*`, `window.*`, `fetch`, `require('fs')`.
- Anything that reads from the env or process state.
- "Helpers" so abstract no consumer will recognize when to use them.
- Things you'd naturally reach for in `lodash` or `date-fns`. (Don't
  reinvent. Vendor real libraries.)
- Project-specific helpers ("convert manuscript paragraph to ...").
- "I might want this someday."

## Versioning

`package.json` has `version`. Bump it when you add or change a utility.
There's no automation here — small enough to do by hand.

Patch (0.1.0 → 0.1.1): bug fixes only.
Minor (0.1.0 → 0.2.0): new utility, backwards-compatible change.
Major (0.1.0 → 1.0.0): breaking change to an existing utility.

## Tests

```
npm test
```

Or just `node tests/js/test-<name>.js` for one file.

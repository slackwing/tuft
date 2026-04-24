# tuft

Small, generic utilities — like a tuft of down. Personal grab-bag, but
disciplined: each utility here is general enough to be reused across
projects with no dependencies, no DOM, no project-specific conventions.

## Scope

What belongs here:
- Pure-function utilities operating on standard data types (arrays,
  strings, numbers).
- Algorithms small enough that copying them around projects would be
  faster than depending on a heavyweight library, but big enough to be
  worth not re-deriving.

What does NOT belong here:
- Anything that touches the DOM, network, filesystem.
- Anything tied to a specific project's vocabulary.
- Anything you'd naturally pull from `lodash`, `date-fns`, etc.
- "I might need this someday" — extract on the second use, not the first.

## Layout

```
tuft/
├── lib/
│   └── js/             # one file per utility; CJS exports
├── tests/
│   └── js/             # one test file per utility
└── package.json
```

The `lib/{lang}/` shape leaves the door open for non-JS implementations
later (e.g. `lib/go/`, `lib/rust/`) without restructuring.

## Utilities

- `rainbow-slice` — skip-then-sample with variety preference. Used for
  laying out a small set of categorical items where uniqueness matters
  more than order or duplication.

## Vendoring

Consumers should vendor by copy from `lib/<lang>/`. There is no
published package; if you reach for one of these in a project that
needs an npm dep, that's the signal to either publish this or rethink.

## Testing

```
npm test
```

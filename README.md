# tuft

Small, generic utilities — like a tuft of down. Personal grab-bag, but
disciplined: everything here is general enough to be reused across
projects, has no dependencies, and carries no project-specific vocabulary.

## Scope

Two kinds of things live here, kept apart:

- **`lib/js/` — pure functions** operating on standard data types (arrays,
  strings, numbers). No DOM, network or filesystem. Algorithms small enough
  that copying them around would be faster than a heavyweight library, but
  big enough to be worth not re-deriving.
- **`lib/ui/` — small UI components**, one self-contained folder each (JS +
  CSS + README). The logic is still pure and Node-tested; only a thin
  `mount` layer touches the DOM. See CONTRIBUTING.md for the rules.

What does NOT belong here:
- Anything that talks to the network, filesystem or storage.
- Anything tied to a specific project's vocabulary.
- Anything you'd naturally pull from `lodash`, `date-fns`, etc.
- Frameworks, build steps, or components big enough to want them.
- "I might need this someday" — extract on the second use, not the first.

## Layout

```
tuft/
├── lib/
│   ├── js/                   # pure functions — one file each; CJS exports
│   └── ui/                   # UI components — one folder each
│       └── <name>/           #   <name>.js, <name>.css, README.md
├── tests/
│   ├── js/                   # test-<name>.js per function
│   └── ui/                   # test-<name>.js per component
└── package.json
```

The `lib/{lang}/` shape leaves the door open for non-JS implementations
later (e.g. `lib/go/`, `lib/rust/`) without restructuring.

## Utilities

- `rainbow-slice` — skip-then-sample with variety preference. Used for
  laying out a small set of categorical items where uniqueness matters
  more than order or duplication.

### UI components

- `grid-of-squares` — a contribution-style grid of days with typed,
  ranked squares (optionally capped per day) that bulldoze overflow into
  later days (skim or proportional), per-date column heights, a start
  date, and a lookahead.

## Vendoring

Consumers should vendor by copy: a function's file from `lib/<lang>/`, or
a component's whole folder from `lib/ui/<name>/`. There is no
published package; if you reach for one of these in a project that
needs an npm dep, that's the signal to either publish this or rethink.

## Testing

```
npm test
```

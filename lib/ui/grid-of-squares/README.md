# grid-of-squares

A GitHub-contribution-style grid: one column per day, squares stacked
bottom-up, today about 80% of the way across, as many columns as fit the
container. Squares have **types** (color, rank, whether they bulldoze);
what doesn't fit a day's column is hidden or shoved into the next day.

```html
<link rel="stylesheet" href="grid-of-squares.css">
<script src="grid-of-squares.js"></script>
<div id="effort"></div>
<script>
  const grid = Tuft.GridOfSquares.mount(document.getElementById('effort'), {
    schema: [
      { type: 'daily', color: 'green', rank: 1, bulldoze: true },
      { type: 'other', color: 'yellow', bulldoze: true },
    ],
    height: 14,
  });
  grid.add('2026-10-26', 'daily', 5).add('2026-10-26', 'other', 2).render();
</script>
```

## API

| Call | Does |
|---|---|
| `mount(el, settings)` | Renders into `el`, refits on resize, returns the grid |
| `grid.add(date, type, count = 1)` | Adds squares (`date` is `'YYYY-MM-DD'`); chainable |
| `grid.clear()` | Removes all squares |
| `grid.render()` | Re-renders — call after a batch of `add`s |
| `grid.destroy()` | Stops listening and empties `el` |

Pure functions, for tests and non-DOM uses: `layout(settings, entries,
columns)` → view model, `renderHTML(viewModel, settings)` → HTML string,
`createModel(settings)`, `normalizeSettings`, `fitColumns(width,
settings)`, `heightOn(settings, date)`, `resolveColor`, `PALETTE`,
`DEFAULTS`. In Node: `require('…/grid-of-squares.js')`; in a page:
`window.Tuft.GridOfSquares`.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `schema` | required | `[{type, color, rank = 0, bulldoze = false, max, label = type}]` — `max`: at most this many of the type's squares per day, before bulldozing (the extra never exists) |
| `height` | `10` | Column height, in squares |
| `heightChanges` | `[]` | `[{from: 'YYYY-MM-DD', height}]` — from that date on, columns are that tall. The grid grows from the bottom: columns share a baseline |
| `bulldozeMode` | `'skim'` | How overflow leaves a column — below |
| `lookahead` | `0.2` | Fraction of the columns after today (`0` ≤ x < `1`) |
| `cellSize`, `gap` | `10`, `2` | Pixels |
| `minColumns` | `10` | Fewest columns, however narrow the container |
| `today` | viewer's local date | `'YYYY-MM-DD'` |
| `start` | `null` | `'YYYY-MM-DD'` — squares dated before it don't exist (not shown, not bulldozed in) |
| `emptyColor` | `'empty'` | Background squares |
| `todayMarker` | `true` | A triangle + "TODAY" under today's column |
| `legend` | `false` | A swatch + label per type, in rank order |
| `tooltip` | `'counts'` | Each column's `title`: `'counts'` (date + counts per type), `'date'`, or `'none'` |

**Colors** are palette words — `green yellow orange red pink purple blue
brown gray black white empty` — or `#rgb`, `#rrggbb`, `rgb()`, `rgba()`.
Near-white colors get a hairline outline.

**Stack order** (bottom → top): higher `rank` first; within a rank, a day's
own squares, then squares carried in from the day before; then the order
they were added. Equal ranks therefore band or alternate as added.

**Bulldozing.** When a day has more squares than its height:
- `skim` — the squares on top leave. Types with `bulldoze: true` move to
  the top of the next day's stack (then re-sorted by rank, so a carried
  low-rank square still sits above the next day's high-rank ones);
  other types' overflow is hidden.
- `proportional` — each type gives up a share of the excess proportional
  to its count (largest remainder; ties go to the bigger group, then the
  lower rank, so small groups tend to stay). Example: height 25 with 18
  green, 9 red, 3 yellow → 3 green and 2 red leave.

Overflow cascades day by day, through history left of the window and into
the future. Days before the window are simulated, so a big day long ago can
still spill into view.

## Styling

Everything is under `.gos`. Override the custom properties to theme it:
`--gos-cell`, `--gos-gap`, `--gos-radius`, `--gos-empty`,
`--gos-light-edge`, `--gos-ink`, `--gos-muted`. Hooks: `.gos-col.is-today`,
`.is-future`, `.gos-cell.is-lit`, `.is-carried`, `.is-light`,
`[data-type="…"]`. Each column's `title` follows the `tooltip` setting.

Tests: `node tests/ui/test-grid-of-squares.js`.

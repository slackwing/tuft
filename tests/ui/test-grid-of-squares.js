/**
 * Tests for lib/ui/grid-of-squares — the pure core and renderer (the mount
 * layer is a few lines of DOM glue around them).
 *
 *   node tests/ui/test-grid-of-squares.js
 */

const GOS = require('../../lib/ui/grid-of-squares/grid-of-squares.js');

let passed = 0;
let failed = 0;
let section = '';

function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.log(`✗ ${section ? section + ': ' : ''}${msg}`);
  }
}

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(a === e, a === e ? msg : `${msg}\n    expected ${e}\n    actual   ${a}`);
}

function throws(fn, pattern, msg) {
  try {
    fn();
    ok(false, `${msg} (did not throw)`);
  } catch (err) {
    ok(pattern.test(err.message), pattern.test(err.message) ? msg : `${msg} (threw "${err.message}")`);
  }
}

function describe(name, fn) {
  section = name;
  console.log(`\n— ${name}`);
  fn();
  section = '';
}

// ---- helpers ------------------------------------------------------------

const A = { type: 'a', color: 'green', bulldoze: true };

/** Lay out `adds` ([date, type, count]) and return the view model. */
function vm(settings, adds, columns) {
  const s = Object.assign({ schema: [A], today: '2026-10-10', lookahead: 0 }, settings);
  const model = GOS.createModel(s);
  for (const [d, t, c] of adds) model.add(d, t, c);
  return GOS.layout(s, model.entries(), columns);
}

/** Stack heights of the visible columns. */
const lens = (v) => v.cols.map((c) => c.cells.length);

/** A column's squares bottom → top as a string of types ("aab"). */
const stackOf = (col) => col.cells.map((c) => c.type).join('');

/** The carried flags of a column, bottom → top, as "..cc". */
const carriedOf = (col) => col.cells.map((c) => (c.carried ? 'c' : '.')).join('');

const count = (html, needle) => html.split(needle).length - 1;

// ---- settings -----------------------------------------------------------

describe('settings', () => {
  throws(() => GOS.normalizeSettings({}), /schema must be a non-empty array/, 'schema is required');
  throws(() => GOS.normalizeSettings({ schema: [] }), /schema must be a non-empty array/, 'schema cannot be empty');
  throws(() => GOS.normalizeSettings({ schema: [{ color: 'red' }] }), /type must be a non-empty string/, 'every type needs a name');
  throws(() => GOS.normalizeSettings({ schema: [A, A] }), /duplicate type "a"/, 'types are unique');
  throws(() => GOS.normalizeSettings({ schema: [{ type: 'x', color: 'maroon' }] }), /unknown color "maroon"/, 'unknown color word');
  throws(() => GOS.normalizeSettings({ schema: [{ type: 'x', color: 'red', rank: 'high' }] }), /rank must be a number/, 'rank is a number');

  const s = GOS.normalizeSettings({ schema: [{ type: 'x', color: 'red' }] });
  eq([s.height, s.bulldozeMode, s.lookahead, s.cellSize, s.gap, s.minColumns, s.todayMarker, s.legend],
    [10, 'skim', 0.2, 10, 2, 10, true, false], 'defaults: height 10, skim, lookahead 0.2, 10px/2px, ≥10 columns, marker on, legend off');
  eq([s.schema[0].rank, s.schema[0].bulldoze, s.schema[0].label], [0, false, 'x'], 'type defaults: rank 0, no bulldozing, label = type');
  ok(GOS.normalizeSettings(s) === s, 'normalizing is idempotent');

  throws(() => GOS.normalizeSettings({ schema: [A], height: 0 }), /height must be a positive integer/, 'height must be positive');
  throws(() => GOS.normalizeSettings({ schema: [A], height: 2.5 }), /height must be a positive integer/, 'height must be whole');
  throws(() => GOS.normalizeSettings({ schema: [A], heightChanges: [{ from: '2027-1-24', height: 43 }] }), /bad date/, 'heightChanges dates are YYYY-MM-DD');
  throws(() => GOS.normalizeSettings({ schema: [A], heightChanges: [{ from: '2027-02-30', height: 43 }] }), /bad date/, 'heightChanges dates must exist');
  throws(() => GOS.normalizeSettings({ schema: [A], heightChanges: [{ from: '2027-01-24', height: 0 }] }), /positive integer/, 'heightChanges heights are positive');
  throws(() => GOS.normalizeSettings({ schema: [A], heightChanges: [{ from: '2027-01-24', height: 4 }, { from: '2027-01-24', height: 5 }] }), /two heightChanges on 2027-01-24/, 'one change per date');
  const sorted = GOS.normalizeSettings({ schema: [A], heightChanges: [{ from: '2027-03-01', height: 5 }, { from: '2027-01-24', height: 43 }] });
  eq(sorted.heightChanges.map((c) => c.from), ['2027-01-24', '2027-03-01'], 'heightChanges get sorted by date');
  throws(() => GOS.normalizeSettings({ schema: [A], bulldozeMode: 'shove' }), /bulldozeMode must be 'skim' or 'proportional'/, 'unknown bulldozeMode');
  throws(() => GOS.normalizeSettings({ schema: [A], lookahead: 1 }), /lookahead must be in \[0, 1\)/, 'lookahead < 1 (today must be visible)');
  throws(() => GOS.normalizeSettings({ schema: [A], lookahead: -0.1 }), /lookahead/, 'lookahead ≥ 0');
  throws(() => GOS.normalizeSettings({ schema: [A], today: 'today' }), /bad date/, 'today is a date');
  throws(() => GOS.normalizeSettings({ schema: [A], cellSize: 0 }), /cellSize/, 'cellSize > 0');
  throws(() => GOS.normalizeSettings({ schema: [A], gap: -1 }), /gap/, 'gap ≥ 0');
  throws(() => GOS.normalizeSettings({ schema: [A], minColumns: 0 }), /minColumns/, 'minColumns ≥ 1');
});

describe('colors', () => {
  eq(GOS.resolveColor('green'), '#74b355', 'a palette word');
  eq(GOS.resolveColor('  Green '), '#74b355', 'palette words ignore case and spaces');
  eq(GOS.resolveColor('grey'), GOS.resolveColor('gray'), 'grey = gray');
  eq(GOS.resolveColor('#ABC'), '#abc', '#rgb');
  eq(GOS.resolveColor('#AABBCC'), '#aabbcc', '#rrggbb');
  eq(GOS.resolveColor('rgb(1,2, 3)'), 'rgb(1, 2, 3)', 'rgb()');
  eq(GOS.resolveColor('rgba(1, 2, 3, 0.5)'), 'rgba(1, 2, 3, 0.5)', 'rgba()');
  throws(() => GOS.resolveColor('#abcd'), /unknown color/, 'bad hex length');
  throws(() => GOS.resolveColor('rgb(300, 0, 0)'), /unknown color/, 'rgb channel over 255');
  throws(() => GOS.resolveColor(''), /bad color/, 'empty color');
  const common = ['green', 'yellow', 'orange', 'red', 'pink', 'purple', 'blue', 'brown', 'gray', 'black', 'white', 'empty'];
  ok(common.every((w) => GOS.PALETTE[w]), 'palette has the common colors + empty');
  const s = GOS.normalizeSettings({ schema: [{ type: 'w', color: 'white' }, { type: 'g', color: 'green' }, { type: 'r', color: 'rgb(250, 250, 250)' }] });
  eq(s.schema.map((t) => t.light), [true, false, true], 'near-white colors are flagged for an outline');
  eq(GOS.normalizeSettings({ schema: [A], emptyColor: 'black' }).emptyColor, '#3a3630', 'emptyColor accepts palette words');
});

describe('model', () => {
  const m = GOS.createModel({ schema: [A] });
  throws(() => m.add('2026-10-01', 'zz'), /unknown type "zz"/, 'add() rejects unknown types');
  throws(() => m.add('2026-10-01', 'a', -1), /non-negative integer/, 'add() rejects negative counts');
  throws(() => m.add('2026-10-01', 'a', 1.5), /non-negative integer/, 'add() rejects fractional counts');
  throws(() => m.add('Oct 1', 'a', 1), /bad date/, 'add() rejects bad dates');
  m.add('2026-10-01', 'a');
  m.add('2026-10-01', 'a', 0);
  m.add('2026-10-02', 'a', 3);
  eq(m.entries().map((e) => [e.date, e.count]), [['2026-10-01', 1], ['2026-10-02', 3]], 'count defaults to 1; zero adds nothing');
  m.clear();
  eq(m.entries(), [], 'clear() empties the model');
});

// ---- window ---------------------------------------------------------------

describe('window', () => {
  eq(GOS.fitColumns(1000, { schema: [A] }), 83, '1000px at 10+2 → 83 columns');
  eq(GOS.fitColumns(50, { schema: [A] }), 10, 'narrow → minColumns');
  eq(GOS.fitColumns(0, { schema: [A], minColumns: 3 }), 3, 'zero width → minColumns');
  eq(GOS.fitColumns(100, { schema: [A], cellSize: 8, gap: 1 }), 11, 'cellSize/gap change the fit');

  const v20 = vm({ lookahead: 0.2 }, [], 10);
  eq([v20.future, v20.todayIndex, v20.windowStart, v20.windowEnd], [2, 7, '2026-10-03', '2026-10-12'], 'lookahead 0.2 of 10 → 2 future columns, today at index 7');
  eq(v20.cols.map((c) => c.isToday), [false, false, false, false, false, false, false, true, false, false], 'exactly one today column');
  eq(v20.cols.map((c) => c.isFuture), [false, false, false, false, false, false, false, false, true, true], 'future columns after today');
  eq(vm({ lookahead: 0 }, [], 10).future, 0, 'lookahead 0 → today is the last column');
  eq(vm({ lookahead: 0.5 }, [], 10).future, 5, 'lookahead 0.5 → half the columns');
  eq(vm({ lookahead: 0.01 }, [], 10).future, 1, 'any lookahead shows at least one future column');
  eq(vm({ lookahead: 0.9 }, [], 2).future, 1, 'today always stays visible');

  eq(vm({ today: '2027-01-02' }, [], 5).cols.map((c) => c.date), ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'], 'dates run across a year end');
  eq(vm({ today: '2026-03-09' }, [], 3).cols.map((c) => c.date), ['2026-03-07', '2026-03-08', '2026-03-09'], 'no gap or repeat across a DST change');
  eq(vm({ today: '2028-03-01' }, [], 2).cols.map((c) => c.date), ['2028-02-29', '2028-03-01'], 'leap day');
  const local = GOS.layout({ schema: [A], lookahead: 0 }, [], 3);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(local.today) && local.cols[2].date === local.today, 'today defaults to the local date');
});

// ---- heights ----------------------------------------------------------------

describe('heights', () => {
  const changes = { schema: [A], height: 23, heightChanges: [{ from: '2026-10-05', height: 43 }] };
  eq([GOS.heightOn(changes, '2026-10-04'), GOS.heightOn(changes, '2026-10-05'), GOS.heightOn(changes, '2026-10-06')], [23, 43, 43], 'height changes ON its date');
  const several = { schema: [A], height: 10, heightChanges: [{ from: '2026-10-04', height: 8 }, { from: '2026-10-02', height: 5 }] };
  eq(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) => GOS.heightOn(several, d)), [10, 5, 5, 8], 'several changes, given out of order');

  const v = vm(Object.assign({ today: '2026-10-06' }, changes), [], 4);
  eq(v.cols.map((c) => c.height), [23, 23, 43, 43], 'each column keeps its own height');
  eq(v.maxHeight, 43, 'the grid is as tall as its tallest visible column');
  eq(vm(Object.assign({ today: '2026-10-03' }, changes), [], 3).maxHeight, 23, '…and only visible columns count');
  const html = GOS.renderHTML(v, Object.assign({ schema: [A] }, changes));
  eq(count(html, 'class="gos-cell'), 23 + 23 + 43 + 43, 'a short column draws no cells above its height');
  ok(html.includes(`height:${43 * 10 + 42 * 2}px`), 'grid height = tallest column in px');

  const grow = vm({ today: '2026-10-02', height: 3, heightChanges: [{ from: '2026-10-02', height: 6 }] },
    [['2026-10-01', 'a', 5], ['2026-10-02', 'a', 2]], 2);
  eq(lens(grow), [3, 4], 'overflow into a taller day is absorbed by the extra room');
});

// ---- ranks ------------------------------------------------------------------

describe('ranks', () => {
  const ranked = [
    { type: 'a', color: 'green', rank: 2 },
    { type: 'b', color: 'red', rank: 1 },
    { type: 'c', color: 'blue', rank: 0 },
  ];
  const v = vm({ schema: ranked, today: '2026-10-01' }, [['2026-10-01', 'c', 1], ['2026-10-01', 'a', 1], ['2026-10-01', 'b', 1]], 1);
  eq(stackOf(v.cols[0]), 'abc', 'higher rank sits lower, whatever the add order');

  const flat = [{ type: 'a', color: 'green' }, { type: 'b', color: 'red' }];
  const band = vm({ schema: flat, today: '2026-10-01' }, [['2026-10-01', 'a', 2], ['2026-10-01', 'b', 1], ['2026-10-01', 'a', 1]], 1);
  eq(stackOf(band.cols[0]), 'aaba', 'equal (default) ranks keep add order — bands');
  const alt = vm({ schema: flat, today: '2026-10-01' }, [['2026-10-01', 'a', 1], ['2026-10-01', 'b', 1], ['2026-10-01', 'a', 1], ['2026-10-01', 'b', 1]], 1);
  eq(stackOf(alt.cols[0]), 'abab', '…or alternate');

  const mixed = [{ type: 'a', color: 'green', rank: 1 }, { type: 'b', color: 'red' }, { type: 'c', color: 'blue' }];
  const m = vm({ schema: mixed, today: '2026-10-01' }, [['2026-10-01', 'c', 1], ['2026-10-01', 'b', 1], ['2026-10-01', 'a', 1], ['2026-10-01', 'c', 1]], 1);
  eq(stackOf(m.cols[0]), 'acbc', 'ranked types sink; equal ranks above keep add order');
  const neg = vm({ schema: [{ type: 'a', color: 'green', rank: -1 }, { type: 'b', color: 'red', rank: 0.5 }], today: '2026-10-01' }, [['2026-10-01', 'a', 1], ['2026-10-01', 'b', 1]], 1);
  eq(stackOf(neg.cols[0]), 'ba', 'any numeric rank works (negative, fractional)');
});

// ---- skim -------------------------------------------------------------------

describe('skim bulldozing', () => {
  // manuscript-studio's documented examples (one type, height 14)
  const ms = (adds, columns, lookahead) => vm({ height: 14, today: '2026-10-03', lookahead: lookahead || 0 }, adds, columns);
  eq(lens(ms([['2026-10-01', 'a', 17], ['2026-10-02', 'a', 6], ['2026-10-03', 'a', 13]], 3)), [14, 9, 13], '17, 6, 13 → 14, 9, 13');
  const into = ms([['2026-10-01', 'a', 17], ['2026-10-02', 'a', 12], ['2026-10-03', 'a', 14]], 4, 0.25);
  eq(lens(into), [14, 14, 14, 1], '17, 12, 14 → 14, 14, 14, 1 (the 1 lands in the future)');
  eq([into.cols[3].isFuture, carriedOf(into.cols[3])], [true, 'c'], 'the spilled square is carried, in a future column');
  eq(carriedOf(into.cols[1]), '............cc', 'carried squares sit on top of a day of the same rank');

  const past = vm({ height: 10, today: '2026-10-10' }, [['2026-10-05', 'a', 50]], 3);
  eq(lens(past), [10, 10, 0], 'history left of the window still spills into view');
  const beyond = vm({ height: 2, today: '2026-10-03' }, [['2026-10-03', 'a', 9]], 3);
  eq([lens(beyond), beyond.cols.length], [[0, 0, 2], 3], 'a cascade past the window end is simulated but not drawn');
  const ahead = vm({ height: 2, today: '2026-10-02', lookahead: 0.5 }, [['2026-10-04', 'a', 2], ['2026-10-05', 'a', 9]], 4);
  eq(lens(ahead), [0, 0, 0, 2], 'squares added for future dates show in future columns (and past the window, not at all)');

  const gy = [{ type: 'g', color: 'green', rank: 1, bulldoze: true }, { type: 'y', color: 'yellow', rank: 0, bulldoze: true }];
  const yellowOver = vm({ schema: gy, height: 3, today: '2026-10-02' }, [['2026-10-01', 'g', 2], ['2026-10-01', 'y', 2], ['2026-10-02', 'g', 2]], 2);
  eq([stackOf(yellowOver.cols[0]), stackOf(yellowOver.cols[1]), carriedOf(yellowOver.cols[1])], ['ggy', 'ggy', '..c'],
    'a carried low-rank square sits above the next day\'s high-rank squares');
  const greenUnder = vm({ schema: gy, height: 3, today: '2026-10-02' }, [['2026-10-01', 'g', 4], ['2026-10-02', 'y', 1], ['2026-10-02', 'g', 1]], 2);
  eq([stackOf(greenUnder.cols[1]), carriedOf(greenUnder.cols[1])], ['ggy', '.c.'], 'a carried high-rank square sinks below lower ranks, above its own rank');
  const chain = vm({ schema: gy, height: 2, today: '2026-10-03' }, [['2026-10-01', 'g', 2], ['2026-10-01', 'y', 3], ['2026-10-02', 'g', 2], ['2026-10-03', 'g', 1]], 3);
  eq(chain.cols.map(stackOf), ['gg', 'gg', 'gy'], 'low-rank squares keep getting shoved to later days');

  const hidden = vm({ schema: [{ type: 'a', color: 'green' }], height: 3, today: '2026-10-02' }, [['2026-10-01', 'a', 5]], 2);
  eq(lens(hidden), [3, 0], 'a non-bulldozing type\'s overflow is hidden');
  const mix1 = vm({ schema: [{ type: 'a', color: 'green', rank: 1, bulldoze: true }, { type: 'b', color: 'red' }], height: 3, today: '2026-10-02' },
    [['2026-10-01', 'a', 2], ['2026-10-01', 'b', 3]], 2);
  eq(mix1.cols.map(stackOf), ['aab', ''], 'mixed: the non-bulldozing excess on top is hidden');
  const mix2 = vm({ schema: [{ type: 'a', color: 'green', bulldoze: true }, { type: 'b', color: 'red', rank: 1 }], height: 3, today: '2026-10-02' },
    [['2026-10-01', 'b', 2], ['2026-10-01', 'a', 3]], 2);
  eq(mix2.cols.map(stackOf), ['bba', 'aa'], 'mixed: the bulldozing excess on top is carried');
});

// ---- proportional -------------------------------------------------------------

describe('proportional bulldozing', () => {
  const gry = [
    { type: 'g', color: 'green', rank: 2, bulldoze: true },
    { type: 'r', color: 'red', rank: 1, bulldoze: true },
    { type: 'y', color: 'yellow', rank: 0, bulldoze: true },
  ];
  const P = { bulldozeMode: 'proportional', schema: gry, today: '2026-10-02' };
  const spec = vm(Object.assign({ height: 25 }, P), [['2026-10-01', 'g', 18], ['2026-10-01', 'r', 9], ['2026-10-01', 'y', 3]], 2);
  eq(spec.cols[0].counts, { g: 15, r: 7, y: 3 }, 'the spec example: 18/9/3 at height 25 sheds 3 green + 2 red, yellow stays');
  eq([stackOf(spec.cols[1]), carriedOf(spec.cols[1])], ['gggrr', 'ccccc'], '…and they land on the next day, in rank order');

  const exact = vm(Object.assign({ height: 5 }, P), [['2026-10-01', 'g', 6], ['2026-10-01', 'r', 4]], 2);
  eq([exact.cols[0].counts, exact.cols[1].counts], [{ g: 3, r: 2 }, { g: 3, r: 2 }], 'exact proportions');
  const tieCount = vm(Object.assign({ height: 10 }, P), [['2026-10-01', 'g', 1], ['2026-10-01', 'r', 7], ['2026-10-01', 'y', 4]], 2);
  eq(tieCount.cols[1].counts, { r: 1, y: 1 }, 'largest remainder: quotas g 0.17, r 1.17, y 0.67 → r 1, then y wins the last one');
  const tieRank = vm(Object.assign({ height: 3 }, P), [['2026-10-01', 'g', 2], ['2026-10-01', 'y', 2]], 2);
  eq(tieRank.cols[1].counts, { y: 1 }, 'equal remainders and counts: the lower rank goes');
  const tieN = vm(Object.assign({ height: 6 }, P), [['2026-10-01', 'g', 2], ['2026-10-01', 'y', 6]], 2);
  eq(tieN.cols[1].counts, { y: 2 }, 'equal remainders: the bigger group goes, small groups stay');

  const hiddenShare = vm(Object.assign({ height: 25 }, P, { schema: [gry[0], { type: 'r', color: 'red', rank: 1 }, gry[2]] }),
    [['2026-10-01', 'g', 18], ['2026-10-01', 'r', 9], ['2026-10-01', 'y', 3]], 2);
  eq([hiddenShare.cols[0].counts, hiddenShare.cols[1].counts], [{ g: 15, r: 7, y: 3 }, { g: 3 }], 'a non-bulldozing type\'s share is hidden, not carried');

  const rr = [{ type: 'a', color: 'green', rank: 1, bulldoze: true }, { type: 'b', color: 'red', rank: 0, bulldoze: true }];
  const again = vm({ bulldozeMode: 'proportional', schema: rr, height: 4, today: '2026-10-03' },
    [['2026-10-01', 'a', 4], ['2026-10-01', 'b', 4], ['2026-10-02', 'a', 2]], 3);
  eq(lens(again), [4, 4, 2], 'carried squares are re-proportioned on the next day');
  eq([stackOf(again.cols[1]), carriedOf(again.cols[1]), stackOf(again.cols[2])], ['aaab', '..cc', 'ab'], '…the topmost of each type leaves first');

  const one = vm({ bulldozeMode: 'proportional', height: 14, today: '2026-10-03' }, [['2026-10-01', 'a', 17], ['2026-10-02', 'a', 6], ['2026-10-03', 'a', 13]], 3);
  eq(lens(one), [14, 9, 13], 'with one type it matches skim');
  const fits = vm(Object.assign({ height: 30 }, P), [['2026-10-01', 'g', 18], ['2026-10-01', 'r', 9], ['2026-10-01', 'y', 3]], 2);
  eq(lens(fits), [30, 0], 'nothing moves when the day fits');
});

// ---- render -----------------------------------------------------------------

describe('render', () => {
  const schema = [
    { type: 'w', color: 'green', rank: 1, bulldoze: true, label: 'writing' },
    { type: 's', color: 'white', rank: 0, bulldoze: true, label: '<staff>' },
  ];
  const settings = { schema, height: 3, today: '2026-10-26', lookahead: 0.25, legend: true };
  const model = GOS.createModel(settings);
  model.add('2026-10-25', 'w', 3);
  model.add('2026-10-25', 's', 2);
  model.add('2026-10-26', 'w', 1);
  const v = GOS.layout(settings, model.entries(), 4);
  const html = GOS.renderHTML(v, settings);

  eq(count(html, 'class="gos-col'), 4, 'one column per day');
  eq(count(html, 'class="gos-cell'), 12, 'height cells per column');
  eq(count(html, 'is-lit'), 3 + 3, 'lit cells: 3 on the 25th, 1 own + 2 carried on the 26th');
  eq(count(html, 'is-carried'), 2, 'carried cells are marked');
  eq(count(html, 'data-type="w" style="background:#74b355"'), 4, 'cells carry their type color inline');
  ok(html.includes('class="gos-col is-today" data-date="2026-10-26"'), 'today column marked');
  ok(html.includes('class="gos-col is-future" data-date="2026-10-27"'), 'future column marked');
  ok(html.includes('class="gos-cell is-lit is-carried is-light" data-type="s"'), 'white cells get the outline class');
  ok(html.includes('title="Oct 26 — writing 1 · &lt;staff&gt; 2"'), 'column tooltip: date + counts in rank order, escaped');
  ok(html.includes('title="Oct 24"'), 'an empty column\'s tooltip is just its date');
  ok(html.includes(`left:${2 * 12 + 5}px`), 'TODAY marker centered under today\'s column');
  ok(html.indexOf('writing</span>') < html.indexOf('&lt;staff&gt;</span>'), 'legend in rank order, labels escaped');
  ok(html.includes('--gos-cell:10px;--gos-gap:2px;--gos-empty:rgba(87, 80, 63, 0.14)'), 'sizes and empty color as CSS variables');

  const plain = GOS.renderHTML(v, Object.assign({}, settings, { legend: false, todayMarker: false }));
  ok(!plain.includes('gos-legend') && !plain.includes('gos-today'), 'legend and marker can be turned off');
  const sized = GOS.renderHTML(v, Object.assign({}, settings, { cellSize: 6, gap: 1, emptyColor: '#eee' }));
  ok(sized.includes('--gos-cell:6px;--gos-gap:1px;--gos-empty:#eee') && sized.includes('height:20px'), 'cellSize, gap and emptyColor reach the markup');
  const evil = GOS.normalizeSettings({ schema: [{ type: '"><x>', color: 'red' }], today: '2026-10-01' });
  const evilHTML = GOS.renderHTML(GOS.layout(evil, [{ date: '2026-10-01', type: '"><x>', count: 1 }], 1), evil);
  ok(!evilHTML.includes('"><x>'), 'type names are escaped in attributes');
});

// ---- parity with manuscript-studio ---------------------------------------------

describe('manuscript-studio parity', () => {
  // manuscript-studio's renderPointsGrid cascade (web/js/home.js, 2026-10-13):
  // daily points first, then other; pop the top onto the next day.
  function msTotals(days, today, cols) {
    const ROWS = 14;
    const future = Math.max(1, Math.round(cols * 0.2));
    const DAY = 86400000;
    const parse = (s) => Date.parse(s + 'T00:00:00Z');
    const fmt = (t) => new Date(t).toISOString().slice(0, 10);
    const windowStart = parse(today) - (cols - future - 1) * DAY;
    const firstData = parse(days[0].date);
    const start = Math.min(firstData, windowStart);
    const dates = [];
    for (let t = start; t <= parse(today) + future * DAY; t += DAY) dates.push(fmt(t));
    const by = {};
    days.forEach((d) => { by[d.date] = d; });
    const matrix = dates.map((d) => (by[d] ? Array(by[d].daily).fill('d').concat(Array(by[d].points - by[d].daily).fill('o')) : []));
    for (let i = 0; i < matrix.length; i++) {
      while (matrix[i].length > ROWS) {
        const top = matrix[i].pop();
        if (!matrix[i + 1]) matrix.push([]);
        matrix[i + 1].push(top);
      }
    }
    const s = dates.indexOf(fmt(windowStart));
    return Array.from({ length: cols }, (_, c) => (matrix[s + c] || []).length);
  }
  const days = [
    { date: '2026-09-20', points: 30, daily: 10 },
    { date: '2026-09-22', points: 9, daily: 9 },
    { date: '2026-09-23', points: 20, daily: 2 },
    { date: '2026-09-25', points: 15, daily: 15 },
    { date: '2026-09-26', points: 3, daily: 0 },
    { date: '2026-10-01', points: 40, daily: 20 },
  ];
  const settings = {
    schema: [{ type: 'daily', color: 'green', rank: 1, bulldoze: true }, { type: 'other', color: 'yellow', rank: 0, bulldoze: true }],
    height: 14,
    today: '2026-10-02',
  };
  const model = GOS.createModel(settings);
  days.forEach((d) => {
    model.add(d.date, 'daily', d.daily);
    model.add(d.date, 'other', d.points - d.daily);
  });
  const ours = lens(GOS.layout(settings, model.entries(), 20));
  eq(ours, msTotals(days, '2026-10-02', 20), 'same per-day totals as manuscript-studio\'s grid');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

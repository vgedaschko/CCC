# DECK SPEC: the builders' handbook for "Big D or little d?"

Binding for every agent that builds slides. Read it once completely, then keep it open.
Content comes from `docs/01_script.md` (verbatim quotes only from the script / SOURCE_DIGEST); this file
says **how** to build. Engine contract: `deck/README.md`. Reference slides to copy from:
`00-foundation.html` / `.css` (S01 title, S04b interaction, S04z bridge, S05 signature morph).

---

## 1. Files and ownership

```
deck/slides/src/
  deck.template.html        foundation   head, config (checkpoints), icon sprite, <div id="stage">
  manifest.json             foundation   slide order (41 positions) + group list
  theme/                    foundation   tokens, fonts, base grid, chrome, components, geometry (registry), motion, modes
  data/countries.json       foundation   the ONE country-position file (Fig. 5.3 measured; Country Mapping 2022 unverified)
  00-foundation.html/.css   foundation   s01, s04b, s04z, s05
  01-g1-opening.html/.css   g1-opening   s02, s02m, s03, s04a
  02-g2-classification…     g2           s06, s07, s08a, s08b, h3, h5
  03-g3-per…                g3           s09a, s09b, h2
  04-g4-tokyo…              g4           s10a, s10b, s11a, s11b, s11c, s11d
  05-g5-toolkit…            g5           s12a, s12b, s12c, s13, s14a, s14m, s14b, s14c
  06-g6-part2…              g6           s15, s16, s17, s17b, s18, s19
  07-g7-close…              g7           s20, h1, h4, s20e
```

- **Edit only your own two files** (`NN-group.html`, `NN-group.css`). Never edit `theme/`, the template,
  the manifest, `data/`, another group's files, `engine/` or the tools. Missing component or a registry
  change → report it to the foundation; meanwhile style locally in your CSS, scoped to your slide ids.
- A partial holds only `<section class="slide" id="…">` elements (comments allowed between them). The
  order in the deck comes from `manifest.json`, not from your file.
- Every stub carries `data-stub`, a `<p class="stub-mark">STUB</p>` and a `.stub-body` with a note on what
  to build: **remove all three** when the slide is built.
- Keep each stub's `id`, `data-transition`, `data-hidden`, `data-next`, `data-title`, its goto chips and
  its registry objects (see §11). Hidden/variant/branch semantics follow script §2.7.

## 2. Commands (run from `deck/`; safe for 7 agents in parallel)

Each builder uses **their own** output file and screenshot folder. Never write `slides/big-d.html`
(the integrator's file) and never share an output path.

```bash
# 1. assemble a private copy (must live directly in slides/, name .tmp-*; gitignored)
node tools/assemble.cjs --out slides/.tmp-g3.html

# 2. automated QA: your slides must show 0 errors (stubs of other groups are listed as notes only)
node tools/check-deck.cjs --deck slides/.tmp-g3.html --slides s09a,s09b,h2
node tools/check-deck.cjs --deck slides/.tmp-g3.html --slides s09a,s09b,h2 --stress   # +40 % text test (warnings)

# 3. screenshots: every build, final, print, paper, lit-room, beamer washout (+ contact sheet)
node tools/shoot.cjs --deck slides/.tmp-g3.html --slides s09a,s09b,h2 --out <your scratch dir>/shots --contact
#    triggers, a running timer, live store values:
node tools/shoot.cjs --deck slides/.tmp-g3.html --slides s04b --elapsed 84 --fire "s04b:dT,vM" --out …
node tools/shoot.cjs --deck slides/.tmp-g3.html --slides s14a --store "d2.scenario=T;d2.method=VOTE" --out …
#    mid-transition frames (20/45/70 %) for every seam into and out of your slides:
node tools/shoot.cjs --deck slides/.tmp-g3.html --slides s09a --states final --morph "s08b:s09a,s09a:s09b,s09b:s10a" --out …

# 4. look at the PNGs with the Read tool (contact.png first, then single frames) and iterate
```

- `check-deck` checks: stage bounds, clipped / spilling text, overlapping text (ink boxes; an opaque box
  on top is fine), text >= 28 px, font fallback per glyph (Chrome's own font matching), <= 6 builds,
  data-step gaps, morph keys on both sides (singles are listed as `morph` lines: read them), goto / next
  targets, console errors, PDF page count. It audits the final state, every trigger fired alone, every
  `data-show-if` value, and print. `--json` for machine output. Exit code 1 on errors.
- `shoot` options: `--states builds,final,print,paper,lit,beamer`, `--fire s:t,t;s2:t`, `--store k=v;…`,
  `--elapsed s` (fake clock), `--morph a:b,…` (follows auto bridges), `--at 20,45,70`, `--scale .5`, `--contact`.
- Engine tests (foundation / integrator): `node tests/run-tests.cjs`.

## 3. The canvas and the grid

1920 x 1080 px. Every slide is a CSS grid (theme/base.css):

| Band | y | x | What |
|---|---|---|---|
| running head `.rh` | 0–64 | full width, content 72–1848 | breadcrumb · deck title · folio |
| body `.body` | 112–984 | 72–1848, 12 columns, 32 px gutter | flow content |
| source footer `.sf` | 1016–1080 | 72–1848 | hairline + one source line |

In **story** mode the two 64 px bands are the black letterbox bars, and the head / footer sit inside them.
Positions in the morph registry are **stage coordinates** (px from the top-left of the slide).

### Skeleton of a content slide

```html
<section class="slide daylight" id="s07" data-transition="morph" data-title="Both were right: Leading ≠ Deciding">
  <header class="rh">
    <p class="rh-crumb vt-swap" data-morph="rh-crumb">I · <b>Classification</b></p>
    <p class="rh-title" data-morph="rh-title">Big D or little d?</p>
    <p class="rh-folio vt-swap" data-morph="rh-folio" data-folio-text="2"></p>   <!-- engine writes "07" -->
  </header>
  <div class="body L-split s-5-7">
    <div class="a stack"> … </div>
    <div class="b stack"> … </div>
  </div>
  <footer class="sf"><p>Meyer (2014), pp. 144–146, 154</p></footer>
</section>
```

- Breadcrumb = rubric item from script §0 (`I · DEFINITION`, `I · CLASSIFICATION`, `I · CASE · TOKYO`,
  `I · RECOMMENDATIONS`, `II · OUR CULTURES`, `II · MANAGEMENT IMPLICATIONS`); the last part in `<b>`.
  Arrows inside it as an icon: `I · Case · Tokyo <svg class="ic"><use href="#ic-arrow-r"/></svg> <b>Seminar</b>`.
- **Folio: never type a number.** `data-folio-text="2"` is filled by the engine (zero-padded to 2). Hidden
  slides show none; the auto bridge S04z repeats S04b's number.
- Footer: one line, `Meyer (2014), pp. …` style, the sources from the script's "Source:" line.
- Title-type slides (S01, S20, S20e) use `class="slide bare"` (no head; footer optional).

### Layout templates (on `.body`)

| Class | Columns | Children |
|---|---|---|
| (none) | 12 | every child spans the row (`--c` / `--r` override: `style="--c: 2 / 8"`) |
| `L-split` | 6 / 6 | `.a`, `.b`; ratios `s-5-7`, `s-7-5`, `s-4-8`, `s-8-4` |
| `L-3` | 4 / 4 / 4 | `.a`, `.b`, `.c` |
| `L-center` | centred column | hero statements |
| `L-bottom` | content sits at the bottom of the body | |

Helpers: `.stack` (vertical flow, `--gap`), `.row` (wrapping row, `--gap`, `--align`), `.full`.
**Free placement** (diagrams and registry objects): `class="… at" style="--x:600px; --y:470px; --w:720px"`
(`--h`, `--z` too) places a direct child of the slide in stage coordinates.

```html
<div class="body L-split s-4-8">
  <div class="a stack" style="--gap:16px">
    <p class="kicker">Working with</p>
    <h2 class="hl-2">Two rulebooks, ten moves.</h2>
  </div>
  <div class="b row" style="--gap:32px"> … cards … </div>
</div>
```

Rules: flow first (`.body` + templates); `.at` only for diagrams and registry objects. No fixed heights on
anything that holds text, no `white-space: nowrap` on headlines, definitions or quotes. Leave slack:
`check-deck --stress` adds 40 % words to each text block in turn and warns where that would collide.

## 4. Type scale (px on the 1920 canvas) — **nothing below 28 px**

| Class | Size / face | Use |
|---|---|---|
| `.display` | 132 Archivo 720 | numerals, one-word statements |
| `.hl` | 100 Newsreader 500 | slide headline (one line where possible; S05 uses 88) |
| `.hl-2` / `.hl-3` | 76 / 56 Newsreader | long headlines (exam card), panel heads |
| `.q.q-l` / `.q` / `.q.q-s` / `.q.q-xs` | 54 / 44 / 37 / 30 Newsreader italic 470 | quotes |
| `.lead`, `.mail-body` | 40 / 38 Newsreader italic | lead text, email bodies |
| `.text` / `.text-sm` | 34 / 30 Archivo 500 | body |
| `.kicker` | 28 Archivo 680, width 125 %, caps, .2em | kickers (`.soft` for the lower-case tail) |
| `.label`, `.caption`, `.chip`, `.who`, `.sf`, `.rh` | 28 | labels, captions, chips, attributions, chrome |

Body weight >= 480 (tokens: `--w-body` 500). Tokens: `--fs-display … --fs-min` (theme/tokens.css).
Big D: Archivo 860, width 125 %. Little d: Newsreader italic 430. Inline in text: `<span class="D">D</span>`,
`<span class="d">d</span>`.

**Glyphs the fonts do not have** (no system fallback anywhere; `check-deck` names any fallback glyph):
arrows → ← ↔ ↑ ↓, ≈, ≠, ↺, ✓, ✗, ☐, circled numbers. Use the sprite icons (1em, `currentColor`):

```html
<svg class="ic" aria-hidden="true"><use href="#ic-arrow-r"/></svg>
```
`ic-arrow-r ic-arrow-l ic-arrow-lr ic-arrow-u ic-arrow-d ic-approx ic-neq ic-loop ic-check ic-cross ic-box
ic-box-check ic-mail ic-trash ic-roots ic-badge ic-stamp ic-clock ic-person ic-arms ic-finger` and
`loop-96` (the timeline revision loop, draw-on ready). Circled numbers: `<span class="num">1</span>`
(`.num--teal`, `.num--amber`). Shipped subsets: latin, latin-ext, vietnamese (Ł ş ő č ę ơ ư … are fine).

## 5. Colour rules

| Token | Meaning — use only for this |
|---|---|
| `--teal` family | consensual / Big D (also `.D`, the D stamp, the consensus clock) |
| `--amber` family | top-down / little d (also `.d`, the vote stamp, revisions, the flip arrow) |
| `--grey` | "the usual pattern", ghost dots |
| `--verm` | hanko seals on S11b–d **only** |
| `--ink`, `--ink-2`, `--ink-3` | text: primary / secondary / tertiary (all >= 4.5:1 under beamer washout) |
| `--paper`, `--paper-ink` | the ringisho sheet |
| `--line`, `--line-2`, `--glass` | hairlines, card fills |

Neutral objects (Sheldon's seat, TRUE/FALSE stamps) are ink. Never hard-code a colour or a glow in group
CSS: use tokens (`var(--glow-teal)` …) so lit-room and paper modes recolour you for free.

## 6. Story vs daylight

- `class="slide story"`: case slides (S02–S04z, S06, S09, S10, S11, cases in Part I). Letterbox bars.
- `class="slide daylight"` (default): theory, classification, recommendations, Part II, backups.
- `class="slide bare"`: S01, S20, S20e.
Mode changes between two slides crossfade with the transition; no runtime.

## 7. Light pools (per slide, CSS only)

Three soft pools are painted in each slide's background: teal (consensual side), amber (top-down side),
spot (neutral key light, off by default). Place them in **your** CSS with custom properties:

```css
#s09a { --lt-x: 300px; --lt-y: 860px; --lt-s: .85;      /* teal pool centre + scale (1 = 1300 x 1000) */
        --la-x: 1500px; --la-y: 360px; --la-s: .8;      /* amber pool */
        --ls-x: 1280px; --ls-y: 540px; --ls-o: 1; }     /* spot pool on (opacity 0..1) */
```
Defaults: teal (420, 560), amber (1500, 480), spot off. Light where the meaning is (teal behind consensus,
amber behind top-down); keep text on calm areas. Lit-room and paper modes switch the pools off.

## 8. Builds, entrances and timing

| Attribute | Meaning |
|---|---|
| `data-step="n"` | revealed on click n (entrance only; **<= 6 clicks per slide**, no gaps) |
| `data-build="…"` | effect of a step / trigger: engine `fade rise drop left right wipe wipe-left wipe-down wipe-up zoom slam none`, Noir `set dropD write draw stamp notify bell` |
| `data-enter="…"` | entrance played when the slide is entered going forward (no click) |
| `data-delay`, `data-duration` | ms; maps onto `--deck-delay` / `--deck-duration` |
| `data-auto="ms"` | bridge slide auto-advance (only S04z) |

Noir effects: `set` (Big D sets from condensed to 125 %), `dropD` (Big D falls with weight, no bounce),
`write` (little d / pencil line written left to right), `draw` (SVG stroke draw-on; paths need
`pathLength="100"`), `stamp` (slam + the stamp's D sets), `notify` (a card drops in like a notification),
`bell` (bell curve grows out of the axis). Quotes fade up (`rise`), stamps `stamp`, the D/d pair `dropD`/`write`.

Timing tokens: builds 600 ms (`--deck-build-duration`, ease-out), morph 800 ms (`--deck-morph-duration`,
camera ease), fade 300 ms (`--deck-fade-duration`, "Fade 0.3 s"). **Hold text on a morph slide until the
shapes land**: give the incoming slide's text `data-enter="fade" data-delay="760"` (`--t-hold`) as on S05.

Final state = markup state: never move or hide something with a build; mid-slide changes are separate
morph slides. Only S04b changes state on triggers (stamps, cover).

## 9. Morph rules

- `data-morph="key"` pairs an element with the same key on the **adjacent** slide (the engine names only
  revealed elements). Keys are unique within a slide. Stamps, trigger chips and goto chips never get keys.
- A key present on one side only fades in / out (fine for objects that enter or leave); `check-deck` lists
  those singles under `morph` — read them and make sure each one is intended.
- Classes for how a pair travels (Chrome takes the class from the **incoming** element: put it on both):

| Class | Pair behaviour | Use |
|---|---|---|
| (none) | uniform scale + crossfade | cards, glyphs, dots, the rules card |
| `vt-shape` | stretches non-uniformly (object-fit fill) | bars and segments (clock bars → timelines) |
| `vt-swap` | old words leave, then new words arrive, natural size | breadcrumb, folio, relabelled labels |
| `vt-text` | scales, old words out before new in | a title that becomes a smaller title |
| `vt-grow` | small mark leaves at once, panel unfolds from it | S01 axis slivers → S02 tiles |
| `vt-leave` | single-sided: leaves fast (360 ms) instead of overprinting the next scene | S06 timelines, S10b/S11a/S11c exits |
| `vt-arrive` | single-sided: arrives late (from 420 ms) | S07 Deciding rail and dots |
| `vt-chip` | contain-fit both images; the card holds, then hands over to the chip | S02 quote cards → S03 monogram chips |
| `vt-rewrap` | like a plain pair, but old words out by 50 %, new in from 18 % (re-wrapped text) | S12a → S12b move chips |
| `vt-collapse` | a dot that may receive a collapsing card: hands over late (64–94 %), linear | Part II member dots |

- An element that needs two classes sets the bare value in group CSS: `view-transition-class: shape leave;`
  (the class names are `shape swap text grow leave arrive chip rewrap collapse`).
- Unchanged words: the engine marks an incoming partner `data-morph-same` when both sides show the same text;
  the theme then lets `vt-swap` / `vt-text` pairs travel as plain pairs (no fade-out / fade-in dip of an
  unchanged breadcrumb).

- A morph slide's root crossfade is staggered (old out by 420 ms, new in from 280 ms): build the incoming
  slide so nothing important sits where shapes travel, or hold it (`--t-hold`).
- Test every seam with `shoot --morph` at 20/45/70 % and read the frames.

## 10. Components (theme/components.css)

```html
<!-- quote with monogram + role -->
<blockquote class="quote">
  <p class="q">“…they cling to it with their lives.”</p>
  <p class="who"><span class="mono">LN</span><span>L. Nicoli <span class="role">· New York</span></span></p>
</blockquote>
<!-- .mono (64 px), .mono--teal/.mono--amber; .mono-chip (96 px, the S03 card-to-chip size) -->

<!-- card / panel (no fixed height) -->
<article class="card card--teal"><p class="card-tag"><svg class="ic"><use href="#ic-roots"/></svg>Working with BIG D</p> … </article>
<!-- .card--amber, .card--solid (opaque) -->

<!-- email card (S04b style; S09a, S20 rhyme it) -->
<article class="card mail">
  <p class="card-tag"><svg class="ic" aria-hidden="true"><use href="#ic-mail"/></svg>original</p>
  <p class="mail-body">Hey team / I thought we should meet …</p>
</article>

<!-- scenario card (S04b/S04z; S14a rhymes it). A stamp inside makes it a clean stamped card. -->
<article class="card scn scn--T">
  <h3 class="scn-title">SCENARIO T</h3>
  <p class="scn-body">Your proposal needs approval at Tokyo HQ. In four weeks.</p>
  <span class="scn-mono" aria-hidden="true">T</span>
  <div class="stamp stamp--D" data-triggered="dT" data-build="stamp"><b>D</b><span>no more<br>discussion!</span></div>
</article>

<!-- label chips (not clickable) -->
<p class="chip chip--amber">FAST IN · SLOW OUT <em>(flexible)</em></p>       <!-- .chip--teal, .chip--ink -->

<!-- hotspots (mouse only): >= 64 px tall, >= 40 px apart, labelled, hidden in print -->
<button class="hot hot--goto at" style="--x:1640px;--y:900px" data-goto="s13" data-print="hide"
        aria-label="Skip quick-fire 2: jump to slide 24"><svg class="ic" aria-hidden="true"><use href="#ic-arrow-r"/></svg> 24</button>
<button class="hot hot--D" data-trigger="d20" data-set="s20.stand=D" data-print="hide" aria-label="Stamp D">D</button>
<!-- .hot--vote (amber italic) -->

<!-- stamps: opaque, tilted (--tilt), slam in -->
<div class="stamp stamp--D at" style="--x:1500px;--y:160px" data-triggered="d20" data-build="stamp"><b>D</b><span>no more discussion!</span></div>
<div class="stamp stamp--vote" …><b>VOTE</b><span>a top-down technique<br>(Meyer, p. 159)</span></div>
<div class="stamp stamp--ink" data-step="2" data-build="stamp"><svg class="ic"><use href="#ic-cross"/></svg><b>FALSE</b></div>

<!-- "decided" cover with the elapsed time (S04b) -->
<div class="cover cover--D g-cover" data-triggered="dT dM">
  <p class="cover-word">decided</p>
  <p class="cover-meta">Big D · no more discussion<span class="big" data-show-if="d2.elapsed">after <span data-bind="d2.elapsed">0:00</span></span></p>
</div>

<!-- bars and the clock face (S04b; the S20 "three decisions" chart rhymes them) -->
<div class="bar bar--amber"></div> <div class="bar bar--teal"></div> <div class="bar bar--empty"></div>
<div class="track"><i style="--at:25%"></i><i style="--at:50%"></i><i style="--at:75%"></i></div>
<div class="ticks"><span style="--at:0%">0:00</span> … <span style="--at:100%">2:00</span></div>
<p class="clock-lbl amber"><b>Decision #1</b> · <svg class="ic"><use href="#ic-approx"/></svg> 3 s <span class="soft">· one person</span></p>
<p class="clock-num">2:00</p>

<!-- the D / d glyph pair (sizes / places are registry geometry) -->
<span class="glyph glyph--D g-glyph-D--title" data-morph="glyph-D" data-enter="set" aria-hidden="true">D</span>
<span class="glyph glyph--d g-glyph-d--title" data-morph="glyph-d" data-enter="write" aria-hidden="true">d</span>

<!-- implementation strokes: solid = closed (Big D), hatched = still open (little d); survives greyscale -->
<div class="impl impl--solid teal at" style="--x:1536px;--y:840px;--w:256px"></div>
<div class="impl impl--hatched amber at" style="--x:872px;--y:474px;--w:920px"></div>
<svg class="loop at" style="--x:1004px;--y:392px" data-build="draw" viewBox="0 0 96 96" aria-hidden="true"><use href="#loop-96"/></svg>
<p class="ann">“each decision is also flexible—a decision with a lowercase <span class="d">d</span>”</p>

<!-- rules card (S04a large, S04b parked, S13 rhyme): em-sized, see registry -->
<article class="card rules g-rules-large" data-morph="rule-card"> <h3 class="rules-h">HOW WE DECIDE</h3>
  <p class="rules-sub">(agreed before we decide)</p>
  <ol class="rules-list"><li><span class="num">1</span><span>All agree <svg class="ic"><use href="#ic-arrow-r"/></svg> stand up (or both hands up)</span></li> …</ol></article>

<!-- live line, gesture key -->
<p class="live"><span class="rec" aria-hidden="true"></span><b>STAND</b> = agree · <b>SEATED</b> = concern</p>
<p class="gesture">Gesture key: <svg class="ic gest teal"><use href="#ic-arms"/></svg> Big D = both arms up ·
   <svg class="ic gest amber"><use href="#ic-finger"/></svg> little d = one finger</p>

<!-- Tokyo / ringi (g4) -->
<i class="seat at" style="--x:…;--y:…"></i>  <!-- .seat--teal (aligned group), .seat--ink (Sheldon) -->
<div class="ringisho g-ringisho lv-mid" data-morph="ringisho"><p class="ringisho-t">ringisho</p><p class="ringisho-s">(proposal document)</p>
  <div class="ringisho-ln"></div><div class="ringisho-ln s"></div>
  <div class="seals"><span><i class="hanko" style="--r:-8deg" data-morph="hanko-1"></i></span> … <span><i class="hanko hanko--D"><b>D</b></i></span></div></div>

<!-- Part II (g6) -->
<i class="mem at" data-morph="mem-1"></i> <i class="ring at" data-morph="ring-1"></i> <i class="ring ring--self"></i> <div class="bracket at" data-morph="bracket"></div>

<!-- sized components (.seat, .mono, .ringisho, .mem, .ring) also set --w / --h, so with .at they keep their size;
     pass style="--w:…" to override -->

<!-- placeholders: never invent a member's name, culture or story -->
<span class="ph">[MEMBER 1 · name]</span> <span class="ph">[culture(s)]</span> <span class="ph">[anecdote]</span>

<!-- "ours" tag for our own devices -->
<p class="q">A country is a bell curve, not a dot.<span class="ours">ours</span></p>
```

## 11. MORPH-KEY REGISTRY (canonical geometry, stage px)

**Binding** objects must sit exactly here on every slide that carries them (use the `g-…` class; do not
restate the numbers). **Seam** objects only need the key on both sides; their geometry on your side is yours.

| Key | Slides | Class / geometry | Notes |
|---|---|---|---|
| `rh-crumb` | every non-bare slide | `.rh-crumb.vt-swap` in `.rh` (x 72, y 0–64) | binding; text changes hand over |
| `rh-title` | every non-bare slide; S01 lockup | `.rh-title` "Big D or little d?" (right, before the folio) | binding; **S02: `.rh-title.vt-text`** (S01's title shrinks into it; all other slides plain) |
| `rh-folio` | every non-bare slide | `.rh-folio.vt-swap` `data-folio-text="2"` | binding; engine fills the number |
| `glyph-D` / `glyph-d` | S01 → S02 | S01 `.g-glyph-D--title` (70, 236, 560 px) / `.g-glyph-d--title` (676, 384, 430 px); S02 `.g-glyph-D--off` / `.g-glyph-d--off` (`data-offstage`, they slide off) | seam S01→S02 (g1 keeps the off-stage pair) |
| `glyph-D` / `glyph-d` | S05 → S06 | S05 `.g-glyph-d--tl` (736, 296, 250 px), `.g-glyph-D--tl` (1338, 728, 196 px) | seam S05→S06 (g2 places them on its stacked timelines) |
| `glyph-D` / `glyph-d` | S13, S20, S20e | rhymes (not adjacent to S05): S20/S20e use the title geometry with a "?" between | |
| `tile-ny` / `tile-mu` | S01 → S02, S02M | S01 slivers on the axis at Fig. 5.3 US / Germany; S02 panels as built by g1: NY (72, 236, 864 x 500) / MU (984, 236, 864 x 500) (`.g-tile-*` keeps the original 150 / 560 proposal, unused), class `vt-grow` | seam; the band above holds the headline and the CEO badge |
| `clock-td` | S02 (from click 1), S02M, S03, S04a, S04b, S04z | `.bar.bar--amber.g-clock-td` (72, 825, 44 x 28) = 3 s on the 2:00 track | **binding, parked bottom-left; keep (72–700, 815–860) free on S02–S04a** |
| `clock-td` | S05 | `.g-tl-td-disc` (600, 470, 132 x 30), class `vt-shape` | the amber Discussion segment; S06 receives it |
| `clock-td-lbl` | S02, S02M, S03, S04a, S04b | `.clock-lbl.amber.g-clock-td-lbl.vt-swap` (136, 822): "#1 ≈ 3 s" (S04b: "Decision #1 · ≈ 3 s · one person") | binding |
| `clock-cons` | S04z → S05 | S04z `.bar--teal.g-clock-cons` (72, 868, 1776 x 72); S05 `.g-tl-cons-disc` (600, 836, 720 x 30); `vt-shape` | S06 receives it |
| `impl-td` / `impl-cons` | S05 → S06 | `.impl--hatched.amber.g-tl-td-impl` (872, 474, 920) / `.impl--solid.teal.g-tl-cons-impl` (1536, 840, 256) | seam |
| `loop-1…3` | S05 → S06 | `.loop` at (1004 / 1284 / 1564, 392) | seam |
| `rule-card` | S04a → S04b; S13 rhyme | `.card.rules.g-rules-large` (527, 168, 46 px em) → `.g-rules-parked` (72, 96, 29 px em) | **binding**; same markup at both scales |
| `mail` (no key) | S04b; rhymes S09a, S20 | `.card.mail` at (648, 96, w 1200) (`.g-mail`) | S09a: same place and style |
| `scn-T` / `scn-M` (no key) | S04b, S04z; rhyme S14a/S14m | `.card.scn.scn--T` (648, 323, 584), `--M` (1264, 323, 584) (`.g-scn-T/M`) | S14a: same style, centred |
| `card-ln` / `card-mw` | S02, S02M → S03 | S02 quote cards (left / right half) → S03 `.mono-chip` (96 px circle) | g1 internal |
| `axis-dec` | S01, S07, S08a, S15–S18 | `<!--@axis-->` presets: `title` (S01), `rails` (S07, x 320–1600, y 720), `map` (S08a, y 578), `room` (S15 y 600, S18 y 424), `strip` (S16–S17b) | S07→S08a: same set + keys, the rail widens, so the dots glide proportionally (a zoom-out) |
| `axis-lead` | S07 | `<!--@axis {"preset":"rails","kind":"lead","y":420,"prefix":"lead-",…}-->` | g2 |
| `dot-<k>` | S07 → S08a; S15 → S18 | generated (`dot-se`, `dot-jp`, …); `.dax-c` has a 16 x 16 transparent border box so keyed dots are drawn mid-morph | S07: SE NL DE US JP CN keep Fig. 5.3 fractions; KR VN fade |
| `col-bigD` / `col-smalld`, `colh-bigD` / `colh-smalld`, `mv-D1…5` / `mv-d1…5`, `qf`, `qf-k`, `qf-hl` | S12a → S12b → S12c | g5 | columns shrink to the side edges; every chip glides on its own key |
| `glyph-d` | S12c → S13 | g5: the quick-fire answer d glides into S13's d | S13's D and rule-card fade in |
| `exam-q` | S14b → S14c | g5: the exam question shrinks into the S14c headline (`vt-text`) | |
| `per-mail` / `per-mail-txt` | S09a → S09b | g3: card frame (`vt-shape`) / words wrapper (`vt-text`) | revealed at S09a click 3 |
| `g4-kicker`, `g4-hl`, `table`, `seat-1…10`, `seat-js`, `lbl-jp/nj/js`, `bar-3w`, `bar-3w-lbl` | S10a → S10b → S11a | g4 | seats turn teal by morph (S10b), table → lectern and seats → desk rows (S11a) |
| `tier-top/senior/mid/staff`, `tl-*`, `ringisho`, `g4-def`, `g4-mori`, `trail-1/2`, `mk-mid/senior` | S11a → S11b → S11c → S11d | g4: desk rows → pyramid tiers; ringisho 312 x 179 at x 484, y 613 / 426 / 268 (`.g-ringisho` unused); hanko travel inside the card (no keys) | |
| `mem-1…3`, `ring-1…3`, `bracket` | S15 → S16 → S17 → S17b → S18 | g6: every P slide carries all three `mem` | any two visible P slides must morph |

Stamps and chips never morph. Morph pairs only with the slide shown immediately before (incl. jumps).

## 12. State-key registry (engine store: data-set / data-bind / data-show-if)

| Key | Values | Set by | Read by |
|---|---|---|---|
| `d1.first` | unset = NY (default), `MU` | S02 chip "MUNICH → 3": `data-set="d1.first=MU"` | S03 (quote order), anything that names the city |
| `d2.scenario` | `T` / `M` | S04b chips (`data-set="d2.scenario=T; d2.method=D"`) | S13 hint, S14a/S14m, S20 |
| `d2.method` | `D` / `VOTE` | S04b chips | S05 debrief, S14a ("You stamped a capital D" / "by vote") |
| `d2.elapsed` | `m:ss` (e.g. `1:24`) | S04b timer (`data-timer-store`), stored when a stamp stops it | S04b cover, S05 label, S20 bars |
| `d2.elapsed_s` | seconds (`84`) | same | numeric tests: `data-show-if="d2.elapsed_s>=120"` |
| `s20.stand` | `D` | S20 stamp chip (`data-set="s20.stand=D"`) | S20 (and S20e if wanted) |

```html
<p data-show-if="d2.method==VOTE">You decided by vote — Meyer files that under top-down.</p>
<span data-bind="d2.elapsed" data-print="minutes">minutes</span>   <!-- markup text = fallback while unset -->
```
Every `data-show-if` / `data-bind` needs its print state: `data-print="show"` (show-if) or `data-print="…"`
(text). Shift+R resets the store. New keys: ask the foundation (registry first).

## 13. Print rules (`?print`, PDF, PPTX)

Print shows every slide in its final build state, one page per slide, triggers hidden.
- Hotspots and live hints: `data-print="hide"` (all `.hot` are hidden in print anyway).
- Live outcomes become a dashed outline that says what the room decides: `data-print-only`
  (S04b: "D or VOTE? — decided live by the room"; S20: "stand-up — decided live"; S14a: "decided by you").
- Timers: `data-print="2:00" data-print-progress="0"` (no fake fill). Binds: `data-print="…"`.
- Hidden slides get "Variant · chosen live" / "Backup · hidden slide" automatically (`data-print-tag` to
  override). Bridge slides carry a `<p class="print-tag" data-print-only>` (see S04z).
- Check both palettes: `shoot` writes `-print.png` (dark, default) and `-paper.png` (`?print&paper`).

## 14. Lit-room, paper, reduced motion

- **Lit-room** (key L, persisted, synced to the presenter; `?lit` for screenshots): pools, grain and glows
  off, neutral graphite, heavier strokes. Use tokens and you are covered; check your `-lit.png`.
- **Paper** (`?print&paper`, `export-pdf --paper`): light palette, same type. Check your `-paper.png`.
- **Reduced motion**: the engine swaps instantly; theme loops stop. Nothing may depend on an animation.

## 15. The country-position file and the axis

`slides/src/data/countries.json` is the **only** source of country positions:
- `sets.fig53`: Meyer (2014), Fig. 5.3, measured on the scan (label centre / arrow-to-arrow length),
  with the book's two label rows. Use it for S01 tiles, S07 (Deciding rail), S08a.
- `sets.cm2022`: Country Mapping 2022, re-read on the PDF by g2 and g6 (agree within 0.01): `verified: true`
  except Italy (dot hidden behind Portugal / Greece). Includes DK, BE, IL, NG. A new country: read it on the
  PDF first, then add it here. Never print a score; state zones.
- `presets`: canonical axis geometry (`title`, `rails`, `map`, `room`, `strip`).

Render with a directive inside your slide (expanded by `assemble.cjs`; preview the markup with
`node tools/lib/axis.cjs '{…}'`):

```html
<!--@axis {"preset":"map","static":["se","nl","de","us","jp","cn"],"step":1,"bells":2,"bellDir":"down","bellAmp":170}-->
```

| Option | Meaning |
|---|---|
| `preset`, `x0`, `x1`, `y`, `rowUp`, `rowLo` | geometry (arrow tips, rail y, label rows) |
| `set` | `fig53` (default) or `cm2022` |
| `show`, `static`, `step`, `stagger` | which countries, which are there from the start, the build step of the rest (revealed from both ends inward) |
| `labels` | `true` (book rows), `"below"`, `false` |
| `ghost` | `true` or keys: grey ghost dots (S15) |
| `bells`, `bellDir`, `bellAmp`, `bellSigma` | bell curves (`bells: n` = build step). `bellDir: "down"` hangs them under the rail so **no curve crosses a label** (S08a must-fix) |
| `morph`, `prefix`, `rail` | keys `axis-dec` + `dot-<k>` by default |
| `kind: "lead"`, `ends`, `points` | the neutral Leading rail with custom by-eye points (S07; say so in the source line) |
| `tiles`, `class`, `id` | S01 slivers; extra classes; id |

The layer is `.dax` (full stage, `pointer-events: none`): `.dax-rail`, `.dax-end`, `.dax-c` (+ `.dax-dot`,
`.dax-lab`), `.dax-bells`. Restyle locally if needed (`#s08a .dax-lab { … }`), never the positions.

## 16. Hard rules (recap)

No speaker notes. Never invent a quote, value, position, page number or a member's culture. No raster
derived from the scans, no photos of people, no logos, no kanji. No network at present time. Builds only
by clicker/keyboard; the mouse touches only small labelled hotspots. <= 6 builds. Look at your own
screenshots (every state, lit, beamer, print, paper, morph frames) before you report done. Do not commit.

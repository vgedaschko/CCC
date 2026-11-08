# deck: the presentation engine for "Big D or little d?"

A small, design-agnostic HTML presentation engine (`engine/deck.js` + `engine/deck.css`, no runtime
dependencies) plus tools that turn a deck into one offline HTML file, a PDF and a .pptx.

The visual design is not part of the engine. Each design direction in `design/directions/` uses the
same markup contract, so the chosen design is ported by keeping its markup and CSS and loading this
engine instead of the prototype runtime.

```
deck/
  engine/deck.js, deck.css   the engine (include both in every deck)
  slides/big-d.html          THE deck (assembled from slides/src by tools/assemble.cjs; do not edit by hand)
  slides/src/                deck sources: template, manifest, Noir theme, one partial pair per group,
                             data/countries.json; builders' handbook: slides/src/DECK_SPEC.md
  slides/fonts/              Archivo + Newsreader (latin, latin-ext, vietnamese; SIL OFL, OFL-*.txt), Inter for the demo
  slides/demo.html, demo.css 12-slide engine demo that uses every feature (plain styling)
  tools/assemble.cjs         slides/src -> slides/big-d.html (or a private --out copy)
  tools/check-deck.cjs       automated QA of an assembled deck (layout, fonts, builds, morph pairs, print)
  tools/shoot.cjs            screenshots: every build, print, paper, lit-room, beamer washout, mid-morph frames
  tools/build.cjs            inline everything into ONE offline .html
  tools/export-pdf.cjs       one 16:9 page per slide, final build state (--paper: light variant)
  tools/export-pptx.cjs      one full-bleed picture per slide, titles set, notes empty (--jpeg q: JPEG pictures)
  tools/lib/                 axis.cjs (the Deciding axis generator), woff2-cmap.cjs (font cmap reader)
  tests/run-tests.cjs        engine suite on slides/demo.html (file://)
  tests/big-d.cjs            end-to-end suite on THE deck: clicker run-through, branches, triggers, hub, print, lit-room
```

## Commands

Run these from `deck/`. Playwright is used from its global install (`require('playwright')`);
`npm install` only fetches `pptxgenjs` for the .pptx export.

| What | Command |
|---|---|
| Install the one dev dependency | `npm install` |
| Assemble the deck | `node tools/assemble.cjs` (writes `slides/big-d.html`); a builder's private copy: `--out slides/.tmp-g3.html` |
| Check the deck | `node tools/check-deck.cjs --deck slides/big-d.html [--slides s05,s06] [--stress] [--json]` |
| Screenshots | `node tools/shoot.cjs --deck slides/big-d.html --slides s04b --out <dir> [--fire s04b:dT] [--elapsed 84] [--morph s04b:s05] [--contact]` |
| Present | open `slides/big-d.html` (or `slides/demo.html`) in Chrome or Edge (double-click works: `file://` is fine) |
| One offline file | `node tools/build.cjs slides/demo.html dist/demo.html` (add `--strict` to fail on remote URLs) |
| PDF (all slides, final state) | `node tools/export-pdf.cjs slides/demo.html dist/demo.pdf` (`--paper`: the light paper variant) |
| PPTX (pictures, no notes) | `node tools/export-pptx.cjs slides/demo.html dist/demo.pptx` (`--jpeg 94`: JPEG pictures, a quarter of the size) |
| All three | `npm run export` (the demo); the real deck: `npm run deck:all` (see "Present the real deck") |
| Tests | `npm test` = engine suite + deck suite (`npm run test:engine`, `npm run test:deck`; a name filter: `node tests/run-tests.cjs presenter`, `node tests/big-d.cjs hub`) |

The exporters accept the source deck or the built file. `dist/`, `node_modules/` and private copies
`slides/.tmp-*` are git-ignored. `assemble`, `check-deck` and `shoot` only read the sources and write their
own output (atomically, or not at all), so several builders can run them in parallel with their own `--out`.

**Course rule.** "Only a PowerPoint presentation without notes is permitted." The .pptx export has
empty notes and a title on every slide. Hidden slides stay hidden in the .pptx and appear in the
PDF with the tag *Variant · chosen live*. The presenter view has no notes field.

## Present the real deck

### Open it

- **On the presentation laptop:** copy `dist/big-d.html` (one offline file: engine, theme, fonts inlined; no network)
  and open it in **Chrome or Edge** (double-click is fine). From the repository: `slides/big-d.html` works the same,
  as long as `slides/src/`, `slides/fonts/` and `engine/` sit next to it.
- Put the deck window on the beamer, press **F** (fullscreen), then **P**: the presenter window opens; drag it to the
  laptop screen. Clicker keys work in both windows.
- **Before the talk (and before every rehearsal): Shift+R** in the deck window. It resets the S04b timer and stamps,
  the stored outcomes (S02 path, scenario, method, time) and the talk clock. The clock starts by itself on the first
  advance.
- Lit classroom? Press **L** (lit-room mode: no light pools, grain or glows, heavier strokes). It is remembered for the
  tab and mirrored to the presenter window.

### Keys

| Key | Action |
|---|---|
| Clicker / PageDown / → / Space | next build, then next slide (hidden slides are skipped; S04z moves on by itself) |
| Clicker back / PageUp / ← | previous build; at a slide's first build, the previous slide in its final state (after a jump: back where you came from) |
| digits, then **Enter** | jump to a physical slide number (the list below); Esc cancels |
| **B** or `.` | black screen on/off (any Next/Prev also lifts it) |
| **L** | lit-room mode on/off |
| **P** | presenter window (clock, checkpoints, current + next preview, no notes) |
| **F** | fullscreen |
| Home / End | first / last visible slide (End = S20E) |
| **?** | help overlay |
| **Shift+R** | reset live outcomes, timers, stamps and the talk clock |

### Numbers to memorise (physical positions: what you type, and what the chips say)

The small number in the top-right corner is the **folio** (visible slides only), so it differs from these.

| Type | Lands on | Chip on screen |
|---|---|---|
| **3** | S02M, Munich first (hidden variant; Next rejoins S03) | S02: `MUNICH → 3` (also stores "Munich first") |
| **24** | S13, Mixed team? | S12b: `→ 24` (skips quick-fire 2) |
| **26** | S14M, Apply · scenario M (hidden; Next rejoins S14B) | S13: `M → 26` (S13 shows "your scenario: M" when the room picked M) |
| **29** | S15, Part II | S14b: `II → 29` (skips true-or-false) |
| **35** | S20, the close | H1: `← end · 35` (lands on S20's final state) |
| **36** | H1, the Q&A hub (hidden) | S20 / S20E: `→ 36` |
| **37 – 40** | H2 consensus better? · H3 Country Mapping by region · H4 course bridge · H5 more rails | the four hub tiles; each backup has `← back` |
| **41** | S20E, the end copy (Next from S20 lands here; a stray click shows nothing new) | |

The S04b chips are triggers, not jumps: **D** or **vote** under the scenario the room took (T or M). A mis-click is
corrected by clicking the right chip. The stamp stops the 2:00 clock; the time is shown on S04b, S05, S14A/S14M and
the S20 bar chart. The S20 **D** chip stamps the proposal when the room stands up (S20E keeps the stamp).

A straight clicker run from S01 to S20E (two presenters, no branches) is **104 presses** (checked by `npm run test:deck`).

### Checkpoints (presenter view)

| Slide | Due by | Meaning |
|---|---|---|
| S05 | 7:30 | definition reached |
| S09A | 14:45 | Per's inbox |
| S12A | 19:30 | toolkit |
| S15 | 25:00 | Part II starts |

Each shows *due in m:ss*, *✓ … ahead* or *behind*; amber means late within 20 s, red later. A detour to a Q&A backup
does not tick a checkpoint off.

### Part II: fill in the placeholders (never invent a member's name, culture or story)

- Every member or team slot is a `<span class="ph">[…]</span>`: 33 in `slides/src/06-g6-part2.html` (S15–S19) and the
  three `[MEMBER n]` names on the title slide in `slides/src/00-foundation.html`. Type over the text and drop the span.
- Positions on the Deciding axis: **one CSS block at the top of `slides/src/06-g6-part2.css`** (`--m1 … --m3` culture
  dots, `--m1-lead …` Leading dots, `--r1 … --r3` "where I place myself"). Fractions 0 (consensual) … 1 (top-down),
  read from the member's Country Mapping 2022 region page; never a score.
- Verdict on a P slide and the S18 team timeline: change one class, `g6-v--tbd` to `g6-v--D` or `g6-v--d`.
- **Three presenters:** in `06-g6-part2.html`, remove `data-hidden` and `data-print-tag="…"` from
  `<section … id="s17b" …>`. Next then runs S17 → S17B → S18, and the folios renumber by themselves.
- Then: `node tools/assemble.cjs && node tools/check-deck.cjs --deck slides/big-d.html && npm run test:deck`
  (the deck suite detects the three-presenter setup by itself).

### Exports (run from `deck/`)

| Output | Command | Size |
|---|---|---|
| everything below, after a fresh assemble | `npm run deck:all` | |
| `dist/big-d.html`, one offline file | `npm run deck:build` (`build.cjs --strict`: fails on any remote URL) | ≈ 1.7 MB |
| `dist/big-d.pdf`, dark, 41 pages, final states, hidden slides tagged | `npm run deck:pdf` | ≈ 16 MB |
| `dist/big-d-paper.pdf`, light paper palette (for e-mail / print) | `npm run deck:pdf-paper` | ≈ 10 MB |
| `dist/big-d.pptx`, 41 pictures, titles, notes empty, hidden slides hidden | `npm run deck:pptx` (JPEG q94) | ≈ 11 MB |

The PDFs carry vector text (Chromium embeds the variable fonts as Type 3 glyphs, one set per weight/width instance,
which is most of their size). Live outcomes print as dashed outlines ("D or VOTE? — decided live by the room",
"stand-up — decided live", "decided by you").

## Markup contract

```html
<link rel="stylesheet" href="../engine/deck.css">
<link rel="stylesheet" href="my-design.css">
<script type="application/json" id="deck-config">
  { "title": "Big D or little d?",
    "lateTolerance": 20,
    "checkpoints": [ { "slide": "s05", "by": "7:30" }, { "slide": "s09a", "by": "14:45" },
                     { "slide": "s12a", "by": "19:30" }, { "slide": "s15", "by": "25:00" } ] }
</script>
<script src="../engine/deck.js" defer></script>

<div id="stage">                                   <!-- fixed 1920x1080 canvas, scaled to fit -->
  <section class="slide" id="s02" data-transition="morph" data-title="Decision #1">
    <h2 data-morph="title">Whose story first?</h2>
    <div class="ceo" data-step="1" data-build="slam">CEO</div>
    <button data-goto="s02m" data-set="decision1.first=Munich">MUNICH → 3</button>
  </section>
</div>
```

### Slides

| Attribute | On | Meaning |
|---|---|---|
| `class="slide" id="…"` | `<section>` | One physical slide. Ids are used by the hash, jumps, checkpoints and state. |
| `data-transition="morph\|fade\|none"` | slide | Transition **into** this slide (default `fade`). Going back uses the transition of the slide being left. |
| `data-hidden` / `data-hidden="backup"` | slide | Skipped by Next/Prev. Reachable by number, `data-goto` or the hash. Tagged in print. |
| `data-next="id"` | slide | What Next does after the last build of this slide (for variants: S02M → S03). |
| `data-auto="ms"` | slide | Auto-advance after the entry transition plus `ms` (bridge slides). Prev skips such slides. `?noauto` holds bridges (for screenshots). |
| `data-title="…"` | slide | Title for the presenter view and the .pptx (default: first `h1`/`h2`/`h3`). |
| `data-print-tag="…"` | hidden slide | Overrides the print tag text. |
| `data-folio-text[="2"]` | any element in a slide | The engine writes the slide's **folio** into it (the number among visible slides, zero-padded to the given width). Hidden slides get an empty text; an auto bridge repeats the folio of the slide before it. |

The engine also writes `data-folio="n"` on every slide (empty on hidden ones, which also get
`data-folio-hidden="variant|backup"`) and `data-folio-total` on the stage, so a design can place and
format the folio itself. Never hard-code slide numbers.

### Builds (entrance-only)

| Attribute | Meaning |
|---|---|
| `data-step="n"` | Revealed at click *n* of the slide (n ≥ 1). Prev un-reveals the last build. |
| `data-build="…"` | Entrance effect: `fade` (default), `rise`, `drop`, `left`, `right`, `wipe` (from the left), `wipe-left`, `wipe-down`, `wipe-up`, `zoom`, `slam`, `none`. |
| `data-enter[="effect"]` | Plays an entrance when the slide is entered going **forward** (e.g. the email "drops in"). |
| `data-delay="ms"`, `data-duration="ms"` | Stagger and length of an entrance. |

Builds only ever animate **into** the element's own CSS state (opacity, clip-path, small
`translate`/`scale`; the CSS `transform` property is left alone). So a slide's final state is its
markup state. Morph starts from that placed state, and print shows exactly it. Entering a slide
backwards shows its final state at once, with no animation.

### Morph

`data-morph="key"` marks an element that persists between consecutive slides. Keys must be unique
within a slide. On a `morph` transition the engine sets `view-transition-name` from the key on the
outgoing and incoming slide (only on elements that are currently revealed). Then it calls
`document.startViewTransition`, and clears the names afterwards. Without the API (or with `?novt`)
it falls back to a CSS crossfade. With `prefers-reduced-motion: reduce` it swaps instantly.
A `fade` transition is a View Transition with no names (a root crossfade).

### Hotspots, triggers and live state

| Attribute | Meaning |
|---|---|
| `data-goto="id"`, `"id/step"`, `"5"`, `"@back"` | Jump. `@back` returns to the last slide viewed (Q&A backups). Also `@next`, `@prev`. |
| `data-trigger="x"` | Reveals every element with `data-triggered` containing `x` **on this slide**. A click on it never advances. |
| `data-trigger-group="g"` | Triggers in a group are exclusive: firing one un-fires the others (corrects a mis-click). |
| `data-triggered="x y"` | Revealed when any listed trigger has fired (e.g. the "decided" cover lists all four stamps). |
| `data-set="a.b=X; c=Y"` | On a trigger or goto: writes to the state store. |
| `data-stop-timer="id …"` | On a trigger or goto: stops those timers (empty value: all timers on the slide). |
| `data-timer="120"` | Countdown in seconds. Starts when revealed, shows `m:ss` and a bar. Keeps running across navigation. Undoing its build with Prev resets it. |
| `data-timer-store="key"` | When the timer is stopped, stores the elapsed time as `key` (`"1:23"`) and `key_s` (`"83"`). |
| `data-bind="key"` | Text = live value of `key` (the markup text is the fallback while unset). |
| `data-show-if="expr"` | Shown only while `expr` holds: `k==V`, `k!=V`, `k`, `!k`, `k>=3` (numeric), joined with `&&` / `\|\|`. |

Fired triggers, timers, the store and the talk clock persist in `sessionStorage` for the tab, so a
reload resumes them. **Shift+R** resets them for the next rehearsal.

Timer markup hooks: the engine adds `[data-timer-text]` and `[data-timer-bar] > .deck-timer-fill`
unless you supply your own `[data-timer-text]`/`[data-timer-bar]`. It sets `--deck-progress` (0…1)
and `data-timer-state="idle|running|done|stopped|print"` on the timer element.

### Print defaults (`?print`, PDF, PPTX, Ctrl+P; `?print&paper` / `--paper` for the paper variant)

Print mode shows every slide in its **final** build state, one per page, with morph disabled.
Hidden slides are included and tagged *Variant · chosen live* (backups: *Backup · hidden slide*).

| Element | In print |
|---|---|
| `data-bind`, `data-timer` | Shows its `data-print="…"` text (a timer shows its full duration if absent; `data-print-progress` sets the bar, default full). |
| `data-triggered`, `data-show-if` | Hidden, unless `data-print="show"`. |
| any element with `data-print="hide"` | Hidden (trigger chips, live hints). |
| `data-print-only` | Shown **only** in print (e.g. a dashed "D or VOTE? Decided live by the room" outline). |

### Engine classes and variables (for design CSS)

- State classes: `.slide.is-active`, `[data-step].is-revealed`, `[data-triggered].is-triggered`,
  `[data-trigger].is-fired` (+ `aria-pressed`), `[data-show-if].is-if-off`, `.deck-anim` (entrance playing).
- Root classes: `deck-mode-audience|presenter|embed|print`, `deck-print`, `deck-is-black`, `deck-vt-morph|fade`,
  `deck-lit` (lit-room mode, key **L**), `deck-paper` (`?paper`, e.g. `?print&paper` for the light print variant).
- Variables: `--deck-build-duration`, `--deck-build-ease`, `--deck-morph-duration`, `--deck-morph-ease`,
  `--deck-fade-duration`, `--deck-fallback-duration`, `--deck-letterbox`.
- Design-specific build effects: add CSS for `.deck-anim[data-build="name"]` / `[data-enter="name"]` with a
  keyframe name that starts with `deck-` (the engine clears `.deck-anim` when such an animation ends).
- `#stage`, `.deck-stage` and `.slide` selectors all work everywhere: the presenter's preview panes
  load the same file. `deck.css` enforces only the stage size and the hide/show rules; its other
  defaults have zero specificity, so design CSS wins without `!important`.

## Keys

| Key | Action |
|---|---|
| → ↓ PageDown Space Enter, click on empty stage | Next build / slide |
| ← ↑ PageUp Backspace, Shift+Space | Previous build / slide (to the final state of the previous slide) |
| digits, then Enter | Jump to physical slide *n* (1-based, hidden slides included); Esc cancels |
| Home / End | First / last visible slide |
| B or `.` | Black screen on/off (any Next/Prev or click only lifts it) |
| F (F5 enters) | Fullscreen |
| P | Presenter window |
| L | Lit-room mode on/off (root class `deck-lit`; the design drops glows and light, raises contrast). Persisted with the live state, mirrored to the presenter window and its previews, kept by Shift+R. `?lit` forces it on. |
| ? | Help overlay |
| Shift+R | Reset live outcomes, timers, stamps and the talk clock |

Clickers send PageDown/PageUp (and often `b`/`.`): all are covered. Key presses during a running
transition are never dropped or doubled. Each press updates the position at once, and an
in-flight transition skips to its end before the next one starts. The URL hash keeps the
position (`#s05/2`), so a reload resumes there.

Mouse: a click on a hotspot while a transition is still running finishes the transition and
activates the hotspot (it does not count as a click on the empty stage). The second click of a
double-click on a hotspot is ignored, so a double-clicked `data-goto` jumps once and does not also
advance the slide it lands on. A number that matches no slide is reported in the window where it
was typed (in the presenter, not on the beamer).

**Prev after a jump.** If you arrived by a jump (number, `data-goto`, `data-next`), Prev at the
first build goes back to where you came from (final state). Otherwise it goes to the previous
visible slide.

## Presenter view

Press **P** in the deck window. A second window opens (`?presenter`; `#presenter` also works).
Put it on the laptop screen and the deck on the beamer. It shows:

- the elapsed **talk clock** with Start/Pause/Resume and Reset. It starts by itself on the first
  advance, and lives in the deck window, so closing and reopening the presenter keeps it.
- the **checkpoints** from `#deck-config`, each marked *due in m:ss*, *✓ reached · m:ss ahead*,
  or *behind*. Amber means late within `lateTolerance` (default 20 s), red means later than that.
  The next checkpoint is highlighted. A checkpoint counts as reached on its slide or any later one,
  except a Q&A backup (`data-hidden="backup"`): a visit to the hub mid-talk does not tick them off.
- the current slide (live, clickable: hotspots and trigger chips work there) and its build number,
  plus a preview of the **next** build or slide.
- Prev / Next / Black / Lit room buttons (the flags line shows BLACK and LIT). Every key above also works in the presenter window.
- **No notes field**, by design.

Sync uses the `window.open` reference and `postMessage` in both directions, so it works from
`file://` (BroadcastChannel does not, reliably). The presenter says hello every second, so if the
deck window is reloaded it reconnects by itself. The two panes are the deck itself, loaded in an
embed mode (`?embed`) and fed the same state.

## Scripting API (window.Deck)

`Deck.next() / prev() / first() / last() / go(id, step) / jump(n) / black(on) / lit(on) / trigger(name) / reset()`,
`Deck.state()` (`{ id, index, step, steps, folio, hidden, black, lit, … }`), `Deck.slides` (with `folio`),
`Deck.store.get/set/all()`, `Deck.timers()`, `Deck.clock.*`, `Deck.isLit`, `Deck.paper`, `Deck.on(event, fn)`
(`ready`, `change`, `shown`, `trigger`, `timerstart`, `timerstop`, `timerdone`, `lit`, `reset`).

## Porting a design onto the engine

1. Keep the design's slide markup and CSS. Replace its runtime `<script>` with `engine/deck.js`
   and add `engine/deck.css` **before** the design CSS.
2. Check the contract attributes: `data-step`, `data-morph`, `data-transition`, `data-goto`,
   `data-trigger`/`data-triggered`, `data-timer`, `data-bind`/`data-show-if` + `data-print`.
3. Move fonts and images to local files (the build inlines them; remote URLs make `--strict` fail).
4. Put the checkpoints into `#deck-config`. Then check the real deck: `node tools/export-pdf.cjs`
   must report one page per slide, and the browser console must stay free of errors.

## Known limits

- The View Transition morph needs Chrome/Edge 111+ (Safari 18+, Firefox 144+). Older browsers get the crossfade.
- Chromium embeds CFF-flavoured (`.otf`-based) web fonts in the PDF as Type 3 glyphs: still vector
  and searchable, but some PDF tools warn. TrueType-flavoured fonts embed normally.
- The .pptx holds one picture per slide (no live text, animation or morph). It is the static copy
  for submission, with a title on each slide for accessibility. Present from the HTML.
- `sessionStorage` is per tab: opening the deck in a new tab starts with fresh live state.
- `build.cjs` parses CSS with regexes. A quoted `url("…")` is taken whole (so `url(%23id)` fragment
  references inside a quoted SVG data URI are left alone), and `#`/`%23` fragments are never treated
  as files. `srcset`, `image-set()` and assets loaded from JavaScript are not inlined.

# deck: the presentation engine for "Big D or little d?"

A small, design-agnostic HTML presentation engine (`engine/deck.js` + `engine/deck.css`, no runtime
dependencies) plus tools that turn a deck into one offline HTML file, a PDF and a .pptx.

The visual design is not part of the engine. Each design direction in `design/directions/` uses the
same markup contract, so the chosen design is ported by keeping its markup and CSS and loading this
engine instead of the prototype runtime.

```
deck/
  engine/deck.js, deck.css   the engine (include both in every deck)
  slides/demo.html           12-slide demo that uses every feature (plain styling)
  slides/demo.css, fonts/    demo styles and a subset of Inter (SIL OFL, see fonts/OFL.txt)
  tools/build.cjs            inline everything into ONE offline .html
  tools/export-pdf.cjs       one 16:9 page per slide, final build state
  tools/export-pptx.cjs      one full-bleed picture per slide, titles set, notes empty
  tests/run-tests.cjs        Playwright suite (file://)
```

## Commands

Run these from `deck/`. Playwright is used from its global install (`require('playwright')`);
`npm install` only fetches `pptxgenjs` for the .pptx export.

| What | Command |
|---|---|
| Install the one dev dependency | `npm install` |
| Present | open `slides/demo.html` in Chrome or Edge (double-click works: `file://` is fine) |
| One offline file | `node tools/build.cjs slides/demo.html dist/demo.html` (add `--strict` to fail on remote URLs) |
| PDF (all slides, final state) | `node tools/export-pdf.cjs slides/demo.html dist/demo.pdf` |
| PPTX (pictures, no notes) | `node tools/export-pptx.cjs slides/demo.html dist/demo.pptx` |
| All three | `npm run export` |
| Tests | `npm test` (or `node tests/run-tests.cjs presenter` to run matching tests only) |

The exporters accept the source deck or the built file. `dist/` and `node_modules/` are git-ignored.

**Course rule.** "Only a PowerPoint presentation without notes is permitted." The .pptx export has
empty notes and a title on every slide. Hidden slides stay hidden in the .pptx and appear in the
PDF with the tag *Variant · chosen live*. The presenter view has no notes field.

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
| `data-auto="ms"` | slide | Auto-advance after the entry transition plus `ms` (bridge slides). Prev skips such slides. |
| `data-title="…"` | slide | Title for the presenter view and the .pptx (default: first `h1`/`h2`/`h3`). |
| `data-print-tag="…"` | hidden slide | Overrides the print tag text. |

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

### Print defaults (`?print`, PDF, PPTX, Ctrl+P)

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
- Root classes: `deck-mode-audience|presenter|embed|print`, `deck-print`, `deck-is-black`, `deck-vt-morph|fade`.
- Variables: `--deck-build-duration`, `--deck-build-ease`, `--deck-morph-duration`, `--deck-morph-ease`,
  `--deck-fade-duration`, `--deck-fallback-duration`, `--deck-letterbox`.
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
- Prev / Next / Black buttons. Every key above also works in the presenter window.
- **No notes field**, by design.

Sync uses the `window.open` reference and `postMessage` in both directions, so it works from
`file://` (BroadcastChannel does not, reliably). The presenter says hello every second, so if the
deck window is reloaded it reconnects by itself. The two panes are the deck itself, loaded in an
embed mode (`?embed`) and fed the same state.

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

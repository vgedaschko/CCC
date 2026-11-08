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
  tools/assemble.cjs         slides/src -> slides/big-d.html (or a private --out copy); applies the team size (--presenters)
  tools/check-deck.cjs       automated QA of an assembled deck (layout, fonts, builds, morph pairs, print)
  tools/shoot.cjs            screenshots: every build, print, paper, lit-room, beamer washout, mid-morph frames
  tools/build.cjs            inline everything into ONE offline .html (+ the embedded fonts' OFL licence files next to it)
  tools/export-pdf.cjs       the static PDF: main flow + appendix, final build states (--paper: light variant)
  tools/export-pptx.cjs      the static PPTX: one full-bleed picture per slide, titles set, notes empty (--jpeg q: JPEG)
  tools/lib/                 axis.cjs (the Deciding axis generator), woff2-cmap.cjs (font cmap reader),
                             pdf-shrink.py (optional lossless PDF size pass, needs pikepdf)
  tests/run-tests.cjs        engine suite on slides/demo.html (file://)
  tests/big-d.cjs            end-to-end suite on THE deck: clicker run-through, branches, triggers, hub, team size,
                             static exports, lit-room (npm test runs it on the 2- and on a 3-presenter build)
```

## Commands

Run these from `deck/`. Playwright is used from its global install (`require('playwright')`);
`npm install` only fetches `pptxgenjs` for the .pptx export.

| What | Command |
|---|---|
| Install the one dev dependency | `npm install` |
| Assemble the deck | `node tools/assemble.cjs` (writes `slides/big-d.html`); a builder's private copy: `--out slides/.tmp-g3.html`; another team size for one build: `--presenters 3`; a team option for one build: `--option nemawashi=on` |
| Check the deck | `node tools/check-deck.cjs --deck slides/big-d.html [--slides s05,s06] [--stress] [--json]` |
| Screenshots | `node tools/shoot.cjs --deck slides/big-d.html --slides s04b --out <dir> [--fire s04b:dT] [--elapsed 84] [--morph s04b:s05] [--contact]` |
| Present | open `slides/big-d.html` (or `slides/demo.html`) in Chrome or Edge (double-click works: `file://` is fine) |
| One offline file | `node tools/build.cjs slides/demo.html dist/demo.html` (add `--strict` to fail on remote URLs); copies the embedded fonts' licence files (`OFL-*.txt`) next to it and names them in a comment after `<!doctype html>` |
| PDF (static export, final states) | `node tools/export-pdf.cjs slides/demo.html dist/demo.pdf` (`--paper`: the light paper variant; `--no-shrink`: skip the size pass) |
| PPTX (pictures, no notes) | `node tools/export-pptx.cjs slides/demo.html dist/demo.pptx` (`--jpeg 94`: JPEG pictures, a quarter of the size) |
| All three | `npm run export` (the demo); the real deck: `npm run deck:all` (see "Present the real deck") |
| Tests | `npm test` = engine suite + deck suite + deck suite on a 3-presenter build (`npm run test:engine`, `npm run test:deck`, `npm run test:team3`; a name filter: `node tests/run-tests.cjs presenter`, `node tests/big-d.cjs hub`) |
| Check the 3-presenter build | `npm run check:team3` (assembles `slides/.tmp-team3.html`, then `check-deck`) |

The exporters accept the source deck or the built file. `dist/`, `node_modules/` and private copies
`slides/.tmp-*` are git-ignored. `assemble`, `check-deck` and `shoot` only read the sources and write their
own output (atomically, or not at all), so several builders can run them in parallel with their own `--out`.

**Course rule.** "Only a PowerPoint presentation without notes is permitted." The .pptx export has
empty notes and a title on every slide. Hidden slides stay hidden in the .pptx and appear in the
PDF's appendix with the tag *Variant · chosen live* or *Backup · hidden slide* (see "Static exports").
The presenter view has no notes field.

## Present the real deck

### Open it

- **On the presentation laptop:** copy `dist/big-d.html` (one offline file: engine, theme, fonts inlined; no network)
  with the two licence files next to it (`OFL-archivo.txt`, `OFL-newsreader.txt`), and open it in **Chrome or Edge**
  (double-click is fine). From the repository: `slides/big-d.html` works the same, as long as `slides/src/`,
  `slides/fonts/` and `engine/` sit next to it.
- **Set-up, in this order** (beamer as an *extended* screen: Windows+P → *Extend*, not *Duplicate*). Do it before the
  talk and before every rehearsal:
  1. Open the deck on the **laptop** screen.
  2. Press **P** (allow pop-ups if a toast asks). The presenter window opens; leave it on the laptop.
  3. Drag the deck window to the beamer, click its title bar (not the slide), press **F** (fullscreen).
  4. **Shift+R**, then **Home**. Shift+R resets the S04b timer and stamps, the stored outcomes (S02 path, scenario,
     method, time) and the talk clock; it keeps the current slide, so Home takes you to S01.
  5. Click the presenter window's top bar. From then on the clicker drives both windows.
- **Talk clock:** it starts on the first advance and counts S01's 0:30 in (`"clockLead": 30` in the deck config), so
  the checkpoints read true when S01 was up for about half a minute. If you open on S01 for much longer, click
  *Start* in the presenter window as A begins speaking instead. *Reset* in the presenter needs two clicks, and
  Shift+R asks for a second press once the clock has passed 1:00.
- Lit classroom? Press **L** (lit-room mode: no light pools, grain or glows, heavier strokes). It is remembered for the
  tab and mirrored to the presenter window.

### Keys

| Key | Action |
|---|---|
| Clicker / PageDown / → / Space | next build, then next slide (hidden slides are skipped; S04z moves on by itself) |
| Clicker back / PageUp / ← | previous build; at a slide's first build, the previous slide in its final state (after a jump: back where you came from, at the build you left) |
| digits, then **Enter** | jump to a physical slide number (the list below). **Type them in the presenter window**: the overlay stays off the beamer and Esc there is harmless. In the deck window the beamer shows only the digits, and Esc also leaves fullscreen, so cancel there with Backspace or wait 4 s |
| Mouse | only the chips do something; a click anywhere else does nothing (`"clickAdvance": false`; a click still lifts the black screen) |
| **B** or `.` | black screen on/off (any Next/Prev also lifts it) |
| **L** | lit-room mode on/off |
| **P** | presenter window (clock, checkpoints, current + next preview, no notes) |
| **F** | fullscreen (F5 too: it does **not** reload. To reload press **Ctrl+R**: slide, stamps, timers and clock come back) |
| Home / End | first / last visible slide (End = S20E) |
| **?** | help overlay |
| **Shift+R** | reset live outcomes, timers, stamps and the talk clock (keeps the slide; past 1:00 on the clock it asks for a second press) |

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

**32** is S17B, the third presenter's slide. With two presenters it is an unused slot: Next skips it, typing 32 says
*no such slide*, it has no folio and no export carries it; the numbers above stay the same for either team size.

The S04b chips are triggers, not jumps: **D** or **vote** under the scenario the room took (T or M). A mis-click is
corrected by clicking the right chip. The stamp stops the 2:00 clock; the time is shown on S04b, S05, S14A/S14M and
the S20 bar chart. The S20 **D** chip stamps the proposal when the room stands up (S20E keeps the stamp).

S11D: only if you held the December talks (manifest `"options": { "nemawashi": true }`, see "Team switches") a chip
*our nemawashi* arrives top right with the nemawashi block (click 2). Click it after asking "Hands up if we talked to
you in December". With the default `false` neither the chip nor its card is in the deck.

A straight clicker run from S01 to S20E (two presenters, no branches) is **104 presses** (checked by `npm run test:deck`).

### Checkpoints (presenter view)

| Slide | Due by | Meaning |
|---|---|---|
| S05 | 7:30 | definition reached |
| S09A | 14:45 | Per's inbox |
| S12A | 19:30 | toolkit |
| S15 | 25:00 | Part II starts |

Each shows *due in m:ss*, *✓ … ahead* or *behind*; amber means late within 20 s, red later. A detour to a Q&A backup
does not tick a checkpoint off. The times assume the clock counted S01 in (see "Open it"). The presenter's *Next*
pane shows what the room sees next: at S04B's last build that is S05 (the auto bridge S04Z is looked past).

### If something goes wrong

- **16:10 or 4:3 beamer:** nothing to do, the slide letterboxes (black bars, nothing cut). Use *Extend*, not *Duplicate*.
- **Morphs stutter** (weak laptop): reopen as `big-d.html?novt` (crossfades, same builds and chips). Check it in the
  tech run: DevTools → Rendering → *Frame rendering stats*, then step S12A → S12B → S12C (the heaviest seams).
- **No animation at all:** the OS asks for reduced motion. Windows: Settings → Accessibility → Visual effects →
  Animation effects *On*; macOS: System Settings → Accessibility → Display → Reduce motion *off*. Then Ctrl+R.
- **Presenter window closed:** press P again in the deck window; the clock lives in the deck window and carries on.
- **Keys dead:** the focus is elsewhere (another app, the address bar). Click the presenter window's top bar.
- **S04B:** never press ← while the 2:00 clock runs at build 1 (un-revealing build 1 resets the clock). If a stray press
  showed the *new data?* arrow (build 2), press ← once: the clock keeps running.
- **A press during the short bridge after S04B** just lands on S05 a moment early; it never skips a build of S05.
- **Reload:** Ctrl+R (not F5) brings back the slide, stamps, timers and the clock.

### Part II: fill in the placeholders (never invent a member's name, culture or story)

- Every member or team slot is a `<span class="ph">[…]</span>`: S15–S19 in `slides/src/06-g6-part2.html` and the
  `[MEMBER n]` names on the title slide in `slides/src/00-foundation.html`. Type over the text and drop the span.
- Positions on the Deciding axis: **one CSS block at the top of `slides/src/06-g6-part2.css`** (`--m1 … --m3` culture
  dots, `--m1-lead …` Leading dots, `--r1 … --r3` "where I place myself"). Fractions 0 (consensual) … 1 (top-down),
  read from the member's Country Mapping 2022 region page; never a score. The placeholders spread P1 and P2 a quarter
  from each end (P3, if present, in the middle). With two presenters `--m3`/`--r3` are unused.
- While the positions are placeholders, S15–S18 carry `data-positions="tbd"` and every member marker (dots, rings,
  mini rails, the S18 bracket) is a **dashed outline**. Set `--mN`/`--rN`, then delete `data-positions="tbd"` from the
  five sections in `06-g6-part2.html` (`npm run test:deck` fails if it is still there once every `.ph` is filled).
- Each P slide also has a *my blind spot* slot under "Where the map is too simple" (script §4.4, cue 3).
- Verdict on a P slide and the S18 team timeline: change one class, `g6-v--tbd` to `g6-v--D` or `g6-v--d`.

### Team size: change one number

`"presenters": 2` in `slides/src/manifest.json` (2 or 3) decides everything; `node tools/assemble.cjs` applies it.

| | Two presenters (default) | Three presenters |
|---|---|---|
| S01 | `[MEMBER 1] · [MEMBER 2]` | `… · [MEMBER 3]` |
| S15 | two dots, labels (two staggered rows), rings | three |
| S16 / S17 strips, S18 axis | P1, P2 | P1, P2, P3 |
| S17B (32) | unused slot: hidden, no folio, not reachable by number, not in the PDF or PPTX | in the flow: S17 → S17B → S18, folios renumber |
| S18 bracket | spans the two members | spans the outermost of the three |

How: every member-3 element carries `data-member="3"` (dot, label, ring, strip marker, the third name), and S17B is
`<section … data-member="3">`. With two presenters the assembler leaves those elements out of `slides/big-d.html`
(so no member-3 morph key exists anywhere) and marks S17B `data-hidden="unused"`; it also writes
`<html class="team-2" data-presenters="2">`, which `06-g6-part2.css` uses to re-space S15 and S18 (`:root.team-2`).
A one-off build with the other size: `node tools/assemble.cjs --presenters 3 --out slides/.tmp-team3.html`.
Then: `node tools/check-deck.cjs --deck slides/big-d.html && npm test` (`npm test` also runs the deck suite on a
3-presenter build; the suite reads the team size from the deck).

### Team switches (manifest `"options"`)

| Switch | Default | What it does |
|---|---|---|
| `"nemawashi"` | `false` | `true` only if the team really held its December talks (script §2.3): S11D gets the mouse chip *our nemawashi* (arrives with click 2) and its card. `false` leaves both out of the deck. |

Elements that belong to a switch carry `data-option="name"`; `assemble` keeps them only while the switch is on and
writes `<html data-options="…">`. One-off build: `node tools/assemble.cjs --option nemawashi=on --out slides/.tmp-nema.html`.

### Exports (run from `deck/`)

| Output | Command | Size |
|---|---|---|
| everything below, after a fresh assemble | `npm run deck:all` | |
| `dist/big-d.html`, one offline file (+ `OFL-archivo.txt`, `OFL-newsreader.txt`) | `npm run deck:build` (`build.cjs --strict`: fails on any remote URL) | ≈ 1.7 MB |
| `dist/big-d.pdf`, dark, 38 pages (31 + appendix of 7), final states | `npm run deck:pdf` | ≈ 7 MB |
| `dist/big-d-paper.pdf`, light paper palette (for e-mail / print), same pages | `npm run deck:pdf-paper` | ≈ 5 MB |
| `dist/big-d.pptx`, 39 pictures, titles, notes empty, 7 hidden slides hidden | `npm run deck:pptx` (JPEG q94) | ≈ 11 MB |

(Two presenters. With three, S17B adds one page and one picture.)

**Static exports** (the engine's `Deck.exportPlan`, used by both exporters and by Ctrl+P):

- **PDF**: the main flow first, in clicker order (S01 … S20, visible slides only), then an **appendix** with the hidden
  variants and backups in physical order (S02M, S14M, H1–H5), each with its print tag (*Variant · chosen live*,
  *Backup · hidden slide*). Left out: the auto bridge S04z, an unused member slot (S17B with two presenters) and
  S20E (the live end copy of S20).
- **PPTX**: physical order; hidden slides stay in place and hidden (`show="0"`, PowerPoint skips them in a show).
  Left out: S04z and an unused member slot. S20E stays, so a slide show does not end on black. Notes stay empty.

The PDFs carry vector text (Chromium embeds the variable fonts as Type 3 glyphs). Live outcomes print as dashed
outlines ("D or VOTE? — decided live by the room", "stand-up — decided live", "decided by you"). Size: in print the
theme swaps effects Chromium would rasterize into 300 dpi masks (the card drop shadow, the faint headline halo, the
tiled dots of the S11c/d trail) for vector equivalents that look the same (`theme/modes.css`). If Python's
**pikepdf** is installed (`pip install --user pikepdf`), `export-pdf` adds a lossless pass (identical streams
merged, flate level 9, object streams; about 20 % smaller); without it the PDF stays as Chromium wrote it
(≈ 9 MB dark, ≈ 6 MB paper), and the log says the pass was skipped.

## Markup contract

```html
<link rel="stylesheet" href="../engine/deck.css">
<link rel="stylesheet" href="my-design.css">
<script type="application/json" id="deck-config">
  { "title": "Big D or little d?",
    "lateTolerance": 20,
    "clockLead": 30,
    "clickAdvance": false,
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

`#deck-config` keys: `title`, `transition` (default for slides), `checkpoints` (`slide`, `by`, `label`), `lateTolerance`
(s, default 20), `clockLead` (s counted in when the first advance leaves the opening slide; default 0) and
`clickAdvance` (default `true`; `false`: a click that misses a hotspot does nothing, so a near miss never reveals a
build). `window.DECK_CONFIG` overrides them (tests).

### Slides

| Attribute | On | Meaning |
|---|---|---|
| `class="slide" id="…"` | `<section>` | One physical slide. Ids are used by the hash, jumps, checkpoints and state. |
| `data-transition="morph\|fade\|none"` | slide | Transition **into** this slide (default `fade`). Going back uses the transition of the slide being left. |
| `data-hidden` / `data-hidden="backup"` | slide | Skipped by Next/Prev. Reachable by number, `data-goto` or the hash. Tagged in print; the PDF puts them in its appendix. |
| `data-hidden="unused"` | slide | An unused slot kept for stable numbers (e.g. a third presenter's slide with two): skipped, not reachable by number, no folio, no tag, in no static export. |
| `data-export="pdf\|pptx\|pdf pptx\|none"` | slide | Which static exports carry the slide (default: both; auto bridges and unused slots: none). |
| `data-next="id"` | slide | What Next does after the last build of this slide (for variants: S02M → S03). |
| `data-auto="ms"` | slide | Auto-advance after the entry transition plus `ms` (bridge slides). Prev skips such slides. `?noauto` holds bridges (for screenshots). |
| `data-title="…"` | slide | Title for the presenter view and the .pptx (default: first `h1`/`h2`/`h3`). |
| `data-print-tag="…"` | hidden slide | Overrides the print tag text. |
| `data-folio-text[="2"]` | any element in a slide | The engine writes the slide's **folio** into it (the number among visible slides, zero-padded to the given width). Hidden slides get an empty text; an auto bridge repeats the folio of the slide before it. |

The engine also writes `data-folio="n"` on every slide (empty on hidden ones, which also get
`data-folio-hidden="variant|backup|unused"`) and `data-folio-total` on the stage, so a design can place and
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

Print mode shows one **static export**, every slide in its **final** build state, one per page, with morph disabled:
`?print` (and Ctrl+P) the PDF plan, `?print&export=pptx` the PPTX plan, `?print&export=all` every slide in physical
order (screenshots, layout checks). `Deck.exportPlan(kind)` returns the plan:

| Plan | Order | Left out |
|---|---|---|
| `pdf` | main flow in clicker order (from the first visible slide, Next at each last build), then an appendix of the hidden slides in physical order | auto bridges, `data-hidden="unused"`, slides whose `data-export` lacks `pdf` |
| `pptx` | physical order, hidden slides in place (the .pptx marks them hidden) | auto bridges, unused slots, `data-export` without `pptx` |
| `all` | physical order | nothing |

While printing the engine reorders the slides in the DOM to the plan order (restored after Ctrl+P), gives the left-out
ones `.deck-export-omit` and the last page `.deck-print-last`. Hidden slides are tagged *Variant · chosen live*
(backups: *Backup · hidden slide*; `data-print-tag` overrides).

| Element | In print |
|---|---|
| `data-bind`, `data-timer` | Shows its `data-print="…"` text (a timer shows its full duration if absent; `data-print-progress` sets the bar, default full). |
| `data-triggered`, `data-show-if` | Hidden, unless `data-print="show"`. |
| any element with `data-print="hide"` | Hidden (trigger chips, live hints). |
| `data-print-only` | Shown **only** in print (e.g. a dashed "D or VOTE? Decided live by the room" outline). |
| `data-offstage` | An element parked outside the 1920 x 1080 stage (a morph partner that slides off): not printed. Chromium's print shrink-to-fit would otherwise count it and scale every PDF page down. |

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
| → ↓ PageDown Space Enter, click on empty stage (unless `clickAdvance` is `false`) | Next build / slide |
| ← ↑ PageUp Backspace, Shift+Space | Previous build / slide (to the final state of the previous slide) |
| digits, then Enter | Jump to physical slide *n* (1-based, hidden slides included); Esc or Backspace cancels. With a presenter window open, the deck window's overlay shows only the digits |
| Home / End | First / last visible slide |
| B or `.` | Black screen on/off (any Next/Prev or click only lifts it) |
| F (F5 enters) | Fullscreen |
| P | Presenter window |
| L | Lit-room mode on/off (root class `deck-lit`; the design drops glows and light, raises contrast). Persisted with the live state, mirrored to the presenter window and its previews, kept by Shift+R. `?lit` forces it on. |
| ? | Help overlay |
| Shift+R | Reset live outcomes, timers, stamps and the talk clock (asks for a second press within 3 s once the clock has passed 1:00) |

Clickers send PageDown/PageUp (and often `b`/`.`): all are covered. Key presses during a running
transition are never dropped or doubled. Each press updates the position at once, and an
in-flight transition skips to its end before the next one starts. The URL hash keeps the
position (`#s05/2`), so a reload resumes there.

Mouse: a click on a hotspot while a transition is still running finishes the transition and
activates the hotspot (it does not count as a click on the empty stage). The second click of a
double-click on a hotspot is ignored, so a double-clicked `data-goto` jumps once and does not also
advance the slide it lands on. A number that matches no slide is reported in the window where it
was typed (in the presenter, not on the beamer).

**Prev after a jump.** If you arrived by a jump (number, `data-goto`, `data-next`, `Deck.go`), Prev at the
first build goes back to where you came from, at the build you left (so a retracted jump gives no build
of the origin slide away; `@back` and older history frames return to the final state). Otherwise it goes
to the previous visible slide, in its final state.

## Presenter view

Press **P** in the deck window. A second window opens (`?presenter`; `#presenter` also works).
Put it on the laptop screen and the deck on the beamer. It shows:

- the elapsed **talk clock** with Start/Pause/Resume and Reset (two clicks within 3 s; the button sits at the far
  right of the bar). It starts by itself on the first advance (plus `clockLead` when that advance leaves the opening
  slide), and lives in the deck window, so closing and reopening the presenter keeps it.
- the **checkpoints** from `#deck-config`, each marked *due in m:ss*, *✓ reached · m:ss ahead*,
  or *behind*. Amber means late within `lateTolerance` (default 20 s), red means later than that.
  The next checkpoint is highlighted. A checkpoint counts as reached on its slide or any later one,
  except a Q&A backup (`data-hidden="backup"`): a visit to the hub mid-talk does not tick them off.
- the current slide (live, clickable: hotspots and trigger chips work there) and its build number,
  plus a preview of the **next** build or slide. An auto bridge is looked past: the preview shows the slide after it
  ("… (after the auto bridge)").
- Prev / Next / Black / Lit room buttons (the flags line shows BLACK and LIT). Every key above also works in the presenter window.
- **No notes field**, by design.

Sync uses the `window.open` reference and `postMessage` in both directions, so it works from
`file://` (BroadcastChannel does not, reliably). The presenter says hello every second, so if the
deck window is reloaded it reconnects by itself. The two panes are the deck itself, loaded in an
embed mode (`?embed`) and fed the same state.

## Scripting API (window.Deck)

`Deck.next() / prev() / first() / last() / go(id, step) / jump(n) / black(on) / lit(on) / trigger(name) / reset()`,
`Deck.state()` (`{ id, index, step, steps, folio, hidden, black, lit, … }`), `Deck.slides` (with `folio`, `hiddenKind`,
`unused`, `exports`), `Deck.exportPlan('pdf'|'pptx'|'all')`, `Deck.printExport`,
`Deck.store.get/set/all()`, `Deck.timers()`, `Deck.clock.*`, `Deck.isLit`, `Deck.paper`, `Deck.on(event, fn)`
(`ready`, `change`, `shown`, `trigger`, `timerstart`, `timerstop`, `timerdone`, `lit`, `reset`).

## Porting a design onto the engine

1. Keep the design's slide markup and CSS. Replace its runtime `<script>` with `engine/deck.js`
   and add `engine/deck.css` **before** the design CSS.
2. Check the contract attributes: `data-step`, `data-morph`, `data-transition`, `data-goto`,
   `data-trigger`/`data-triggered`, `data-timer`, `data-bind`/`data-show-if` + `data-print`.
3. Move fonts and images to local files (the build inlines them; remote URLs make `--strict` fail).
4. Put the checkpoints into `#deck-config`. Then check the real deck: `node tools/export-pdf.cjs`
   must report one page per slide of the export plan, and the browser console must stay free of errors.

## Known limits

- The View Transition morph needs Chrome/Edge 111+ (Safari 18+, Firefox 144+). Older browsers get the crossfade.
- Chromium embeds CFF-flavoured (`.otf`-based) web fonts in the PDF as Type 3 glyphs: still vector
  and searchable, but some PDF tools warn. TrueType-flavoured fonts embed normally.
- The .pptx holds one picture per exported slide (no live text, animation or morph). It is the static copy
  for submission, with a title on each slide for accessibility. Present from the HTML.
- `sessionStorage` is per tab: opening the deck in a new tab starts with fresh live state.
- `build.cjs` parses CSS with regexes. A quoted `url("…")` is taken whole (so `url(%23id)` fragment
  references inside a quoted SVG data URI are left alone), and `#`/`%23` fragments are never treated
  as files. `srcset`, `image-set()` and assets loaded from JavaScript are not inlined.

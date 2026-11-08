# Speaking texts — Big D or little d?

This is the full spoken text for every slide of our presentation of Erin Meyer, *The Culture Map*, chapter 5, "Big D or Little d: Who Decides, and How?" (the Deciding scale), for Cross-Cultural Communication with Prof. Sabrina Hegner on 06.01.2027. It follows the built deck (`deck/slides/big-d.html`: what appears at each click) and the storyboard `docs/01_script.md` (timing, roles, hand-over lines, live interaction). Where the two differ, the deck decides what is on screen and the script decides who speaks and for how long. This file is for rehearsal only. In the room only the slides are allowed, with no notes, so learn the text until each slide is enough to remind you what to say.

**How to read the slide texts (section 4)**

- **A** and **B** are roles, not people (script §1.1). On slides with more than one voice, every spoken paragraph starts with a role label, for example **B (as the CEO):**. Slides with one speaker have no labels.
- *[Italics in square brackets]* are stage directions. *(Italics in round brackets)* describe what the screen shows. Neither is spoken.
- Plain [SLOTS] are filled in from your fill-in sheet or live in the room: [MEMBER 1: …], [TEAM: …], [T] (the scenario the room chose), [m:ss on screen] (read the time off the slide).
- **Bold** is an anchor: say it word for word. Bold text in curly quotes (“…”) is on the slide at that moment: read it off the screen exactly as written.
- Everything else is flex text. Learn the idea, not the wording. If you blank, say it in your own words.
- ✂ marks a sentence you may drop when you are behind. Definitions, on-screen quotes and hand-over lines never carry a ✂.
- The line under each slide title gives: the speaker with two presenters (three-presenter role in brackets) · block time = talk time + room time · clicks · spoken words on the default path. Room time is time when the room acts (standing, hands, gestures, call-outs, reading pauses) and nobody talks.
- Speaking rate: 2.0 words per second of talk time (120 words per minute). No slide is above it.

---

## 1. How to learn it

**The method, in four layers.** Learn them in this order. Each layer hangs on the one before.

1. **Order and clicks.** Learn the slide order (33 visible slides with two presenters) and each slide's click count. A straight clicker run from S01 to S20e is 104 presses. Also learn the three jump numbers **3 · 26 · 36** and the four checkpoints (**S05 7:30 · S09a 14:45 · S12a 19:30 · S15 25:00**).
2. **Memory key.** Each slide has 3–6 cue words, in the order the slide reveals them. Every cue is visible on screen when you need it. Practise looking at the slide and saying only the cue words. Then the slide itself becomes your cue card.
3. **Anchors.** Learn the bold lines word for word: definitions, the mnemonic, the CEO lines and every hand-over line. On-screen quotes are anchors too, but they are on the slide. You only need to know *when* they come and to read them exactly.
4. **Flex text.** Read it twice, then say it in your own words. Do not memorise it word for word. If a sentence disappears in the room, nobody notices.

**✂ and rescue lines.**

- ✂ sentences are the first to go when the presenter window shows a checkpoint in amber or red. Section 2.3 lists the bigger cuts from the script (§2.9).
- Every slide has one **If you blank** line. If your mind goes empty, say that line, click, and let the next build remind you. Never apologise; just bridge.
- The partner not speaking may help with one quiet cue word, never with a full sentence.

**Practice techniques**

- **Spaced repetition.** Review each learned block after 1, 3, 7 and 14 days. Ten minutes per review is enough: memory keys first, then anchors.
- **Block drills.** Learn and drill in four blocks:
  - Block 1: S01–S05 (the live block, 0:00–10:00). It contains checkpoint ① (S05, 7:30).
  - Block 2: S06–S11 (cases and classification, 10:00–19:30). It contains checkpoint ② (S09a, 14:45) and ends where ③ starts.
  - Block 3: S12–S14 (toolkit, mixed teams, exam, 19:30–24:15). It starts at checkpoint ③ (S12a, 19:30) and ends before the 0:45 buffer.
  - Block 4: Part II (S15–S20, 25:00–35:00) and the Q&A lines. It starts at checkpoint ④ (S15, 25:00).
  - Script §1.5 calls its drill packages S01–S05 · S06–S09 · S10–S13 · S14; these four blocks cover the same slides.
- **Slide-only runs.** Speak with nothing but the slides in view. Away from the laptop, use a build-state flipbook on a tablet or phone: in `deck/`, run `node tools/shoot.cjs --deck slides/big-d.html --states builds,final --scale 0.5 --out <a folder of your own>`. It writes `<id>-b0.png … <id>-final.png` for every slide, so you see each build in the order the room sees it, which is the order of the memory keys. `deck/dist/big-d.pdf` shows only the final builds: use it for a last layout check, not to learn the memory keys (it tempts you to say later content too early). At the laptop, run the live deck so you also drill the clicks, the stamps and the real times.
- **Record yourself.** Use a phone. Compare your time per slide with section 7: words ÷ 2 = seconds. Listen for the hard words in section 3.
- **Swap runs.** Each person presents the other role. Every person must be able to present every part of Part I and the shared Part II slides (S15, S18–S20). The P slides belong to their member; the other member learns them only for the absent-member variant (section 2.6).
- **Three full runs with a stopwatch** (script §1.5), set up as on the day: presenter window (P), deck on a second screen, F, then Shift+R and Home.
  - Run 1: normal owners.
  - Run 2: rotated owners; Munich first (chip → 3) and scenario M (chip → 26); one absent-member variant.
  - Run 3: rotated owners again; friends play a shy room, then a chaotic room; let Decision #2 fail on purpose so you practise the vote path, and stage one tie at the deadline; take the skip chips "→ 24" (S12b) and "II → 29" (S14b) once; end with a trip to the Q&A hub (→ 36) and back.
- **Tech run in the room**, if at all possible (script §2.10 checklist).

**Rehearsal plan, 08.11.2026 – 06.01.2027**

| Dates | Focus | Done when |
|---|---|---|
| Sun 08.11. – Sun 15.11. | Each person reads this file aloud once. Learn the slide order, the click counts, the jump numbers 3 · 26 · 36 and the four checkpoints. Read section 3 aloud. | You can name all slides in order with their click counts. |
| Mon 16.11. – Sun 22.11. | Block 1 (S01–S05), both roles: memory keys → anchors → flex. Each person runs the S02/S04b clicker-plus-chip sequence once on a TV or projector and types one jump number in the presenter window. | Block 1 slide-only in 10:00. |
| Mon 23.11. – Sun 29.11. | Block 2 (S06–S11), both roles. Spaced review of block 1. | Block 2 slide-only in 9:30. |
| Mon 30.11. – Sun 06.12. | Block 3 (S12–S14). Review blocks 1–2. First swap run of Part I (each presents the other role). Each person facilitates Decision #2 once with friends as the audience. | Part I slide-only, end to end, with a stopwatch: S15 reached by 25:00. |
| Mon 07.12. – Sun 13.12. | Block 4: S15, S18–S20 and the Q&A lines. Each member starts the fill-in sheet (script §4.2). Send the mid-December email to Prof. Hegner (script §2.10). If you ask her to play the boss in Decision #1, also tell her that her choice will be "revised" on screen as part of the demo, and ask whether she will answer yes when B asks "Do we switch?" (S02 Branch). Optional nemawashi talks (only if you really held the talks; option on): 1–2 classmates each, with the script §2.3 question. | Email sent. S15 and S18–S20 slide-only. |
| Mon 14.12. – Sun 20.12. | **Decisions first.** Prof. Hegner's reply: is the browser deck allowed? If not, rehearse Runs 1–3 from the .pptx: no builds, chips or clock, outcomes said aloud, jump numbers 3 · 25 · 34 (script §2.10). Does she play the boss? Keep or drop the S02 professor Branch. December talks held (only if you really held the talks; option on)? Then set `"options": { "nemawashi": true }` in `deck/slides/src/manifest.json`, run `npm run deck:all` in `deck/` before Run 1, and check that the S11d chip "our nemawashi" appears at click 2. **Then:** fill-in deadline for cultures and anecdotes: 20.12. (script §4.1). Each member writes the P-slide text once from section 5, times it aloud (about 270 words, 2:15), then learns it from the four cue headers. Fill in S18 and the S19 team lines together. **Full run 1** at the end of the week. | Decisions taken. Run 1 timed; slides that ran long are trimmed with their ✂ lines. |
| Mon 21.12. – Sun 27.12. | Spaced review alone: a slide-only pass with the build-state flipbook (section 1, "Slide-only runs") every two or three days; one recording per block; say the other role's memory keys. | Recordings at or under 120 words per minute. |
| Mon 28.12. – Sun 03.01. | **Full run 2** early in the week, **full run 3** at the weekend (with the vote path, one tie, "→ 24" and "II → 29"). If you are apart, run them over a video call with screen share; the deck runs offline on each laptop. | Three full runs done; every branch tried once. |
| Mon 04.01. | Positions checked and deck final (script §4.1). Email the .pptx and the PDF (aim for today; deadline evening of 05.01.). One slide-only pass. | Email sent. |
| Tue 05.01. | Light day: memory keys and hand-over lines only. Tech run in the room if possible. | |
| Wed 06.01. | Set-up checklist (script §2.10). Warm-up: say every hand-over line once, together, in order. Shift+R, then Home. | Present. |

---

## 2. Roles and timing

### 2.1 Two presenters (the planning default)

Generated from the texts in section 4 (default path: New York first, scenario T, unanimous Decision #2). Words are spoken words; talk time = block − room. P slides (S16, S17) show their word budget.

<!-- BEGIN:table2 -->
| Slide | Speaker, 2 presenters (3p in brackets) | Block | Talk | Room | Words | w/s |
|---|---|---|---|---|---|---|
| S01 | A (3p: A) | 0:30 | 0:28 | 0:02 | 55 | 1.96 |
| S02 | A hosts, B speaks the CEO lines (3p: A + B) | 2:00 | 1:42 | 0:18 | 204 (A 178 · B 26) | 2.00 |
| S02m | A hosts, B speaks the CEO lines (3p: A + B) · variant, not in totals | 2:00 | 1:42 | 0:18 | 204 (A 178 · B 26) | 2.00 |
| S03 | B (3p: B) | 1:30 | 1:22 | 0:08 | 164 | 2.00 |
| S04a | B, A on the clicker (3p: B, A clicks) | 0:26 | 0:23 | 0:03 | 45 | 1.96 |
| S04b | B facilitates; A clicks, fires the chips and speaks the Müller line (3p: the same) | 3:04 | 1:30 | 1:19 | 180 (A 20 · B 160) | 2.00 |
| S04z | nobody speaks (3p: nobody) | 0:00 | 0:00 | 0:00 | 0 | — |
| S05 | A (3p: A) | 2:30 | 2:05 | 0:25 | 250 | 2.00 |
| S06 | B (3p: C) | 1:15 | 1:12 | 0:03 | 144 | 2.00 |
| S07 | A (3p: A) | 1:45 | 1:40 | 0:05 | 192 | 1.92 |
| S08a | B (3p: B) | 1:20 | 1:12 | 0:08 | 144 | 2.00 |
| S08b | B (3p: B) | 0:25 | 0:25 | 0:00 | 50 | 2.00 |
| S09a | B (3p: C) | 1:15 | 1:05 | 0:10 | 129 | 1.98 |
| S09b | B (3p: C) | 0:45 | 0:44 | 0:01 | 88 | 2.00 |
| S10a | A (3p: C) | 0:25 | 0:25 | 0:00 | 47 | 1.88 |
| S10b | A (3p: C) | 0:35 | 0:35 | 0:00 | 68 | 1.94 |
| S11a | A (3p: C) | 0:25 | 0:25 | 0:00 | 50 | 2.00 |
| S11b | A (3p: C) | 0:27 | 0:27 | 0:00 | 54 | 2.00 |
| S11c | A (3p: C) | 0:08 | 0:08 | 0:00 | 16 | 2.00 |
| S11d | A (3p: C) | 0:45 | 0:45 | 0:00 | 90 | 2.00 |
| S12a | B (3p: B) | 1:20 | 1:15 | 0:05 | 149 | 1.99 |
| S12b | B (3p: B) | 0:30 | 0:20 | 0:10 | 40 | 2.00 |
| S12c | B (3p: B) | 0:25 | 0:15 | 0:10 | 30 | 2.00 |
| S13 | A, B speaks the American line (3p: A, B one line) | 1:00 | 0:57 | 0:03 | 114 (A 104 · B 10) | 2.00 |
| S14a | A (3p: C) | 0:40 | 0:20 | 0:20 | 40 | 2.00 |
| S14m | A (3p: C) · variant, not in totals | 0:40 | 0:20 | 0:20 | 40 | 2.00 |
| S14b | A (3p: C) | 0:30 | 0:26 | 0:04 | 52 | 2.00 |
| S14c | A (3p: C) | 0:20 | 0:10 | 0:10 | 20 | 2.00 |
| S15 | B (3p: C) | 0:45 | 0:40 | 0:05 | 75 | 1.88 |
| S16 | Member 1 (3p: Member 1) | 2:30 | 2:15 | 0:15 | 270 (budget) | 2.00 |
| S17 | Member 2 (3p: Member 2) | 2:30 | 2:15 | 0:15 | 270 (budget) | 2.00 |
| S18 | B (3p: C) | 0:45 | 0:43 | 0:02 | 81 | 1.88 |
| S19 | A ①② → B ③ + CQ sentence (3p: A ① → B ② → C ③ + CQ) | 2:30 | 2:25 | 0:05 | 285 (A 164 · B 121) | 1.97 |
| S20 | B (proposal) → A (callback) (3p: the same) | 1:00 | 0:43 | 0:17 | 85 (A 50 · B 35) | 1.98 |
| S20e | nobody (3p: nobody) | 0:00 | 0:00 | 0:00 | 0 | — |
<!-- END:table2 -->

S04b is the one slide with planned slack: block 3:04 = talk 1:30 + room 1:19 + slack 0:15.

### 2.2 Totals and balance

<!-- BEGIN:balance -->
| Role | Part I words | Part II shared words | Own P slide (budget) | Total words | Speaking time at 120 wpm | Talk-time budget (block − room) | Script §1.3 net | Speaking time vs §1.3 |
|---|---|---|---|---|---|---|---|---|
| A | 1236 | 214 | 270 | 1720 | 14:20 | 14:29 | 14:57 | 96 % |
| B | 1179 | 312 | 270 | 1761 | 14:40 | 14:48 | 15:23 | 95 % |
<!-- END:balance -->

- **Within budget.** Both roles stay below the script's net talk time (§1.3: A ≈ 14:57, B ≈ 15:23), so nothing had to be trimmed (the rule: trim only when a role is more than 10 % over). The spare seconds are your safety margin for pauses and a slower pace.
- **Balanced minutes.** B speaks about 20 seconds more than A (script: B +0:26). Part I alone: A ≈ 10:18 and B ≈ 9:50 of speech (script: 10:32 and 10:03). B's extra time sits in Part II (S15, S18 and move ③), which §1.3 gives to B.
- **Balanced complexity** (script §1.1). A carries the conceptual core: the definition and timelines (S05), Leading ≠ Deciding (S07), Tokyo and ringi (S10–S11), the mixed-team protocol (S13), the exam card (S14) and moves ① ②; A also runs the clicker in S04 and from S19 to the end, the chips and the presenter clock (section 2.4). B carries the live work: the CEO lines, the facilitation of Decision #2 (the hardest live moment), the merger quotes (S03, S06), the map (S08), Per's inbox (S09), the toolkit and quick-fire (S12), the Part II framing (S15, S18), move ③ with the CQ sentence and the closing stand-up.
- **Hard words are shared.** A has the Japanese names and terms (Astellas, Susumi Mori, ringi, ringisho, nemawashi). B has the German board terms (Aufsichtsrat, Vorstand), Per Engman and Lencioni.

### 2.3 Checkpoints and cuts

The presenter window (key P) shows each checkpoint as *due in m:ss*, *✓ reached* or *behind*: amber = up to 0:20 late, red = later. On red, apply the next cuts in deck order (script §2.9). Part II starts by 25:30 at the very latest; never take time from Part II.

| Checkpoint | Slide on screen by | If red, cut next (deck order) | Saves |
|---|---|---|---|
| ① | S05 · 7:30 | S05: skip the "which flip felt worse?" poll; keep "Same move. Different rules." and the path line · S06: roots in one line ("pioneers versus boards") · S07: usual pattern in one sentence (the on-screen quote stays) · S08a: no "find your country" pause and none of its ✂ sentences · S08b: one sentence · S09a/b: no delete poll, Per's upside dropped | ≈ 0:12 · 0:20 · 0:08 · 0:21 · 0:10 · 0:12 |
| ① on the vote or tie path | S05 comes about 0:30 late (red) | Act at once; do not wait for the presenter window. S05: skip the poll and the two vote-path ✂ lines · S06: roots in one line · S08a: no pause and none of its ✂ sentences | ≈ 0:24 · 0:20 · 0:21: about 1:05 against the vote-path text, so S09a is back on time |
| ② | S09a · 14:45 | S11d: skip the nemawashi reveal (only if you really held the talks; option on) · S12b: skip quick-fire 2 with the chip "→ 24" | 0:10 · 0:25 |
| ③ | S12a · 19:30 | S14a: call-out 15 s instead of 20 s · S14b: skip true-or-false with the chip "II → 29" | 0:05 · 0:20 |
| ④ | S15 · 25:00 | No cuts in Part II. If you arrive late, the ✂ lines in S15 and S19 are the only flex. | — |
| Bank | S04 | Instant unanimity, or "Round two, now" in a silent room | up to +1:00 |

The cuts at ①, ② and ③ save about 2:23 together (2:13 without the optional nemawashi reveal), as in script §2.9.

**Where these texts changed the script's earlier timing** (raised with the script owner; script §2.1, §2.4, §2.9 and §3 now agree):

- **S14a call-out: 20 s, not 30 s** (script §2.1, §2.9, §3 S14a). The 0:40 block cannot hold 30 s of call-out plus the scenario, the result, the question, the tick-off and the hand-over (40 words, 0:20). So the §2.9 cut "15 s instead of 30 s" becomes "15 s instead of 20 s" and saves 0:05, not 0:15.
- **S14c thumbs: about 5 s each, not 2 × 8 s** (script §2.1, §3 S14c). Two 8-s votes would leave 0:04 of the 0:20 block for the two prompts, the two stamps and the hand-over.
- **S07 late cut: the on-screen quote stays.** Script §2.9 showed the grey dots without speech; but an on-screen quote is never cut, so the cut keeps "First, the usual pattern. Hierarchical cultures, “from Morocco to Korea”, decide top-down." It saves about 0:08, not 0:10.
- **S04b change-of-mind test: about 0:27, not ≤ 0:20** (script §2.4). Its own lines need that long. It is already inside S04b's talk and room time: on the default path the stamp comes by about 6:40, so S05 is on screen by about 7:15 and the 0:15 slack stays free.

All ✂ sentences together hold about 263 words, roughly 2:12 of speech, including the ones in this table. Section 7 lists them per slide. Together with the slide skips and the 0:45 buffer, Part I can absorb a slow Decision #2 without touching Part II.

### 2.4 Hand-overs: who speaks

The line is spoken by the person who ends the slide; the next slide's headline answers it (script §1.4). "→" means the speaker changes.

| Boundary | Line (spoken word for word) | 2 presenters | 3 presenters |
|---|---|---|---|
| S01 → S02 | "And the first decision is right now." | A continues | A continues |
| S02 → S03 | "A few months in, both sides were fighting about one word." | A → B | A → B |
| S03 → S04 | "So far, one person decided for you. Now all of you decide — together." | B continues | B continues |
| S04 → S05 | "Two decisions, two clocks. Look at them." | B → A | B → A |
| S05 → S06 | "And when the two rulebooks meet in one team?" | A → B | A → C |
| S06 → S07 | "Wait — Germany is the hierarchical one. How can it also be the consensual one?" | B → A | C → A |
| S07 → S08 | "So where does everybody sit?" | A → B | A → B |
| S08 → S09 | "Let's visit the far consensual end — through an American's inbox." | B continues | B → C |
| S09 → S10 | "From Sweden to its neighbour at the far consensual end: Tokyo." | B → A | C continues |
| S10 → S11 | "How does a strongly hierarchical company decide by consensus?" | A continues | C continues |
| S11 → S12 | "So how do you work with each system?" | A → B | C → B |
| S12 → S13 | "And if your team has both?" | B → A | B → A |
| S13 → S14 | "Your turn. Remember the scenario you chose?" | A continues | A → C |
| S14a → S14b | "Now let's make it exam-proof." | A continues | C continues |
| S14 → S15 | "That was Meyer's world. Now: ours." | A → B | C continues |
| S15 → P1 | "[MEMBER 1], you first — where does your dot land?" | B → Member 1 | C → Member 1 |
| P1 → P2 | "[MEMBER 2], where does your dot land?" | Member 1 → Member 2 | Member 1 → Member 2 |
| P2 → P3 | "[MEMBER 3], where does your dot land?" | — (no P3) | Member 2 → Member 3 |
| last P → S18 | "Different dots, one team. So how did WE decide?" | Member 2 → B | Member 3 → C |
| S18 → S19 | "What should managers do about gaps like ours?" | B → A | C → A |
| S19 → S20 | "Which brings us to one last decision." | B continues | C → B |

Same-speaker bridges inside a block (not in §1.4, from script §3): S08a "Zoom in on one region." · S09a "Later, Per explained what working with Americans felt like." · S11a "And he showed how it works." · S12a "Now, a quick-fire." The S19 switch from A to B has no line: A clicks card ③ and B steps forward with "Move three".

**Who holds the clicker.** One clicker, one rule: the speaker holds it. At a speaker change, the outgoing speaker says the hand-over line, clicks to the next slide and passes the clicker. Three exceptions, where A keeps the clicker and the mouse at the laptop and the speaker cues A with a look:

- **S04a–S04b** (B facilitates): A clicks every build and fires the stamp chips. B passes the clicker to A at the end of S03.
- **S12b's chip "→ 24"** (B speaks): only A touches the mouse.
- **S19–S20, to the end** (also with three presenters): A clicks every card of S19, the S20 builds and the S20 D chip. The S18 speaker (B; C with three presenters) passes the clicker to A at the end of S18.

A also uses the mouse for the chips on A's own slides (MUNICH → 3, M → 26, II → 29) and for "→ 36" in the Q&A.

**Which member holds which role (two presenters).** Roles rotate in the drills. For the day, Member 1 = A and Member 2 = B is the smoothest pairing: every Part II hand-over then goes to the other person, except P2 → S18, where B's question "So how did WE decide?" works as a question to the room. If Member 1 holds B, B uses the self-variant on S15 (Branch there).

### 2.5 Three presenters

The texts stay the same; only the speaker changes (script §0, §1.2). Part II is shorter: S15, S18 and each P slide use the three-presenter branches in their slides.

| Blocks | 2 presenters | 3 presenters |
|---|---|---|
| S01 · S02 (host) · S05 · S07 · S13 · S04 clicks, chips and Müller line | A | A |
| S03 · S04 (facilitator) · S08a/b · S12a–c · the CEO lines (S02) · the American line (S13) | B | B |
| S06 · S09a/b | B | **C** |
| S10a/b · S11a–d · S14a/m/b/c | A | **C** |
| S15 (0:45 → 0:30) · S18 (0:45 → 0:30) | B | **C** (use the 3p branch) |
| P slides | Member 1, Member 2 · 2:30 each (≈ 270 words) | Members 1–3 · 2:00 each (≈ 215 words); S17b uses the same template |
| S19 | A ①② (1:30) → B ③ + CQ sentence (1:00) | A ① → B ② → C ③ + CQ sentence (0:40 each; 3p branch) |
| S20 | B (proposal) → A (callback) | B → A |

Net talk per person with three presenters (script §1.2): A ≈ 10:12 · B ≈ 9:58 · C ≈ 10:10.

### 2.6 If one presenter is absent on the day

Script §1.5 (a recommendation; the team confirms it): the file stays as it is. The member who is present speaks all A and B lines, including the CEO lines, facilitates Decision #2 and clicks the chips (they also work in the presenter window). The absent member's P slide is either presented in the third person from their fill-in sheet ("[MEMBER n] places …"), adding nothing that is not on the sheet, or jumped over (Member 1 absent: type 31 + Enter at the end of S15; Member 2 absent: type 33 + Enter at the end of S16). A P slide presented in the third person needs no hand-over question before it: the speaker simply goes on (script §1.5). The solo lines are in the Branches of S01, S02, S15 and S16. Rehearse the chosen variant once in Run 2.

---

## 3. Pronunciation guide

Stress in CAPITALS. Where we are not sure, the table gives a safe anglicised form and says so. Japanese words have no strong stress: keep their syllables even.

| Name or term | Say it | Note |
|---|---|---|
| Erin Meyer | AIR-in MY-er | American author. |
| Larry Nicoli | LA-ree nih-KOH-lee | Unsure: an Italian-style NEE-ko-lee is also possible. Pick one form and keep it. |
| Matthias Wulf | ma-TEE-ahs VULF | German; short u, as in "full". Safe English form: ma-THY-us WOOLF ("Wulf" like "wolf"). |
| Martina Müller | mar-TEE-nah MÜ-ler | German ü: say "ee" with rounded lips. Safe English form: MYOO-ler. |
| Munich | MYOO-nik | The English name. |
| Per Engman | PAIR ENG-mahn | Swedish. "Per" sounds like English "pair". |
| Lasse · Charlotte | LAH-seh · shar-LOT | Swedish colleagues; only if you say the names. |
| Patrick Lencioni | PAT-rik len-see-OH-nee | American author. Unsure: the Italian form len-CHOH-nee is also understood. |
| Jack Sheldon | JAK SHEL-dun | |
| Astellas | uh-STEL-us | Japanese pharmaceutical company. |
| Tokyo | TOH-kyoh | Two syllables ("kyo" is one), not "To-ki-o". |
| Susumi Mori | soo-soo-mee moh-ree | Japanese, all syllables even. The r is a light tap, close to a soft d. The book prints "Susumi"; say it as printed. |
| ringi | REEN-gee | Hard g as in "give". Japanese: even, rin-gi. |
| ringisho | REEN-gee-shoh | The proposal document. |
| nemawashi | neh-mah-WAH-shee | Japanese: even, ne-ma-wa-shi. A light stress on WA is fine in English. |
| Aufsichtsrat | OWF-zikhts-raht | German; "kh" as in Scottish "loch". Safe: OWF-zikts-raht, or say "the supervisory board". |
| Vorstand | FOR-shtahnt | German. Or say "the managerial board". |
| Hofstede | HOF-stay-duh | Dutch. Many English speakers say HOF-steed; both are understood. |
| GLOBE | GLOHB | Said as the word "globe". |
| Bennett | BEN-it | |
| Thomas (CQ) | TOM-us | CQ = see-KYOO, cultural intelligence. |
| Osland & Bird | OZ-lund and BURD | Q&A only (backup 39). Safe anglicised form. |
| Hall | HAWL | Q&A only. |
| Sabrina Hegner | sa-BREE-nah HAYG-ner | Unsure about the vowel: HAYG-ner or HEG-ner. Use the form you hear in class. |
| Nigeria · Vietnam · Singapore | ny-JEER-ee-uh · vee-et-NAHM · SING-uh-por | |
| Korea · Morocco · Netherlands | kuh-REE-uh · muh-ROK-oh · NETH-er-lunz | |
| consensual · consensus | kun-SEN-shoo-ul · kun-SEN-sus | |
| hierarchical | hy-uh-RAR-ki-kul | Five syllables. Practise slowly: hy-uh · RAR · ki · kul. |
| egalitarian | ih-gal-ih-TAIR-ee-un | |
| unanimous · unanimity | yoo-NAN-ih-mus · yoo-nuh-NIM-ih-tee | |
| implementation | im-plih-men-TAY-shun | |
| ethnocentrism | eth-noh-SEN-triz-um | |
| generalization | jen-er-uh-ly-ZAY-shun | |
| paradox · decisive | PAR-uh-doks · dih-SY-siv | |
| solicited | suh-LIS-ih-tid | S02, CEO line. |
| analyst | AN-uh-list | S02. |
| pharmaceutical | far-muh-SOO-tih-kul | S10a. If it trips you, say "pharma company" (FAR-muh). |
| facilitator | fuh-SIL-ih-tay-ter | S04b, tie Branch. |
| defusing | dee-FYOO-zing | S13 quote: "taking the danger out". Not "diffusing" (spreading). |
| exhibit · predominant | ig-ZIB-it · prih-DOM-ih-nunt | S15, Bennett quote. |
| deliberate (adjective) | dih-LIB-er-it | S19. Ends in "-it", not "-ate". |
| competencies | KOM-pih-tun-seez | S19, CQ footer. |
| Anglo | ANG-gloh | S19, GLOBE line. |
| Thomas's | TOM-us-iz | S19 ("In Thomas's terms"). |
| Big D · little d | big DEE · little DEE | Say the letter clearly; the gesture carries the size. |

How to read the symbols aloud: "Fig. 5.3" = "Figure five point three" · "≈ 3 s" = "about three seconds" · "2:00" = "two minutes" · "Decision #2" = "Decision two" · "≠" = "is not" · an elapsed time such as "1:47" (S05, S20) = "one minute forty-seven", or "almost two minutes".

---

## 4. Slide by slide

Part I · block 1 · the live block (0:00–10:00). Checkpoint ①: S05 on screen by 7:30.

### S01 · Big D or little d?

Role A (3p: A) · block 0:30 = talk 0:28 + room 0:02 · 0 clicks · 55 words

**Memory key:** [MEMBER] names → Meyer · Ch. 5 → Who decides — and how? → Consensual · Top-down → route line

**On entry** — *(screen: static title; big teal D, small amber d, "Who decides — and how?", the credits with two name slots, the route line, and the Consensual … Top-down axis along the bottom)*

*[wait until the room is quiet, 2 s]* Hello. We are [MEMBER 1: name] and [MEMBER 2: name]. Erin Meyer, The Culture Map, chapter five: the Deciding scale. Who decides, and how? **Today, this presentation decides twice. Once top-down, once by consensus.** You'll feel it before we name it. Our route: definition, countries, recommendations, our cultures, management implications.

**Branch** — *Three presenters:* We are [MEMBER 1: name], [MEMBER 2: name] and [MEMBER 3: name]. · *One presenter absent (solo, script §1.5):* Hello. I'm [MEMBER n: name], presenting for both of us today. *(the rest as written)*

**Hand-over:** **"And the first decision is right now."** *(2p and 3p: A continues and clicks)*

**If you blank:** Who decides, and how? Let's find out right now. *[click]*

### S02 · Whose story first?

Role A hosts, B speaks the CEO lines (3p: A + B) · block 2:00 = talk 1:42 + room 0:18 · 4 clicks · 204 words (A 178 · B 26)

**Memory key:** Whose story first? → CEO today → LN · Larry Nicoli → REVISED · MW → ? Who is more hierarchical?

**On entry** — *(screen: the title shrinks into the running head; the NEW YORK and MUNICH tiles draw their skylines; headline "Whose story first?"; small chip MUNICH → 3, bottom right)*

**A:** Before we explain anything: whose story first? New York, or Munich? Let's hear what you— *[B steps forward and cuts A off; A: click]*

**Click 1** — *(the CEO badge pops up next to the headline; the amber sliver "#1 ≈ 3 s" wipes in, bottom left)*

**B (as the CEO):** **No time. I'm the CEO today. New York.**

**A:** Hands up if you'd have picked Munich. *[wait 2 s]*

**B (as the CEO):** **Noted. Your input was not solicited. Welcome to top-down.** *[A: click]*

**Click 2** — *(Larry Nicoli's card rises over the NEW YORK tile)*

**A:** Meyer's case: a New York financial firm merges with a German partner. ✂ Both sides admired each other, until misunderstandings began. Larry Nicoli is the number two. He had lunch, just lunch, with a Munich analyst. Then a manager two levels above the analyst told Larry off. Larry had skipped the protocol. His reaction: **“Incredible! These Germans are incredibly hierarchical.”** And: **“Who cares what grade level he’s at? … these Germans do!”**

**B (as the CEO):** *[cutting in]* Change of plan. New data from Munich. We're switching.

**A:** *[sighs]* We'd only just started… *[click]*

**Click 3** — *(amber banner REVISED · new data from Munich; a ↺ loop on the sliver; Matthias Wulf's card rises over the MUNICH tile)*

**A:** *[beat]* Now, Munich. Matthias Wulf leads the merger there. He says Americans only look egalitarian: open doors, first names, casual dress. **“Don’t be fooled. They are much more hierarchical than we are!”** And: **“…‘March left!’ the Americans all click their heels and turn left…”** *[click]*

**Click 4** — *(a row of small arrows, already pointing left, wipes in from the right; a big "?" between the cards; "Who is more hierarchical?")*

**A:** Who is more hierarchical? Team Larry — the Germans? Hands up. *[2 s]* Thanks. Team Matthias — the Americans? Hands up. *[2 s]* Hold that vote. In ten minutes, you'll see both are right.

**Branch** —

- *Munich first:* the CEO says **"No time. I'm the CEO today. Munich."** A clicks the chip **MUNICH → 3** with the mouse and plays S02m (next section). If the chip misfires: A types 3 + Enter in the presenter window, or **B (as the CEO):** On second thought: New York. *(then the default path)*
- *The room shouts preferences at click 1:* **B (as the CEO):** Thanks for your input. *[beat]* New York.
- *Nobody raises a hand for Munich:* **B (as the CEO):** Nobody? Then top-down worked perfectly. Or nobody dared.
- *The professor as the boss (only if she agreed in the mid-December email, including the switch question; section 1, 07.12.):* on entry **A:** Professor Hegner, you are the boss today. New York, or Munich? *[A: click as she answers]* If she says Munich: chip → S02m. If she hesitates for more than 5 s: **B:** Then, top-down, I decide. New York. *(then the default path, with B as the CEO)* If she chose: there is no CEO on this path, and B never speaks "as the CEO". **A:** Hands up if you'd have picked [the other city]. *[2 s]* **B** *(to the room, not to her)*: Noted. Your input was not solicited. Welcome to top-down. *[A: click; A tells the story]* The flip goes to her, the boss: **B:** *[to the professor]* Professor Hegner, new data from [the other city]. Do we switch? *[she says yes, as agreed]* **A:** *[sighs]* We'd only just started… *[click]* · If she says no: **A:** The boss keeps it. In Meyer's merger, they switched. *[click]*
- *Solo (one presenter absent, script §1.5):* no interruption. **A:** Before we explain anything: whose story first? New York, or Munich? *[step to the side for every CEO line]* No time. I'm the CEO today. New York. *[step back]* Hands up if you'd have picked Munich. … At the flip: *[step to the side]* Change of plan. New data from Munich. We're switching. *[step back; sigh to the room]* We'd only just started… *[click]*

**Hand-over:** **"A few months in, both sides were fighting about one word."** *(2p: A → B · 3p: A → B)* *[A: click, then pass the clicker to B]*

**If you blank:** Two cities, one merger. Let's see who says what. *[click]*

### S02m · Whose story first? (Munich first, hidden variant)

Role A hosts, B speaks the CEO lines (3p: A + B) · replaces S02 after its click 1; same block 2:00 = talk 1:42 + room 0:18 · 3 clicks · 204 words (A 178 · B 26) on the whole path

**Memory key:** CEO today → MW · Matthias Wulf → REVISED · LN → ? Who is more hierarchical?

**Before the jump** — *(still S02, after its click 1)*

**A:** Before we explain anything: whose story first? New York, or Munich? Let's hear what you— *[B cuts in; A: click 1 on S02]*

**B (as the CEO):** **No time. I'm the CEO today. Munich.** *[A: mouse on the chip MUNICH → 3]*

**On entry** — *(screen: a quick fade; CEO badge and the sliver "#1 ≈ 3 s" already in place; both tiles, no cards yet)*

**A:** Hands up if you'd have picked New York. *[wait 2 s]*

**B (as the CEO):** **Noted. Your input was not solicited. Welcome to top-down.** *[A: click]*

**Click 1** — *(Matthias Wulf's card rises over the MUNICH tile)*

**A:** Meyer's case: a New York financial firm merges with a German partner. ✂ Both sides admired each other, until misunderstandings began. Matthias Wulf leads it in Munich. He says Americans only look egalitarian: open doors, first names, casual dress. **“Don’t be fooled. They are much more hierarchical than we are!”** And: **“…‘March left!’ the Americans all click their heels and turn left…”**

**B (as the CEO):** *[cutting in]* Change of plan. New data from New York. We're switching.

**A:** *[sighs]* We'd only just started… *[click]*

**Click 2** — *(amber banner REVISED · new data from New York; a ↺ on the sliver; Larry Nicoli's card rises over the NEW YORK tile)*

**A:** *[beat]* Now, New York: Larry Nicoli, number two. He had lunch, just lunch, with a Munich analyst. Then a manager two levels above the analyst told Larry off. Larry had skipped the protocol. His reaction: **“Incredible! These Germans are incredibly hierarchical.”** And: **“Who cares what grade level he’s at? … these Germans do!”** *[click]*

**Click 3** — *(arrows pointing left, the big "?", "Who is more hierarchical?")*

**A:** Who is more hierarchical? Team Larry — the Germans? Hands up. *[2 s]* Thanks. Team Matthias — the Americans? Hands up. *[2 s]* Hold that vote. In ten minutes, you'll see both are right.

**Branch** — *Nobody raises a hand for New York:* **B (as the CEO):** Nobody? Then top-down worked perfectly. Or nobody dared. · *A pressed Next on S02 instead of the chip (Larry's card rises over NEW YORK):* A clicks **MUNICH → 3** at once; the chip works at any build of S02. If the chip fails: A types 3 + Enter in the presenter window, or **B (as the CEO):** On second thought: New York. *(go on with the S02 click 2 story; Larry's card is already up)*

**Hand-over:** **"A few months in, both sides were fighting about one word."** *(2p: A → B · 3p: A → B)* *[A: click (Next goes straight to S03), then pass the clicker to B]*

**If you blank:** Two cities, one merger. Let's see who says what. *[click]*

### S03 · One word, two rulebooks: decision

Role B (3p: B) · block 1:30 = talk 1:22 + room 0:08 · 4 clicks · 164 words

**Memory key:** decision → Munich's rulebook: DECISION → cling → New York's rulebook: decision → continue discussions

**On entry** — *(screen: the two cards shrink into the chips "L. Nicoli · New York" and "M. Wulf · Munich"; headline "One word, two rulebooks: decision"; the amber sliver stays parked bottom left)*

The word was: decision. Meyer met two German directors in her Paris office. Martina Müller, and her boss, Matthias Wulf. They were surprised: the American CEO decided alone. Their former German chairman decided through group agreement. Even the weekly meeting agenda needed everyone's approval. *[click]*

**Click 1** — *(left, teal: "Munich's rulebook"; DECISION lands like stone; Müller's line rises)*

First, Munich's rulebook. Americans would close a meeting with a decision. For Müller, a decision is **“…a commitment. A promise.”** ✂ She even felt the Americans were trying to trick them. *[click]*

**Click 2** — *(Nicoli's line rises under the stone)*

And the other side's view? Nicoli says the Germans take weeks to decide. And then **“…they cling to it with their lives.”** *[click]*

**Click 3** — *(right, amber: "New York's rulebook"; decision written in pencil; Nicoli's own line)*

Second, New York's rulebook. Here, a decision is written in pencil. For Nicoli, the world is dynamic. Things change. So: **“If decisions are not flexible, how can we beat the competition?”** *[click]*

**Click 4** — *(Wulf's line rises under the pencil)*

And Munich's view of New York? After much frustration, Wulf concluded: **“…a ‘decision’ is simply an agreement to continue discussions.”** *[pause]* Same word. Two rulebooks.

**Hand-over:** **"So far, one person decided for you. Now all of you decide — together."** *(2p and 3p: B continues on S04a)* *[B: click, then pass the clicker to A; A keeps it for all of S04]*

**If you blank:** Same word. Now read the other column. *[click]*

### S04a · How we decide (rules card)

Role B, A on the clicker (3p: B, A clicks) · block 0:26 = talk 0:23 + room 0:03 · 0 clicks · 45 words

**Memory key:** HOW WE DECIDE → stand up → seated → 2:00 → majority vote → no reopening

**On entry** — *(screen: the rules card rises large in the centre; rules 1 to 5 rise one by one; "Can we all live with these rules?" fades in under the card)*

**Before we decide, we agree how we decide.** *[point at each rule as you read it]* One: all agree? Stand up, or both hands up. Two: seated is a concern, not a veto. Three: two minutes. Four: no unanimity? Majority vote. Everyone commits. Five: no reopening. **Can we all live with these rules?** *[wait for nods, 3 s; A: click]*

**Branch** — *Someone says no (or jokes "No!"):* **B:** Thank you — that's a concern, not a veto. Rule two. *[A: click]* · *The professor:* she is not asked to take part; no line goes to her. · *Behind schedule:* no cut here. The S04 block is a hard 3:30; time is banked or lost on S04b.

**Hand-over:** — *(B keeps the floor on S04b; A clicks after the nods)*

**If you blank:** Read the card with me. Can we all live with these rules? *[A: click]*

### S04b · Decision #2: the room decides

Role B facilitates; A clicks, fires the chips and speaks the Müller line (3p: the same) · block 3:04 = talk 1:30 + room 1:19 + slack 0:15 · 3 clicks + 4 trigger chips · 180 words (A 20 · B 160) · both concern echoes counted

**Memory key:** email · SCENARIO T → T · M cards → STAND / SEATED → D | vote → new data? → MM line

**On entry** — *(screen: the rules card shrinks into the left third; the email drops in like a notification, tagged "our email · Per-style"; cards SCENARIO T and SCENARIO M, tagged "fictional exercises"; chips D | vote under each card; the line STAND = agree · SEATED = concern; the big clock reads 2:00 over an empty track; above it, amber, "Decision #1 · ≈ 3 s · one person")*

**B:** Our proposal: *[read the email aloud]* **Hey class — I thought we could practise SCENARIO T at the end of Part I. What do you think?** *[point at the T card]* T: approval at Tokyo HQ, in four weeks. *[point at the M card]* M: a German–American team, a supplier, by Friday. *[beat]* Round one. Stand up, or both hands up, if you agree with T. Stay seated if you have a concern. Two minutes. Go! *[A: click]*

**Click 1** — *(the countdown runs from 2:00 to 0:00 while the teal bar fills the track)*

*[Default path: the clock starts at about 4:55; concerns about 5:05–6:05; round two about 6:05–6:35; stamp by about 6:40.]*

**B:** *[scan the room: some people are seated]* Thank you. Please sit down. *[wait until everyone sits]* Some of you stayed seated. What's your concern? *[hear at most two concerns, at most 20 s each; at 20 s: "Thank you — in one sentence?"; echo each one with a questioning look:]* So: [the first concern, ≤ 8 words]. *[second concern, if any]* So: [the second concern, ≤ 8 words]. *[after the concerns]* If T doesn't work for others, who could support M? Hands up. *[count silently. Clock at 0:20 or less? Do not start round two: let it run out and take the vote path (Branch). At least half the room for M? Branch "Switch to M". Otherwise:]* Round two: T, plus [their change, ≤ 3 words]. Stand up if you agree. *[everyone stands]* Everyone is up: Scenario [T]. **Decision made — capital D. No more discussion.** *[A: mouse on the D chip under the winning card → teal D stamp; "decided · Big D · no more discussion · after m:ss" covers the clock]* Please sit down. *[beat; then lightly]* Great! *[beat]* Actually… new data just came in. Let's do the other scenario. *[A: click]*

**Click 2** — *(an amber arrow "new data?" arcs between the two cards)*

**B:** *[pause 2 s]* How does that feel? *[take ONE reaction, see Branch; if nobody reacts within 2 s:]* Nobody minds? Martina Müller would have. *[A: click]*

**Click 3** — *(Müller's line rises under the cards: MM · M. Müller · German director)*

**A:** Martina Müller, a German director: **“They casually change the decision every week…”** *[beat]* Relax. Your decision stands. Rule five: no reopening.

*[The change-of-mind test, from "Great!" to here, takes about 0:27 (script §2.4 plans ≈ 0:30). On the default path the stamp comes by about 6:40, so S05 is on screen by about 7:15, and the 0:15 slack stays free.]*

**Branch** — *(each line replaces the matching default line; the change-of-mind test after the outcome is the same on every path)*

- *Switch to M (at least half the room raises a hand for M):* **B:** Round two: Scenario M. Stand up if you agree. *(every [T] after it becomes M; A clicks the chip under the M card, D or vote; say the outcome aloud: Scenario M it is.)*
- *Seated but silent after one invitation (≤ 10 s):* **B:** No concern voiced? Round two, now. Stand up if you agree. *[still not unanimous → vote at once; the clock is still running, so do not say "Time":]* **No unanimity.** Please sit down. **Rule four: majority vote. Everyone commits.** Hands up for T… *(then as the deadline vote below)*. Rule four sets no waiting time. Bank the saved time.
- *Unanimous in round one (after 20 s or more):* **B:** Everyone is up: Scenario [T]. **Decision made — capital D. No more discussion.** *[A: D chip under T]* Please sit down.
- *Instant unanimity (under 20 s):* **B:** Everyone is up: Scenario [T]. Fast for a consensus. Real agreement, social pressure, or root-binding? Hold that thought. **Decision made — capital D. No more discussion.** *[A: D chip under T]* Please sit down. *[Bank the saved time; S11d pays it off.]*
- *Shy room:* **B:** Let's do it all at once. Three, two, one: stand up if you agree! *[if people stay seated and silent:]* Silence isn't consensus. Hands, please. *[still nothing → "Round two, now" above]* Never single out a quiet student. **A** may play devil's advocate for the smaller side: Let me argue for M: a German–American team picks a supplier, by Friday. Anyone with me? *(or)* Let me argue for T: Tokyo HQ, four weeks, a real test of patience. Anyone with me?
- *Chaotic room:* **B:** *[one hand up]* One voice at a time, please. I repeat each concern, so everyone hears it. *[when people argue about time:]* The clock decides. We all agreed on the deadline. *(no extension)*
- *Not unanimous when the clock ends (0:00, "time · rule 4" appears):* **B:** **Time.** Please sit down. **Rule four: majority vote. Everyone commits.** Hands up for T. *[count silently]* Thanks. Hands up for M. *[count silently]* Scenario [T] it is. *[A: mouse on the vote chip under the winner → amber VOTE stamp; "decided · by majority vote · rule 4" covers the clock; B points at the stamp]* Meyer lists the vote among her top-down techniques. [The other one]: noted, and you commit. *[beat; then lightly]* Great! *[beat]* Actually… new data just came in. Let's do the other scenario. *[A: click]*
- *Tie at the deadline:* **B:** A tie. Our rules can't break it. So the facilitator decides: one person, top-down. We take [T]. *[A clicks no stamp; S05 then shows "minutes". If B takes M, A remembers to use the chip "M → 26" on S13.]*
- *Vote path or tie path: expect S05 about 0:30 late (red).* Do not wait for the presenter window. Skip the S05 poll and the two vote-path ✂ lines, say the S06 roots in one line, and drop the S08a pause with its ✂ sentences (together about 1:05; S09a is back on time; section 2.3).
- *Someone can't or won't stand:* covered in round one ("or both hands up"). If someone stays seated and quiet, leave it: seated is a concern, not a veto. Never call on that person.
- *The professor joins in on her own:* **B:** Thank you, one more voice. *(she counts as one voice; she is never asked to vote, stamp or approve)*
- *A stamp chip fails:* **B** says the result aloud: The result stands: Scenario [T], by [consensus / majority vote]. A wrong chip is corrected by clicking the right one.
- *A stray click shows "new data?" early:* A presses ← once; the clock keeps running. Never press ← while the clock runs on click 1: that resets the clock.
- *A reaction comes in the change-of-mind test:* **B:** [their words, repeated]. Thank you. *[A: click 3]*
- *Nemawashi ally (only if you really held the talks; option on):* **B** may invite a classmate by name, only if that person agreed: [CLASSMATE: name], you gave us your view in December. Would you share it now?

**Hand-over:** **"Two decisions, two clocks. Look at them."** *(2p: B → A · 3p: B → A; B says it right after A's Müller line; A clicks and the bridge runs by itself)*

**If you blank:** *(B, any moment before the stamp)* Let's see where the room stands: stand up if you agree.

### S04z · Bridge (auto)

Role: nobody speaks (3p: nobody) · block 0:00 (moves on to S05 by itself after about 0.15 s) · 0 clicks · 0 words

**Memory key:** — (two cards, two bars; say nothing)

**On entry** — *(screen: a quick fade; only the two scenario cards (the room's stamp stays on its card), the amber sliver and the full teal bar; the deck moves on to S05 by itself)*

*[silence; everybody looks at the bars; A does not press]*

**Branch** — *A pressed during the bridge:* nothing is lost; S05 arrives a moment early with all its builds still to come.

**Hand-over:** — *(covered by "Two decisions, two clocks. Look at them." on S04b)*

**If you blank:** — *(nothing to say here)*

### S05 · What you just felt has a name

Role A (3p: A) · block 2:30 = talk 2:05 + room 0:25 · 5 clicks · 250 words

**Memory key:** What you just felt has a name → Decision #1 · Decision #2 → our CEO's flip → individuals · unanimous → FAST IN · SLOW IN → gesture key

**On entry** — *(screen: the amber sliver and the teal bar glide into the "Discussion" parts of two timelines; the d and the D drop onto the decision points; kicker THE DECIDING SCALE, headline "What you just felt has a name.", row labels "Decision #1 · one person · ≈ 3 s" and "Decision #2 · consensus rules · [time]")*

*[wait until the D has landed, 2 s]* What you just felt has a name: the Deciding scale. Consensual versus top-down. Who decides, and how? Decision one: one person, about three seconds. Decision two: the whole room, [m:ss on screen]. *[click]*

**Click 1** — *(the implementation parts wipe in: amber, long and hatched, with three ↺ loops, the first labelled "our CEO's flip"; teal, short and straight)*

Look at what comes after the decision. Top-down, in amber: short discussion, long implementation. It loops: more discussion, revisiting, altering. *[point at the first loop]* That first loop is our CEO's flip. Consensual, in teal: long discussion, short implementation. No more discussion! *[click]*

**Click 2** — *(top-down definition; the lowercase-d quote over the amber line)*

Here are Meyer's definitions. Top-down: **“Decisions are made by individuals (usually the boss).”** One person decides, early and fast. But **“each decision is also flexible—a decision with a lowercase d”**. New information comes in, and the decision opens again. So implementation can take a long time. *[click]*

**Click 3** — *(consensual definition; the capital-D quote over the teal line)*

Consensual: **“Decisions are made in groups through unanimous agreement.”** The discussion is long, because everyone is consulted. Then everyone has bought in, so implementation is fast. The decision is **“fixed and inflexible—a decision with a capital D”**. The moment of deciding is the pivot. *[beat]* ✂ Hands up: which flip felt worse? ✂ The CEO's? *[wait for hands]* ✂ Thanks. ✂ Or ours? *[wait for hands]* Same move. Different rules. You reached a capital D, and rule five held. *[click]*

**Click 4** — *(mnemonic chips: FAST IN · SLOW OUT (flexible) and SLOW IN · FAST OUT)*

Here is our trick for the exam. *[point along a timeline]* In is the decision; out is the implementation. Top-down: **fast in, slow out, and flexible.** Consensual: **slow in, fast out.** *[click]*

**Click 5** — *(gesture key in the footer: Big D = both arms up · little d = one finger)*

And one gesture for the rest of today. **Big D: both arms up. Little d: one finger.** The system you just tried: show me! *[arms up; wait]* The CEO's system: show me! *[one finger; wait]*

**Branch** —

- *Vote path at the deadline (VOTE stamp):* instead of "You reached a capital D, and rule five held." say: Two minutes were not enough for consensus. That is the price of the capital D: time. ✂ On the German side, even meeting agendas went round twice. ✂ And in Japan, Meyer says, decisions take a long time — more on that soon.
- *Early vote (silent room, VOTE stamp before 2:00):* instead say: Silence is not consensus, so we voted. A real capital D takes time. ✂ On the German side, even meeting agendas went round twice.
- *Tie path (no stamp; the label reads "minutes"):* on entry say: Decision two: the whole room, a few minutes. At click 3 use the deadline vote-path lines.
- *Late at checkpoint ① (more than 0:20 behind), or on the vote or tie path:* skip the poll (all four ✂ pieces). Keep "Same move. Different rules." and the path line ("You reached a capital D, and rule five held.", or the vote-path line without its ✂ sentences).
- *Nobody raises a hand in the poll:* Same move. Different rules. *(go on; no comment)*

**Hand-over:** **"And when the two rulebooks meet in one team?"** *(2p: A → B · 3p: A → C)* *[click]*

**If you blank:** Look at the two timelines: same word, different rules. *[click]*

Part I · block 2 · cases and classification (10:00–19:30). Checkpoint ②: S09a on screen by 14:45.

### S06 · When the two systems collide

Role B (3p: C) · block 1:15 = talk 1:12 + room 0:03 · 4 clicks · 144 words

**Memory key:** American side / German side → frustration zone → “Either of these systems can work…” → pioneers · Aufsichtsrat → iceberg

**On entry** — *(screen: the two S05 timelines slide on top of each other, amber "American side" on top, teal "German side" below; headline "Collision: one side implements, the other revises.")*

They collide. *[point at the amber line]* Top: the American little d, full of loops. *[point at the teal line]* Below: the German Big D. *[click]*

**Click 1** — *(a hatched "frustration zone" fades in where the lines overlap; two pins dock: “A promise.” on the D, “an agreement to continue discussions” on the d)*

Müller told Meyer what happened. The Germans spent days implementing. Then an American changed his mind, or brought new data. For her, a decision was **“A promise.”** Wulf called the American one **“an agreement to continue discussions”**. *[click]*

**Click 2** — *(Meyer's two fragments rise in, top right)*

Meyer's verdict: **“Either of these systems can work…”** But when they collide, **“…misunderstandings, inefficiency, and frustration can occur”**. *[click]*

**Click 3** — *(a wave line wipes across: the waterline; below it a wagon "US · pioneers · speed, individualism" and a board diagram "Germany · Aufsichtsrat appoints Vorstand")*

Why? Meyer looks at history. ✂ Many American pioneers had fled formal hierarchies. ✂ Speed mattered more than avoiding mistakes. ✂ So they decided fast: by the leader, or by vote. ✂ In many German firms, a senior group decides. ✂ In larger firms, the Aufsichtsrat appoints the Vorstand. *[or in English: the supervisory board appoints the managerial board]* **In one line: pioneers versus boards.** *[click]*

**Click 4** — *(iceberg labels at the waterline: "behaviour above" · "values, attitudes, beliefs below · iceberg")*

That's the iceberg from our course: behaviour above, values below.

**Branch** — *Late at checkpoint ① (script §2.9), or on the vote or tie path:* drop all five ✂ roots sentences; say only "Why? Meyer looks at history: pioneers versus boards."

**Hand-over:** **"Wait — Germany is the hierarchical one. How can it also be the consensual one?"** *(2p: B → A · 3p: C → A)*

**If you blank:** Same word, two rulebooks — and in one team, that means frustration. *[click]*

### S07 · Both were right: Leading ≠ Deciding

Role A (3p: A) · block 1:45 = talk 1:40 + room 0:05 · 4 clicks · 192 words

**Memory key:** Leading / Deciding → usual pattern → US → Germany → Japan · Vietnam

**On entry** — *(screen: headline "Both were right: Leading ≠ Deciding."; two rails: LEADING Egalitarian ↔ Hierarchical on top, DECIDING Consensual ↔ Top-down below; the Deciding dots are already in place: Japan, Sweden, Netherlands, Germany, Vietnam CM, US, China, Korea CM)*

Because these are two different scales. Remember Team Larry and Team Matthias? Both were right. *[point at the top rail]* Larry read the top rail: Leading. He saw fixed hierarchy, formal distance, formal titles. *[point at the bottom rail]* Matthias read the bottom rail: Deciding. He saw how Americans make decisions. **Leading is not Deciding.** *[click]*

**Click 1** — *(grey dots for Sweden, the Netherlands, China and Korea appear on Leading; nearly vertical grey lines drop to Deciding; tag "the usual pattern · “from Morocco to Korea”")*

First, the usual pattern. ✂ The lines drop almost straight down. ✂ Egalitarian cultures, like the Swedes and the Dutch, decide by consensus. Hierarchical cultures, **“from Morocco to Korea”**, decide top-down. *[click]*

**Click 2** — *(an amber line slants hard to the right from the US; tag "US · “more top-down than hierarchical”")*

Now the exceptions. The US is egalitarian on Leading. But one person, usually the boss, decides fast for the group. So the US is **“more top-down than hierarchical”**. *[click]*

**Click 3** — *(a teal line slants the other way from Germany; tags "Germany · hierarchical, yet consensual" and "US + Germany · “exceptions to the global pattern—but in opposite directions”")*

Germany slants the other way: hierarchical, yet consensual. So both are **“exceptions to the global pattern—but in opposite directions”**. That explains the clash in the merger. *[click]*

**Click 4** — *(teal lines slant far left from Japan and Vietnam; a ring highlights Japan's line; the Japan quote and "Vietnam CM · the same zig-zag, level with Germany")*

Here is the twist. *[trace Japan's line with your hand]* Japan's line crosses almost the whole map. *[read the quote with a short pause after "hierarchical"]* Japan, although **“…strongly hierarchical is one of the most consensual societies in the world”**. In course terms: a cultural paradox. ✂ The Country Mapping 2022 shows the same zig-zag for Vietnam. So the rule is: **never read Deciding off Leading.** A title does not tell you who decides.

**Branch** — *Late at checkpoint ①:* at click 1 say only "First, the usual pattern. Hierarchical cultures, “from Morocco to Korea”, decide top-down." An on-screen quote is never cut, so the cut saves about 0:08 (script §2.9).

**Hand-over:** **"So where does everybody sit?"** *(2p: A → B · 3p: A → B)*

**If you blank:** Two scales: how much hierarchy, and who decides. They do not always match. *[click]*

### S08a · Where does your culture decide?

Role B (3p: B) · block 1:20 = talk 1:12 + room 0:08 · 2 clicks · 144 words

**Memory key:** Fig. 5.3 (footer) → Japan … Nigeria → your culture? (headline) → relative (chip) → bell curve → generalization (chip)

**On entry** — *(screen: the Leading rail fades; the Deciding axis stays with Japan, Sweden, Netherlands, Germany, US, China; chip "relative · a generalization, not a stereotype"; the figure's two definitions sit at the ends)*

Here is Meyer's map: Figure 5.3. You know six of these already. *[click]*

**Click 1** — *(the other seven labels fade in from both ends: UK, France, Brazil, Italy, India, Russia, Nigeria)*

Read it in clusters, left to right. *[sweep your hand along the axis]* Far consensual: Japan and Sweden. Then the Netherlands and Germany. The UK sits in the middle. The US is just right of centre. Then Brazil, France and Italy. Then Russia, India and China. And at the far top-down end: Nigeria.

✂ Now find your country. *[silent pause, 5 s]* ✂ Meyer notes that consensus sounds modern and positive in business today. ✂ So you may feel proud on the left, and defensive on the right. ✂ Neither end is better. *[click]*

**Click 2** — *(each dot gets a translucent bell curve; the line "A country is a bell curve, not a dot." appears, tagged ours)*

Two reading rules. First, it is relative: Germans are consensual compared with Americans. Second, each dot is an average. People vary, so the curves overlap. **A country is a bell curve, not a dot.** *[point at the chip]* The lecture's word: a generalization. A group tendency, not a label for a person.

**Branch** — *Late at checkpoint ①, or on the vote or tie path:* no "find your country" pause and none of the four ✂ sentences from "Now find your country" on; clusters only.

**Hand-over:** **"Zoom in on one region."** *(2p and 3p: B continues into S08b)*

**If you blank:** Left is consensual, right is top-down, and every dot is only an average. *[click]*

### S08b · Asia is not one block

Role B (3p: B) · block 0:25 = talk 0:25 + room 0:00 · 1 click · 50 words

**Memory key:** Country Mapping 2022 → Japan → China · Korea → same region, opposite ends → Brazil vs US

**On entry** — *(screen: fade to the panel "Erin Meyer, Country Mapping 2022 · Asia IV": Japan, Singapore, China, Korea on a Deciding bar; below, the note "Book (2014) and online map (2022) differ in detail" with Brazil and the US)*

Meyer's online map, 2022: Asia. *[point left]* Japan: extreme consensual. Singapore: right of centre. *[point right]* China and Korea: far top-down. *[click]*

**Click 1** — *(rings at both ends; caption "same region, opposite ends")*

Same region, opposite ends. ✂ *[point at the note]* Book and online map differ in detail: Brazil and the US swap places. ✂ Use one source at a time.

**Branch** — *Late at checkpoint ①:* one sentence only: "Same region, opposite ends."

**Hand-over:** **"Let's visit the far consensual end — through an American's inbox."** *(2p: B continues · 3p: B → C)*

**If you blank:** Even inside one region, cultures sit at opposite ends. *[click]*

### S09a · Per's inbox: consensus from the inside

Role B (3p: C) · block 1:15 = talk 1:05 + room 0:10 · 4 clicks · 129 words

**Memory key:** Per Engman → opinion / DELETE → Poll → Lasse · Charlotte → Hi Erin → never sent

**On entry** — *(screen: fade; left "Meyer's new boss · Per Engman · a consensus-building Swedish manager"; right Per's email card, tag "original · Per to his team", ending "What do you think?")*

Meyer's own story: in Europe, her new boss was Per Engman. He called himself a typical consensus-building Swedish manager. ✂ He asked her to be patient with the Swedish process. Then this email arrived. ✂ Sound familiar? ✂ Our email copied his style. *[click]*

**Click 1** — *(Meyer's thought bubble “I don’t really have an opinion…”; a DELETE stamp slams onto the email; the poll card "Who would have hit delete?")*

She thought: **“I don’t really have an opinion…”** She was too busy. So she hit delete. ✂ *[raise your hand]* Who would have hit delete? *[wait 3–5 s for hands]* *[click]*

**Click 2** — *(replies from Lasse and Charlotte stack in; a pile of mail icons counts up "+…"; “Slowly—ever so slowly…”)*

Her Swedish colleagues did not. *[point at Lasse, then Charlotte; do not read them]* One by one, they replied with their own ideas. ✂ Then came replies to the replies. **“Slowly—ever so slowly…”** the group reached agreement. *[click]*

**Click 3** — *(the room dims; Per's personal email zooms in: "Hi Erin / Haven’t heard from you, what do you think? / Per")*

Then Per wrote to her personally. *[read the email card]* **Haven’t heard from you, what do you think?** *[click]*

**Click 4** — *(her reply types in, tagged "Meyer's draft · never sent", and a strike line wipes through it)*

*[let the room read, 3–4 s]* What she wanted to say. Never sent. Instead she replied: she would support whatever the group decided.

**Branch** — *Only if concerns were voiced in Decision #2 (the "Who could support M" question was asked):* after click 2, *[point at Charlotte]* ✂ Our question in Decision two was inspired by her. · *Late at checkpoint ①:* no delete poll.

**Hand-over:** **"Later, Per explained what working with Americans felt like."** *(2p: B continues · 3p: C continues into S09b)*

**If you blank:** Per asked everyone; Meyer wanted one person to decide. *[click]*

### S09b · Consensus: a four-letter word?

Role B (3p: C) · block 0:45 = talk 0:44 + room 0:01 · 3 clicks · 88 words

**Memory key:** Per on Americans → upside → Lencioni → #@!% → ethnocentrism

**On entry** — *(screen: Per's personal email becomes the teal panel "Per Engman on Americans" with two quotes and the label "upside · his team felt listened to · rapid implementation")*

Per described Americans as **“too busy to work as good team members”**. And as **“…always trying to impose a decision for decision’s sake…”** He meant Meyer. ✂ His upside: the team felt listened to; implementation was rapid. *[click]*

**Click 1** — *(the amber panel "Patrick Lencioni · American business author" fades in on the right)*

The opposite view: American author Patrick Lencioni. **“‘consensus’ is a four-letter word!”** *[click]*

**Click 2** — *(a censor bar "#@!%" wipes across the word Consensus in the headline)*

*[let it land, 1 s]* A four-letter word: a swear word. *[click]*

**Click 3** — *(the bar "ethnocentrism" joins both panels; the lecture line fades in below)*

Each side thinks its way is better: ethnocentrism. The lecture says: **“…your way is not the only way or even the best way!”**

**Branch** — *Late at checkpoint ①:* drop the ✂ upside line.

**Hand-over:** **"From Sweden to its neighbour at the far consensual end: Tokyo."** *(2p: B → A · 3p: C continues)*

**If you blank:** One side's virtue is the other side's problem. *[click]*

### S10a · Tokyo: already decided?

Role A (3p: C) · block 0:25 = talk 0:25 + room 0:00 · 1 click · 47 words

**Memory key:** Tokyo HQ · Astellas → stop testing? → 8 + 2 → JS → 3 weeks

**On entry** — *(screen: fade into a top view of the meeting table: 8 grey seats "8 Japanese managers", 2 grey seats "2 non-Japanese “old hands”"; kicker "Tokyo HQ · Astellas · stop testing a new product?"; headline "Three weeks of preparation. Already decided?")*

Tokyo, the headquarters of Astellas, a Japanese pharmaceutical company. The question: should they stop testing a new product? *[point at the table]* Around the table: eight Japanese managers and two non-Japanese old hands. *[click]*

**Click 1** — *(a bar "3 weeks of preparation" wipes across; Jack Sheldon's seat "JS" glides in at the end of the table, "outside the group")*

And Jack Sheldon, the expert. He wanted the testing to continue. He spent three weeks building his argument. *[click]*

**Hand-over:** — *(same speaker; press straight on into S10b)*

**If you blank:** Sheldon came well prepared, to a group of ten. *[click]*

### S10b · Tokyo: 100 percent aligned

Role A (3p: C) · block 0:35 = talk 0:35 + room 0:00 · 2 clicks · 68 words

**Memory key:** 8 Japanese managers (now teal) → finalized → 100 percent → roots under the table

**On entry** — *(screen: the table glides left; all 8 Japanese seats turn teal at the same instant)*

The meeting begins. A Japanese manager presents first and concludes: stop the testing. *[point at the teal seats]* The others agree. *[click]*

**Click 1** — *(both quotes fade in, signed "J. Sheldon · at Tokyo HQ")*

To Sheldon, **“…it seemed that the decision had already been finalized within the group.”** Everyone was polite, but **“100 percent aligned against continued testing”**. ✂ Three weeks of work, and no effect at all. *[click]*

**Click 2** — *(a rewind scrubber runs back along the bar, right to left; thin roots grow under the table)*

*[follow the rewind with your hand]* So the real decision came earlier. *[point at the roots]* Somewhere under the table.

**Hand-over:** **"How does a strongly hierarchical company decide by consensus?"** *(2p: A continues · 3p: C continues into S11a)*

**If you blank:** The group had decided before the meeting even began. *[click]*

### S11a · Later, in Meyer's seminar

Role A (3p: C) · block 0:25 = talk 0:25 + room 0:00 · 1 click · 50 words

**Memory key:** seminar → JS tells the story → Japanese participants → S. Mori

**On entry** — *(screen: a divider line draws across; headline "Later, in Meyer’s seminar for Astellas"; the table becomes a lectern with JS, "JS tells the story"; new classroom rows, part teal, part grey, "Japanese participants confer")*

Later, Sheldon told this story in Meyer's seminar for Astellas. Several participants were Japanese. Meyer asked them what might have happened. *[click]*

**Click 1** — *(Mori's monogram SM appears on a teal seat; his line fades in)*

After a coffee break, Susumi Mori spoke for them. **“In Japan, decisions tend to be made by group consensus…”** Not by the individual.

**Hand-over:** **"And he showed how it works."** *(2p: A continues · 3p: C continues into S11b)*

**If you blank:** The Japanese participants explained it: the group decides. *[click]*

### S11b · Ringi: the decision climbs, stamp by stamp

Role A (3p: C) · block 0:27 = talk 0:27 + room 0:00 · 1 click · 54 words

**Memory key:** Ringi → ringisho → mid-management → S. Mori

**On entry** — *(screen: the desk rows swell into a four-level pyramid; the ringisho drops onto "mid-management"; three vermilion stamps land on it; the ringi box appears on the right)*

This is the ringi system. Low-level managers agree first. Then the proposal document, the ringisho, starts at mid-management. *[point at the ringi box]* **Each person reads the ringisho, may suggest changes and stamps it. Once everyone at one level has approved, it moves up.** *[click]*

**Click 1** — *(Mori's line fades in)*

Mori's summary: the ringi system is **“…hierarchical, bottom-up, and consensual all at the same time.”** *[click]*

**Hand-over:** — *(same speaker; press straight on into S11c)*

**If you blank:** The proposal starts in the middle and climbs, stamp by stamp. *[click]*

### S11c · Ringi: the ringisho reaches senior level

Role A (3p: C) · block 0:08 = talk 0:08 + room 0:00 · 0 clicks · 16 words

**Memory key:** senior → Mori's line: hierarchical · bottom-up · consensual

**On entry** — *(screen: the ringisho climbs to "senior"; two more stamps pop on; a dotted trail marks mid-management; Mori's line is still on screen)*

Up one level. *[trace the climb with your hand]* Hierarchical: it climbs, level by level. Bottom-up: it starts low. Consensual: everyone stamps. *[click]*

**Hand-over:** — *(same speaker; press straight on into S11d)*

**If you blank:** Each level agrees, then passes it up. *[click]*

### S11d · Ringi reaches the top; nemawashi

Role A (3p: C) · block 0:45 = talk 0:45 + room 0:00 · 3 clicks · 90 words

**Memory key:** top management · D → capital D → nemawashi = root-binding → J. Sheldon

**On entry** — *(screen: the ringisho reaches "top management"; the last stamp is a teal capital D; Mori's line and the ringi box are gone)*

*[point at the top]* At the top: a capital D. *[click]*

**Click 1** — *(Meyer's fragment with a teal D seal: “a decision with a capital D”)*

Ringi is slow. Then the decision is fixed, and implementation can be rapid. Meyer calls it **“a decision with a capital D”**. **Slow in, fast out.** *[click]*

**Click 2** — *(a plant with bound roots draws itself; "nemawashi = “root-binding”"; label "informal, face-to-face talks before anyone signs")*

Before the first stamp comes nemawashi: **“root-binding”**. ✂ Gardeners bind the roots before they move a plant. **Nemawashi: informal, face-to-face talks before anyone signs.** *[click]*

**Click 3** — *(Sheldon's two lines rise in, signed J. Sheldon)*

Sheldon's lesson, in his words: **“…do my ‘root binding’ well before the actual meeting.”** Because later, **“…it becomes very hard to go back on the group decision…”**

**Branch** — optional extras, spoken after click 2, before you press for click 3:

- *Nemawashi reveal (only if you really held the talks; option on — the chip "our nemawashi" arrives top right with click 2):* Hands up if we talked to you in December. *[wait for hands, 3 s; click the chip "our nemawashi"]* That's why Decision two had early supporters. *(About 0:11. Drop the ✂ gardener line here and the ✂ line in S10b; the rest comes from the buffer. Late at checkpoint ② or later: skip it, script §2.9.)*
- *Only if Decision #2 reached instant unanimity (under 20 s) and the option is off — the payoff of "Hold that thought" from S04b:* ✂ Remember our instant consensus? ✂ In Tokyo, the quick yes came from talks before the meeting. *(About 0:08; replaces the ✂ gardener line.)*

**Hand-over:** **"So how do you work with each system?"** *(2p: A → B · 3p: C → B)*

**If you blank:** Slow in, fast out — and the real work happens before the meeting. *[click]*

Part I · block 3 · toolkit, mixed teams, apply and exam (19:30–24:15, then the 0:45 buffer). Checkpoint ③: S12a on screen by 19:30.

### S12a · Two rulebooks, ten moves

Role B (3p: B) · block 1:20 = talk 1:15 + room 0:05 · 2 clicks · 149 words

**Memory key:** ten moves → BIG D → unlike Erin → Sheldon's lesson → little d → our rule 4

**On entry** — *(screen: fade; kicker "How to work with each system · Meyer's advice, five moves each"; headline "Two rulebooks, ten moves."; the stage below is still empty)*

Meyer's answer: five moves for each system. Two rulebooks, ten moves. *[click]*

**Click 1** — *(the teal column "Working with BIG D (consensual)" flies in from the left, its five chips one by one; small notes "unlike Erin" beside 3 and "Sheldon's lesson" beside 4)*

First, Big D. **Slow in, fast out.** One: expect it to take longer. ✂ More meetings, more emails. Two: show patience and commitment. ✂ Even when the talks seem endless. Three: check in regularly. *[point at "unlike Erin"]* Unlike Erin Meyer, who hit delete. Four: cultivate informal contacts. Otherwise a consensus forms without you. *[point at "Sheldon's lesson"]* That was Sheldon's lesson. Five: don't push. Put quality first. Once it is made, the decision is hard to change. *[click]*

**Click 2** — *(the amber column "Working with little d (top-down)" flies in from the right; small notes "Decision #1" beside 2 and "our rule 4" beside 4)*

Now, little d. **Fast in, slow out.** One: the boss decides. Before, during or after the meeting. Two: follow, even if you were overruled. *[point at "Decision #1"]* Like you did in Decision one. Three: in charge? Listen, then decide fast. ✂ Otherwise you look indecisive. Four: divided, with no leader? Suggest a vote. *[point at "our rule 4"]* The majority binds everyone. That was our rule four. Five: stay flexible. ✂ Decisions are rarely set in stone.

**Branch** — *Vote path (Decision #2 ended with the amber VOTE stamp):* after "That was our rule four", add ✂ "That's how you decided Decision two." · *Unanimous path:* no change.

**Hand-over:** **"Now, a quick-fire."** *(2p and 3p: B continues into S12b; spoken before the click)*

**If you blank:** Big D: join early and be patient. Little d: follow the boss and stay flexible. *[click]*

### S12b · Quick-fire 1: Big D or little d?

Role B (3p: B) · block 0:30 = talk 0:20 + room 0:10 · 2 clicks · 40 words

**Memory key:** Show me → Tokyo card → D → Sheldon

**On entry** — *(screen: the two columns shrink to the side edges; centre: kicker "Quick-fire · gesture, don't shout", headline "Big D or little d? Show me."; gesture key in the footer; chip "→ 24" bottom right)*

**Big D or little d?** We read a card; you show me. *[click]*

**Click 1** — *(the card "Quick-fire 1 of 2" zooms in: "You fly to Tokyo after three weeks preparing your argument.")*

You fly to Tokyo after three weeks preparing your argument. Which system do you meet? Show me. *[wait for gestures, about 10 s; do not show an answer yourself]* *[click]*

**Click 2** — *(a big teal D drops in under the card with "Big D · get in early, build informal contacts (Sheldon)"; a glow ring lights "Cultivate informal contacts" in the left column)*

Big D. Get in early; build informal contacts. ✂ Exactly Sheldon's lesson. *[click]*

**Branch** — *Late at checkpoint ② or ③ (script §2.9, saves 0:25):* after click 2, B does not press the clicker. B says the S12 hand-over at once, **"And if your team has both?"** *(B → A)*, and looks at A; A puts the mouse on "→ 24" (bottom right; fallback: A types 24 + Enter in the presenter window). B passes the clicker to A. · *The room is split or silent:* Tokyo sits at the far consensual end. So: Big D.

**Hand-over:** — *(B continues; the clicker brings card two)*

**If you blank:** Tokyo means consensus: get in early. *[click]*

### S12c · Quick-fire 2: Big D or little d?

Role B (3p: B) · block 0:25 = talk 0:15 + room 0:10 · 1 click · 30 words

**Memory key:** “Decision made!” → d → Stay flexible → small d or big D?

**On entry** — *(screen: card one turns into card two, "Quick-fire 2 of 2 · A teammate says “Decision made!” — then brings new data next week."; the D and the glow ring are gone)*

A teammate says **“Decision made!”** Then brings new data next week. Show me. *[wait for gestures, about 10 s]* *[click]*

**Click 1** — *(an amber d writes itself under the card with "little d · stay flexible — and ask: small d or big D?"; a glow ring lights "Stay flexible" in the right column)*

Little d. Stay flexible. And ask: small d, or big D?

**Hand-over:** **"And if your team has both?"** *(2p: B → A · 3p: B → A)*

**If you blank:** New data, new plan: that's little d. *[then the hand-over]*

### S13 · Mixed team? Decide how to decide.

Role A, B speaks the American line (3p: A, B one line) · block 1:00 = talk 0:57 + room 0:03 · 4 clicks · 114 words (A 104 · B 10)

**Memory key:** Recognise it? → Meyer's protocol → open box (—) → small d → big D → awareness

**On entry** — *(screen: the side columns fade; the S04 rules card "HOW WE DECIDE" sits top left, with "Recognise it? Our rules from Decision #2." under it; headline "Mixed team? Decide how to decide."; an amber d bottom left, a teal D drops in at the centre; chip "M → 26" bottom right with a small hint, "your scenario: T · next" or "your scenario: M", if a stamp chip was clicked on S04b)*

**A:** *[point at the rules card]* Recognise it? Our rules from Decision two. ✂ You agreed to them about eighteen minutes ago. *[click]*

**Click 1** — *(the card "Meyer's protocol · agree it early, in a mixed team" rises in; four boxes tick one by one, each beside the number of our rule that covered it: 4 · 1 2 · 3 · 5; the fifth box, "Revisit before big decisions", stays open with a dash)*

**A:** Here is the secret. Our card followed Meyer's protocol for mixed teams. **Agree how you decide, early.** *[point down the ticks]* Vote, or the boss after discussion? A hundred percent agreement? A deadline? Flexibility after the deadline? *[point at the open box]* ✂ One box stays open: revisit the method before big decisions. *[click]*

**Click 2** — *(an amber speech bubble rises beside the d, signed "an American manager · p. 160")*

**A:** The merger team learned to label their decisions out loud.

**B (as the American manager):** **“Great! Decision made! … Decision with a small d, that is!”** *[A: click]*

**Click 3** — *(a teal bubble rises beside the D, signed "a German manager · p. 160")*

**A:** And a German manager might ask: **“…does it have a small d or a big D?”** *[click]*

**Click 4** — *(the takeaway rises in along the bottom, signed "Meyer · p. 161")*

**A:** Meyer's lesson: **“awareness and open communication go a long way toward defusing conflict”**.

**Branch** — *The room chose scenario M (hint "your scenario: M", or you remember M):* after the hand-over, put the mouse on "M → 26" (bottom right); do not press the clicker. If the chip misfires: type 26 + Enter in the presenter window. · *Scenario T, or no hint:* press the clicker as usual. · *B is out of reach:* **A:** An American manager might say: *(then the same quote)*.

**Hand-over:** **"Your turn. Remember the scenario you chose?"** *(2p: A continues · 3p: A → C)*

**If you blank:** Before you decide, agree how you decide. Then label it: small d or big D? *[click]*

### S14a · Your scenario. Your three moves. (scenario T)

Role A (3p: C) · block 0:40 = talk 0:20 + room 0:20 · 1 click · 40 words

**Memory key:** SCENARIO T · decided by you → Call them out → nemawashi → Quality → stick

**On entry** — *(screen: fade; kicker "Apply · the scenario you chose in Decision #2"; headline "Your scenario. Your three moves."; the Scenario T card "Your proposal needs approval at Tokyo HQ. In four weeks." with the room's result beside it: the teal D stamp or the amber VOTE stamp, each with "decided by you · after m:ss", or a dashed "decided by you" if no stamp was clicked; the line "Which three moves would you use? Call them out.")*

*[point at the card]* Scenario T: Tokyo approval, four weeks. *[point at the stamp]* You stamped a capital D. Which three of Meyer's moves would you use? Call them out. *[call-out, about 20 s; echo each move in two or three words: "Yes, talk early." "Patience, good."]* Thanks! *[click]*

**Click 1** — *(three teal moves fly in from the left: "1 Start nemawashi now · get in early and informally" · "2 Quality of information · complete, well reasoned; don't push" · "3 Expect it to stick · once made, hard to change")*

*[tick off aloud the ones the room named]* Start nemawashi now. Quality of information; don't push. Expect it to stick.

**Branch** —

- *Vote path (amber VOTE stamp):* instead of "You stamped a capital D." say: You decided by vote. Meyer files that under top-down. Would you defend a vote as hard as a consensus?
- *Tie (the facilitator decided; no stamp, dashed outline):* instead of "You stamped a capital D." say: It was a tie, so one person decided. That's top-down too.
- *Stamp missing (dashed outline):* say the result aloud: You decided this by [consensus / vote].
- *Silent room after 5 s:* Think of Sheldon. What would he do earlier?
- *Late at checkpoint ③ (script §2.9):* call-out 15 s. This saves 0:05: the call-out is 20 s, because 30 s would not fit the 0:40 block (section 2.3).
- *The room chose M, but this T card is up:* type 26 + Enter in the presenter window; S14m follows, and Next goes on to S14b.

**Hand-over:** **"Now let's make it exam-proof."** *(2p: A continues · 3p: C continues into S14b)*

**If you blank:** Tokyo means Big D: start early, bring good data, expect it to stick. *[click]*

### S14m · Your scenario. Your three moves. (scenario M, hidden variant)

Role A (3p: C) · block 0:40 = talk 0:20 + room 0:20 · 1 click · 40 words

**Memory key:** SCENARIO M · decided by you → Call them out → method → Label → flexibility after

**On entry** — *(screen: reached by the chip "M → 26" on S13; same layout as S14a with the Scenario M card "Your German–American team must pick a supplier. By Friday." and the room's result; the line "Which three moves would you use? Call them out.")*

*[point at the card]* Scenario M: a supplier, by Friday. *[point at the stamp]* You stamped a capital D. Which three of Meyer's moves would you use? Call them out. *[call-out, about 20 s; echo each move in two or three words]* Thanks! *[click]*

**Click 1** — *(three moves fly in: "1 Agree the method first · vote or boss? 100%? Friday?" · "2 Label: small d or big D? · say which kind each decision is" · "3 Deadline + flexibility after · how open is it after Friday?")*

*[tick off aloud the ones the room named]* Method first. Label: small d or big D? Deadline, and flexibility after.

**Branch** — the same result lines as S14a (vote path, tie, stamp missing; call-out 15 s when late). *Silent room after 5 s:* Think of the merger. What did both sides need to agree?

**Hand-over:** **"Now let's make it exam-proof."** *(2p: A continues · 3p: C continues; Next goes to S14b)*

**If you blank:** A German–American team: agree the method, label it, fix the deadline. *[click]*

### S14b · Exam card

Role A (3p: C) · block 0:30 = talk 0:26 + room 0:04 · 0 clicks · 52 words

**Memory key:** Practice question → Consensual D → Top-down d → Leading ≠ Deciding → Recommendations → Take a photo

**On entry** — *(screen: fade, static; kicker "Practice question · in the Lecture I exam format"; the question in italics; four cards "1 Consensual D", "2 Top-down d", "3 Leading ≠ Deciding", "4 Recommendations"; "Take a photo."; chip "II → 29" bottom right)*

*[point at the question]* Explain the difference between consensual and top-down decision making, and give an example. *[point at card 1]* One: consensual. **Slow in, fast out.** Like ringi, or Per's team. *[card 2]* Two: top-down. **Fast in, slow out.** Like the US side of the merger. *[card 3]* Three: Leading is not Deciding. *[card 4]* Four: mixed team? Agree how you decide. **Take a photo.** *[pause 4 s]* *[click]*

**Branch** — *Late (presenter clock more than 0:20 behind here; script §2.9, cut after checkpoint ③, saves 0:20):* after "Take a photo.", put the mouse on "II → 29" (bottom right; fallback: type 29 + Enter in the presenter window) and say the Part I hand-over now: **"That was Meyer's world. Now: ours."** *(2p: A → B · 3p: C continues)*

**Hand-over:** — *(same speaker; the clicker brings the true-or-false round)*

**If you blank:** Point at the four cards and name them: consensual, top-down, Leading is not Deciding, recommendations. *[click]*

### S14c · True or false? Thumbs.

Role A (3p: C) · block 0:20 = talk 0:10 + room 0:10 · 4 clicks · 20 words

**Memory key:** statement 1 · Thumbs → FALSE → statement 2 · Thumbs → TRUE

**On entry** — *(screen: headline "True or false? Thumbs."; key "thumb up = true · thumb down = false")*

*[say nothing; the thumbs key is on screen; click at once]*

**Click 1** — *(statement 1 rises in: "Top-down decisions are made fast, so implementation is fast too.")*

True or false? Thumbs. *[let the room read and vote, about 5 s]* *[click]*

**Click 2** — *(an off-white "✗ FALSE" stamp slams on; reason line "continual revision: implementation can take long")*

False. Fast in, slow out. *[click]*

**Click 3** — *(statement 2 rises in: "Japan is strongly hierarchical, yet one of the most consensual societies.")*

Thumbs? *[let the room read and vote, about 5 s]* *[click]*

**Click 4** — *(a "✓ TRUE" stamp; reason line "ringi: group agreement, level by level")*

True. Hierarchical, yet consensual.

**Branch** — *Ahead of time only:* read each reason line aloud as well (about +0:08; with full reasons the slide takes about 0:35, script §3). · *Timing note:* the thumb votes are about 5 s each (script §2.1, §3 S14c): two 8-s votes would leave 4 s for the prompts, the stamps and the hand-over (section 2.3).

**Hand-over:** **"That was Meyer's world. Now: ours."** *(2p: A → B · 3p: C continues)*

**If you blank:** Read the stamp and point at its reason line. *[click]*

---

Part II · our cultures, how we decided, management implications (25:00–35:00). Checkpoint ④: S15 on screen by 25:00, at the very latest 25:30.

### S15 · Now us: the room maps itself

Role B (3p: C) · block 0:45 = talk 0:40 + room 0:05 · 2 clicks · 75 words

**Memory key:** Show me → Part II → P1 · P2 → ring = me → Bennett

**On entry** — *(screen: fade; kicker "Part II · our cultures → how we decided → three moves for managers"; headline "Your culture: Big D or little d? Show me."; gesture key top right; the Deciding axis wipes in with the book's 13 countries as grey ghost dots; legend "dot = Country Mapping 2022 (generalization)")*

**Your culture: Big D or little d? Show me.** *[wait for gestures, 5 s]* ✂ This room alone is a scale. Part two: our cultures, how we decided, three moves for managers. *[click]*

**Click 1** — *(white member dots drop onto the axis, labelled "P1 [MEMBER 1: culture]" and "P2 [MEMBER 2: culture]"; while positions are still placeholders they are dashed)*

[MEMBER 1: culture] and [MEMBER 2: culture], placed by Meyer's Country Mapping. *[click]*

**Click 2** — *(hollow rings land at each member's own place; legend "ring = me"; Bennett's line rises in, "Bennett (2001) · Lecture III, slide 34")*

The dot is a tendency. The ring is a person: one of us. Bennett says: **“A given individual may exhibit the predominant group tendency a lot, a little, or not at all.”**

**Branch** —

- *3p (block 0:30 = talk 0:25 + room 0:05, C speaks):* on click 1 name all three cultures; drop the ✂ line, the "Part two" line and "The dot is a tendency. The ring is a person: one of us."; say instead: The rings are us. Bennett: *(then the quote)*.
- *A member's culture is not on Meyer's map (dashed marker), at click 1:* [MEMBER n: culture] is not on Meyer's map, so that dot is self-assessed. · *Bicultural member (two linked dots), at click 1:* [MEMBER n: name] has two dots.
- *Self-variant: the S15 speaker (B; C with three presenters) is Member 1, or is the first member present when Member 1 is absent:* replace the hand-over with: Let me go first. Where does my dot land? *[click]*
- *One presenter is absent on the day (only the variant the team chose, script §1.5), at click 1:* [MEMBER n] couldn't be here today. Their dot stays; they were part of every decision. *(present their P slide from their sheet when you reach it)* · *Member 1 absent, third-person variant:* S16 comes next and is theirs, so skip the hand-over question and go straight on into S16. · *Member 1 absent, jump variant:* at the end of this slide say the self-variant line, then type 31 + Enter instead of the click.

**Hand-over:** **"[MEMBER 1], you first — where does your dot land?"** *(2p: B → Member 1 · 3p: C → Member 1; use the first member present; if that is you, use the self-variant)*

**If you blank:** The dots are our cultures. The rings are us. *[click]*

### S16 · P1 · [MEMBER 1: name · culture(s)]

Member 1 (3p: Member 1) · block 2:30 = talk 2:15 + room 0:15 · 3 clicks · budget 270 words (3p: block 2:00 = talk 1:48 + room 0:12 · 215 words)

**Memory key:** And me? → Position on the map → I felt it when … → too simple · my blind spot → In a team I need → my verdict

**On entry** — *(screen: Member 1's dot unfolds into the card "P1 [MEMBER 1 · name] [culture(s)]", headline "[MEMBER 1: culture] — [Big D / little d]. And me?")*

*[Member 1's own text: the fill-in template in section 5. Clicks: 1 position, 2 episode, 3 nuance + team need + verdict.]*

**Branch** —

- *Member 2 absent on the day, jump variant (script §1.5):* at the end of S16, type 33 + Enter (lands on S18) and end with **"Different dots, one team. So how did WE decide?"**
- *Third-person variant (script §1.5):* the present member speaks the absent member's slide from their fill-in sheet ("[MEMBER n] places …"), adding nothing that is not on it. A P slide in the third person needs no hand-over question: skip the question before it and go straight on, to the next P slide or to **"Different dots, one team. So how did WE decide?"**
  - *Member 2 absent:* end S16 without "[MEMBER 2], where does your dot land?"; click and present S17 in the third person.
  - *Member 1 absent (you presented S16 in the third person):* end S16 with: And where does my dot land? *[click]*

**Hand-over:** **"[MEMBER 2], where does your dot land?"** *(2p and 3p: Member 1 → Member 2)*

**If you blank:** Read the three icons as questions, and answer each in a few words. *[click]*

### S17 · P2 · [MEMBER 2: name · culture(s)]

Member 2 (3p: Member 2) · block 2:30 = talk 2:15 + room 0:15 · 3 clicks · budget 270 words (3p: block 2:00 = talk 1:48 + room 0:12 · 215 words)

**Memory key:** And me? → Position on the map → I felt it when … → too simple · my blind spot → In a team I need → my verdict

**On entry** — *(screen: the P1 card folds back into its dot on the strip as Member 2's dot unfolds into the card "P2 [MEMBER 2 · name] [culture(s)]")*

*[Member 2's own text: the same template in section 5, with Member 2's slots.]*

**Hand-over:** **"Different dots, one team. So how did WE decide?"** *(2p: Member 2 → B · 3p: instead "[MEMBER 3], where does your dot land?", Member 2 → Member 3)*

**If you blank:** Read the three icons as questions, and answer each in a few words. *[click]*

### S17b · P3 · [MEMBER 3: name · culture(s)] (three presenters only)

Member 3, three-presenter build only · with two presenters an unused slot (Next skips it, typing 32 finds nothing) · 3p: 2:00 block, 1:48 talk, 0:12 room · 3 clicks · 3p budget 215 words

**Memory key:** as S16.

*[Three presenters only: Member 3 uses the template in section 5 with the three-presenter budgets, and ends with **"Different dots, one team. So how did WE decide?"** (Member 3 → C).]*

### S18 · How did WE decide this presentation?

Role B (3p: C) · block 0:45 = talk 0:43 + room 0:02 · 3 clicks · 81 words (slots at their budgets)

**Memory key:** WE → gap → Our concept decision → risk · fix

**On entry** — *(screen: the P card folds back into its dot; both member dots sit on the Deciding axis, labelled P1 and P2; headline "How did WE decide this presentation?")*

*[let the headline land, 1 s; the question was just asked]* *[click]*

**Click 1** — *(a dashed bracket spans the two outermost dots; above it "gap: [small / medium / large]")*

*[trace the bracket]* The gap between our dots: [small / medium / large]. *[click]*

**Click 2** — *(a mini timeline wipes in: kicker "Our concept decision · who proposed, how we agreed, revisited?"; labels "Discussion · who proposed? [TEAM: …]" · "How we agreed [TEAM: one person / a vote / everyone]" · "Implementation · revisited? [TEAM: …]"; the marker "[D / d]")*

Our concept decision. *[point at "Discussion"]* [TEAM: who proposed it, ≤ 6 words]. *[point at "How we agreed"]* We agreed by [TEAM: one person / a vote / everyone]. *[point at "Implementation"]* Revisited? [TEAM: no / yes — what changed, ≤ 8 words]. Honestly: **[Big D / little d]**. *[click]*

**Click 3** — *(the risk/fix card rises in: "[WIDEST PAIR: X ↔ Y] risk [TEAM: …] · fix [TEAM: …]"; under it Meyer's two anchors: "more consensual side: a revised decision feels like “trying to trick us” Müller, p. 147" · "more top-down side: a slow decider looks like “an indecisive or ineffective leader” p. 159")*

Our risk: [TEAM: ≤ 6 words]. *[point left]* More consensual side: a revised decision feels like **“trying to trick us”**. *[point right]* More top-down side: a slow decider looks like **“an indecisive or ineffective leader”**. Our fix: [TEAM: ≤ 6 words].

**Branch** —

- *Fill click 2 in truthfully:* "we did it top-down" is a fine answer (script §4.6). Sentence shape only: [TEAM: one of us] proposed it in [TEAM: when].
- *Written by position, not by person (script §4.6):* say "the more consensual side" and "the more top-down side", never a name, so the line holds whoever is present.
- *Both members share one culture (script §4.6):* on click 1 say: Our dots sit close together. So we mirror ourselves against the opposite end of the map. Then give the risk for a team from that end.
- *3p (block 0:30 = talk 0:28 + room 0:02, C speaks):* click 1: Gap: [small / medium / large]. · Click 2, one sentence: [TEAM: who] proposed it; we agreed by [TEAM: one person / a vote / everyone]: [Big D / little d]. · Click 3: risk and fix only; point at Meyer's two anchors without reading them; then the member in the middle adds one line: [MEMBER n: I sit between them, closer to …].

**Hand-over:** **"What should managers do about gaps like ours?"** *(2p: B → A · 3p: C → A)* *[click, then pass the clicker to A; A keeps it to the end]*

**If you blank:** Say the three labels as questions: who proposed, how we agreed, revisited? Then: risk and fix. *[click]*

### S19 · Three moves for managers

Role A ①② → B ③ + CQ sentence (3p: A ① → B ② → C ③ + CQ) · block 2:30 = talk 2:25 + room 0:05 · 3 clicks · 285 words (A 164 · B 121) (team lines at their budgets)

**Memory key:** Three moves → Decide how to decide → Don't read Deciding off Leading → Time your influence → “Decisive” → CQ

**On entry** — *(screen: fade; headline "Three moves for managers." on an empty stage)*

**A:** Three moves for managers. *[click]*

**Click 1** — *(card ① zooms in: rules-card icon with D and d; "Decide how to decide — and label it D or d."; team slot "[for X ↔ Y: which protocol question would we answer differently?]"; bullets "In the team charter: vote or boss? 100% agreement? A deadline? Flexibility after it? p. 160" and "Label each decision: “a small d or a big D?” pp. 160–161")*

**A:** Move one: **decide how to decide, and label it: big D or little d.** [for X ↔ Y: which protocol question would we answer differently? ≤ 20 words; shape: "For a pair like ours, the hard question is …"] So write Meyer's protocol into every kick-off and team charter. Vote or boss? A hundred percent agreement? A deadline? Flexibility after it? Then label each decision: **“a small d or a big D?”** In meetings, meeting notes and emails. The merger team made this a habit. ✂ Meyer's point: awareness and open talk defuse conflict. *[click]*

**Click 2** — *(card ② zooms in: two-rails icon and ≠; "Don't read Deciding off Leading."; team slot "[for X ↔ Y: …]"; bullets "Titles and formality don't show who decides: US, Germany, Japan, Vietnam." and "Merger integration, onboarding, expatriates: check both scales.")*

**A:** Move two: don't read Deciding off Leading. [for X ↔ Y: … ≤ 20 words; shape: "In our pair, titles would tell you …, but …"] Titles and formality don't show who decides. The US is egalitarian, yet top-down. Germany, Japan and Vietnam are hierarchical, yet consensual. This matters in three places. Merger integration, like the US–German case. Onboarding new hires from abroad. And preparing expatriates. So check both scales. *[A: click — card ③ zooms in; B steps forward]*

**Click 3** — *(card ③ zooms in: roots and clock icons; "Time your influence. “Decisive” is culturally coded."; team slot "[for X ↔ Y: …]"; bullets "Consensual: get in early and informally (nemawashi). pp. 157–158" and "Top-down: the boss decides; follow, stay flexible. pp. 159–160"; the GLOBE line "“a leader is decisive if they can make a quick decision” GLOBE, Anglo cultures · course script, p. 26"; the footer "CQ: knowledge · mindfulness · competencies" rises in)*

**B:** Move three: **time your influence. “Decisive” is culturally coded.** [for X ↔ Y: … ≤ 15 words] Facing a consensual system: get in early and informally — nemawashi. Facing a top-down system: the boss decides. Follow, and stay flexible. Our course script quotes GLOBE. In Anglo cultures, **“a leader is decisive if they can make a quick decision”**. Leaders from Germany or France tend to be deliberate and precise. So a consensual manager is not automatically indecisive. ✂ Remember that in assessments and promotions. *[point at the footer]* In Thomas's terms: cultural intelligence. Knowledge: the scale and its paradoxes. Mindfulness: noticing your irritation when the CEO flipped. Competencies: the toolkit and the protocol.

**Branch** —

- *3p (0:40 each; A clicks every card):* A says card ① and drops its ✂ line, then hands over; B says card ② as written, then hands over; C says card ③ without the Germany/France sentence and the ✂ line, with a team line of ≤ 10 words and the short CQ sentence: Knowledge, mindfulness, competencies: the scale, the irritation, the toolkit.
- *Ahead of time only (B, after the CQ sentence; ours, script §4.7 and backup 39):* In Bennett's model, we would call asking small d or big D a step toward adaptation.

**Hand-over:** **"Which brings us to one last decision."** *(2p: B continues into S20 · 3p: C → B)* *[A: click]*

**If you blank:** One: agree how you decide. Two: check both scales. Three: get in early, or follow fast. *[click]*

### S20 · So — was that a big D or a little d?

Role B (proposal) → A (callback) (3p: the same) · block 1:00 = talk 0:43 + room 0:17 · 3 clicks + the stamp chip · 85 words (A 50 · B 35)

**Memory key:** one last proposal → Stand up → Three decisions today → big D or little d? → Q&A runs on little d

**On entry** — *(screen: bare stage; the proposal drops in like an email: "one last proposal · In your next group project, agree HOW you decide — before you decide."; chip "→ 36" bottom right)*

**B:** One last proposal. *[point at the card]* In your next group project, agree HOW you decide — before you decide. *[A: click]*

**Click 1** — *(the line "Stand up if you'll take this with you." rises in; the small D stamp chip appears beside it)*

**B:** Stand up, or raise both hands, if you'll take this with you. *[wait about 5 s; look at the class, not at the professor]* *[nearly everyone stands → A clicks the D chip: a teal D stamps the proposal]* Capital D. No more discussion. Please sit down. *[A: click]*

**Click 2** — *(three bars, "Three decisions today": "seconds · #1 · one person", "minutes · #2 · the room" with the real time, "yours · #3 · your next team" as an empty bar; the big teal D, a "?" and the amber d return as on the title slide; headline "So — was that a big D or a little d?")*

**A:** Three decisions today. *[point along the bars]* The CEO's took seconds. Yours took minutes. The third is yours: how you'll decide in your next international team. **So — was that a big D or a little d?** Show me. *[wait for gestures, about 5 s]* Depends on whether you revisit it tomorrow. *[click]*

**Click 3** — *("Q&A runs on little d." rises in)*

**A:** **Q&A runs on little d.** We'll revisit anything. Questions?

**Branch** —

- *Not everyone stands:* A clicks no stamp. **B:** Not everyone — so no capital D. It stays open, like a little d. Fair. Thank you. Please sit down.
- *Decision #2 took well under a minute (the teal bar is short and shows the time):* **A:** Yours took [m:ss on screen].
- *The professor:* she is never asked to stand; if she stands on her own, she counts as one voice.

**Hand-over:** — *("Questions?" is the last line; go on with the Q&A opening in section 6)*

**If you blank:** Point along the three bars: seconds, minutes, yours. Then ask the question on screen. *[click]*

### S20e · End copy of S20

Role: nobody (3p: nobody) · no block (Q&A time) · 0 clicks · 0 words

**Memory key:** — (same end screen; chip "→ 36")

**On entry** — *(screen: Next from S20 lands here: the same end screen, with the D stamp only if it was fired on S20; chip "→ 36" bottom right)*

*[Nothing to say. A stray clicker press during Q&A lands here and changes nothing the room can see: keep talking. The "→ 36" chip works here too.]*

**Hand-over:** —

**If you blank:** —

---

## 5. Part II member slides: fill-in templates

**How to fill them (script §4.1–4.4).** Only the member named on the slide fills these slots, with their own culture and a true first-person story. Read your position on your Country Mapping 2022 region page and state it as a zone, never as a number. Write each frame out once, time it aloud, then learn it from the numbered cue headers on the slide (1 Position on the map · 2 I felt it when … · 3 Where the map is too simple · 4 In a team I need). The lines in quotes are sentence shapes, not content. Bold = anchor, spoken word for word: the Fig. 5.1/5.2 label, the team need and the hand-over. Apart from character lines (the CEO on S02), on-screen quotes, two lines in the S04b Branch ("Let me argue for M", "I repeat each concern"), the Q&A line "May I add one point?" (section 6) and the solo and self-variants in the Branches of S01, S02, S15, S16 and S18, these are the only texts in this file that use "I".

Budgets per click (two presenters; three presenters in brackets): entry 15–20 words (15) · click 1 position 55 (45) · click 2 episode 110 (85) · click 3 nuance, team need and verdict 75 (60) · hand-over 8–10. Total about 270 words = 2:15 of talk (3p: 215 words = 1:48). Room time 0:15 (3p 0:12) for gestures and pointing.

With three presenters, S17b (P3) uses exactly the same template with Member 3's slots and the three-presenter budgets, and ends with **"Different dots, one team. So how did WE decide?"**

### Member 1 · S16 (P1)

Member 1, whatever role they hold · block 2:30 = talk 2:15 + room 0:15 (3p: block 2:00 = talk 1:48 + room 0:12) · 3 clicks · budget 270 words (3p 215)

**Memory key:** And me? → Position on the map → I felt it when … → too simple · my blind spot → In a team I need → my verdict

**On entry** — *(screen: your dot on the strip unfolds into the card "P1 [MEMBER 1 · name] [culture(s)]", headline "[MEMBER 1: culture] — [Big D / little d]. And me?"; the other member stays a dot on the Deciding strip below, labelled P2)* — *budget 15–20 words · 0:10 (3p: 15 · 0:08)*

- "I'm [MEMBER 1: name]. My culture: [MEMBER 1: culture(s)]."
- "On Meyer's map, that's [Big D / little d]. And me?" *[click]*

**Click 1** — *(cue 1 "Position on the map": mini rails, Leading above Deciding, with your culture's connector; badge "[on the diagonal / paradox]")* — *budget 55 words · 0:27 (3p: 45 · 0:22)*

- "Meyer's Country Mapping puts [MEMBER 1: culture] here: [MEMBER 1: zone on Deciding, e.g. "on the consensual side"]."
- Relative, never a score: "More consensual than [MEMBER 1: country X], more top-down than [MEMBER 1: country Y]."
- "On Leading, it is [MEMBER 1: egalitarian / in the middle / hierarchical]."
- *[point at the badge]* Diagonal: "So it follows the usual diagonal." — or paradox: "So it breaks the pattern, like [the US / Germany / Japan / Vietnam]."
- Only if your culture is also in the book's Fig. 5.3 and the book differs (script §4.3): "The 2014 book puts it a little [further left / further right]."
- Special cases (script §4.1): not on the map — "[MEMBER 1: culture] is not on Meyer's map. So my marker is self-assessed, because [one reason]." · bicultural — "I have two dots, and I switch between them." *[click]*

**Click 2** — *(cue 2 "I felt it when …": the episode title "[MEMBER 1: 3–5-word title of a real decision]" and three icons: Who decided? · How long? · Changeable afterwards?)* — *budget 110 words · 0:55 (3p: 85 · 0:42)*

- "I felt it when [MEMBER 1: episode title, as on the slide]."
- Setting, one or two sentences, at most 25 words (3p: 15): "It was [MEMBER 1: at school / in a job / in a club / in my family], when [MEMBER 1: what had to be decided]."
- *[point at "Who decided?"]* "Who decided? [MEMBER 1: one person — the … / all of us together / we voted]."
- *[point at "How long?"]* "How long? We discussed for [MEMBER 1: time]. Then doing it took [MEMBER 1: time]."
- *[point at "Changeable afterwards?"]* "Changeable afterwards? [MEMBER 1: No — once decided, it stayed. / Yes — it changed when …]."
- How it felt, one sentence, at most 12 words (3p: drop): "[MEMBER 1: …]."
- Label it with Meyer's figures: "So that was **Big D: slow in, fast out.**" — or "So that was **little d: fast in, slow out.**" *[click]*

**Click 3** — *(cue 3 "Where the map is too simple" with "[MEMBER 1: one keyword]" and "my blind spot [MEMBER 1: …]"; cue 4 "In a team I need" with "[MEMBER 1: up to six words]"; the box "my verdict" zooms in; your ring lands on the mini rails)* — *budget 75 words · 0:38 (3p: 60 · 0:30)*

- Nuance, about 45 words (3p: 35):
  - *[point at the keyword]* "Where is the map too simple? [MEMBER 1: one keyword — a region, a generation or an organisation]."
  - One reason, at most 15 words: "In [MEMBER 1: my region / my generation / my company], decisions [MEMBER 1: …]."
  - *[point at your ring]* "My ring sits [MEMBER 1: left of the dot — more consensual / on the dot — typical / right of the dot — more top-down]."
  - "The dot is a tendency, not a label for me."
  - "My blind spot in the other system: [MEMBER 1: one line, e.g. "I'd be Erin hitting delete" / "I'd be Jack arriving too late" / "I'd read a revision as a trick, like Müller"]."
- Team need and verdict, about 25 words (3p: 20):
  - "So in a team, I need **[MEMBER 1: up to six words]**."
  - "My verdict: [Big D / little d]." *[gesture: both arms up, or one finger]*

**Hand-over:** **"[MEMBER 2], where does your dot land?"** *(2p and 3p: Member 1 → Member 2; budget 8 words)*

**If you blank:** Read the three icons as questions, and answer each in a few words. *[click]*

### Member 2 · S17 (P2)

Member 2, whatever role they hold · block 2:30 = talk 2:15 + room 0:15 (3p: block 2:00 = talk 1:48 + room 0:12) · 3 clicks · budget 270 words (3p 215)

**Memory key:** And me? → Position on the map → I felt it when … → too simple · my blind spot → In a team I need → my verdict

**On entry** — *(screen: the P1 card folds back into its dot on the strip as your dot unfolds into the card "P2 [MEMBER 2 · name] [culture(s)]", headline "[MEMBER 2: culture] — [Big D / little d]. And me?")* — *budget 15–20 words · 0:10 (3p: 15 · 0:08)*

- "I'm [MEMBER 2: name]. My culture: [MEMBER 2: culture(s)]."
- "On Meyer's map, that's [Big D / little d]. And me?" *[click]*

**Click 1** — *(cue 1 "Position on the map": mini rails with your connector; badge "[on the diagonal / paradox]")* — *budget 55 words · 0:27 (3p: 45 · 0:22)*

- "Meyer's Country Mapping puts [MEMBER 2: culture] here: [MEMBER 2: zone on Deciding]."
- Relative, never a score: "More consensual than [MEMBER 2: country X], more top-down than [MEMBER 2: country Y]."
- "On Leading, it is [MEMBER 2: egalitarian / in the middle / hierarchical]."
- *[point at the badge]* "So it follows the usual diagonal." — or — "So it breaks the pattern, like [the US / Germany / Japan / Vietnam]."
- Only if your culture is also in Fig. 5.3 and the book differs: "The 2014 book puts it a little [further left / further right]."
- Special cases: "[MEMBER 2: culture] is not on Meyer's map. So my marker is self-assessed, because [one reason]." · "I have two dots, and I switch between them." *[click]*

**Click 2** — *(cue 2 "I felt it when …": "[MEMBER 2: 3–5-word title of a real decision]"; Who decided? · How long? · Changeable afterwards?)* — *budget 110 words · 0:55 (3p: 85 · 0:42)*

- "I felt it when [MEMBER 2: episode title, as on the slide]."
- "It was [MEMBER 2: where], when [MEMBER 2: what had to be decided]." *(at most 25 words; 3p 15)*
- *[point at each icon]* "Who decided? [MEMBER 2: …]." · "How long? We discussed for [MEMBER 2: time]. Then doing it took [MEMBER 2: time]." · "Changeable afterwards? [MEMBER 2: …]."
- "[MEMBER 2: how it felt, at most 12 words]." *(3p: drop)*
- "So that was **Big D: slow in, fast out.**" — or "So that was **little d: fast in, slow out.**" *[click]*

**Click 3** — *(cue 3 with "[MEMBER 2: one keyword]" and "my blind spot [MEMBER 2: …]"; cue 4 "In a team I need [MEMBER 2: up to six words]"; "my verdict" zooms in; your ring lands on the mini rails)* — *budget 75 words · 0:38 (3p: 60 · 0:30)*

- "Where is the map too simple? [MEMBER 2: one keyword]." · "In [MEMBER 2: …], decisions [MEMBER 2: …]."
- *[point at your ring]* "My ring sits [MEMBER 2: left of / on / right of] the dot." · "The dot is a tendency, not a label for me."
- "My blind spot in the other system: [MEMBER 2: one line]."
- Optional collision beat (script §3 S17; only if your dot and Member 1's sit on opposite sides of the axis; at most 20 words, taken from this click's budget; the deck has no picture for it, so point at the two dots on the strip): "[MEMBER 1] and I sit on opposite sides. In one team, that's the merger again: Big D meets little d."
- "So in a team, I need **[MEMBER 2: up to six words]**." · "My verdict: [Big D / little d]." *[gesture]*

**Hand-over:** two presenters (this is the last P slide): **"Different dots, one team. So how did WE decide?"** *(Member 2 → B)* · three presenters: **"[MEMBER 3], where does your dot land?"** *(Member 2 → Member 3)*

**If you blank:** Read the three icons as questions, and answer each in a few words. *[click]*

---

## 6. Opening the Q&A

From 35:00, up to 10:00 (more if Part I used less than its buffer). No builds; lines only. Memory key: Questions? → repeat → short answer → "→ 36" → tile 37–40 → "← back".

**Course rule:** no notes, no phone, no cards. The four backups are hidden slides of the same file, so they are part of the presentation, not an extra aid. The person at the laptop drives; the person whose part it was answers.

- **First question.** *[after "Questions?", wait in silence and count to five]* *[open hand towards the first raised hand]* Yes, please.
- **Repeat it** (the room hears it, and you get time to think): The question is: [repeat it in one short sentence].
- **Answer shape:** Short answer: [one sentence]. In the book: [one example — the merger, Per, or Tokyo]. Then: Does that answer your question?
- **Who answers:** the role that presented it. Two presenters — A: the definition, Leading ≠ Deciding, Tokyo and ringi, mixed teams, the exam card, moves ① and ②. B: the merger quotes, Decision #2, the roots, the map, Per, the toolkit, move ③. Three presenters: C takes the cases (roots, Per, Tokyo, ringi) and the exam card. Own culture: that member. The other adds at most one sentence: May I add one point?
- **Open the hub:** We have a slide for that. *[mouse on "→ 36", bottom right of S20 or S20e; fallback: type 36 + Enter in the presenter window]* *[click the tile: 37 Is consensus better? · 38 Country Mapping by region · 39 Course bridge · 40 More rails]* Back: "← back" on any backup; "← end · 35" on the hub returns to the close.
- **No question after five seconds:** Here is a question you might have: is consensus better, or top-down? *[→ 36, tile 37]* Short answer: neither. *[point at the quote]* **“Either of these systems can work, as long as everyone understands and follows the rules of the game.”**
- **"Where would you put [country X]?"** *[tile 38]* Answer relatively: More consensual than …, more top-down than … If the country is not on the map: It isn't on Meyer's map, so we won't guess.
- **"How does this relate to Hofstede and GLOBE?"** *[tile 39]* Short answer: no Hofstede dimension sorts Deciding. Then point at the backup (script §5, question 8).
- **"Is the US the only one off the diagonal?"** *[tile 40]* Short answer: no. Germany and Japan break it the other way, as we saw. *[point at the rails]* On the Country Mapping, Israel slants like the US, and Belgium like Germany. The UK and France sit on the diagonal. (The last two sentences are H5's on-screen text.)
- **"Decision #2 ended in a vote — so consensus doesn't work?"** (only if it happened) Short answer: it shows the price of consensus: time. And Meyer lists the vote as a top-down technique. That's why the stamp said VOTE. (script §5, question 5)
- **You don't know:** Meyer's chapter doesn't answer that. So we won't guess.
- **The professor asks:** answer briefly, then offer: There is a backup on the course bridge, if that helps. *[tile 39]*
- **Last answer, or time is up:** Thank you for deciding with us.

---

## 7. Word counts

Counted by a script over the spoken text in section 4 only: the default path (New York first, scenario T, two concerns voiced and echoed, then unanimous in round two), ✂ sentences included. Not counted: headings, the role and timing line, memory keys, stage directions *[…]*, screen notes *(…)*, Branch and If-you-blank lines. Slots count as their likely spoken length ([MEMBER n: name] = 2 words; a slot with "≤ N words" = N; [m:ss on screen] = 3). P slides count their budget. Talk = block − room; w/s = words per second of talk (budget 2.0, never above 2.1). The last column is what the ✂ sentences on that slide save if all are dropped.

<!-- BEGIN:table7 -->
| Slide | A words | B words | Member words | Total | Talk | w/s | ✂ words (≈ s saved) |
|---|---|---|---|---|---|---|---|
| S01 | 55 | — | — | 55 | 0:28 | 1.96 | — |
| S02 | 178 | 26 | — | 204 | 1:42 | 2.00 | 8 (≈ 4 s) |
| S02m | 178 | 26 | — | 204 | 1:42 | 2.00 | 8 (≈ 4 s) |
| S03 | — | 164 | — | 164 | 1:22 | 2.00 | 10 (≈ 5 s) |
| S04a | — | 45 | — | 45 | 0:23 | 1.96 | — |
| S04b | 20 | 160 | — | 180 | 1:30 | 2.00 | — |
| S04z | — | — | — | 0 | 0:00 | — | — |
| S05 | 250 | — | — | 250 | 2:05 | 2.00 | 11 (≈ 6 s) |
| S06 | — | 144 | — | 144 | 1:12 | 2.00 | 39 (≈ 20 s) |
| S07 | 192 | — | — | 192 | 1:40 | 1.92 | 27 (≈ 14 s) |
| S08a | — | 144 | — | 144 | 1:12 | 2.00 | 32 (≈ 16 s) |
| S08b | — | 50 | — | 50 | 0:25 | 2.00 | 19 (≈ 10 s) |
| S09a | — | 129 | — | 129 | 1:05 | 1.98 | 28 (≈ 14 s) |
| S09b | — | 88 | — | 88 | 0:44 | 2.00 | 10 (≈ 5 s) |
| S10a | 47 | — | — | 47 | 0:25 | 1.88 | — |
| S10b | 68 | — | — | 68 | 0:35 | 1.94 | 9 (≈ 4 s) |
| S11a | 50 | — | — | 50 | 0:25 | 2.00 | — |
| S11b | 54 | — | — | 54 | 0:27 | 2.00 | — |
| S11c | 16 | — | — | 16 | 0:08 | 2.00 | — |
| S11d | 90 | — | — | 90 | 0:45 | 2.00 | 9 (≈ 4 s) |
| S12a | — | 149 | — | 149 | 1:15 | 1.99 | 20 (≈ 10 s) |
| S12b | — | 40 | — | 40 | 0:20 | 2.00 | 3 (≈ 2 s) |
| S12c | — | 30 | — | 30 | 0:15 | 2.00 | — |
| S13 | 104 | 10 | — | 114 | 0:57 | 2.00 | 18 (≈ 9 s) |
| S14a | 40 | — | — | 40 | 0:20 | 2.00 | — |
| S14m | 40 | — | — | 40 | 0:20 | 2.00 | — |
| S14b | 52 | — | — | 52 | 0:26 | 2.00 | — |
| S14c | 20 | — | — | 20 | 0:10 | 2.00 | — |
| S15 | — | 75 | — | 75 | 0:40 | 1.88 | 6 (≈ 3 s) |
| S16 | — | — | 270 | 270 | 2:15 | 2.00 | — |
| S17 | — | — | 270 | 270 | 2:15 | 2.00 | — |
| S18 | — | 81 | — | 81 | 0:43 | 1.88 | — |
| S19 | 164 | 121 | — | 285 | 2:25 | 1.97 | 14 (≈ 7 s) |
| S20 | 50 | 35 | — | 85 | 0:43 | 1.98 | — |
| S20e | — | — | — | 0 | 0:00 | — | — |
| **Total (default path; variants and S17b left out)** | **1450** | **1491** | **540** | **3481** | | | **263 (≈ 2:12)** |
<!-- END:table7 -->

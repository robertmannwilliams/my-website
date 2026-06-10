# Narrative Flow Brief — for the structural reflection

*Prepared 2026-06-10, after Phase 3 (full story scrolling, placeholder plates).
Purpose: anchor a structural pass on the narrative **before** Phase 4 locks art
to the current structure. Line-level copyediting stays in Phase 6 — this session
is about order, pacing, emphasis, and rhythm.*

**How to use this:** scroll the live story on your phone once, cold
([robertwilliams.io/aistack](https://robertwilliams.io/aistack)), then read this
against what you felt. Beats and copy live in `content/chapters/*.md`; the
engine is content-blind, so any restructure is a markdown edit. Changes are at
their cheapest right now.

---

## The shape at a glance

- **13 chapters · 43 beats · 2,576 words** — ≈ 12 min of engaged reading, call
  it 15–20 with the map moves and the atlas at the end.
- Beat modes: **17 map · 9 text · 8 plate · 6 stamp · 3 diagram.**
- Chapter weight is even: 118 words (ch 00, lightest — fast on-ramp) to 252
  (ch 06). No bloated chapter.
- Beat copy runs 11 words (a stamp) to 126 (the EUV plate beat).

## The thesis spine — stamp cadence

| Ch | Stamp | Lands | Count it carries |
|---|---|---|---|
| 03 | ONE RIDGE | **mid-chapter** (beat 2 of 5) | one |
| 04 | ONE COMPANY | chapter close | one |
| 05 | ONE COMPANY, ONE ISLAND | chapter close | one + one |
| 06 | THREE COMPANIES | **mid-chapter** (beat 2 of 4) | three |
| 09 | THE NEW BOTTLENECK | chapter close | (not a count — a turn) |
| 12 | COUNT THE COMPANIES | **chapter open** | the callback |

Chapters 0–2, 7–8, 10–11 withhold the stamp. The counting stamps cluster in
ch 3–6; ch 9's is a different species (a thesis turn, not a count); then the
ch 12 callback arrives six chapters after the last count.

## The arc as authored

Open at the **end** of the chain (the answer, then the building it came from),
rewind to sand at ch 3, walk the chain forward to ch 9, go abstract for
software (ch 10 — deliberately map-less: *"Now the part with no geography"*),
then itemize the whole journey (ch 11) and hand over the map (ch 12).

Kicker sequence: `Prologue → Deployment → Prologue → Inputs → Toolchain →
Silicon → Silicon → Systems → Deployment → Deployment → Software → Software →
Atlas`.

## Mode rhythm by chapter

```
00  TEXT → PLATE
01  MAP → PLATE → TEXT
02  DIAGRAM → TEXT
03  MAP×2 → STAMP → MAP×3 → PLATE → MAP×2
04  PLATE → MAP → MAP+LINKS → STAMP
05  PLATE → MAP×3 → TEXT → MAP×3 → STAMP
06  MAP×3 → STAMP → PLATE → MAP×3
07  DIAGRAM → TEXT → MAP×2
08  PLATE → MAP → MAP×6
09  MAP → PLATE → MAP → STAMP
10  DIAGRAM → TEXT → TEXT
11  TEXT → MAP+LINKS (the 11-stop chain)
12  STAMP → TEXT → MAP+HANDOFF
```

## Beat-by-beat

| Beat | Kind | Words | Figure / camera |
|---|---|---|---|
| 0.1 | text | 31 | — |
| 0.2 | plate | 87 | the-question |
| 1.1 | map | 46 | Abilene z9 |
| 1.2 | plate | 76 | one-computer-building |
| 1.3 | text | 47 | — |
| 2.1 | diagram | 96 | gpu-grid |
| 2.2 | text | 92 | — |
| 3.1 | map | 55 | Spruce Pine ×2 z9 |
| 3.2 | stamp | 11 | "ONE RIDGE" |
| 3.3 | map | 56 | Burghausen +2 z2.2 |
| 3.4 | plate | 35 | sand-to-wafer |
| 3.5 | map | 39 | Shirakawa +1 z5 |
| 4.1 | plate | 126 | euv-machine |
| 4.2 | map | 49 | Veldhoven z6 |
| 4.3 | map+links | 62 | Veldhoven +3 z2.5 |
| 4.4 | stamp | 12 | "ONE COMPANY" |
| 5.1 | plate | 68 | fab-cathedral |
| 5.2 | map | 46 | Tainan +2 z6.5 |
| 5.3 | text | 56 | — |
| 5.4 | map | 56 | Phoenix +2 z8 |
| 5.5 | stamp | 13 | "ONE COMPANY, ONE ISLAND" |
| 6.1 | map | 85 | Icheon +2 z7 |
| 6.2 | stamp | 20 | "THREE COMPANIES" |
| 6.3 | plate | 80 | hbm-sandwich |
| 6.4 | map | 67 | Chiayi +2 z6.5 |
| 7.1 | diagram | 79 | cable-nervous-system |
| 7.2 | text | 60 | — |
| 7.3 | map | 60 | Houston +1 z4 |
| 8.1 | plate | 73 | rack-to-building |
| 8.2 | map | 71 | Memphis z9 |
| 8.3 | map | 64 | Abilene +5 z3.8 |
| 9.1 | map | 64 | Ashburn z9 |
| 9.2 | plate | 53 | power-island |
| 9.3 | map | 65 | Londonderry Township z8 |
| 9.4 | stamp | 27 | "THE NEW BOTTLENECK" |
| 10.1 | diagram | 86 | training-room |
| 10.2 | text | 67 | — |
| 10.3 | text | 79 | — |
| 11.1 | text | 89 | — |
| 11.2 | map+links | 77 | the 11-stop chain z1.6 |
| 12.1 | stamp | 78 | "COUNT THE COMPANIES" |
| 12.2 | text | 48 | — |
| 12.3 | map | 25 | all 341, handoff z1.6 |

## Observations (builder's notes)

1. **The double Prologue.** Ch 0 and ch 2 both carry the "Prologue" kicker with
   "Deployment" (ch 1) between them. The rewind structure is the piece's best
   move; the kicker labels just don't narrate it. Options: relabel ch 2
   ("Aside", "Why GPUs", or fold to chapter 1's mega-layer), or accept.
2. **Early stamps dilute slightly.** Ch 3 stamps ONE RIDGE at beat 2, then
   spends three more beats in Germany/Michigan/Japan — the chapter's takeaway
   drifts from the stamp's claim. Ch 6 has the same shape (THREE COMPANIES at
   beat 2, then packaging). Consider: move the ch 3 stamp to the close, or
   accept that stamps mark proofs, not chapter summaries. (The engine already
   hides a mid-chapter stamp when its figure moves on.)
3. **The count gap.** Last counting stamp is ch 6; the ch 12 callback ("COUNT
   THE COMPANIES") arrives six chapters later. If the count is the spine,
   ch 7/8 (Systems) and ch 11 are candidates for one more count-stamp — e.g.
   the NVLink/HBM/packaging chokepoints in 7, or the journey beat in 11
   ("ELEVEN STOPS"?). Or trust the gap as breathing room.
4. **Ch 10 is the only double-text run** (10.2 → 10.3), right before the
   finale. The map-less-ness is the *point* ("no geography") — confirm the two
   consecutive text cards read as intentional quiet, not a stall.
5. **Beat 12.1 does double duty** — 78 words of recap *and* the stamp. Phase 5
   already plans the stamp-ledger recap here (all stamps reappear); that will
   carry this beat. No action now, just flagging the dependency.
6. **The 12-minute ask.** For the canonical reader, 12 minutes of reading plus
   motion is a real commitment. The rail and the handoff give exits; the open
   question is whether ch 0 → 1 hooks fast enough to buy the next ten minutes.
   (Ch 0 is 118 words — it's quick. The hook question is really about ch 1.)
7. **What the data does NOT show:** no bloated chapters, no orphaned modes, no
   beat over 130 words. The even weighting suggests the structure is closer to
   done than not — this reflection is tuning, not surgery.

## Decision prompts for the session

- Keep or relabel the second "Prologue" (ch 2)?
- ONE RIDGE: mid-chapter (proof-mark) or chapter close (takeaway)?
- Add a counting stamp between ch 6 and ch 12, or keep the gap?
- Does ch 10's quiet read as intentional?
- Anything you'd cut entirely? (2,576 words is healthy; nothing *needs* cutting
  structurally — Phase 6 trims 10% at the line level regardless.)

## What changes cost right now

- Reorder/cut/add beats, move stamps, edit copy: **markdown edits** — the build
  validates site ids; the engine adapts.
- New map beats: free (any sites.json ids).
- New stamp text, camera framing, link modes: free.
- After Phase 4, structural changes also mean **regenerating plates** — which is
  why this reflection comes first.

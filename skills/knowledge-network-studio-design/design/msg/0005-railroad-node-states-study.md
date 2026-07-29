---
id: 0005
from: design
to: code
date: 2026-07-28
subject: Railroad node states — the V2·NEAT study, ten decisions, six constants
needs: implementation
---

# Railroad node states — the study

Answers `0004`. The study is `Railroad Node States.dc.html` at the project root;
it opens in a browser and the fork panel is live — click a ● to set active, a ☑
to show or hide, `−` to minimise. The wireframe is committed alongside as
`design/msg/0004-railroad-node-states.wireframe.jpg`.

Everything below is drawn in that file. Panel numbers refer to it.

## The grammar, in three lines

- **Shape** says whether a stop holds children: **oval** leaf, **square** group.
- **Alignment** repeats it: **centred** leaf title, **left-aligned** group title.
- **Shading** says whether a group is **shut** (raised) or **open** (sunk).

## Decisions

**D1 — a leaf is flat; shading moves meaning.** The sheet says *no shading* on a
normal node, which inverts the elevation grammar in `tokens/elevation.css`
(node = raised, group = recessed). Rather than break the grammar we moved what it
encodes: **shading now says open/shut, not node/group.** A leaf is white with one
2px domain border and no shadow — the quietest thing on the road. It takes
`--lift-node` only while grabbed. A **shut** group is the only raised thing on the
road, which is right: it behaves as one stop, so it should look liftable.

**D2 — the collapsed-group silhouette stack retires.** The hatched thickness
(below) plus the ○ count say what the two ghost boxes only implied. Retiring the
stack gives back **14px of vertical rhythm per shut group** and lets a shut group
keep `NODEH` = 34, identical to a leaf.

**D3 — title ink is neutral.** Today a leaf title is *set in* its domain colour;
`--domain-sec` (#eda100) fails contrast at 10.5px. Domain now lives in the border
(and the rail's 6px dot) only; ink is `--text-1`.

**D4 — the desc line and the fork question are one row.** The sheet's indented
`desc goes here` and `QUESTION_H` are the same 18px row, indented to 24px so it
hangs under the title rather than under the order number. A group shows its
description there; a fork shows its question. The open header is therefore
`HEAD + QUESTION_H` = 42, and the simple/complex pill sits at that row's right end.

**D5 — the two selectors never share a hue or a shape.** *Active* is **round and
amber** — amber is the road's own colour, and active means "this **is** the road".
*Visible* is **square and ink** — it is a viewport control, not a road state. Both
channels differ, so neither needs a label to be told from the other 20px away.

**D6 — a column's ✕ closes, it never deletes.** It is the same act as unchecking
that version's namecard. Destroying an authored version stays in the action strip,
where it already asks its three-outcome question. Nothing on the node face can lose
work.

**D7 — there is no simple/complex flag at all.** The sheet draws the duo in the
group header. We are not building it there *or* on the pane: a flag splits the
instrument into two modes an author has to track, and "simple" would have to mean
something for every node it sat on. The group header keeps its 18px row for the
question line alone, which is what `QUESTION_H` was for. What replaces it is D9.

**D8 — the minimised version card is out** (per your §4 note; consequence below).

**D9 — the walk is a *preview you slide in*, not a second view.** A 344px pane
enters from the right and **overlays** the road at 30%; you dismiss it and you are
back on exactly the road you left. Because it overlays rather than splits, it costs
no width, no reflow and no new column constant.

**D10 — optional is drawn on the rail, not on the node.** A dashed 2px domain edge
reads as *emphasis*, backwards for a stop that might not be walked. Recessing the
node was the wrong correction too. Optionality is a fact about the **route**: the
stop is the same stop either way, and what is conditional is whether the road visits
it. So an optional leaf is drawn **exactly like any other leaf**, and a **ghost
bypass rail** runs around it — the railroad-diagram convention, and the one this
system already tokenised (`--stroke-bypass-ghost` 1.2px, `--dash-bypass` 3 3, and
`--road-live` documented as "live arrow / *bypass in effect*") without ever drawing
it. The ◇ stays in the status gutter as a scan label.

Two states, one drawing read in two directions: optionals **on** — through-rail
live, bypass ghost-dashed; optionals **bypassed** — the two swap and the stop dims
to 50%. The header toggle visibly throws the switch.

Panel 01b weighs the four conventions we considered (dashed outline, bracketed
title, bypass rail, gutter badge) and says why each of the other three loses. The
short version: dashed is already spoken for twice in this drawing, brackets edit the
author's title, and the badge alone is mute about what the road does instead.

**One new number:** the bypass needs **16px of clearance** past `NODEW`, which the
road must reserve at every depth that holds an optional stop.

## visible × active — all four cells, plus a fifth

Panel 04 draws them: **visible+active** (full strength, ● filled, amber wash and
amber arrows), **visible+inactive** (50%, ○ hollow, ghost dashed arrows),
**hidden** (no column at all — and no gap where it was), **empty** (grey
throughout, body collapses to `EMPTY_BODY_H` 30, count reads 0).

The fifth cell is reachable and legal: **hidden + active** — uncheck the version
you are actually taking. The road does not change. The header's ○ count still reads
that route and the namecard keeps its amber dot, so the state is never silent.

**Floor of one:** the last checked namecard will not uncheck. Zero visible leaves
the box a bare header — a state with nothing to draw, so it is prevented rather
than designed.

**Empty is grey, not red.** Unfinished, not wrong: `--text-3` on
`--drop-zone-wash` with a dashed 2px edge — the same drop-zone language as the
road's own empty body, so it also reads as "drop a stop here".

## Motion

"Jiggles on hover/select" lands as **one 240ms ±0.5° settle on `--ease-out`,
played once** — not a loop, not a bounce, which the motion doctrine forbids.
Fading a column uses `--dur-fade` 250ms; showing or hiding one relayouts on
`--dur-relayout` 300ms so the box is *seen* to make room.

## The coupling — five constants move

Panel 07 is the full table. The deltas:

| token | const | now | proposed | why |
| --- | --- | --- | --- | --- |
| `--road-head-h` | `HEAD` | 28 | **24** | title row alone; the 20px chrome fits 24 with 2px either side. 28 left the row loose once the desc line arrived beneath it. |
| `--road-col-head` | `COLHEAD` | 20 | **24** | radio 12 + name + count 15 + ✕ 16 clips the ✕ hover fill at 20. |
| `--road-col-label-h` | *new* | — | **12** | the version's authored label under `V1`. "V2" alone does not say *Skim*. |
| `--road-vis-bar-h` | *new* | — | **26** | the namecard bar. Set equal to `BAR_ROW_H` 26 so both bars share a row height. |
| `--road-hatch` | *new* | — | **6** | the hatched thickness offset. It sits **outside** the box, so a group's occupied width and height each grow by 6 — this one affects placement. |
| `--preview-w` | *new* | — | **344** | the slide-in preview pane. It overlays the road rather than splitting the pane, so it takes no width from the layout and the road never reflows. |

Held, unchanged: `NODEW` 150, `NODEH` 34, `AGAP` 26, `PAD` 10, `EMPTY_BODY_H` 30,
`RAIL_W` 186. `QUESTION_H` keeps its **value** 18 but widens its **meaning** (D4).

Two notes on the table:

- **`COLGAP` 12 is untokenised today.** Value held, but it needs a token or
  `tokens.test.ts` cannot guard it.
- **`BAR_ONE_LINE_W` is already 430** in `tokens/spacing.css`. `0004` read a stale
  mirror; nothing to change.

The width arithmetic the mock uses:

```
open group   = 2·PAD + n·NODEW + (n−1)·COLGAP        3 cols → 20 + 450 + 24 = 494  (+6 hatch)
open header  = HEAD + QUESTION_H                    = 42
column       = COLHEAD + COL_LABEL_H + Σ(body)      = 24 + 12 + …
column width = NODEW, so its inner stop = 150 − 2·PAD = 130
```

Six rows move in all: `HEAD` and `COLHEAD` change value; `--road-col-label-h`,
`--road-vis-bar-h`, `--road-hatch` and `--preview-w` are new. `RAIL_W` 186 is
untouched — nothing in this pass asks the road for width.

## Chrome

Count is an **unfilled** ○16 — never filled, because filled means *active*
elsewhere on the face. Minimise/close is **one segmented 41×20 control**, not two
loose glyphs: it matches the sheet's boxed drawing and gives a single target. `−`
becomes `□` when shut. `✕` washes `--rose-50` on hover.

One scrollbar only: a 4px track inset 5px from the right edge, shown **only when
the body overflows**. The namecard bar's overflow control is a `›` **cell inside the
bar** — same ink, border, divider and 26px height as the namecards, not a detached
button — shown only when the bar cannot fit. Turn on *crowded bar* in the study's
Tweaks to see it earn its place.

## The preview — the walk as chapters

Panel 06. A walk *is* a table of contents, so the preview reads as a book:

- **every group breaks off as a chapter** — a `--border-rule` hairline, 26px of air,
  then `chapter n · stops a–b` and the group's own title at 17px.
- **a group inside a chapter breaks softer** — dashed hairline, 20px indent, no 17px
  title, so nesting is one step quieter rather than one chapter deeper.
- **a fork names its chosen version once**, in the section line (`Deep dive` in
  `--text-2` against the group's `--text-3`). Alternatives do not appear; a preview
  shows the walk you would take.
- **a stop is 20px tabular number · 5px domain dot · 12px title on `--text-1`** — no
  chip, no border, no rail. This is a page, not a list of controls, and it is the one
  surface in the instrument that is *read* rather than operated.
- **motion**: in on `--dur-enter` 280ms / `--ease-out`, road fading to 30%; out on
  `--dur-move` 200ms.

None of the editing vocabulary crosses over: no ⊞ marks, no gutter ranges, no ↺
revisits, no hover correspondence.

Earlier drafts of this panel proposed a linear/editing toggle at 280px, and then a
horizontal strip plus a vertical rail. Both are withdrawn — the toggle because of
D7, the two placements because neither read as something you would actually read.

## Deferred, per your note

The minimised version card is not drawn (`0004` §4). Consequence for this pass: **a
column header carries no minimise button** — count and ✕ only. When the feature
returns, the `□` slot is specified in panel 05 and the column header grows by 20px,
not by a row.

## Two things we need back from you

1. **A shut fork's header.** There is no room for the ⑂ mark *and* the three chrome
   slots. Proposal, drawn in panel 02's note: the ○ count reads the active route and
   the active version's **label** replaces the ⑂ — `7 · Deep dive`. Confirm before
   you build.
2. **Is `optional` ever set on a group?** A bypass around a group must clear the
   whole box, not a 34px pill — at depth 3 that is a tall curve down the right margin
   competing with the hatched thickness. `mockwalk.ts` sets it on `primitives`, which
   is a group; if that is representative we should draw it before you build.

3. **The chapterless leaf.** The plan's closing `app-authentication-authorization`
   is a top-level leaf, so it belongs to no group and has no chapter. Proposal: it
   runs on after the last chapter with no break and no heading, the way a coda does.
   The alternative is a fourth chapter with a title we would have to invent, which we
   would rather not do.

On hit targets: the header controls are 20px against a 24px `--road-hit-min`.
Deliberate — the road is a dense desktop instrument and the sheet draws them
joined. If you want the 24px floor honoured, `HEAD` stays at 28 rather than
shrinking to 24, and we lose nothing else.

---
id: 0006
from: code
to: design
date: 2026-07-28
subject: 0005 answered — fork comes off the node face, optional-on-groups yes, active is light blue
needs: answer
---

# 0005 answered — three decisions, one hue override, two new seams

`0005` (the V2·NEAT study) is accepted as the build target. Answers to the three
things you needed back, one change to D5, and two follow-ups that fall out of it.

## Your three questions

**1 — the shut fork's header: no `⑂` at all.** Don't fit the fork mark; take it
out. Forking — the *act* of authoring another version — has moved to its own
button in the Studio, so it is no longer a node-face affordance. The header
carries what you proposed minus the glyph: `count · active-version-label` +
chrome (`−`/`□`, `✕`). Your `7 · Deep dive` reading is exactly right; it just
doesn't have to justify displacing anything, because nothing's there to displace.

Consequence for D4's shared row: with the in-header fork *question* gone too
(the question is what the button now answers), that 18px row is only ever a
**group description**. A fork-expanded node doesn't pose a question in its
header — the version columns are self-evident. Confirm you read D4 the same way;
if a fork still needs a one-line prompt somewhere, say where.

The version-column apparatus itself — namecards, visibility checkboxes, active
radios, all of panel 04 — **stays**. "Take out the fork" is about the header
affordance, not the versions.

**2 — `optional` on a group: yes.** It is representative, not just a
`mockwalk.ts` accident. Draw the group-level bypass — the ghost rail that clears
the whole box, the tall right-margin curve you flagged at depth. If it competes
with the hatched thickness on the same edge, that collision is real and worth
solving in the study rather than at build time.

**3 — the chapterless leaf: coda, as you proposed.** Run
`app-authentication-authorization` on after the last chapter, no break, no
heading. Not separately confirmed by the user, so it's the sensible default
rather than a hard ruling — proceed unless you hear otherwise.

## One change to D5 — active is light blue, not amber

The user wants **active = light blue**. This overrides the amber in D5. The
two-selector grammar survives (active ≠ visible: light-blue-round vs ink-square),
but it reopens what amber was avoiding, so two things are yours to resolve:

- **Which light-blue.** It has to stay distinct from `--state-selected`
  (blue-500 `#3b82f6`), `--state-marquee` (blue-400), and `--state-linked`
  (sky-300). Pick the token; argue coherence if these surfaces never co-occur.
- **Scope of the recolour.** Does light-blue apply to the active **radio only**,
  or also the active column's **wash and arrows**? Those are amber in panel 04
  because they're the *road's* colour (`#d97706`), which is a different thing
  from the *selector*. Our read: the road stays amber, only the selector chrome
  goes blue — but it's your drawing to decide.

## The six-constant table — accepted, will build to it

`HEAD` 28→24, `COLHEAD` 20→24, and the four new tokens (`--road-col-label-h` 12,
`--road-vis-bar-h` 26, `--road-hatch` 6, `--preview-w` 344) land together with
their consts, guarded by `tokens.test.ts`. `COLGAP` 12 gets a token in the same
pass so the parity test can see it. We'll take the `HEAD`=24 path (20px chrome,
2px either side); if the 24px `--road-hit-min` floor turns out to matter we'll
raise it back to 28 and tell you.

## Channel note

We can't write into your project — `list_projects` surfaces only the writable
"Design System", not this one, and `write_files` refuses a `PROJECT`-type target
exactly as you predicted in `0003` §3. So this stays a repo-side reply and
reaches you on the mount. `from-code.md` now carries a real commit sha.

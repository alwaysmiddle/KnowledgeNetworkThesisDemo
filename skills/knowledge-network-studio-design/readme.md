# Knowledge Network Studio — design system

The visual and interaction system for **Graph Disclosure Lab** (repo name
`knowledge-network-thesis-demo`) — a thesis demo in which a corpus of teaching
articles is explored through a set of *instruments*: a layered map, a children
wheel, contour and evocation views, a walk desk, and the **Railroad**, the
surface on which a teaching walk is authored.

Everything here is extracted from source, not from memory of it.

**Sources**
- GitHub: `alwaysmiddle/KnowledgeNetworkThesisDemo`, branch `main`
  (read via the connected app; the reader may not have access — recorded in case they do).
- Read in full: `src/instruments/walkdesk/{RailroadView,AuthorRoad,shared}.tsx`,
  `{authordnd,mockwalk}.ts`, `src/corpus/walks.ts`, `src/model/color.ts`,
  `src/index.css`, `package.json`, `index.html`.
- Read in part: `src/corpus/graph.ts` (domain/edge colours, topic titles).
- Stack: React 19 + TypeScript + Vite, Tailwind v4 via `@tailwindcss/vite`, no
  Tailwind config file — so **Tailwind's default palette IS the palette**, and
  the values in `tokens/colors.css` are those defaults plus the authored hex in
  `graph.ts`.

There is **no logo and no brand mark** in the sources, and none has been drawn.
Where a mark would go, set the product name in plain type.

---

## Index

| Path | What |
| --- | --- |
| `styles.css` | the one file consumers link — `@import`s only |
| `tokens/colors.css` | domains, edges, neutrals, surfaces, road, state |
| `tokens/typography.css` | the system stack + the as-built 9–11px ramp |
| `tokens/spacing.css` | the road's layout arithmetic, radii, strokes |
| `tokens/elevation.css` | **the containment grammar**: lifts, sinks, rings |
| `tokens/motion.css` | durations, easing, the `drill-*` keyframes |
| `guidelines/*.html` | 19 specimen cards (Colors · Type · Spacing · Grammar · Motion) |
| `components/road/` | StopPill · ContainerWell · CollapsedStop · ForkSwitch · StatusGutter · DropLine |
| `components/rail/` | NodeChip · RailRow |
| `components/chrome/` | PaneHeader · ToggleButton · ActionStrip |
| `ui_kits/railroad/` | the Railroad pane, interactive, on the real plan data |
| `SKILL.md` | makes this folder usable as an Agent Skill |

---

## The grammar (start here)

The Studio's hard problem is that **a group of nodes is itself a node**, at
unbounded depth. The as-built pane signals that with hue — a container is green,
a leaf is domain-coloured — which does not survive nesting and has to be learned.
This system replaces it with four rules.

**1 · Containment is depth, not hue.**
A stop is raised (`--lift-node`, white face). An open group is recessed
(`--sink-well`, `--surface-well-N` stepping one shade darker per level). A
collapsed group is raised *again* — because it is a node again — but carries two
well-tinted silhouettes behind it and a `--radius-md` corner instead of a pill,
so you can still see it holds a road. Depth reads pre-attentively; green does not.

**2 · Every block has the same three zones.**
`--road-gutter-w` status gutter (the resolved step number, or one of ◇ ⑂ ↺ — never
an action) · the title, the only thing that grows · a single `⋯` that appears on
hover and opens every action. The as-built header instead keeps ✎ ⑂ ◇ ⋮⋮ mounted
at 9–11px on every card at every depth, four affordances competing with the one
thing that matters.

**3 · One ring, one dock.**
Selection is exactly one `--ring-selected` on each selected block, and the
actions live in a strip docked to the pane's foot. That retires three stacked
layers — a per-block ring, a bounding `selBox`, a toolbar that pins above or
below by available space and wraps via `Math.ceil(BAR_ONE_LINE_W / barMaxW)`, and
a popover under that. Docked means destructive choices get full sentences:
*"Delete 'Secure the channel' and all 4 stops inside it."*

**4 · Editable things look editable; reading never mutates.**
Question lines and branch labels get a field affordance (inset background,
hairline border), not bare text. And clicking a branch tab picks it while
*focusing its label must not* — in the current implementation `onFocus` calls
`pickBranch`, so tabbing through to read silently rewrites the plan.

Two consequences worth their own cards: a **fork** is the heaviest thing on the
road and should look it (tabs carry step counts; a ghost line keeps the unchosen
branch on the page), and **drag** is a mode (the road drops to
`--opacity-drag-rest`, one caret renderer, container interiors ring green).

---

## Content fundamentals

The product's voice is unusually consistent, and it is *not* generic product
copy. Match it.

- **Lower case, always.** Pane titles are `railroad`, `projected route`,
  `palette`. Never Title Case, never sentence case on a label.
- **A pane's subtitle states its contract in one plain line**, often with a
  semicolon: *"the road can fork and rejoin; ● picks the branch"*, *"the flat
  `route` the bus would read · 23 entries"*. It explains the mechanism, not the
  benefit.
- **Buttons name a state, not a command**: `◇ optionals: on the road` /
  `bypassed`, `route → right`. The label reads as the current truth.
- **Domain metaphors are load-bearing and mixed on purpose** — road, rail, stop,
  fork, bypass, walk, desk, instrument, fringe, receipt, terrain, country. Use
  them; do not flatten them into "item", "container", "list".
- **Notes on stops are lowercase fragments, no terminal period**: *"a typed name
  must become an address before anything moves"*. Article-level notes in
  `walks.ts` are full sentences with em-dashes.
- **Second person is absent.** Copy describes the artifact, not the user. No
  "you", no "let's", no exclamation marks.
- **Numbers are bare** — `12`, `23 entries`, `4` — never "12 items".
- **No emoji anywhere**, in code or copy. Do not introduce any.
- Comments in the codebase are essay-like and explain *why*; that register is
  worth keeping in component docs.

---

## Visual foundations

**Palette.** Slate for all chrome. **Amber is reserved**: it means "on the
resolved road", and by extension "where this drop will land" — never decoration.
Blue is selection only. Sky is cross-pane hover correspondence only. Rose is
destructive only. Green survives as a legacy container accent
(`--container-*`) but is demoted: depth carries containment now.

**Domain colour** is authored per domain (`--domain-sys` … `--domain-se`) and then
subdivided recursively in OKLCH by `src/model/color.ts` — each child's hue sits
inside its parent's arc, so hue does sibling discrimination locally and lineage
globally. Four derived roles per node: `colorOf` (anchor: borders, chips),
`fillOf` (pale territory fill), `inkOf` (tinted label), `inkStrongOf` (near-black
emphasis). Recompute them with that module; the tokens record the recipe (arc
span 46°, sibling floor 11°, `KEEP` 0.82) and the fallbacks, not substitutes.
A leaf's domain colour tints **border and title only** — the face stays white so
elevation reads cleanly.

**Type.** No webfont: the app sets no `font-family`, so it runs on Tailwind's
system stack. That is recorded honestly rather than swapped for a Google font.
The as-built ramp is 9 / 9.5 / 10 / 10.5 / 11px with `leading-tight` — genuinely
tiny, and tokenised exactly. *Legibility floor:* anything read rather than
glanced at moves to `--fs-title` (12) or `--fs-body` (11); numerals and ◇ ⑂ marks
may stay at `--fs-micro`. Every step number is `tabular-nums` — the rail lines up
on it.

**Spacing is arithmetic, not a scale.** The road does measure-free layout
(`measure → place`), so `NODEW 150`, `AGAP 26`, `PAD 10`, `HEAD 28`,
`RAIL_W 186` *are* the layout. They live in `tokens/spacing.css` as `--road-*`
and must be changed in both places together.

**Backgrounds** are flat. No images, no illustrations, no textures, no gradients
anywhere in the product — the only "imagery" is the graph itself. Pane surfaces
are `slate-50` at 50–80% over white; that faint translucency is the house
treatment for a pane behind content. No blur except where a floating layer sits
over the board.

**Borders & radii.** Stops are `border-2` in the domain colour, pill radius.
Open containers are `rounded-2xl`. Menus and drop zones `rounded-lg`. Buttons and
tabs `rounded`. **Dashed always means conditional** — an optional stop, an
inactive bypass rail, a placeholder awaiting a node, a collapsed group in the
rail. Never dash for decoration.

**Shadow.** The as-built pane has almost none (one `shadow-md` on the floating
toolbar); this system introduces the lift/sink pair as the containment signal.
Keep them soft and low-contrast — `--lift-node` is a 1px contact shadow plus a
wide, faint ambient one. Never both a lift and a sink on the same element.

**Hover / press.** Hover = a one-step-darker wash of the element's own family
(`hover:bg-slate-50`, `hover:bg-green-100`), never a colour change and never a
scale. Press has no distinct treatment. Disabled = `--opacity-disabled` (0.3),
never a grey repaint. Off-road / skipped = `--opacity-off-road` (0.5). A dragged
block's peers drop to `--opacity-drag-rest` (0.35).

**Animation.** Everything is a short ease-out; nothing bounces, nothing springs.
The repo's own rationale: a relayout should be legible — *"nodes visibly make
room"* — so blocks transition `left/top/width/height` over 200ms, expand/collapse
transforms over 300ms, edge tracing over 180ms, and scope changes enter *from
their navigation direction* (`drill-down/up/left/right`, 280ms). Never animate
colour.

**Layout rules.** Instruments are panes in a flex composition; each owns a
`shrink-0` header, a `flex-1 min-h-0` body, and (authoring panes) a `shrink-0`
docked footer. The rail's side is a **toggle**, implemented with CSS `order` so
DOM order stays stable and flipping never remounts it — follow that pattern for
any pane-arrangement choice.

---

## Iconography

There is **no icon library, icon font, or SVG sprite** in this codebase. Every
icon is a **Unicode glyph set inline in the markup**, and it is a real vocabulary:

| Glyph | Means |
| --- | --- |
| `◇` | optional — may be bypassed |
| `⑂` | a fork: this container offers a choice |
| `⊞` | a group / "group the selection" |
| `↺` | a revisit: this node already appeared |
| `●` / `○` | the chosen branch / an available branch |
| `▾` / `▸` | expanded / collapsed |
| `↥` | promote steps up out of a container |
| `⌫` | drop just this variant |
| `✕` | delete |
| `↶` / `↷` | undo / redo |
| `✎` / `✓` | rename mode on / done |
| `⋯` | this system's replacement for the `⋮⋮` drag dot: the block's actions |
| `→` / `←` | which side the rail runs down |
| `⇄` | a symmetric relation (`see_also`), in corpus comments |

Rules: keep the glyphs — they are consistent and they cost nothing. Do **not**
introduce Lucide/Heroicons for these; do **not** hand-roll SVG replacements; do
**not** use emoji. If a genuinely new affordance needs a mark, take another
geometric Unicode glyph in the same weight class. `⋮⋮` is retired: the header
row is already the drag handle, so a decorative grip is one affordance too many.

---

## Intentional additions

Everything in `components/` has a counterpart in the source instrument, with
three additions the redesign requires:

- **`StatusGutter`** — the source scatters the order badge, ◇ and ⑂ inline; this
  fixes them into one column so the road and rail align.
- **`ActionStrip` / `ActionChoice`** — replaces the floating toolbar *and* the
  delete popover with one docked surface.
- **`ForkSwitch`** — the source renders the question input and tab strip inline
  inside `AuthorRoad`; extracted so the step counts and ghost line can be
  enforced in one place.

---

## Caveats

- The **fork** and the **optional stop** in the UI kit are demo additions —
  `mockwalk.ts` authors neither, so neither state would otherwise be reachable.
  Flagged in `ui_kits/railroad/README.md`.
- Component cards are static token-driven markup rather than live mounts, so they
  render before the component bundle exists. Their values are copied from the
  `.jsx`; if you change a component, update its card.
- `--surface-well-*` and the lift/sink shadows are **new** — proposed here, not
  extracted. Everything else in `tokens/` is as-built and cited in comments.
- Not covered: the layered map, Children wheel, Contour/Evoc/Walk views, the
  Palette, `LensPane`, `TreePanel`, `StudioView` chrome. The tokens apply; the
  component inventory does not yet.

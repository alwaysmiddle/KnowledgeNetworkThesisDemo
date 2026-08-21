import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// DS HOST RULES — the ones no prop can express.
//
// The Design System ships CHROME WITHOUT BODIES: a pane's hat, a group's frame,
// a chip's face. What goes inside is the host's, so the DS cannot make it right
// — it can only write down what the host must do. Those written rules are the
// only thing standing between us and the defect, and on 2026-08-17 we measured
// how well that works: rule 1 below was written down, read, and still broken in
// 5 of the 6 places we had to obey it. A rule in prose has a compliance rate.
//
// These tests are the machine half. They do not replace the prose — the prose
// explains WHY, which is the part worth keeping — they stop it decaying. Every
// rule here is one the DS states in a `.d.ts` we ported; each test cites it.
//
// Source-scanning rather than rendering: vitest runs `environment: 'node'` with
// no jsdom, and — more to the point — these are rules about what the SOURCE may
// say. A rendering test would need the very layout the rule exists to protect.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** each argument is a repo-relative directory to walk, or a single .tsx file */
function tsxUnder(...paths: string[]): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    if (!statSync(p).isDirectory()) {
      if (p.endsWith('.tsx')) out.push(p)
      return
    }
    for (const e of readdirSync(p, { withFileTypes: true })) walk(join(p, e.name))
  }
  for (const p of paths) walk(join(ROOT, p))
  return out
}

const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/')

/** blank out comments so a rule's own prose — which necessarily quotes the thing
 *  it bans — is never read as a violation of itself. Replaced with spaces rather
 *  than removed so line numbers survive. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))
}

type Hit = { file: string; line: number; text: string }

function scan(files: string[], test: (line: string) => string | null): Hit[] {
  const hits: Hit[] = []
  for (const f of files) {
    stripComments(readFileSync(f, 'utf8'))
      .split(/\r?\n/)
      .forEach((line, i) => {
        const t = test(line)
        if (t !== null) hits.push({ file: rel(f), line: i + 1, text: t })
      })
  }
  return hits
}

const show = (hits: Hit[]) => hits.map((h) => `${h.file}:${h.line}  ${h.text}`)

// ─── rule 1 ──────────────────────────────────────────────────────────────────
// PaneHeader.d.ts rule 2: "THE BODY TAKES NO BACKGROUND OF ITS OWN; the pane's
// --surface-paper shows through."
//
// A pane body is the root an instrument returns — StudioView paints the pane
// (--surface-paper, --radius-lg), mounts a PaneHeader on its border, and renders
// `inst.render(bus)` into the box below. So the rule binds every instrument root.
//
// Identifying one WITHOUT a JSX parser: a pane body fills its pane and is
// therefore `h-full`; a floating legend or overlay chip is `absolute`-positioned
// and is not. That single distinction separates the two cleanly across this app —
// every `bg-white/95` chip floating over a canvas is correctly untouched, and it
// SHOULD keep its background: it is not the body, it sits on top of one.
describe('DS PaneHeader rule 2 — a pane body paints no background', () => {
  // The un-migrated alt-visualizations (#69) are still on the cool slate palette
  // and draw white overlay chips onto a slate canvas. Stripping the canvas there
  // would leave near-white chips on near-white paper — a regression, not a fix.
  // They come off this list as each instrument is migrated, never by widening it.
  const MIGRATION_DEBT: Record<string, number> = {
    'src/instruments/ContoursView.tsx': 1,
    'src/instruments/ClustersView.tsx': 1,
    'src/instruments/UnfoldGraphView.tsx': 1,
    'src/instruments/UnfoldView.tsx': 2,
    'src/instruments/WalkView.tsx': 2,
    'src/instruments/walkdesk/WalkColumnsView.tsx': 1,
    'src/instruments/walkdesk/WalkStackView.tsx': 1,
    'src/instruments/walkdesk/shared.tsx': 1,
    // not palette debt: the atlas paints #eef4f8 because that colour is its WATER
    // — the map's own drawing, not chrome. Stripping it would leave the land
    // floating on paper. It is listed because the rule cannot tell the two apart,
    // and a body that means to paint should have to say so here. Raised on #108.
    'src/instruments/MapView.tsx': 1,
  }

  const BG = /\bbg-(?!transparent\b)[a-z]+(?:-\d{2,3})?(?:\/\d+)?\b/
  // an inline `background` counts too. MapView:530 sets one and carries no
  // bg-* class at all — a className-only scan called that pane clean, and only a
  // computed-style read off the running page caught it.
  // the whitespace lives INSIDE the lookahead on purpose: written as `:\s*(?!…)`
  // the `\s*` backtracks to zero, the exclusion is then tested against the space
  // rather than the value, and `background: 'none'` reads as a violation
  const STYLE_BG = /\bbackground(?:Color)?\s*:(?!\s*['"]?(?:none|transparent)\b)/

  const hits = scan(tsxUnder('src/instruments', 'src/studio/instruments.tsx'), (line) => {
    if (!/\bh-full\b/.test(line)) return null
    const m = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/)
    const cls = m?.[1] ?? m?.[2] ?? ''
    if (BG.test(cls)) return `${BG.exec(cls)![0]}   in "${cls}"`
    if (STYLE_BG.test(line)) return `inline background   in ${line.trim().slice(0, 90)}`
    return null
  })

  it('an instrument with no recorded debt paints no background', () => {
    expect(show(hits.filter((h) => !(h.file in MIGRATION_DEBT)))).toEqual([])
  })

  // The ratchet: the debt list must shrink as #69 lands, and a file that quietly
  // grows a second violation under an existing allowance is caught here.
  it('the #69 migration debt is exactly as recorded', () => {
    const counted: Record<string, number> = {}
    for (const h of hits) counted[h.file] = (counted[h.file] ?? 0) + 1
    expect(counted).toEqual(MIGRATION_DEBT)
  })
})

// ─── rule 2 ──────────────────────────────────────────────────────────────────
// PaneHeader.d.ts rule 2, second half: "A body that must clip rounds ALL FOUR
// corners at --radius-lg, never the bottom two alone."
//
// The header is 11px tall, so a body that clips starts INSIDE the pane's 20px
// corner arc. Rounding only the bottom leaves the top two corners square and
// bites two notches out of the pane's rounded top. Shipped exactly that way at
// StudioView.tsx:128 until 78af5b4.
describe('DS PaneHeader rule 2 — a clipping body rounds all four corners', () => {
  const files = tsxUnder('src')

  it('no style rounds the bottom corners alone', () => {
    const bad = scan(files, (line) => {
      if (!/borderBottom(?:Left|Right)Radius/.test(line)) return null
      // the top pair (or a blanket borderRadius) must be set on the same element;
      // these are written one-per-line here, so the whole declaration is in view
      return /borderTop(?:Left|Right)Radius|borderRadius\s*:/.test(line) ? null : line.trim()
    })
    expect(show(bad)).toEqual([])
  })

  it('no className rounds the bottom corners alone', () => {
    const bad = scan(files, (line) => {
      const m = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/)
      const cls = m?.[1] ?? m?.[2]
      if (!cls || !/\brounded-b(?:-|\b)/.test(cls)) return null
      // drop the bottom-only tokens FIRST: `\brounded\b` matches inside
      // `rounded-b-lg` (the `-` is a word boundary), so testing the raw string
      // would let every violation clear itself
      const rest = cls.replace(/\brounded-b(?:-[a-z0-9[\]().%-]+)?/g, '')
      return /\brounded-t(?:-|\b)|\brounded(?:-(?:none|sm|md|lg|xl|full|\[))?\b/.test(rest) ? null : cls
    })
    expect(show(bad)).toEqual([])
  })
})

// ─── rule 3 ──────────────────────────────────────────────────────────────────
// TreeRow.d.ts, on `caretStyle`: "If you repeat it, repeat the LONGHANDS.
// `caretStyle` sets `borderRight` and `borderBottom` and nothing else. Writing it
// as `border` plus `borderTop: 'none'` looks equivalent and is not: React diffs
// style objects key by key, so a re-render that changes only the shorthand's
// colour re-sets `border` and never re-sets the two sides that were switched off
// — the mark fills in, and the caret becomes a diamond the first time it is
// hovered."
//
// We comply today because we port from the .jsx. This stops a hand-rolled caret
// — or any switched-off border side — from reintroducing it.
describe('DS TreeRow — a switched-off border side needs longhands, not a shorthand', () => {
  it("no element pairs a `border` shorthand with a `border<Side>: 'none'`", () => {
    const bad: Hit[] = []
    for (const f of tsxUnder('src')) {
      const lines = stripComments(readFileSync(f, 'utf8')).split(/\r?\n/)
      lines.forEach((line, i) => {
        if (!/border(?:Top|Right|Bottom|Left)\s*:\s*['"]none['"]/.test(line)) return
        // the shorthand it would fight sits in the same object literal — look at
        // the few lines either side, which is the whole of any style object here
        const near = lines.slice(Math.max(0, i - 6), i + 7).join('\n')
        // `:` then the whitespace inside the lookahead — see STYLE_BG above for why
        if (/\bborder\s*:(?!\s*['"]none['"])/.test(near)) bad.push({ file: rel(f), line: i + 1, text: line.trim() })
      })
    }
    expect(show(bad)).toEqual([])
  })
})

// ─── our side of the contract ────────────────────────────────────────────────
// The failure we keep reporting upstream, pointed the other way. On 2026-08-17
// our VersionedGroup port carried 50 props and 12 doc comments while the DS's
// own .d.ts documented nearly all of them — so `src/ds/`, the file anyone here
// actually opens, was a WORSE manual than the source it was copied from. The
// 38 missing were ported in the same pass that added this test.
//
// The budget is not zero and should not be: the DS leaves the self-explanatory
// props bare too (`title`, `domain`, `onClick`, the min/max sizes), and a prop
// covered by a shared comment above its sibling — "drag bounds: …" over three of
// them — reads as undocumented to this counter and is not. Checked component by
// component against the DS's .d.ts, the remainder is at DS parity. The number is
// a ratchet against silent regression, not a target to drive to 0.
describe('our DS ports document what the DS documents', () => {
  const BUDGET = 55

  const undocumented: string[] = []
  for (const f of tsxUnder('src/ds')) {
    const lines = readFileSync(f, 'utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (!/^export interface \w+Props\b/.test(lines[i])) continue
      for (let j = i + 1; j < lines.length && !/^\}/.test(lines[j]); j++) {
        const prop = lines[j].match(/^ {2}(\w+)\??:/)
        if (!prop) continue
        const prev = lines[j - 1].trim()
        if (!(prev.endsWith('*/') || prev.startsWith('*') || prev.startsWith('/**'))) {
          undocumented.push(`${rel(f)}:${j + 1}  ${prop[1]}`)
        }
      }
    }
  }

  // An EXACT count, not a ceiling: porting more prose should fail here once and
  // make you lower the number, the same way the barrel test makes adopting a
  // component a deliberate edit rather than a quiet audit miss.
  it(`leaves exactly ${BUDGET} props undocumented across src/ds`, () => {
    expect(undocumented.length, `\n${undocumented.join('\n')}\n`).toBe(BUDGET)
  })
})


// ─── rule 5 ──────────────────────────────────────────────────────────
// IconButton.d.ts: "a native `title` holding a long name draws ONE line the width
// of the screen — the hardest shape there is to read. Fold it at the element that
// sets the attribute." (OB-032 in the DS, OB-034 for the host screens.)
//
// A component port cannot reach this rule: `/design-sync` rewrites `src/ds/**` and
// never opens a screen file, and the screens are exactly where the unbounded
// strings live — a corpus title interpolated into a sentence, a walk's whole
// description. So it is the host's rule, and this is the machine half of it.
//
// A title PROP handed to a DS component is NOT a violation: that one is folded
// inside the component, and `Pane title=` is a pane HEADING rather than a tooltip.
// The two are told apart by the tag name, which is exact rather than a heuristic —
// JSX spells a DOM element lowercase (`button`, `span`) and a component
// capitalised (`PillButton`, `PaneHeader`). So the scan walks back from each
// `title=` to the `<` that opens its tag.
describe('DS IconButton — every tooltip on a DOM element is folded', () => {
  const TREES = ['src/ds', 'src/instruments', 'src/studio', 'src/ui']

  /** the JSX tag whose attribute list contains index `i` */
  function tagAt(src: string, i: number): string | null {
    const open = src.lastIndexOf('<', i)
    if (open < 0) return null
    const m = /^<\s*([A-Za-z][\w.]*)/.exec(src.slice(open, i))
    return m ? m[1] : null
  }

  /** the whole attribute value, brace-matched. Several of these tooltips are
   *  multi-line ternaries, so a fixed-size window would read half a value and
   *  report a folded one as raw. */
  function valueAt(src: string, i: number): string {
    if (src[i] === '"') return src.slice(i, src.indexOf('"', i + 1) + 1)
    let depth = 0
    for (let k = i; k < src.length; k++) {
      if (src[k] === '{') depth++
      else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1)
    }
    return src.slice(i, i + 80)
  }

  const raw: string[] = []
  for (const f of tsxUnder(...TREES)) {
    const src = stripComments(readFileSync(f, 'utf8'))
    for (const m of src.matchAll(/\btitle=(["{])/g)) {
      const tag = tagAt(src, m.index)
      if (!tag || tag[0] !== tag[0].toLowerCase()) continue // a prop, not a tooltip
      const value = valueAt(src, m.index + 6)
      // `wrapTip` need not be the OUTERMOST call. A value that only sometimes
      // carries a string folds inside its branch and stays undefined otherwise,
      // which is the right shape rather than a violation.
      if (value.includes('wrapTip(')) continue
      const line = src.slice(0, m.index).split('\n').length
      raw.push(`${rel(f)}:${line}  title=${value.replace(/\s+/g, ' ').slice(0, 70)}`)
    }
  }

  it('sets no raw title= on a DOM element', () => {
    expect(raw).toEqual([])
  })
})

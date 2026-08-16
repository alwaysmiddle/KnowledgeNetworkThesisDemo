// The #91 gate, made lookable-at.
//
// "Closed cards host the whole VersionedGroup" sounds like the safe half of #91,
// because a closed card has no visible children and the children-are-siblings
// wall therefore does not apply to it. But the two sides do not draw `folded` the
// same way, and swapping the component swaps the picture:
//
//   the road    a raised PILL at exactly leaf size, with two silhouettes peeking
//               down-right behind it (ADR-0005 D2) so a fold reads as a folded
//               STACK rather than as one stop
//   the DS      a raised rounded-lg CARD with one well-tinted plate behind it at
//               7px, a 3-line title clamp, and the tally in the head. Its own
//               elevation.css states the rule: "a folded group -> raised again,
//               with the well tint stacked behind it"
//
// Both are deliberate and they disagree, so this is a design change and not a
// refactor. This page puts them side by side at the same content, on the road's
// own well surface, each under a leaf pill for scale — because the question is
// not "which is prettier" but "which one still says CONTAINER when it is sitting
// in a column of leaves".
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import { useCallback, useState } from 'react'
import { VersionedGroup, GroupGeometry } from '../../../src/ds/group/VersionedGroup'
import type { BodySlot } from '../../../src/ds/group/VersionedGroup'

const NODEW = 150
const NODEH = 34
// what the road hosts since the fold went to the DS's own minimum: the shell is
// told `width` NODEW but never squeezed under this, so it renders at 190 (AuthorRoad
// FOLD_MIN_W). The calibration rows must render the same way or they measure a
// box the road never draws.
const FOLD_MIN_W = 190
const TITLE = 'Secure the channel'
const STEPS = 1

/** the road's leaf stop, for scale — every fold is judged against this shape */
function LeafPill({ n, title, color }: { n: string; title: string; color: string }) {
  return (
    <div style={{
      width: NODEW, height: NODEH, borderRadius: 999, boxSizing: 'border-box',
      border: '1.5px solid ' + color, background: 'var(--surface-raised)',
      color: 'var(--text-1)', padding: '0 12px',
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)',
    }}>
      <span style={{ flexShrink: 0, fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-bold)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-3)' }}>{n}.</span>
      <span style={{ flex: 1, textAlign: 'center' }}>{title}</span>
    </div>
  )
}

/** AuthorRoad.tsx:845-888 as it stands — the pill and its two decorative plates,
 *  transcribed to inline styles so this page does not depend on Tailwind reaching
 *  into tools/. Same box, same tokens, same offsets. */
function RoadFold() {
  const plate: React.CSSProperties = {
    position: 'absolute', width: NODEW, height: NODEH, borderRadius: 999, boxSizing: 'border-box',
    border: '1px solid var(--border-well-strong)', background: 'var(--surface-raised)',
    pointerEvents: 'none',
  }
  return (
    <div style={{ position: 'relative', width: NODEW + 6, height: NODEH + 6 }}>
      <div aria-hidden style={{ ...plate, left: 5, top: 5 }} />
      <div aria-hidden style={{ ...plate, left: 2.5, top: 2.5 }} />
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: NODEW, height: NODEH, borderRadius: 999, boxSizing: 'border-box',
        border: '1px solid var(--border-well-strong)', background: 'var(--surface-raised)',
        boxShadow: 'var(--lift-node)', color: 'var(--text-1)', padding: '0 10px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-bold)',
      }}>
        <span style={{ flexShrink: 0, fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-bold)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-3)' }}>3.</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{TITLE}</span>
      </div>
    </div>
  )
}

function Case({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', color: 'var(--text-1)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-2)', minHeight: 48 }}>{note}</div>
      {/* the road's well, so each fold is judged on the surface it actually sits on */}
      <div data-case={label} data-ds-host="" style={{
        background: 'var(--surface-well-1, var(--surface-sunken))', borderRadius: 'var(--radius-lg)',
        padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <LeafPill n="2" title="TCP & UDP" color="var(--domain-net)" />
        <span style={{ color: 'var(--acorn-500)' }}>↓</span>
        {children}
        <span style={{ color: 'var(--acorn-500)' }}>↓</span>
        <LeafPill n="4" title="HTTP & REST" color="var(--domain-cs)" />
      </div>
    </div>
  )
}

const versions = [{ id: '0', name: 'just the handshake', label: 'v1' }]

/** CALIBRATION for the road's foldSize() estimator.
 *
 *  layoutRoad places every box before anything renders, so hosting the folded
 *  component means PREDICTING its height — the same problem headRows() solved for
 *  the open card's head, and solved the same way: measure the real thing across a
 *  spread of titles, then fit a line to it. Deriving it from the CSS is not good
 *  enough here, because the head row is `alignItems: baseline` and its height is
 *  set by baseline alignment rather than by the tallest child.
 *
 *  Each row renders at the road's own width with `narrow`, which is the
 *  configuration the road hosts. The driver reads these boxes back. */
const CALIBRATE = [
  'IP',
  'DNS & Naming',
  'Secure the channel',
  'Authentication & Authorization',
  'Everything the browser does before the first byte comes back',
]

/** CALIBRATION of the DS's PUBLISHED GEOMETRY — the OPEN card, hosted the way
 *  the road hosts it: `bodySlot`, told its width and a `slotHeight`, no children.
 *
 *  layoutRoad reserves every card before render, so it asks GroupGeometry
 *  (openHeight / foldedSize) for the numbers, and this page is where those
 *  numbers meet the rendered card. Each case varies one string; the driver reads
 *  back the shell's height, the three head rows, the slot the component REPORTS
 *  through onBodySlot, and the prediction — and prints the deltas. A prediction
 *  that drifts from the drawing shows up here as a number, not as a card whose
 *  steps overlap its picker. Under data-ds-host, the DS's own box model, which
 *  the geometry assumes. */
const OPEN_W = 272
const SLOT_H = 94 // two 34px nodes and a 26px gap — a road column of two leaves
const OPEN_CASES: { k: string; title: string; desc: string; name: string; slot?: number; count?: number }[] = [
  { k: 't1-d1-n1', title: 'Secure the channel', desc: 'a typed name must become an address', name: 'just the handshake' },
  { k: 't2', title: 'Everything the browser does before the first byte comes back', desc: 'a typed name must become an address', name: 'just the handshake' },
  { k: 'd2', title: 'Secure the channel', desc: 'a typed name must become an address before anything moves, and the resolver is where that happens', name: 'just the handshake' },
  { k: 'n2', title: 'Secure the channel', desc: 'a typed name must become an address', name: 'what breaks when a hop is lost, and what the sender learns about it' },
  { k: 'd0', title: 'Secure the channel', desc: '', name: 'just the handshake' },
  { k: 'empty', title: 'Secure the channel', desc: '', name: 'just the handshake', slot: 34, count: 0 },
]

/** one calibration card: the port hosted with bodySlot, its prediction and its
 *  reported slot stamped on the wrapper for the driver to read */
function OpenCase({ c }: { c: (typeof OPEN_CASES)[number] }) {
  const [slot, setSlot] = useState<BodySlot | null>(null)
  const onBodySlot = useCallback((b: BodySlot) => setSlot((prev) => (prev && prev.left === b.left && prev.top === b.top && prev.width === b.width && prev.height === b.height) ? prev : b), [])
  const slotH = c.slot ?? SLOT_H
  const count = c.count ?? 2
  const pred = GroupGeometry.openHeight({ width: OPEN_W, title: c.title, index: '3', description: c.desc, descPlaceholder: 'enter description', versionName: c.name, versionLabel: 'v1', count, countLabel: 'nodes', narrow: false, bodyHeight: slotH })
  return (
    <div data-cal-open={c.k} data-ds-host="" data-pred-h={pred.height} data-pred-bodytop={pred.bodyTop} data-pred-measured={String(pred.measured)}
      data-slot={slot ? `${slot.left},${slot.top},${slot.width},${slot.height}` : ''}>
      <VersionedGroup title={c.title} index="3" count={count} countLabel="nodes" description={c.desc}
        versions={[{ id: '0', name: c.name, label: 'v1' }]} activeId="0"
        resizable={false} movable={false} narrow={false} width={OPEN_W}
        bodySlot slotHeight={slotH} onBodySlot={onBodySlot}
        onToggleFold={() => {}} onClose={() => {}} onDescribe={() => {}} onRetitle={() => {}} onRename={() => {}} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: 28, display: 'flex', gap: 30, alignItems: 'flex-start', background: 'var(--surface-canopy)', minHeight: '100vh' }}>
      <Case label="road" note="ADR-0005 D2 — a pill at exactly leaf size, two plates peeking behind it.">
        <RoadFold />
      </Case>
      <Case label="ds-natural" note="VersionedGroup folded, at its own foldedMinWidth of 190. Rounded-lg, one well-tinted plate at 7px, tally in the head.">
        <VersionedGroup folded title={TITLE} index="3" count={STEPS} countLabel="steps"
          versions={versions} activeId="0" resizable={false} movable={false} narrow={false} />
      </Case>
      <Case label="ds-pillwidth" note="The same component squeezed to the road's 150px with narrow suppressed — the tally spills out of the card. This is the WRONG way to host it, kept as the evidence for why.">
        <VersionedGroup folded title={TITLE} index="3" count={STEPS} countLabel="steps"
          versions={versions} activeId="0" resizable={false} movable={false} narrow={false}
          width={NODEW} foldedMinWidth={NODEW} />
      </Case>
      <Case label="ds-narrow" note="150px with narrow passed — the DS's own answer below ~250px: the tally drops to its own line. This is what hosting at road width actually looks like.">
        <VersionedGroup folded title={TITLE} index="3" count={STEPS} countLabel="steps"
          versions={versions} activeId="0" resizable={false} movable={false} narrow
          width={NODEW} foldedMinWidth={NODEW} />
      </Case>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: OPEN_W }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', color: 'var(--text-1)' }}>calibrate · open, bodySlot</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-2)', minHeight: 48 }}>
          The DS group OPEN as the road hosts it — bodySlot, told 272 wide and a slot of {SLOT_H} — against GroupGeometry.openHeight: title, DescLine, picker at one and two lines, an empty version.
        </div>
        {OPEN_CASES.map((c) => <OpenCase key={c.k} c={c} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 210 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', color: 'var(--text-1)' }}>calibrate</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-2)', minHeight: 48 }}>
          The folded box as the road hosts it (told 150, floored at 190, narrow, under the DS's own content-box via data-ds-host — so the shell is 196 with a 190 face), over a spread of title lengths — what foldSize() has to predict.
        </div>
        {CALIBRATE.map((t, i) => (
          <div key={i} data-cal={i} data-cal-title={t} data-ds-host=""
            data-pred-h={GroupGeometry.foldedSize({ width: NODEW, foldedMinWidth: FOLD_MIN_W, title: t, index: String(i + 1), count: i + 1, countLabel: 'nodes', narrow: true }).height}
            data-pred-w={GroupGeometry.foldedSize({ width: NODEW, foldedMinWidth: FOLD_MIN_W, title: t, index: String(i + 1), count: i + 1, countLabel: 'nodes', narrow: true }).width}>
            <VersionedGroup folded title={t} index={String(i + 1)} count={i + 1} countLabel="nodes"
              versions={versions} activeId="0" resizable={false} movable={false} narrow
              width={NODEW} foldedMinWidth={FOLD_MIN_W}
              // as the road passes them: the head's control cluster reserves the
              // width of BOTH buttons even while receded, and the title's room —
              // so where it wraps — depends on that
              onToggleFold={() => {}} onClose={() => {}} />
          </div>
        ))}
      </div>
    </div>
  </StrictMode>,
)

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
import { VersionedGroup } from '../../../src/ds/group/VersionedGroup'

const NODEW = 150
const NODEH = 34
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
      <div data-case={label} style={{
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 210 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', color: 'var(--text-1)' }}>calibrate</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-2)', minHeight: 48 }}>
          The folded box at the road's own width, over a spread of title lengths — what foldSize() has to predict.
        </div>
        {CALIBRATE.map((t, i) => (
          <div key={i} data-cal={i} data-cal-title={t}>
            <VersionedGroup folded title={t} index={String(i + 1)} count={i + 1} countLabel="steps"
              versions={versions} activeId="0" resizable={false} movable={false} narrow
              width={NODEW} foldedMinWidth={NODEW} />
          </div>
        ))}
      </div>
    </div>
  </StrictMode>,
)

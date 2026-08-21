// OB-029 / OB-033 specimens — the cases the two obligations name, and no others.
//
// The claims both items make are about MEASURED behaviour, so they cannot be
// asserted from source and cannot be asserted in the node test environment:
//
//   OB-029  "opening and closing each of the three changes the card's height by 0,
//            for a one-line AND a wrapped value of each"
//   OB-033  "draws a title longer than its cap AND a live version name longer than
//            its own 2-line cap as a CUT STRING ending in '…'"
//
// A card on the real road would do, but it drags in AuthorRoad's whole layout and
// gives no control over the one thing that decides both — the LENGTH of each
// string against the column it is laid out in. So the specimens are built here,
// one card per case, at a fixed width, with every one of the three strings
// editable. `drive-inline-edit.mjs` reads them.
//
// Every card is `width={CARD_W}` deliberately: a card left to size itself never
// clips a title, so an ellipsis case cannot even exist at an automatic width.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import { VersionedGroup } from '../../../src/ds/group/VersionedGroup'

const CARD_W = 300

/** the three strings, at the three lengths that matter.
 *
 *  ONE LINE   — fits its column with room to spare
 *  WRAPPED    — takes more than one line but stays inside the cap, so nothing is
 *               cut and nothing may gain an ellipsis
 *  OVER CAP   — needs more lines than the cap allows, so the tail is cut and the
 *               cut has to be visible */
const CASES = [
  {
    key: 'one-line',
    title: 'Serve it',
    description: 'one short line',
    version: 'first pass',
  },
  {
    key: 'wrapped',
    title: 'Secure the channel end to end',
    description: 'a description long enough that it has to wrap onto a second line in this column',
    version: 'the second attempt, rewritten',
  },
  {
    key: 'over-cap',
    title: 'Everything the browser does before the first byte of the page comes back to it, in order',
    description: 'a description long enough that it has to wrap onto a second line in this column',
    version: 'the version whose name runs past the two lines the picker row allows it, and then some more',
  },
  {
    key: 'empty-desc',
    title: 'No description yet',
    description: '',
    version: 'only version',
  },
]

function Specimen({ c }: { c: (typeof CASES)[number] }) {
  const [title, setTitle] = useState(c.title)
  const [description, setDescription] = useState(c.description)
  const [versions, setVersions] = useState([{ id: 'v0', name: c.version }])
  return (
    <div data-case={c.key} style={{ padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{c.key}</div>
      <VersionedGroup
        width={CARD_W}
        index="2."
        title={title}
        description={description}
        descPlaceholder="enter description"
        versions={versions}
        activeId="v0"
        count={2}
        movable={false}
        resizable={false}
        onRetitle={setTitle}
        onDescribe={setDescription}
        onRename={(id, name) => setVersions((vs) => vs.map((v) => (v.id === id ? { ...v, name } : v)))}
      >
        <div style={{ height: 24 }} />
        <div style={{ height: 24 }} />
      </VersionedGroup>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{
      minHeight: '100vh', background: 'var(--surface-paper)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24, padding: 24,
    }}>
      {CASES.map((c) => <Specimen key={c.key} c={c} />)}
    </div>
  </StrictMode>,
)

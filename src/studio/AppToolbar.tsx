import { CopyMark, LoadMark, NewMapMark, PasteMark, PrintMark, SaveMark, Toolbar } from '@/ds'
import type { ToolbarItemSpec } from '@/ds'

import { redoDraft, undoDraft } from '../instruments/walkdesk/authordraft'

/** The application toolbar (#55): universal, app-level operations pinned directly
 *  under the app header — the DS Toolbar's designed slot. Built entirely on the
 *  DS Toolbar / ToolbarItem, glyph-only (OB-064) — the DS shipped the marks that
 *  were missing (NewMapMark/PrintMark/SaveMark/LoadMark/CopyMark/PasteMark),
 *  resolving #55's open "labels vs glyphs" call in favour of glyphs; text pills
 *  were the interim, on-spec choice while those marks didn't exist yet.
 *
 *  Only undo/redo and Present have a command model today. Undo/redo are wired to
 *  the walk-draft history in authordraft.ts (the sole undoable model in the demo
 *  — note it is WALK-scoped, not truly app-global; safe no-ops when the history
 *  is empty). new map / print / save / load / copy / cut / paste have no backing
 *  model yet, so they render disabled, carrying their `Name (Ctrl+X)` tooltip
 *  until an app-level command/clipboard model exists. See #55.
 *
 *  PRESENT (#195) is app-level in the strongest sense — it replaces the whole
 *  screen — so it belongs here rather than on any instrument. It carries no
 *  keyboard shortcut on purpose: PowerPoint's F5 is the browser's reload, which
 *  in a Vite-heavy workflow is a key the author presses constantly. Shift+F5 is
 *  the candidate if one is ever wanted. */
export function AppToolbar({ onPresent }: { onPresent?: () => void } = {}) {
  const newMap: ToolbarItemSpec[] = [{ glyph: <NewMapMark />, title: 'New map', disabled: true }]
  const editing: ToolbarItemSpec[] = [
    { glyph: '↶', title: 'Undo (Ctrl+Z)', onClick: undoDraft },
    { glyph: '↷', title: 'Redo (Ctrl+Y)', onClick: redoDraft },
  ]
  const document: ToolbarItemSpec[] = [
    { glyph: <PrintMark />, title: 'Print (Ctrl+P)', disabled: true },
    { glyph: <SaveMark />, title: 'Save (Ctrl+S)', disabled: true },
    { glyph: <LoadMark />, title: 'Load', disabled: true },
  ]
  const clipboard: ToolbarItemSpec[] = [
    { glyph: <CopyMark />, title: 'Copy (Ctrl+C)', disabled: true },
    { glyph: <PasteMark />, title: 'Paste (Ctrl+V)', disabled: true },
    { glyph: '✂', title: 'Cut (Ctrl+X)', disabled: true },
  ]
  // ▶ is TrailStrip's own glyph for starting a walk, so entering a deck reads as
  // the same family of act. `walk` is the tone the DS reserves for movement
  // through the corpus, which is what distinguishes this from the file-and-
  // clipboard verbs beside it.
  const present: ToolbarItemSpec[] = [{ glyph: '▶', title: 'Present', tone: 'walk', onClick: onPresent }]
  return (
    <Toolbar
      groups={[{ items: newMap }, { items: editing }, { items: document }, { items: clipboard }, { items: present }]}
    />
  )
}

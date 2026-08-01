import { Toolbar } from '@/ds'
import type { ToolbarItemSpec } from '@/ds'

import { redoDraft, undoDraft } from '../instruments/walkdesk/authordraft'

/** The application toolbar (#55): universal, app-level operations pinned directly
 *  under the app header — the DS Toolbar's designed slot. Built entirely on the
 *  DS Toolbar / ToolbarItem.
 *
 *  Only the operations that have a command model today are live: undo/redo are
 *  wired to the walk-draft history in authordraft.ts (the sole undoable model in
 *  the demo — note it is WALK-scoped, not truly app-global; safe no-ops when the
 *  history is empty). print/save/copy/cut/paste have no backing model yet, so
 *  they render disabled, carrying their `Name (Ctrl+X)` tooltip until an
 *  app-level command/clipboard model exists. See #55.
 *
 *  Labels-not-glyphs: #55 leaves label-vs-icon to testing, and the DS forbids
 *  emoji glyphs; there is no house glyph for save/copy/cut/paste, so text pills
 *  are the legible, on-spec choice for now. */
export function AppToolbar() {
  const editing: ToolbarItemSpec[] = [
    { label: 'undo', title: 'Undo (Ctrl+Z)', onClick: undoDraft },
    { label: 'redo', title: 'Redo (Ctrl+Y)', onClick: redoDraft },
  ]
  const document: ToolbarItemSpec[] = [
    { label: 'print', title: 'Print (Ctrl+P)', disabled: true },
    { label: 'save', title: 'Save (Ctrl+S)', disabled: true },
  ]
  const clipboard: ToolbarItemSpec[] = [
    { label: 'copy', title: 'Copy (Ctrl+C)', disabled: true },
    { label: 'cut', title: 'Cut (Ctrl+X)', disabled: true },
    { label: 'paste', title: 'Paste (Ctrl+V)', disabled: true },
  ]
  return <Toolbar dense groups={[{ items: editing }, { items: document }, { items: clipboard }]} />
}

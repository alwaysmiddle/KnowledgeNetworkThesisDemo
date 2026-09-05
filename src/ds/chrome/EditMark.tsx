/** THE PENCIL'S OPTICAL LIFT, px — published (DS, 2026-09-04) because every mark that sits
 *  BESIDE the pencil has to share it or the pair reads misaligned: the bin (`BinMark`) and
 *  the flag on the notes head both paid for the number being private. CHOSEN, owner-reported
 *  2026-08-28. Use the constant, never a retyped 1.4. */
export const EDIT_MARK_LIFT = 1.4

/** An action icon for "edit" — a pencil, one filled silhouette rather than assembled
 *  pieces, so its own bounding box centres itself in the button (a two-piece version, a
 *  rotated bar plus a separate triangle, drifted off-centre by construction; reported
 *  2026-08-28). Toggles a whole-card edit mode (`VersionedGroup.editMode`, OB-110 / #256):
 *  several fields become editable at once, replacing a per-field click-to-edit model.
 *
 *  A one-off ACTION icon, like `Toolbar`'s Unicode glyphs, drawn because no Unicode pencil
 *  reads clean at this weight — not part of the closed set of five state marks (caret, bin,
 *  check, restore, optional). No `size` prop: the silhouette is a `clipPath` polygon in
 *  absolute px, which does not rescale the way an SVG `viewBox` does. Fixed at 10×10, the
 *  only size used today.
 *
 *  PORTED FOR ITS CONSTANT, AHEAD OF ITS SCREEN (OB-144, 2026-09-05). Nothing here renders
 *  the pencil yet — #256 (OB-110) is the edit mode that will. It is ported whole rather than
 *  as a bare constant because the DS's contract puts `EDIT_MARK_LIFT` on the pencil, and a
 *  constant that names a mark which does not exist in the tree would be a stranger number.
 *  Typed port of the DS EditMark.jsx (contract: EditMark.d.ts). */
export function EditMark() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: 10,
        height: 10,
        background: 'currentColor',
        /* the mark's own optical centring: a triangular silhouette reads visually heavier
           toward its point, so a mathematically-centred bounding box still looks a touch
           low in the button — owner-reported 2026-08-28, same class of correction as the
           caret's translate elsewhere in this system. Nudge, not a re-derivation of the
           polygon. */
        transform: `translateY(-${EDIT_MARK_LIFT}px)`,
        clipPath: 'polygon(1.24px 8.76px, 3.58px 7.98px, 8.38px 3.18px, 6.82px 1.62px, 2.02px 6.42px)',
      }}
    />
  )
}

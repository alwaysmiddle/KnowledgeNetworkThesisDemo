/** The sidebar's families, in the order they are listed.
 *
 *  `maps` read the corpus as territory, `walks` is the authoring desk and what it
 *  projects, `reading` is prose and structure about one node, `lenses` are the
 *  four authored relations. Flat, one level — the palette is a list of families,
 *  not a tree, and the DS InstrumentGroup is built for exactly that shape.
 *
 *  This lives beside instruments.tsx rather than inside it because that file is
 *  .tsx: an exported string-literal array there reads to react-refresh as a
 *  component export, which then makes every other constant in the registry
 *  illegal. A plain .ts module is the honest home for shared vocabulary anyway —
 *  nothing here renders. */
export const FAMILIES = ['maps', 'walks', 'reading', 'lenses'] as const

export type Family = (typeof FAMILIES)[number]

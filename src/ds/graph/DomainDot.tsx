import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

/** THE RING, IN HUE ORDER. Sixteen hue names, matching `--hue-<name>` in
 *  tokens/colors.css. This is the READING order — how a person looks at a
 *  palette — and NOT the order hues are handed out in: see `TOPIC_WALK`. */
export const HUE_RING: string[] = ['rose', 'brick', 'clay', 'amber', 'honey', 'olive', 'lime', 'leaf', 'fern', 'jade', 'teal', 'river', 'cobalt', 'iris', 'violet', 'mallow']

/** THE ASSIGNMENT ORDER — indices into `HUE_RING`, and the load-bearing array
 *  of the two. A bit-reversal permutation: the first four topics of a corpus
 *  land 80 degrees or more apart instead of walking round the warm end
 *  together. Assigning by hue order would give a three-topic corpus rose,
 *  brick and clay — three warm reds, which is the fault this palette exists
 *  to fix. Reordering this re-colours every corpus that never overrode a slot
 *  by hand, so treat it as data rather than as a list to tidy. */
export const TOPIC_WALK: number[] = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]

/** TOPICS WALK FORWARD, RELATION KINDS WALK BACKWARD, along the one
 *  permutation. So the first EIGHT topics and the first EIGHT relation kinds
 *  of a corpus are hue-disjoint by construction, and the two families meet in
 *  the middle only once both are eight deep; past that they share hues, and
 *  ROLE is the whole of what separates them (a filled mark against a line).
 *  An earlier version started relations four places along the SAME
 *  direction, which reproduced the topic sequence exactly — relation 1 drew
 *  the same clay as topic 5. */
export const RELATION_WALK_REVERSED = true

type HueRole = '' | 'ink' | 'stroke' | 'wash' | 'wash-raised'

/** A ring hue in one of its five roles. `role` is '' (the MARK: a dot, a
 *  1.5px border), 'ink' (a label in the hue, AA on white), 'stroke' (a
 *  hairline; lighter than the mark because a connector is never drawn above
 *  the weight of what it connects), 'wash' (a fill on paper) or
 *  'wash-raised' (the same on a white face, and a step STRONGER — a wash
 *  cannot tint white). */
export function hueToken(name: string, role?: HueRole): string {
  if (!HUE_RING.includes(name)) return 'var(--swatch-anchor-fallback)'
  return `var(--hue-${name}${role ? '-' + role : ''})`
}

/** the nth topic's hue name, off `TOPIC_WALK`. Wraps: topic 17 shares topic
 *  1's hue, which is the honest ceiling of the palette rather than a bug to
 *  route around — a corpus with more than sixteen top-level topics wants the
 *  arc grading (a family owns a hue, its children take steps inside its
 *  46deg arc), not a seventeenth slot. */
export function topicHue(n: number): string {
  return HUE_RING[TOPIC_WALK[((n % 16) + 16) % 16]]
}

/** the nth relation kind's hue name — the same walk, read from the far end */
export function relationHue(n: number): string {
  return HUE_RING[TOPIC_WALK[15 - (((n % 16) + 16) % 16)]]
}

/** the six domain codes as ring hue NAMES rather than as `var()` strings —
 *  what `topicPaint()` needs, and the only place the example's mapping is
 *  written twice. Kept beside `DOMAIN_TOKEN` (imported from ./vocab)
 *  deliberately: a seventh entry added to one and not the other is a bug a
 *  reader can see from here. */
const EXAMPLE_HUE: Record<string, string> = { sys: 'leaf', math: 'violet', cs: 'cobalt', net: 'teal', sec: 'amber', se: 'fern' }

/** the fallback is a real answer, not a guard: a topic nobody has a hue for
 *  gets the anchor swatch rather than nothing, so an unknown code draws as a
 *  dot and not as a gap. Resolution order: a RING NAME first (`topic="teal"`,
 *  what a general corpus passes), then the example palette's codes
 *  (`topic="net"`, what the CS corpus still passes), then the fallback. A
 *  ring name always wins, so a corpus is free of the example's vocabulary. */
export function domainToken(domain?: string): string {
  if (!domain) return 'var(--swatch-anchor-fallback)'
  if (HUE_RING.includes(domain)) return `var(--hue-${domain})`
  return DOMAIN_TOKEN[domain as DomainCode] || 'var(--swatch-anchor-fallback)'
}

/** THE PAINT FOR A TOPIC — every value a caller needs, so no call site
 *  chooses a role. Returns `{ hue, mark, ink, stroke, wash, washRaised }`.
 *  `hue` is the resolved ring name, or null for an unknown topic (whose
 *  values are all the anchor fallback, so it draws as a grey mark rather
 *  than as nothing).
 *
 *  `stroke` is included deliberately even though a topic does not normally
 *  draw one: a topic's own hairline (a rail's rung, a tree's guide) is the
 *  one case, and leaving it out would send a caller back to assembling a
 *  token name by hand. */
export function topicPaint(topic?: string): { hue: string | null; mark: string; ink: string; stroke: string; wash: string; washRaised: string } {
  const hue = topic !== undefined && HUE_RING.includes(topic) ? topic : (topic !== undefined ? EXAMPLE_HUE[topic] : undefined) || null
  if (!hue) return { hue: null, mark: 'var(--swatch-anchor-fallback)', ink: 'var(--swatch-ink-fallback)', stroke: 'var(--swatch-anchor-fallback)', wash: 'var(--swatch-fill-fallback)', washRaised: 'var(--swatch-fill-fallback)' }
  return { hue, mark: `var(--hue-${hue})`, ink: `var(--hue-${hue}-ink)`, stroke: `var(--hue-${hue}-stroke)`, wash: `var(--hue-${hue}-wash)`, washRaised: `var(--hue-${hue}-wash-raised)` }
}

/** THE NEXT FREE TOPIC HUE, as a call rather than as a sentence. Pass the hue
 *  names a corpus has already used (in any order); get back `{ n, hue }` —
 *  the walk position and its hue name.
 *
 *  WHAT A HOST STILL OWNS, legitimately: STORAGE. The slot must be written
 *  onto the topic when it is created, not recomputed from position —
 *  recompute it and colours shift the moment someone deletes a sibling or
 *  reorders the tree. This function chooses; the host remembers.
 *
 *  Past sixteen it wraps rather than failing, and a wrapped hue is a real
 *  answer: a corpus that deep should be grading inside a family's arc, and
 *  returning nothing would only push the caller into inventing a
 *  seventeenth colour.
 *
 *  Not called anywhere in this app yet — the teaching corpus is a fixed,
 *  authored dataset (src/corpus/graph.ts) with no runtime "create a topic"
 *  path, so there is no live call site for "assign the next free hue". Ported
 *  and exported per OB-060/OB-062's done-when regardless: the function is
 *  cheap, harmless, and ready the day that changes. */
export function nextTopicSlot(taken: string[] = []): { n: number; hue: string } {
  const used = new Set(taken)
  for (let n = 0; n < 16; n++) {
    const hue = topicHue(n)
    if (!used.has(hue)) return { n, hue }
  }
  return { n: taken.length % 16, hue: topicHue(taken.length) }
}

/** the same, for relation kinds — the walk read backward, so a corpus's
 *  first eight kinds never collide with its first eight topics. Not called
 *  anywhere in this app yet, for the same reason as `nextTopicSlot`. */
export function nextRelationSlot(taken: string[] = []): { n: number; hue: string } {
  const used = new Set(taken)
  for (let n = 0; n < 16; n++) {
    const hue = relationHue(n)
    if (!used.has(hue)) return { n, hue }
  }
  return { n: taken.length % 16, hue: relationHue(taken.length) }
}

/** A node's topic identity, rendered as a round dot — the smallest unit of
 *  identity in the whole system. Typed port of the DS DomainDot.jsx. */
export interface DomainDotProps {
  /** a RING hue name (`'teal'`, `'iris'`) or one of the shipped example
   *  palette's codes (`'net'`, `'sec'`). A ring name always wins. Prefer this
   *  over `domain`. */
  topic?: string
  /** @deprecated the same prop under its old, narrower name — the palette is
   *  no longer a fixed set of six CS domains. Pass `topic`. Still honoured;
   *  `topic` takes precedence. */
  domain?: DomainCode
  /** px; 9 in rows and chips, 12+ in headers */
  size?: number
  /** paper halo, for dots sitting on a coloured or busy ground */
  ring?: boolean
}

export function DomainDot({ topic, domain, size = 9, ring }: DomainDotProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-pill)',
        flexShrink: 0,
        display: 'inline-block',
        background: domainToken(topic !== undefined ? topic : domain),
        boxShadow: ring ? '0 0 0 2px var(--surface-raised)' : 'none',
      }}
    />
  )
}

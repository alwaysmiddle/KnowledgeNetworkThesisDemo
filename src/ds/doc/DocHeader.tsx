import { DOMAIN_TOKEN } from '../graph/vocab'
import type { DomainCode } from '../graph/vocab'

/** The head of a node's document: three different KINDS of string stacked, each
 *  treated as its own kind. `kind` is a category (closed set, the only uppercase
 *  in the app); `title` is a name (verbatim from the corpus, in the domain hue);
 *  `ancestry` is a location (root-first, "/"-joined, never abbreviated). All three
 *  name something real, so none sits at --text-3 — that ink is for the app's own
 *  hints. Typed port of the DS DocHeader.jsx; reuses DomainCode/DOMAIN_TOKEN from
 *  ../graph/vocab instead of the DS's own inline domain map. */
export interface DocHeaderProps {
  /** 'topic' | 'container' | 'leaf' — lower case; the component uppercases it */
  kind: string
  title: string
  domain: DomainCode
  /** containment path, slash-separated, root first */
  ancestry?: string
}

export function DocHeader({ kind, title, domain, ancestry }: DocHeaderProps) {
  return (
    <div style={{ padding: '14px var(--space-5) 12px', borderBottom: '1px solid var(--border-hair)' }}>
      <div
        style={{
          fontSize: 'var(--fs-micro)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--ls-eyebrow)',
          fontWeight: 'var(--fw-bold)',
          color: 'var(--text-2)',
        }}
      >
        {kind}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-head)',
          fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--ls-display)',
          lineHeight: 'var(--lh-tight)',
          marginTop: 3,
          color: DOMAIN_TOKEN[domain] || 'var(--text-1)',
        }}
      >
        {title}
      </div>
      {ancestry ? <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-2)', marginTop: 5 }}>{ancestry}</div> : null}
    </div>
  )
}

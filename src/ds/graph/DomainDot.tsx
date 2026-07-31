import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

/** The six-slot domain identity, rendered as a round dot — the smallest unit
 *  of identity in the system. Typed port of the DS DomainDot.jsx. */
export interface DomainDotProps {
  domain: DomainCode
  /** px; 9 in rows and chips, 12+ in headers */
  size?: number
  /** paper halo, for dots sitting on a coloured or busy ground */
  ring?: boolean
}

export function DomainDot({ domain, size = 9, ring }: DomainDotProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-pill)',
        flexShrink: 0,
        display: 'inline-block',
        background: DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)',
        boxShadow: ring ? '0 0 0 2px var(--surface-raised)' : 'none',
      }}
    />
  )
}

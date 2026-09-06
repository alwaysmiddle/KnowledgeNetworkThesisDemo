import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react'

import { IconButton } from './IconButton'

/** THE SYSTEM'S TEXT BOX, one recipe: a raised face (`--surface-raised`) on a hairline
 *  (`--border-hair`), the primary ring (`--accent-primary`) on focus, `--radius-md`, and the
 *  house `✕` (`IconButton`'s own glyph and hover) to clear — never a typed × of another size.
 *  It lived only inside `ConnectionsSplitPane`'s filter until 2026-09-02, when `StopFinder`
 *  needed the same box — a second hand copy is how a recipe drifts, so it is an element now.
 *  Text inside is always selectable, whatever `user-select` the pane around it sets.
 *  Typed port of the DS TextInput.jsx (contract: TextInput.d.ts), OB-137/138 / #267. */
export interface TextInputProps {
  /** the box's value — controlled */
  value: string
  /** every keystroke, and the ✕ (with `''`) */
  onChange: (value: string) => void
  /** the placeholder, and the aria-label unless `ariaLabel` is given */
  placeholder?: string
  /** a mark drawn inside the left end (e.g. `<FindMark size={12} />`); decorative, `--text-3` */
  leading?: ReactNode
  /** show the ✕ while there is a value. Default `true` */
  clearable?: boolean
  /** `sm` — 12px text, the filter's box; `md` — body size. Default `sm` */
  size?: 'sm' | 'md'
  /** focus the input on mount */
  autoFocus?: boolean
  /** the input element, for a caller that focuses it itself */
  inputRef?: RefObject<HTMLInputElement | null>
  /** the input's keydown, before the box does anything with it */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  /** defaults to `placeholder` */
  ariaLabel?: string
  /** on the wrapper (width, margin) — never on the input itself */
  style?: CSSProperties
}

export function TextInput({ value, onChange, placeholder, leading, clearable = true, size = 'sm', autoFocus = false, inputRef, onKeyDown, ariaLabel, style }: TextInputProps) {
  const [focused, setFocused] = useState(false)
  const own = useRef<HTMLInputElement | null>(null)
  const ref = inputRef || own
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
    // mount only, as the DS's effect is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const padY = size === 'sm' ? 5 : 6
  const padL = leading ? 28 : 8
  const padR = clearable && value ? 26 : 8
  return (
    <div style={{ position: 'relative', ...style }}>
      {leading ? <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-3)', pointerEvents: 'none' }}>{leading}</span> : null}
      <input ref={ref} type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} aria-label={ariaLabel || placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-ui)', fontSize: size === 'sm' ? 12 : 'var(--fs-body)', lineHeight: 'var(--lh-snug)',
          padding: padY + 'px ' + padR + 'px ' + padY + 'px ' + padL + 'px',
          border: '1px solid ' + (focused ? 'var(--accent-primary)' : 'var(--border-hair)'), borderRadius: 'var(--radius-md)',
          color: 'var(--text-1)', background: 'var(--surface-raised)', outline: 'none', boxShadow: 'none',
          userSelect: 'text', WebkitUserSelect: 'text', transition: 'border-color var(--dur-hover) var(--ease-soft)',
        }} />
      {clearable && value ? (
        <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <IconButton tone="chrome" size={18} glyphSize={11} title="clear" label="clear" onClick={() => { onChange(''); if (ref.current) ref.current.focus() }} />
        </span>
      ) : null}
    </div>
  )
}

/* P.Kt scrollbars — the three-state affordance. Self-installing, zero config.
   Drop one <script src="assets/scrollbars.js"> after the stylesheet.

     (no state)  the bar is hidden — the pane is at rest
     data-sb=on    pointer or focus is inside the pane — resting bar, no bezel
     data-sb=near  pointer is in the gutter (or dragging) — wider bar, bezel, arrows

   The script only sets attributes; every pixel lives in tokens/base.css —
   including the end arrows, which paint only in `near` and are stroked a shade
   darker than the bar so a thin line reads as its equal.

   It publishes FLASH / LEAVE / PAD on window.PKT_SB so any other control that
   recedes with the pane (PaneHeader's ✕) can share this clock.
   It marks <html data-sb-js> on load, so a page that never loads this file
   keeps the plain resting bar instead of an invisible one.
   Opt a subtree out with data-sb-off. */
(() => {
  if (document.documentElement.hasAttribute('data-sb-js')) return
  document.documentElement.setAttribute('data-sb-js', '')

  const PAD = 4      /* forgiveness band outside the gutter, px */
  const FLASH = 900  /* how long a wheel/keyboard scroll keeps the bar up, ms */
  const LEAVE = 500  /* grace period before the bar recedes after you leave, ms */
  let current = null, dragging = null

  /* published so frame-borne controls (a pane's ✕) recede on the same clock */
  window.PKT_SB = { FLASH, LEAVE, PAD }

  const num = v => parseFloat(v) || 0

  /* nearest ancestor that actually scrolls right now */
  function scroller(node) {
    for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
      if (n.hasAttribute('data-sb-off')) return null
      const s = getComputedStyle(n)
      const y = s.overflowY, x = s.overflowX
      if ((y === 'auto' || y === 'scroll') && n.scrollHeight > n.clientHeight) return n
      if ((x === 'auto' || x === 'scroll') && n.scrollWidth > n.clientWidth) return n
    }
    return null
  }

  const set = (el, v) => {
    if (!el) return
    clearTimeout(el.__sbHide)
    if (el.getAttribute('data-sb') !== v) el.setAttribute('data-sb', v)
  }
  /* the bar never vanishes under the cursor's heels — it waits LEAVE first */
  const clear = el => {
    if (!el) return
    clearTimeout(el.__sbHide)
    el.__sbHide = setTimeout(() => {
      if (el !== current && el !== dragging) el.removeAttribute('data-sb')
    }, LEAVE)
  }

  /* is the pointer over the scrollbar gutter of el? */
  function inGutter(el, x, y) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el)
    const bt = num(s.borderTopWidth), br = num(s.borderRightWidth)
    const bb = num(s.borderBottomWidth), bl = num(s.borderLeftWidth)
    const gw = el.offsetWidth - el.clientWidth - bl - br
    const gh = el.offsetHeight - el.clientHeight - bt - bb
    if (gw > 0 && x >= r.right - br - gw - PAD && x <= r.right - br) return true
    if (gh > 0 && y >= r.bottom - bb - gh - PAD && y <= r.bottom - bb) return true
    return false
  }

  addEventListener('pointermove', e => {
    if (dragging) return
    const el = scroller(e.target)
    if (el !== current) { const prev = current; current = el; clear(prev) }
    if (el) set(el, inGutter(el, e.clientX, e.clientY) ? 'near' : 'on')
  }, true)

  addEventListener('pointerdown', e => {
    const el = scroller(e.target)
    if (el && inGutter(el, e.clientX, e.clientY)) { dragging = el; set(el, 'near') }
  }, true)

  addEventListener('pointerup', e => {
    const d = dragging; dragging = null
    if (!d) return
    /* A click in the gutter must not flip near -> on -> near under a pointer
       that never moved: releasing used to drop the bar to its resting width for
       the one frame before the next pointermove put it back, which reads as a
       blink. While the pointer is still in the gutter the bar stays 'near'. */
    if (inGutter(d, e.clientX, e.clientY)) { current = d; set(d, 'near'); return }
    if (d === current) set(d, 'on'); else clear(d)
  })

  document.addEventListener('pointerleave', () => { const p = current; current = null; clear(p) })

  /* wheel / keyboard / programmatic scrolling flashes the bar, then it recedes */
  addEventListener('scroll', e => {
    const el = e.target
    if (!el || el.nodeType !== 1 || el === dragging) return
    if (el.hasAttribute('data-sb-off')) return
    if (el.getAttribute('data-sb') !== 'near') set(el, 'on')
    clearTimeout(el.__sbFlash)
    el.__sbFlash = setTimeout(() => clear(el), FLASH)  /* + LEAVE before it goes */
  }, true)

  addEventListener('focusin', e => { const el = scroller(e.target); if (el) set(el, 'on') }, true)
  addEventListener('focusout', e => { const el = scroller(e.target); if (el) clear(el) }, true)
})()

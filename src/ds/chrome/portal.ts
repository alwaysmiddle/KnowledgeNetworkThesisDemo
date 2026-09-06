import { createPortal } from 'react-dom'
import type { ReactNode, ReactPortal } from 'react'

/** RENDER INTO ANOTHER NODE. The DS runtime carries `ReactDOM` as a global and falls back to
 *  rendering in place when it has none; its docblock says a port replaces the body with a real
 *  `createPortal`, which this is — the fallback does not exist here because `react-dom` always
 *  does. Shared by `VersionedGroup` (its menu and refusal panel) and `NodePicker` (its option
 *  list) since 2026-09-02; each had its own `createPortal` call before. Typed port of the DS
 *  components/chrome/portal.js, OB-110 (#256). */
export function portalInto(node: Element | DocumentFragment, element: ReactNode): ReactPortal {
  return createPortal(element, node)
}

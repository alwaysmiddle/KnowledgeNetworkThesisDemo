// THE TOOLBAR ▶'S THREE STATES (#267, DS OB-135 rules 1–3) — in their own file
// because AppToolbar.tsx exports a component and fast refresh wants a component
// file to export nothing else.

/** where the presenter is: nothing on, the preview, a live lecture, or an ended one */
export type PresentState = 'idle' | 'preview' | 'live' | 'ended'

/** the ▶'s title for each state — the words the DS's header chip refers the professor
 *  to ("▶ on the app toolbar starts the lecture" / "resumes it") */
export const PRESENT_TITLE: Record<PresentState, string> = { idle: 'present', preview: 'present', live: 'presenting', ended: 'resume' }

/** the machine-readable hook a driver finds the ▶ by (`data-toolbar-hook`) */
export const PRESENT_HOOK = 'present'

// The app IS the Studio: after the consolidation, every navigation-UX
// prototype is a pickable instrument inside StudioView (the old tab-per-view
// Shell and the standalone Cockpit tab live on as git history and the
// 'explore' preset). App now owns nothing but the full-height mount — the
// corpus header (title, stats, domain/edge legend) it used to carry has been
// removed; Studio owns everything about the graph and how it's explored.
import ProjectorScreen from './present/ProjectorScreen'
import { isProjectorLocation } from './present/projector'
import StudioView from './studio/StudioView'

export default function App() {
  // THE PROJECTOR WINDOW (#267, DS OB-135 clause 2): a second window of this same
  // app, opened by the toolbar ▶ at `?projector`, is the room's screen — the live
  // slide full-bleed and nothing else. One bundle, one origin, two windows; the
  // query flag is the whole of the routing this app has.
  if (isProjectorLocation(window.location.search)) return <ProjectorScreen />
  return (
    <div className="flex flex-col h-screen bg-canopy">
      <main className="flex-1 min-h-0">
        <StudioView />
      </main>
    </div>
  )
}

repo: alwaysmiddle/KnowledgeNetworkThesisDemo
branch: main
path: src/instruments/walkdesk

## Last sync
date: 2026-07-28T17:30:00Z

### Updated in this project
- Built a design system from the repo: tokens, 19 foundation cards, 12 components, and a Railroad UI kit.
- Extracted the as-built values (Tailwind v4 defaults + authored `DOMAIN_COLOR`/`EDGE_COLOR` hex + the road's layout constants) into `tokens/`.
- Proposed a containment grammar to replace the green-hue container signal: elevation and depth-stepped well tints.
- `ui_kits/railroad/index.html` runs on the real `PLAN` from `mockwalk.ts` and the `transistor-to-program` walk.

## Screen map
| Project screen | Repo files |
| --- | --- |
| ui_kits/railroad/index.html | src/instruments/walkdesk/{RailroadView,AuthorRoad,shared}.tsx, {authordnd,mockwalk}.ts, src/corpus/{walks,graph}.ts |
| tokens/colors.css | src/corpus/graph.ts (DOMAIN_COLOR, EDGE_COLOR), src/model/color.ts, walkdesk Tailwind classes |
| tokens/spacing.css | src/instruments/walkdesk/AuthorRoad.tsx (layout constants), RailroadView.tsx (RAIL_W) |
| tokens/motion.css | src/index.css |
| components/road, components/rail, components/chrome | src/instruments/walkdesk/AuthorRoad.tsx, shared.tsx, RailroadView.tsx |
| Node Grouping Canvas.dc.html | (none — the original grouping study that preceded this system) |

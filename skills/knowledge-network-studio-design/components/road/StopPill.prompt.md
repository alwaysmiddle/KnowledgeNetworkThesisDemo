The leaf stop on the road — one corpus node, raised above whatever surface holds it.

```jsx
<StopPill title="TCP vs UDP" domainColor="var(--domain-net)" order={4} />
<StopPill title="Symmetric encryption" optional offRoad />
<StopPill title="IP routing" selected order={3} />
```

States: `selected` (blue ring + wash), `linked` (sky ring, from cross-pane hover), `offRoad` (50% dim), `optional` (dashed border), `dragging` (deeper lift). Never stack `selected` and `linked` rings — selection wins.

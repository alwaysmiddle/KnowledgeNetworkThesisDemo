A group folded into a single node. Use wherever a container is collapsed — the stacked silhouettes are the only thing separating it from a leaf, so never drop them.

```jsx
<CollapsedStop title="Secure the channel" depth={2} count={4} fork onToggle={expand} />
```

Radius is `--radius-md`, NOT `--radius-pill`: a stop is a pill, a folded group is a rounded rect. That corner is the second cue after the stack.

An open group — recessed well, one tint step per depth. Use for every expanded container, plain group or fork.

```jsx
<ContainerWell title="Serve it on the network" depth={1} count={6} onToggle={collapse}>
  <StopPill title="DNS naming" order={2} />
  <ContainerWell title="Secure the channel" depth={2} count={4}>…</ContainerWell>
</ContainerWell>
```

Pass `header={<ForkSwitch …/>}` to make it a fork. Use `<EmptyBody/>` as children when the chosen variant is empty. The header row is the drag handle; the ▾ button collapses.

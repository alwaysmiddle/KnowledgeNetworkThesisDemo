Pass as `header` to a ContainerWell whose stop has 2+ variants.

```jsx
<ContainerWell title="The crypto detour" depth={2} fork header={
  <ForkSwitch question="How much cryptography does this class need?" chosen={0}
    variants={[{label:'Deep dive',count:7},{label:'Skim',count:2}]} onPick={pick} />
}>…</ContainerWell>
```

Two rules it exists to enforce: the step count is always on the tab, and only a click changes the branch (never focus).

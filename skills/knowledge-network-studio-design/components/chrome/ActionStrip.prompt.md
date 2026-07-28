The one place selection actions live. Always mounted — it states "nothing selected" rather than appearing and disappearing.

```jsx
<ActionStrip count={2} prompt={<>
  <ActionChoice>Keep the 4 steps on the road, remove the group</ActionChoice>
  <ActionChoice danger>Delete the group and all 4 steps inside it</ActionChoice>
</>}>
  <ToggleButton>Group</ToggleButton>
  <ToggleButton>◇ Optional</ToggleButton>
</ActionStrip>
```

Never render a floating toolbar or a popover for these — the dock exists so nothing has to be positioned.

---
name: User prefers plain conversational language over jargon-heavy technical prose
description: When explaining ideas back to the user, prefer simple language and match the user's own conversational style. Less formal architectural prose, fewer dense tables, more thinking-out-loud.
type: feedback
originSessionId: 9c9304f7-0568-4e2d-991b-f905866f4cb2
---
User asked me to communicate in simpler language and to use their own explanation style as reference.

**User's natural style** (observed in this conversation):
- Conversational and informal ("yeah", "I guess", "honestly")
- Short sentences mixed with longer ones
- Reaches for everyday analogies before formal vocabulary (kernel/registers, programming language design, folders/tags)
- Thinks out loud — "I'm not sure but..." / "I forgot, can you remind me"
- Doesn't lean on heavy markdown formatting for casual discussion
- Doesn't bury key points in tables when prose would do

**Why:** User is a CS masters student and software developer working on thesis design discussions, not formal architecture review. Conversation > document.

**How to apply:**
- For exploratory discussion (most of the time), prefer plain prose with short sentences over big multi-column comparison tables.
- Drop unnecessary jargon. If a simple word will do, use the simple word.
- Save dense formatting (tables, allowlists, spec-style bullets) for genuine spec or reference content where structure aids navigation — not for casual back-and-forth.
- When summarizing trade-offs, talk through them in sentences. Tables only when you genuinely need a parallel comparison.
- Match the user's thinking-out-loud cadence when answering "why" questions — explain the reasoning step by step rather than presenting it as a polished summary.
- Caveman mode levels override this when active — they have their own terseness rules. This preference applies in normal explanatory mode and also informs the "lite" caveman tone.

# Field Jarvis — Ray-Ban Display Web App

Lens-side confirm surface for the draft-and-confirm loop. 600×600 HTML/JS app
for the Meta Ray-Ban Display right-lens screen, driven by the Neural Band
(pinch = Enter, wrist = arrows).

## Run (no hardware required)

Served by the field-loop sidecar:

```bash
cd re-acquisition/field-loop && npm start
# open http://127.0.0.1:4680/glasses/
```

Desktop keyboard simulates the Neural Band exactly as Meta's preview delivers
it to Web Apps:

| Key | Neural Band | Action |
|---|---|---|
| `↑ ↓` | wrist rotate | move selection / scroll fields |
| `← →` | swipe | choose Confirm / Skip / Discard |
| `Enter` | **pinch** | fire selected action |
| `Esc` | double-pinch | back |

## UX contract

- One decision per screen. HOME (pending count) → LIST → CARD → RESULT.
- The lens never edits fields — editing is phone work (PWA review queue).
  High-risk fields render amber as a "look closer" cue.
- Voice capture stays on the phone mic for now; the lens is the confirm
  button, not the microphone.

## Phase 4 boundary (platform-churn isolation)

`input.js` is the only file that knows input comes from keyboard events. If
Meta's Web App preview changes its input encoding, or capture moves to the
native Wearables Device Access Toolkit (Kotlin wrapper, lens mic/camera),
swap that one adapter — `app.js` only sees semantic
`up/down/left/right/select/back` events.

Distribution today: password-protected URL via Meta's team release channel
(up to 100 testers) — fine for an internal tool. Public listing stays gated
behind Meta review; accept preview-API churn as a known risk.

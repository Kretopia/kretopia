

## Upgrade Invite Copy Across All Components

The current invite messages are generic ("Join my creative circle on ThriveIN!"). We need punchy, conversion-focused copy that speaks to the creator pain point and creates urgency.

### Changes

**3 files** need updated clipboard copy:

1. **`src/components/InviteDialog.tsx`** (line 57-60) — Main share dialog
2. **`src/components/dashboard/InviteCard.tsx`** (line 64-66) — Dashboard card
3. **`src/components/profile/InviteCodesCard.tsx`** (line 62-67) — Profile codes

### New Copy (all 3 locations)

```
Stop cold DMing strangers for collabs.

ThriveIN matches you with verified creatives who actually fit your style — AI-powered, portfolio-first.

I'm already on. Join me 👇
{link}
```

**Why this works:**
- **Line 1**: Hooks with a relatable pain point (cold DMs)
- **Line 2**: Differentiates with "verified" + "AI-powered" + "portfolio-first"
- **Line 3**: Social proof ("I'm already on") + personal invite feel
- No fake stats, no fluff — just the value prop

Also update the `INVITE_MATERIALS.md` short DM template to match the new tone.


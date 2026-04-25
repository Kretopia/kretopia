# Improve Creator Site Settings Card

Make the slim Creator Site card in `/settings` properly load and edit the username, with the site URL updating immediately after saving.

## Current behavior
`src/components/settings/CreatorSiteSettings.tsx` reads `username` on mount and uses it to display the site URL, but there is no way to edit it from this card. If the username is missing, users are kicked over to `/website-builder?step=username`. There is no inline edit, no validation, no live URL refresh.

## Changes

**File: `src/components/settings/CreatorSiteSettings.tsx`**

1. **Inline username editor**
   - Add an `Input` for the username with a "Save" button next to it.
   - Pre-fill from the loaded `profiles.username`.
   - Show the resulting URL preview (`thrivein.io/<username>`) live as the user types.

2. **Validation before save**
   - Lowercase, trim, allow only `a-z 0-9 _ -`, length 3–30.
   - Reject reserved words (`admin`, `settings`, `website-builder`, `api`, `auth`, etc.).
   - Check uniqueness via `profiles.select('user_id').eq('username', value).neq('user_id', user.id).maybeSingle()` before updating.

3. **Save flow**
   - `update profiles set username = ... where user_id = ...`.
   - On success: update local `username` state so the URL block re-renders with the new handle, toast "Username saved", clear the editing state.
   - On uniqueness conflict or validation failure: inline error message under the input, no toast spam.

4. **URL block refresh**
   - Derived `siteUrl` already depends on `username`, so updating state after save will refresh the copy/open buttons automatically.
   - Keep the fallback `/site/<user.id>` only when no username is claimed.

5. **Drop the "Claim a username" button**
   - No longer needed — claiming happens inline. Keep the "Open Website Builder" CTA as the secondary action.

6. **Loading + saving states**
   - Disable the input + Save button while `loading` or `saving`.
   - Show `Loader2` spinner inside the Save button during the save.

## Out of scope
- No changes to the website builder route.
- No schema changes — `profiles.username` already exists and is used elsewhere.
- No changes to `site_enabled` toggle behavior.

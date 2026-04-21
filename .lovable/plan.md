

## Fix the magic link "non-2xx" error on Save

### Root cause
`supabase/functions/claim-and-create-profile/index.ts` line 49 has a broken email regex:
```ts
if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
```
The double backslashes (`\\s`, `\\.`) make the regex require literal backslash characters, so **every real email fails**
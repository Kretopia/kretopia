# ThriveIN SSO — Integration Guide for Anansi

## Overview
"Sign in with ThriveIN" lets Anansi users authenticate using their ThriveIN creative profile. This uses a standard OAuth 2.0 Authorization Code flow.

---

## Your Anansi Credentials

| Field | Value |
|-------|-------|
| **Client ID** | `4f76281af0b789acc26f07555383af44` |
| **Client Secret** | `08d793bd4c9382f11c1832b8042eb40cc84a0f06ffe46fb0a9f2ef63beda8955` |
| **Registered Redirect URIs** | `http://localhost:3000/auth/callback`, `https://anansi.app/auth/callback` |

> ⚠️ **Keep the client secret on your server only.** Never expose it in frontend code.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /functions/v1/sso-authorize` | GET/POST | Get authorization code |
| `POST /functions/v1/sso-token` | POST | Exchange code for access token |
| `GET /functions/v1/sso-userinfo` | GET | Fetch user profile with token |

**Base URL:** `https://kwmcocsitwssrtzkdojh.supabase.co`

---

## Flow

### Step 1: Redirect user to ThriveIN

From Anansi, redirect the user to ThriveIN's login page. After they log in, call the authorize endpoint with their ThriveIN session token:

```
GET /functions/v1/sso-authorize
  ?client_id=4f76281af0b789acc26f07555383af44
  &redirect_uri=https://anansi.app/auth/callback
  &response_type=code
  &scope=profile
  &state=random_csrf_token
```

**Headers:** `Authorization: Bearer <user's ThriveIN JWT>`

**Response:**
```json
{
  "redirect_url": "https://anansi.app/auth/callback?code=AUTH_CODE&state=random_csrf_token",
  "code": "AUTH_CODE"
}
```

### Step 2: Exchange code for access token (server-side)

```bash
POST /functions/v1/sso-token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "4f76281af0b789acc26f07555383af44",
  "client_secret": "08d793bd4c9382f11c1832b8042eb40cc84a0f06ffe46fb0a9f2ef63beda8955",
  "redirect_uri": "https://anansi.app/auth/callback"
}
```

**Response:**
```json
{
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "scope": "profile",
  "user": {
    "id": "uuid",
    "name": "Ethan Auguste",
    "avatar_url": "https://...",
    "role": "Producer",
    "bio": "...",
    "skills": ["Music Production", "Events"],
    "location": "Bali, Indonesia"
  }
}
```

### Step 3: Fetch user profile anytime

```bash
GET /functions/v1/sso-userinfo
Authorization: Bearer <access_token>
```

---

## React/Next.js Integration Snippet

### `lib/thrivein-sso.ts`

```typescript
const THRIVEIN_API = "https://kwmcocsitwssrtzkdojh.supabase.co/functions/v1";
const CLIENT_ID = "4f76281af0b789acc26f07555383af44";

// Step 1: Open ThriveIN login popup
export function signInWithThriveIN(redirectUri: string) {
  const state = crypto.randomUUID();
  sessionStorage.setItem("thrivein_state", state);
  
  // Redirect to ThriveIN app for authentication
  const thriveINLoginUrl = new URL("https://thrivein-new-beta.lovable.app/auth");
  thriveINLoginUrl.searchParams.set("sso_client_id", CLIENT_ID);
  thriveINLoginUrl.searchParams.set("sso_redirect_uri", redirectUri);
  thriveINLoginUrl.searchParams.set("sso_state", state);
  
  window.location.href = thriveINLoginUrl.toString();
}

// Step 2: Exchange code for token (call from your API route, NOT frontend)
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientSecret: string
) {
  const res = await fetch(`${THRIVEIN_API}/sso-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Step 3: Fetch user profile
export async function getThriveINUser(accessToken: string) {
  const res = await fetch(`${THRIVEIN_API}/sso-userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

### `app/auth/callback/page.tsx` (Next.js)

```tsx
"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedState = sessionStorage.getItem("thrivein_state");
    
    if (state !== savedState) {
      console.error("State mismatch - possible CSRF attack");
      return;
    }
    
    if (code) {
      // Send code to YOUR backend API route to exchange for token
      fetch("/api/auth/thrivein", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          // Store the user session in your app
          localStorage.setItem("thrivein_token", data.access_token);
          localStorage.setItem("user", JSON.stringify(data.user));
          router.push("/dashboard");
        })
        .catch(console.error);
    }
  }, [searchParams, router]);
  
  return <div>Signing you in with ThriveIN...</div>;
}
```

### Button Component

```tsx
import { signInWithThriveIN } from "@/lib/thrivein-sso";

export function SignInWithThriveINButton() {
  return (
    <button
      onClick={() => signInWithThriveIN("https://anansi.app/auth/callback")}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90"
    >
      <img src="https://thrivein-new-beta.lovable.app/favicon.png" alt="" className="w-5 h-5" />
      Sign in with ThriveIN
    </button>
  );
}
```

---

## Scopes

| Scope | Data Returned |
|-------|---------------|
| `profile` (default) | id, name, avatar, role, bio, skills, location, verification_score |
| `portfolio` | + portfolio items, social links |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `invalid_client` | Wrong client_id or client_secret |
| `invalid_grant` | Code expired, used, or redirect_uri mismatch |
| `invalid_token` | Access token expired or revoked |
| `login_required` | User is not authenticated on ThriveIN |

---

## Security Notes

- Auth codes expire after **10 minutes** and are single-use
- Access tokens expire after **30 days**
- Always validate the `state` parameter to prevent CSRF
- Keep `client_secret` server-side only (use Next.js API routes)
- To add more redirect URIs, contact ThriveIN admin

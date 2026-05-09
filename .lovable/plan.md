# Guest Wallet Top-Ups (Phase 1)

Lets a guest (no ThriveIN account) open a link, identify themselves with email, top up a balance via Stripe Checkout (Apple Pay / Google Pay / card), and have that balance persisted to a guest wallet record they can return to from the same device.

## User Flow

1. Guest visits `/guest-pay` (or scans a venue QR like `/guest-pay?venue=abc`).
2. Enters email → server issues a `guest_session_token` (UUID, 90-day expiry) stored in an httpOnly-style cookie + localStorage fallback.
3. Wallet screen shows current balance + "Add Funds" CTA with preset amounts ($10/$25/$50/$100, custom).
4. Tap "Add Funds" → calls `guest-wallet-topup` edge fn → returns Stripe Checkout URL → redirect.
5. Stripe Checkout shows Apple Pay / Google Pay sheet automatically on supported devices, plus card.
6. On payment success, Stripe webhook (`guest-wallet-webhook`) credits the wallet balance and marks the topup `succeeded`.
7. Guest is redirected back to `/guest-pay?topup=success` and sees the new balance (polled or refreshed on mount).

Out of scope for Phase 1: actually paying merchants, refunds, multi-currency conversion, Twilio OTP (email-only for v1).

## Database (single migration)

```text
guest_wallets
  id uuid pk, email text unique not null,
  balance_cents int not null default 0,
  currency text not null default 'USD',
  created_at, updated_at

guest_wallet_sessions
  token uuid pk, wallet_id uuid fk, expires_at timestamptz,
  created_at, last_used_at

guest_wallet_topups
  id uuid pk, wallet_id uuid fk,
  amount_cents int, currency text,
  stripe_session_id text unique,
  status text check in ('pending','succeeded','failed','cancelled'),
  created_at, updated_at

guest_wallet_transactions  (audit log; only credits in Phase 1)
  id uuid pk, wallet_id uuid fk,
  delta_cents int, kind text ('topup'|'spend'|'refund'|'adjustment'),
  ref_id uuid, note text, created_at
```

RLS: tables are not exposed to the anon key for direct writes — all access goes through edge functions with the service-role key. Add a permissive `SELECT` policy gated on `false` plus the service role bypass.

## Edge Functions

- `guest-wallet-session` (POST `{email}`) — upsert wallet, mint session token, return `{token, walletId, balance, currency}`. Throttle by IP.
- `guest-wallet-me` (GET, header `x-guest-token`) — validate token, return wallet snapshot + recent topups.
- `guest-wallet-topup` (POST, header `x-guest-token`, body `{amount, currency}`) — validate ($1–$1000), create `guest_wallet_topups` row, create Stripe Checkout session in `payment` mode with `payment_method_types: ['card']` (Apple/Google Pay are auto-enabled on the wallet card method). Set `metadata.topup_id`. Return `{url}`.
- `guest-wallet-webhook` (POST, public, no JWT) — verifies `stripe-signature`, on `checkout.session.completed` looks up topup by `metadata.topup_id`, increments `guest_wallets.balance_cents`, sets topup `succeeded`, writes a `guest_wallet_transactions` row. Idempotent (no-op if topup already `succeeded`).

All functions use `verify_jwt = false` and validate input with Zod. Webhook needs raw body for signature verification.

## Frontend

- `src/pages/GuestPay.tsx` — single page with three states:
  1. **Email entry** — minimal card, email input, "Continue".
  2. **Wallet view** — large balance, presets, "Add Funds" button, recent top-ups list, "Sign out of guest wallet" link.
  3. **Success toast** when `?topup=success` is in URL → calls `guest-wallet-me` to refresh.
- `src/lib/guestWallet.ts` — small client: `getToken()`, `setToken()`, `clearToken()` (localStorage), `api(path, init)` wrapper that adds `x-guest-token` header.
- Route added in `src/App.tsx` at `/guest-pay` (public, no auth gate).

Uses semantic color tokens only. Reuses existing `Button`, `Input`, `Card`, `useToast`. Solid background (no backdrop-blur).

## Stripe Configuration Notes (technical)

- Apple Pay requires the Stripe-hosted Checkout to serve a domain-verification file. Stripe Checkout (vs Payment Element) handles this automatically — no `.well-known` hosting needed on our side.
- Google Pay shows automatically in Checkout when card is enabled.
- Webhook signing secret must be added as `STRIPE_WEBHOOK_SECRET` (we'll prompt the user once the function is deployed and they have the URL to register in Stripe Dashboard).

## Implementation Order

1. Migration: 4 tables + RLS lockdown.
2. Edge fns: `guest-wallet-session`, `guest-wallet-me`, `guest-wallet-topup`, `guest-wallet-webhook`.
3. `src/lib/guestWallet.ts` client helper.
4. `src/pages/GuestPay.tsx` + route registration.
5. Prompt user to add `STRIPE_WEBHOOK_SECRET` and register the webhook URL in Stripe Dashboard for event `checkout.session.completed`.

## Open Question

Should we require email verification (magic link) before allowing top-ups, or trust the entered email for v1? Recommended: **trust for v1** (lower friction; the wallet is bound to the device via session token, not the email's inbox). We can add OTP verification later if abuse appears.

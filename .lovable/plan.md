# ThriveIN Wallet — Path 2

Goal: creators never touch Stripe. They see "Add your bank → get paid." ThriveIN is the platform; Stripe handles compliance and rails under the hood via **Connect with `controller.requirement_collection: 'stripe'` + `losses.payments: 'application'`** (Stripe-collected KYC, ThriveIN-controlled UX, ThriveIN holds funds in platform balance, payouts to creator bank via Stripe Payouts).

---

## Phase 0 — Foundations (this PR)

**DB**
- `creator_wallets` (user_id PK, stripe_account_id, kyc_status: `none|pending|verified|restricted`, payout_method: `none|bank|card`, default_currency, country, created_at, updated_at)
- `creator_wallet_balances` (user_id, currency, available_cents, pending_cents, updated_at) — mirror of Stripe balance, refreshed on webhook
- `creator_payout_methods` (id, user_id, type, last4, bank_name, brand, is_default, stripe_external_account_id)
- `creator_payouts` (id, user_id, amount_cents, currency, status, stripe_payout_id, arrival_date, failure_reason, created_at)
- Trigger: auto-create `creator_wallets` row on profile insert.
- Migrate existing `profiles.stripe_account_id` → seed `creator_wallets`.

**Edge functions (all `verify_jwt = false`, validate in code)**
- `wallet-onboard-start` — creates Connect account with controller config + returns hosted KYC link (only used when bank requires it; for most flows we collect bank details directly).
- `wallet-add-bank` — accepts bank details (account_number, routing/IBAN, holder name, country), creates `external_account` on the Connect account. No Stripe redirect.
- `wallet-add-card-payout` — for debit-card instant payouts (US/select markets).
- `wallet-balance` — returns mirrored balances.
- `wallet-payout` — requests payout to default method.
- `wallet-list-payouts` — history.
- `stripe-wallet-webhook` — handles `account.updated`, `payout.*`, `balance.available`, `capability.updated`. Updates `kyc_status`, balances, payout statuses.

**UI**
- `/thrivepay` → new "Wallet" hero replacing the Stripe Connect CTA:
  - Balance card (available / pending, multi-currency)
  - "Add your bank" sheet (`WalletAddBankSheet.tsx`) — country picker → bank fields → done. No Stripe redirect.
  - "Cash out" button → `WalletPayoutSheet.tsx` (amount, method, confirm).
  - Payout history list.
- Replace `PayoutsConnectWarning` link/copy → "Add your bank" inline sheet, not external `/thrivepay` redirect.
- Hide all "Stripe" wording from creators. Internal admin can still see `stripe_account_id`.

---

## Phase 1 — Buyer-side parity (parallel quick win)

- Enable Apple Pay / Google Pay / Link on all existing Stripe Checkout sessions (`payment_method_types` left default + `automatic_payment_methods.enabled: true`).
- Audit: `create-payment`, `wallet-topup`, ticket purchase, invoice pay, ThriveFund pledge edge functions.

---

## Phase 2 — Migration & deprecation

- Backfill: any creator with active `stripe_account_id` from old Express flow → mark `kyc_status='verified'` in `creator_wallets`, copy external account to new model where possible. Show one-time banner: "Your payouts are now managed inside ThriveIN."
- Update all consumers (events, gigs, ThrivePay invoices, ThriveFund) to read from `creator_wallets` instead of `profiles.stripe_account_id`.
- Sunset old `PayoutsConnectWarning` copy that linked out.

---

## Phase 3 — Polish

- Multi-currency display (USD/TTD/EUR), conversion preview using existing `convert-currency` fn.
- Payout schedules: instant (debit card, +1.5% fee), standard (2 business days, free).
- Tax forms (1099 / equivalents) surfaced inside ThriveIN — Stripe collects via dashboard-less API.
- Wallet activity feed.

---

## Technical details

**Stripe Connect controller config** (used by `wallet-onboard-start`):
```ts
stripe.accounts.create({
  controller: {
    losses: { payments: 'application' },
    fees: { payer: 'application' },
    stripe_dashboard: { type: 'none' },
    requirement_collection: 'stripe', // Stripe collects KYC, we drive UX via Account Sessions if needed
  },
  country, email, capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
})
```

**External account creation** (no redirect):
```ts
stripe.accounts.createExternalAccount(acctId, {
  external_account: { object: 'bank_account', country, currency, account_holder_name, account_number, routing_number }
})
```

**Payout**:
```ts
stripe.payouts.create({ amount, currency }, { stripeAccount: acctId })
```

Funds flow: buyers pay → funds land on **platform** account → app credits `creator_wallets.balance` (tracked via metadata + webhooks) → on payout request, app uses `stripe.transfers.create` to move funds to connected account, then `stripe.payouts.create` from connected account to bank.

**Webhook idempotency**: dedupe by `event.id` in `stripe_webhook_events` table.

---

## Scope of this first PR

Phase 0 only: schema + 4 edge functions (`wallet-add-bank`, `wallet-balance`, `wallet-payout`, `stripe-wallet-webhook`) + Wallet UI on `/thrivepay`. Phases 1-3 follow once Phase 0 ships and we test with real creators.

Approve to proceed?

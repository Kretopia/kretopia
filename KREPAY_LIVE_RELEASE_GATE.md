# KrePay — Live Release Gate

Project: Kretopia · ref `kwmcocsitwssrtzkdojh` · 2026-08-23
**Gate status: CLOSED. Stripe LIVE mode was not enabled, prepared-only.**

| Gate condition | Status |
|---|---|
| Wallet security migration applied | PASS |
| Negative wallet tests pass | PASS (privilege matrix, see security report) |
| Privilege state stable (no drift) | PASS |
| Notification migration applied | PASS |
| acceptance → Studio → notification flow passes | PASS (12-case matrix) |
| Test Stripe payment passes | BLOCKED — no confirmed test key |
| Test webhook signature passes | BLOCKED — no signing secrets configured |
| Duplicate webhook passes | BLOCKED (wallet handler has event-ID dedupe; untested) |
| Failed payment passes | BLOCKED |
| Refund test passes | BLOCKED |
| Live secrets server-side only | PASS (nothing Stripe-related in `src/` or `.env`) |
| Live webhook exists | NOT CONFIGURED |
| Live webhook secret matches live endpoint | NOT CONFIGURED |
| Test keys/prices absent from live config | N/A until modes are separated |
| Production URLs verified | PASS (`https://kretopia.com`, `https://www.kretopia.com`) |
| Payout / Connect configuration complete | PARTIAL — Connect wallet stack exists, unverified end-to-end |
| Human approval recorded | NOT RECORDED |

## Required before any live payment
1. Configure test mode fully (see `KREPAY_STRIPE_CONFIGURATION_REPORT.md`) and pass the sandbox matrix.
2. Add event-ID dedupe to `stripe-marketplace-webhook` and `guest-wallet-webhook`.
3. Add automated webhook signature tests.
4. Register live endpoints and store their live signing secrets.
5. Obtain an explicit, separate human approval for a live charge.

A live charge must never be executed from an automated prompt.

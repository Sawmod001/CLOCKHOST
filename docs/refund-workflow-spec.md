# Spec: Admin-Reviewed Refund Workflow (AUDIT-REFUND-003 remediation)

Status: Implemented (2026-08-28)
Method: Spec-Driven Development + TDD + Agile/Scrum

## Problem
`refund_booking()` marked refunds `completed` and wrote `escrow_releases` **without ever
calling Paystack** (no money moved). `cancel_booking()` auto-refunded on every cancel. This
produced phantom refunds and violated the product rule that refunds require human review.

## User rules (from product owner)
1. **No Supabase user-auth verification for now** (defer AUDIT-SEC-001's auth piece).
2. The HMAC `verified-by-paystack` webhook check stays (it proves Paystack authenticity, unrelated to user auth).
3. **Before any refund there is a process: an admin must verify what happened and what caused it.**
4. **No refund if the booking time has expired** (event_end in the past).

## User stories
- As a guest, when I cancel I want a refund *request* opened (not instantly paid) so an admin reviews it.
- As an admin, I want to see pending refund requests with the booking + cause so I can verify before paying.
- As an admin, I want to approve (with notes) → Paystack is called → money reverses → records complete.
- As an admin, I want to reject (with notes) → guest is notified, no money moves.
- As the system, I must reject any refund request where the booking period has already expired.

## Acceptance criteria
- `request_refund` returns `{ok:false, reason:'booking_expired'}` when `event_end < now()`.
- `request_refund` otherwise inserts `refund_records(status:'requested')` and does NOT call Paystack.
- `cancel_booking` no longer auto-pays; it calls `request_refund`.
- Guest refund route creates a *request* only.
- Admin approve route calls `initiateRefund` (Paystack) first; only on success does it
  finalize (`refund_records.status='completed'`, `payment_records.escrow_status='refunded'`,
  `escrow_releases` inserted, guest notified). On Paystack failure → `status='failed'`, admin notified.
- Admin reject sets `status='rejected'` + `review_notes`, notifies guest.
- Refund amount is server-computed (policy) and never exceeds the total paid.

## Refund policy (mirrors SQL constants; TS is canonical for tests)
- flexible: >24h before start → 100%; else 50%
- moderate: >48h → 100%; 24–48h → 50%; else 0
- strict:  >72h → 50%; else 0
- expired (event_end < now) → 0, not payable.

## Out of scope (this change)
- Supabase user-auth verification (deferred per PO).
- Auto-approval / instant refunds.
- Dispute auto-resolution (separate; should route through this same request path later).

## Tests
- `tests/refunds.test.ts`: pure policy + expiry + amount-cap + reducer transitions (`tsx --test "tests/*.test.ts"`).
- Integration (Paystack/DB) requires a live env; covered by route code review, not unit-run here.

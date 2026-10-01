# Spec: Listing Approval Lifecycle (AUDIT-DB-002 remediation)

Status: Implemented (2026-08-28)
Method: Spec-Driven Development + TDD + Agile/Scrum

## Problem
Migrations conflicted: `migration-phase1.sql` set the status enum to
`('draft','submitted','under_review','approved','rejected','suspended','archived')`
(and renamed `pending_review→submitted`), but a later migration reverted the constraint to the
OLD enum `('draft','pending_review','active','suspended','archived')`. The app wrote the NEW
values (`submitted`, `active`, `rejected`), so every write violated the CHECK and admin approval
was impossible. New listings could never become publicly visible.

## Decision (canonical model)
- **Live/public status = `active`.** Chosen over phase1's unused `'approved'` because the RLS
  policy `listings_read_active` (`migration.sql:260`) and the public `GET /api/listings` already
  key on `status='active'`.
- Public visibility = `status = 'active' AND is_active = true` (is_active is a host-controlled
  soft toggle, independent of approval).

## States & transitions (src/lib/listings/lifecycle.ts — single source of truth)
`draft → submitted → under_review → active` with `rejected` (from submitted/under_review),
`suspended`/`archived` (from active), and `rejected → submitted` (resubmit).

## Acceptance criteria
- `listings.status` CHECK allows only the 7 canonical values.
- Host creates `draft`; `submit-review` → `submitted`.
- Admin approve (`/api/admin/listings/[id]/approve` or `/api/admin/listings/review`) → `active`
  and records `approved_by`/`approved_at`.
- Admin reject → `rejected` + `rejection_reason`.
- Public listing search returns only `active` + `is_active` rows.

## Tests
- `tests/listings-lifecycle.test.ts`: transitions + public-visibility + decision mapping (10/10 pass).
- Integration (DB/RLS) requires a live env; covered by route review, not unit-run here.

## Residual
- Add a migration-order test so no future batch silently redefines `listings_status_check`.

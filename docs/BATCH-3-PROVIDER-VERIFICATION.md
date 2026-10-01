# Batch 3: Provider Verification — Complete

## What Was Built

Provider verification system: providers submit documents, admins review, verification status cascades to provider profiles.

---

## Verification Lifecycle

```
Provider submits → status: "pending"
  ↓
Admin reviews → "approved" | "rejected" (+ reason)
  ↓
If ALL required types (identity, business) approved → provider_profiles.verification_status = "approved"
If ALL approved revoked → provider_profiles.verification_status = "rejected"
```

### Verification Types
| Type | Purpose |
|---|---|
| `identity` | Government-issued ID (National ID, Driver's License, Passport) |
| `business` | Business registration certificate or CAC document |
| `property_authority` | Authorization to list this property (ownership or agency agreement) |

### Required Types for Full Verification
- `identity` + `business` = provider verified
- `property_authority` = optional (can list without it, but builds trust)

---

## Schema Changes

### `provider_verifications` table (fixed)
Added columns:
- `review_note TEXT` — rejection reason from admin
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — auto-updated via trigger

Added RLS policies:
- `provider_verifications_insert_own` — providers can INSERT their own (status must be 'pending')
- `provider_verifications_update_own` — providers can UPDATE own pending (replace documents)
- `provider_verifications_admin_read` — admins can SELECT all
- `provider_verifications_admin_update` — admins can UPDATE all

Added trigger:
- `provider_verifications_updated_at` — auto-updates `updated_at` on any row change

### Duplicate Submission Prevention
- Provider cannot submit a new verification of the same type if one is already pending
- Must wait for admin to approve/reject before resubmitting

---

## Files Changed

### New Files
| File | Purpose |
|---|---|
| `src/app/api/provider/verifications/route.ts` | Provider: submit (POST) + list own (GET) |
| `src/app/api/admin/verifications/route.ts` | Admin: list all with filters (GET) |
| `src/app/api/admin/verifications/[id]/approve/route.ts` | Admin: approve verification |
| `src/app/api/admin/verifications/[id]/reject/route.ts` | Admin: reject with reason (Zod validated) |
| `src/app/(host)/host/verification/page.tsx` | Provider verification dashboard |
| `src/app/(admin)/admin/verifications/page.tsx` | Admin verification review page |

### Modified Files
| File | Change |
|---|---|
| `supabase/migration.sql` | Fixed `provider_verifications` schema (added `review_note`, `updated_at`, 4 RLS policies, trigger) |
| `src/lib/db/supabase-queries.ts` | Added 6 verification queries |
| `src/app/api/upload/route.ts` | Extended to support PDFs for verification documents (10MB limit, `purpose=verification`) |
| `src/components/sidebar/HostSidebar.tsx` | Added "Verification" link with Shield icon |
| `src/components/sidebar/AdminSidebar.tsx` | Added "Verifications" link with Shield icon |
| `src/app/(host)/host/dashboard/page.tsx` | Added verification status card (pending/none) |

---

## Security

- **CSRF** on all POST routes
- **Rate limiting**: 5 submissions/min per IP for provider
- **Input validation**: Zod schemas for submit and reject
- **RLS**: Providers can only read/insert/update own verifications; admins can read/update all
- **Admin-only**: approve/reject endpoints require `role === 'admin'`
- **Audit logging**: `verification.submitted`, `verification.approved`, `verification.rejected`
- **Duplicate prevention**: Cannot submit if same type is already pending

---

## Provider Verification Page

- Shows all 3 verification types with status (pending/approved/rejected)
- Upload documents (images or PDFs, max 10MB each, up to 5 per submission)
- Resubmit after rejection (shows last rejection reason)
- Document links for approved verifications
- Verification status card on host dashboard

## Admin Verification Page

- Tabbed view: Pending / Approved / Rejected
- Shows provider info (business name, type, user email)
- Document preview links (opens in new tab)
- Approve button (auto-updates provider profile if all required types approved)
- Reject button with required reason (min 5 chars, max 500)
- Audit trail for all decisions

---

## Verification Cascade Logic

When admin approves a verification:
1. Check if ALL required types (identity, business) for that provider are now approved
2. If yes → `provider_profiles.verification_status = 'approved'`, set `verified_at`
3. Provider is now "verified" — can be displayed with verified badge

When admin rejects a verification:
1. Check if ANY other verification for that provider is still approved
2. If no approved verifications remain → `provider_profiles.verification_status = 'rejected'`
3. If some are still approved → overall status stays as-is

---

## Build Status

✅ Build passes — all routes registered:
- `/host/verification`
- `/admin/verifications`
- `/api/provider/verifications`
- `/api/admin/verifications`
- `/api/admin/verifications/[id]/approve`
- `/api/admin/verifications/[id]/reject`

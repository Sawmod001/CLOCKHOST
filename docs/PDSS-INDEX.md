# ClockHost PDSS — Master Index
## Product Domain & System Specification | Version 1.0

> **Purpose:** This is the master tracking document for the ClockHost remodel.
> **Last updated:** 2026-08-28

---

## Document Structure

| File | Contents | Count |
|------|----------|-------|
| `PDSS-PART1-BUGS.md` | Critical bugs that break the app | 10 bugs |
| `PDSS-PART2-PAGES.md` | Missing pages that need to be created | 12 pages |
| `PDSS-PART3-FEATURES.md` | Missing features and architectural gaps | 30 items |
| `PDSS-SPRINT-TRACKER.md` | Sprint plan and progress tracking | 10 sprints |

---

## Quick Status Dashboard

### Bugs (Part 1)
| Priority | Count | Status |
|----------|-------|--------|
| P0 Critical | 10 | ALL BROKEN |

### Pages (Part 2)
| Priority | Count | Status |
|----------|-------|--------|
| P1 Required | 9 | ALL MISSING |
| P2 Nice-to-have | 3 | ALL MISSING |

### Features (Part 3)
| Priority | Count | Status |
|----------|-------|--------|
| P0 Critical | 8 | 3 BROKEN, 3 MISSING, 2 PARTIAL |
| P1 Important | 14 | 5 MISSING, 6 PARTIAL, 3 BROKEN |
| P2 Nice-to-have | 8 | 6 MISSING, 1 PARTIAL, 1 UNKNOWN |

---

## How to Use This Protocol

### Before Starting Work
1. Open `PDSS-SPRINT-TRACKER.md` to see current sprint
2. Read the tasks in the current sprint
3. For each task, find the corresponding PDSS section
4. Read the requirements and verification criteria

### During Development
1. Reference the spec section numbers (§XX) from REMODEL-BLUEPRINT.md
2. Follow the fix/implementation instructions in the PDSS section
3. Test against the verification criteria

### After Completing Work
1. Check off all verification criteria
2. Update status from BROKEN/MISSING/PARTIAL to DONE
3. Update the sprint tracker
4. Run tests to ensure nothing broke

### Status Values
- **BROKEN** — exists but does not work
- **MISSING** — does not exist at all
- **PARTIAL** — exists but incomplete
- **IN_PROGRESS** — actively being worked on
- **DONE** — implemented and verified
- **BLOCKED** — cannot proceed until dependency resolved

---

## Total Work Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Critical Bugs | 10 | 0 | 10 |
| Missing Pages | 12 | 0 | 12 |
| Missing Features | 30 | 0 | 30 |
| **TOTAL** | **52** | **0** | **52** |

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `REMODEL-BLUEPRINT.md` | 96-section product specification (source of truth) |
| `DESIGN-GATE.md` | 10 pre-implementation design documents |
| `PDSS-PART1-BUGS.md` | Critical bugs tracking |
| `PDSS-PART2-PAGES.md` | Missing pages tracking |
| `PDSS-PART3-FEATURES.md` | Missing features tracking |
| `PDSS-SPRINT-TRACKER.md` | Sprint plan and progress |

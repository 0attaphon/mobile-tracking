# Phase 1 — Database Contract and Security

> Execute tasks in order. Read the master plan, `supabase/README.md`, current student/auth migrations, and only the two files below.

**Goal:** Establish the authoritative ledger, inventory, catalog, idempotent RPCs, RLS, and security invariants.

**Files:**

- Create/modify: `supabase/migrations/20260923000000_coin_wallet_ledger.sql`
- Create/modify: `supabase/tests/coin_wallet.sql`

**Rules:** Lock the student row with `FOR UPDATE` before balance work. Replays must compare operation-defining fields. Security-definer functions validate `auth.uid()` and set a safe `search_path`. Clients never write ledger/inventory directly.

### Task 1.1: Ledger, Inventory, and Catalog

- [x] Add pgTAP assertions for ledger constraints, inventory uniqueness, one active catalog version, positive prices, exactly 69 known IDs, and a 12,000-coin catalog total.
- [x] Apply the existing migration to the user-designated Supabase test database.
- [x] Verify `coin_ledger`, `student_inventory`, `shop_catalog_versions`, and `shop_catalog_items` exist.
- [x] Verify catalog v1 has the 69 spec IDs totaling 12,000 coins; unknown IDs remain rejected by Task 1.3 coverage.
- [x] Verify focused assertions pass in Supabase SQL Editor.
- [x] Commit: `test: lock wallet catalog invariants` (`59d89d2`).

Ledger invariants:

```sql
balance_after >= 0
balance_after = balance_before + delta
transaction_type IN (
  'focus_reward', 'chore_reward', 'outdoor_reward',
  'shop_purchase', 'admin_deduction', 'legacy_import'
)
```

### Task 1.2: Reward Claims and Focus Lifecycle

- [x] Test: valid reward credits once; same request replays; changed replay fields conflict; duplicate source/date is rejected; a focus milestone pays at most once per Bangkok calendar day while existing catch-up/freeze behavior remains valid.
- [x] Test: second active focus session raises `FOCUS_SESSION_ACTIVE`; completion/cancellation release the lock; replay is idempotent.
- [x] Implement server-owned reward rules; never accept a client delta.
- [x] Implement/harden start, completion, and cancellation with one `in_progress` session per student.
- [x] Run focused pgTAP tests and commit: `feat: make wallet rewards idempotent`.

### Task 1.3: Purchases, Import, and Reads

- [x] Test active catalog price, insufficient balance, duplicate ownership, replay, duplicate import IDs, unknown IDs, and per-student reads.
- [x] Implement `purchase_shop_item`, `import_legacy_inventory`, `get_my_wallet`, and `get_my_coin_history` transactionally.
- [x] Verify only the authenticated student's latest requested history is returned.
- [x] Run focused pgTAP tests and commit: `feat: add transactional wallet purchases`.

### Task 1.4: Admin Deduction and RLS

- [x] Fixture: one admin and two students.
- [x] Test unauthenticated/non-admin → `ADMIN_REQUIRED`; amounts `0`, `-1`, decimal, unsafe integer, and above balance fail; stale balance → `BALANCE_CHANGED`.
- [x] Test valid deduction `100 → 60`, one ledger row, correct actor, safe replay, and conflicting replay.
- [x] Implement exact trimmed student-code lookup and `admin_deduct_student_coins`.
- [x] Enable RLS: students select only their rows; admins may read ledger; clients cannot directly mutate wallet tables.
- [x] Run focused pgTAP tests and commit: `feat: add secured admin coin deductions`.

### Task 1.5: Close Legacy Bypasses

This preserves original Task 6.

- [x] Test authenticated direct `students` insert with `coins = 999999` is denied.
- [x] Revoke `INSERT` on `students` from `authenticated`, `anon`, and `public`; remove `students_insert_own`; retain `register_student` as the only creation path.
- [x] Revoke `increment_student_coins(integer)` from `authenticated`, `anon`, and `public`; retain only for the documented transition window.
- [x] Run the complete suite and commit: `fix: close wallet creation and focus overlap bypasses`.

## Phase Gate

```bash
supabase test db supabase/tests/coin_wallet.sql
```

Expected: all assertions pass and roll back. If the runtime is unavailable, record the exact missing dependency and leave the phase unchecked.

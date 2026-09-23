# Shared Coin Wallet and Admin Deduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase the authoritative coin wallet, let an authenticated admin deduct coins by student code, and make rewards and purchases idempotent and auditable.

**Architecture:** A Postgres ledger and versioned shop catalog own every confirmed balance change. Mobile rewards queue stable request IDs and mobile purchases call a transactional RPC; the admin site uses a separate admin-only deduction RPC. The app displays confirmed coins plus pending rewards and refreshes the confirmed balance after reconnecting.

**Tech Stack:** PostgreSQL/Supabase migrations and RPCs, Expo SDK 52 / React Native 0.76, Zustand, AsyncStorage, Next.js 15 App Router, React 19, TypeScript, Vitest, pgTAP

**Spec:** `docs/superpowers/specs/2026-09-22-outdoor-quests-rewards-design.md`

## Global Constraints

- Supabase is the source of truth for confirmed coins and inventory.
- Never expose or commit a Supabase service-role key.
- Admin deduction accepts an exact student code and a positive integer amount; a balance may never become negative.
- Every mutation carries a stable request UUID and is idempotent.
- Offline rewards may queue, but pending rewards cannot be spent or deducted.
- New purchases and admin deductions require a network connection.
- Existing owned items and confirmed coins must survive migration.
- Mobile changes must remain compatible with Expo SDK 52 / RN 0.76 and Android dev-client builds.

---

## File Structure

- Create `supabase/migrations/20260923000000_coin_wallet_ledger.sql`: wallet ledger, inventory, catalog, idempotent RPCs, RLS, and removal of unrestricted delta writes.
- Create `supabase/tests/coin_wallet.sql`: pgTAP coverage for authorization, concurrency-safe balance checks, audit rows, purchases, and idempotency.
- Create `pet-focus/src/services/supabase/wallet.ts`: typed RPC client for balance, ledger, rewards, inventory import, and purchases.
- Create `pet-focus/src/services/supabase/pendingRewards.ts`: student-scoped AsyncStorage queue with atomic read/modify/write serialization.
- Modify `pet-focus/src/stores/petStore.ts`: confirmed and pending balances; no unrestricted server delta.
- Modify `pet-focus/src/stores/userStore.ts`: server inventory hydration and one-time legacy inventory import state.
- Modify `pet-focus/src/components/onboarding/IdentityGate.tsx`: migration, queue flush, balance/inventory refresh.
- Modify `pet-focus/app/(tabs)/shop.tsx`: online transactional purchase flow.
- Create `pet-focus/app/coin-history.tsx`: student-visible wallet history.
- Create `pet-focus/src/services/supabase/__tests__/pendingRewards.test.ts`: queue behavior and student isolation.
- Modify `pet-focus/package.json`: add the wallet unit-test command and Vitest dev dependency.
- Create `admin-web/src/app/coins/page.tsx`: admin lookup and recent deduction history.
- Create `admin-web/src/app/coins/actions.ts`: authenticated student lookup and deduction actions.
- Create `admin-web/src/components/coins/CoinDeductionForm.tsx`: lookup, before/after confirmation, loading, and stale-balance handling.
- Modify `admin-web/src/components/AdminNav.tsx`: add the coin deduction navigation entry.

### Task 1: Add the authoritative ledger and idempotent RPC contract

**Files:**
- Create: `supabase/migrations/20260923000000_coin_wallet_ledger.sql`
- Create: `supabase/tests/coin_wallet.sql`

**Interfaces:**
- Produces: `wallet_transaction_result(balance integer, ledger_id uuid, replayed boolean)`
- Produces: `admin_deduct_student_coins(p_student_code text, p_amount integer, p_request_id uuid, p_expected_balance integer)`
- Produces: `claim_student_reward(p_request_id uuid, p_reward_type text, p_source_id text, p_source_date date)`
- Produces: `purchase_shop_item(p_item_id text, p_catalog_version integer, p_request_id uuid)`
- Produces: `import_legacy_inventory(p_item_ids text[], p_request_id uuid)`
- Produces: `get_my_wallet()` and `get_my_coin_history(p_limit integer)`

- [ ] **Step 1: Write the failing pgTAP tests**

Create fixtures for one admin UUID, two student UUIDs, and catalog item `hat_school`. Assert these exact behaviors: unauthenticated/admin-missing deduction raises `ADMIN_REQUIRED`; amount `0`, `-1`, and amount above balance raise errors; stale `p_expected_balance` raises `BALANCE_CHANGED`; one valid deduction changes `100` to `60` and writes one `admin_deduction` ledger row; replaying the same request returns `60` with `replayed=true`; reusing the request ID with a different amount raises `IDEMPOTENCY_CONFLICT`; purchase and deduction cannot make the balance negative; reward replay credits once; inventory import ignores duplicate known IDs and rejects unknown IDs.

- [ ] **Step 2: Run the database test to verify it fails**

Run: `supabase test db supabase/tests/coin_wallet.sql`

Expected: FAIL because the wallet tables and RPCs do not exist.

- [ ] **Step 3: Create ledger and catalog tables**

Create `coin_ledger` with `id`, unique `request_id`, `student_id`, `transaction_type`, `delta`, `balance_before`, `balance_after`, `actor_user_id`, `source_id`, `source_date`, `metadata`, and `created_at`. Add checks for `balance_after >= 0`, `balance_after = balance_before + delta`, and allowed transaction types `focus_reward`, `chore_reward`, `outdoor_reward`, `shop_purchase`, `admin_deduction`, `legacy_import`.

Create `student_inventory(student_id, item_id, acquired_at, source_ledger_id)` with a composite primary key. Create `shop_catalog_versions(version, active, created_at)` and `shop_catalog_items(version, item_id, price, active)` with positive prices and an FK to the version. Seed version `1` using the 69 item IDs and prices from the spec appendix.

- [ ] **Step 4: Implement the RPCs as security-definer transactions**

For every mutation: validate `auth.uid()`, lock the target `students` row with `FOR UPDATE`, check an existing ledger row by request ID before applying work, compare all replay fields to detect conflicts, calculate the next balance, update `students.coins`, then insert the ledger and inventory rows in the same transaction.

`admin_deduct_student_coins` must additionally require `public.is_admin()`, trim and exact-match `students.student_id`, require `p_amount > 0`, compare `p_expected_balance`, and record `actor_user_id = auth.uid()`.

`claim_student_reward` must calculate coins from server-owned rules for the reward type and source ID. It must enforce one source claim per student/date and reject arbitrary client deltas. `purchase_shop_item` must read the active item price, reject already-owned items, and insert inventory with the purchase ledger row.

- [ ] **Step 5: Restrict policies and retire unrestricted delta writes**

Enable RLS on all new tables. Students may select only their own ledger and inventory; admins may select all ledger rows; no client gets direct insert/update/delete rights. Revoke execution of `increment_student_coins(integer)` from `authenticated`, retain the function only during the migration window, and add a comment that it is removed after the transition build is mandatory.

- [ ] **Step 6: Run database tests**

Run: `supabase test db supabase/tests/coin_wallet.sql`

Expected: all assertions PASS and the test transaction rolls back.

- [ ] **Step 7: Commit the database contract**

```bash
git add supabase/migrations/20260923000000_coin_wallet_ledger.sql supabase/tests/coin_wallet.sql
git commit -m "feat: add authoritative coin wallet ledger"
```

### Task 2: Replace the mobile delta queue with idempotent reward requests

**Files:**
- Create: `pet-focus/src/services/supabase/wallet.ts`
- Create: `pet-focus/src/services/supabase/pendingRewards.ts`
- Create: `pet-focus/src/services/supabase/__tests__/pendingRewards.test.ts`
- Modify: `pet-focus/src/services/supabase/sync.ts`
- Modify: `pet-focus/src/stores/petStore.ts`
- Modify: `pet-focus/package.json`

**Interfaces:**
- Consumes: wallet RPCs from Task 1
- Produces: `type PendingReward = { requestId: string; studentId: string; rewardType: 'focus' | 'chore' | 'outdoor'; sourceId: string; sourceDate: string; createdAt: string }`
- Produces: `enqueueReward(reward: PendingReward): Promise<void>`
- Produces: `flushPendingRewards(studentId: string): Promise<{ confirmedBalance: number; remaining: number }>`
- Produces: `fetchWallet(): Promise<{ confirmedBalance: number; pendingCount: number }>`
- Produces: store fields `confirmedCoins`, `pendingRewardCoins`, and derived `coins`

- [ ] **Step 1: Add Vitest and write failing queue tests**

Add `"test": "vitest run"` and `vitest` as a dev dependency in `pet-focus/package.json`. Test that two concurrent enqueues both remain, duplicate request IDs collapse to one, a failed flush preserves the item, a successful replay removes it, and student A never flushes student B's queue.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pet-focus && npm test -- src/services/supabase/__tests__/pendingRewards.test.ts`

Expected: FAIL because the queue module does not exist.

- [ ] **Step 3: Implement the serialized student-scoped queue**

Store a versioned object under `supabase-pending-rewards-v2`. Serialize queue mutations through one module-level promise chain so enqueue during flush cannot be overwritten. Keep the same request ID for every retry. Return only the active student's items from flush and preserve other students' items.

- [ ] **Step 4: Implement typed wallet RPC calls and store semantics**

Map Supabase errors to `OFFLINE`, `INSUFFICIENT_COINS`, `BALANCE_CHANGED`, `ALREADY_OWNED`, and `UNKNOWN`. Remove new uses of `syncCoinDelta`. `addCoins` becomes reward enqueue plus optimistic pending display; `spendCoins` is no longer used for purchases. `coins` shown in headers equals confirmed plus pending, while purchase eligibility uses confirmed only and labels pending rewards as “รอยืนยัน”.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `cd pet-focus && npm test -- src/services/supabase/__tests__/pendingRewards.test.ts && npx tsc --noEmit`

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit the mobile wallet foundation**

```bash
git add pet-focus/package.json pet-focus/package-lock.json pet-focus/src/services/supabase/wallet.ts pet-focus/src/services/supabase/pendingRewards.ts pet-focus/src/services/supabase/__tests__/pendingRewards.test.ts pet-focus/src/services/supabase/sync.ts pet-focus/src/stores/petStore.ts
git commit -m "feat: sync rewards through idempotent wallet requests"
```

### Task 3: Migrate inventory and make purchases transactional

**Files:**
- Modify: `pet-focus/src/stores/userStore.ts`
- Modify: `pet-focus/src/components/onboarding/IdentityGate.tsx`
- Modify: `pet-focus/app/(tabs)/shop.tsx`
- Create: `pet-focus/app/coin-history.tsx`
- Modify: `pet-focus/src/services/supabase/wallet.ts`

**Interfaces:**
- Consumes: `import_legacy_inventory`, `purchase_shop_item`, `get_my_wallet`, `get_my_coin_history`
- Produces: `refreshWalletAndInventory(): Promise<void>` and `purchaseItem(itemId: string, catalogVersion: number, requestId: string)`

- [ ] **Step 1: Write failing service tests for purchase responses**

Mock Supabase RPC responses and assert that success hydrates the returned balance and inventory, `INSUFFICIENT_COINS` leaves local ownership unchanged, and retry with the same request ID produces one owned item.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd pet-focus && npm test -- src/services/supabase/__tests__/wallet.test.ts`

Expected: FAIL because the purchase methods do not exist.

- [ ] **Step 3: Implement one-time legacy inventory import**

After auth restoration, submit the persisted `ownedItems` array once with a stable migration request ID stored per student. Accept only known catalog IDs server-side. Hydrate `ownedItems` from server inventory after import, and preserve equipped IDs only when they remain owned.

- [ ] **Step 4: Replace local purchase mutation**

On buy, require connectivity, create and persist a request ID before calling the RPC, disable the button until completion, hydrate balance and inventory from the result, then equip/apply the item. On timeout retain the request ID and offer retry. Refresh wallet and inventory whenever the shop screen gains focus.

- [ ] **Step 5: Add student coin history**

Render the student's latest 50 ledger entries with Thai labels, signed amount, resulting balance, and local date/time. Link the screen from the coin badge or settings. Do not expose another student's rows.

- [ ] **Step 6: Verify mobile behavior**

Run: `cd pet-focus && npm test && npx tsc --noEmit`

On an Android dev client, verify a purchase, a simulated timeout/retry, reconnect after an admin deduction, legacy inventory import, and offline use of an already-owned item.

- [ ] **Step 7: Commit purchase and inventory migration**

```bash
git add pet-focus/src/stores/userStore.ts pet-focus/src/components/onboarding/IdentityGate.tsx 'pet-focus/app/(tabs)/shop.tsx' pet-focus/app/coin-history.tsx pet-focus/src/services/supabase/wallet.ts pet-focus/src/services/supabase/__tests__/wallet.test.ts
git commit -m "feat: make shop purchases transactional"
```

### Task 4: Build the admin deduction flow

**Files:**
- Create: `admin-web/src/app/coins/page.tsx`
- Create: `admin-web/src/app/coins/actions.ts`
- Create: `admin-web/src/components/coins/CoinDeductionForm.tsx`
- Modify: `admin-web/src/components/AdminNav.tsx`

**Interfaces:**
- Consumes: `admin_deduct_student_coins`
- Produces: `lookupStudentByCode(code: string)` and `deductCoins(input: { studentCode: string; amount: number; requestId: string; expectedBalance: number })`

- [ ] **Step 1: Implement strict server actions**

Both actions call `requireAdmin()` and return `ADMIN_REQUIRED` without querying student data when authorization fails. Lookup trims and exact-matches the code and returns `studentId`, `studentCode`, `nickname`, `className`, and `balance`. Deduction validates safe positive integer input, calls the RPC, and maps `BALANCE_CHANGED`, `INSUFFICIENT_COINS`, and `STUDENT_NOT_FOUND` to Thai user messages.

- [ ] **Step 2: Build the confirmation UI**

The first state contains one student-code field. A successful lookup shows identifying data and confirmed balance. Amount input immediately shows “ยอดเดิม → หัก → ยอดคงเหลือ”; the confirmation button remains disabled for invalid or excessive amounts. Generate one UUID when entering confirmation and reuse it during retries. Disable fields during submission.

- [ ] **Step 3: Handle stale balances and show history**

On `BALANCE_CHANGED`, refresh the student, clear the previous confirmation, and require a new click. After success, show the returned balance and append the ledger entry. Below the form, render the most recent admin deductions available to the current admin role.

- [ ] **Step 4: Add navigation and verify the production build**

Run: `cd admin-web && npm run build`

Expected: Next.js build exits 0 and `/coins` is present in the route list.

- [ ] **Step 5: Smoke-test authorization and idempotency**

As an admin: find a known code, deduct a valid amount, reload, and verify one history row. Retry the same request ID and verify no second deduction. As a student/anonymous session: verify the page and actions return no student data.

- [ ] **Step 6: Commit the admin flow**

```bash
git add admin-web/src/app/coins admin-web/src/components/coins admin-web/src/components/AdminNav.tsx
git commit -m "feat: let admins deduct student reward coins"
```

### Task 5: Complete migration safeguards and integrated verification

**Files:**
- Modify: `docs/USER_GUIDE.md`
- Modify: `pet-focus/AGENTS.md`
- Modify: `supabase/README.md`

**Interfaces:**
- Consumes: all tasks above
- Produces: documented rollout and rollback sequence

- [ ] **Step 1: Document the rollout order**

Record this exact order: apply additive schema and catalog; deploy compatible mobile build; verify legacy import and v2 queues; require the compatible build for spending; revoke old delta RPC; enable admin deduction UI. Rollback hides new UI and stops new mutations while preserving ledger, balances, and inventory.

- [ ] **Step 2: Run all automated checks**

Run: `supabase test db supabase/tests/coin_wallet.sql`

Run: `cd pet-focus && npm test && npx tsc --noEmit`

Run: `cd admin-web && npm run build`

Expected: every command exits 0.

- [ ] **Step 3: Run the concurrency matrix**

Exercise purchase vs. admin deduction, two admin deductions, duplicate reward retry, enqueue during flush, and a stale response arriving after a newer balance. Confirm the balance and ledger agree and never become negative.

- [ ] **Step 4: Update user and maintainer documentation**

Explain confirmed vs pending coins, online purchase requirement, admin lookup/deduction flow, history, migration behavior, and that offline devices see admin deductions after reconnecting.

- [ ] **Step 5: Commit the verified wallet rollout documentation**

```bash
git add docs/USER_GUIDE.md pet-focus/AGENTS.md supabase/README.md
git commit -m "docs: describe shared coin wallet operations"
```

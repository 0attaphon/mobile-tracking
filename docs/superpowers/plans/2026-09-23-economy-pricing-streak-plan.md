# Economy Pricing and Streak Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reprice the existing 69-item catalog to 12,000 total coins and ensure a streak milestone bonus is awarded at most once per Bangkok day.

**Architecture:** The literal mobile catalog and server catalog share one checked version and price map. Streak calculation becomes a pure function with an explicit last-awarded date, then the store persists that field and submits one idempotent reward request.

**Tech Stack:** TypeScript, Zustand, Vitest, PostgreSQL/Supabase catalog from the wallet plan

**Spec:** `docs/superpowers/specs/2026-09-22-outdoor-quests-rewards-design.md`

## Global Constraints

- Keep all 69 existing item IDs and owned-item behavior.
- New prices must match the spec appendix and total exactly 12,000 coins.
- Do not charge existing owners, remove ownership, or refund prior price differences.
- Keep focus base rewards unchanged.
- Streak milestone bonuses for days 1, 3, 7, 14, and 30 are paid once on that Bangkok day.
- Catch-up and freeze-token behavior must remain intact.

---

## File Structure

- Create `shared/shopCatalog.ts`: versioned item ID to price map used for validation and server seeding.
- Modify `pet-focus/src/types/shop.ts`: consume or match the versioned price map.
- Create `pet-focus/src/types/__tests__/shopCatalog.test.ts`: count, total, IDs, and representative ordering.
- Create `pet-focus/src/features/focus/streakReward.ts`: pure streak bonus calculation.
- Create `pet-focus/src/features/focus/__tests__/streakReward.test.ts`: same-day, milestone, catch-up, and freeze cases.
- Modify `pet-focus/src/stores/focusStore.ts`: persist `lastStreakBonusDate` and use pure calculation.
- Modify `pet-focus/src/hooks/useFocusSession.ts`: enqueue one idempotent streak/focus reward result.
- Modify `docs/USER_GUIDE.md` and `pet-focus/AGENTS.md`: current prices and bonus semantics.

### Task 1: Create and verify the 12,000-coin catalog

**Files:**
- Create: `shared/shopCatalog.ts`
- Modify: `pet-focus/src/types/shop.ts`
- Create: `pet-focus/src/types/__tests__/shopCatalog.test.ts`

**Interfaces:**
- Produces: `SHOP_CATALOG_VERSION = 1`
- Produces: `SHOP_PRICES: Readonly<Record<string, number>>`
- Produces: `getShopPrice(itemId: string): number`

- [ ] **Step 1: Write failing catalog tests**

Assert 69 unique IDs; every active `SHOP_ITEMS` ID has one price and no extra price IDs exist; prices are positive multiples of five; the sum is exactly `12_000`; item ordering by old rarity bands remains sensible by checking `hat_school < hat_tophat`, `bg_white < bg_deep_space`, and both pets remain purchasable; server seed output matches this map.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pet-focus && npm test -- src/types/__tests__/shopCatalog.test.ts`

Expected: FAIL because the shared catalog does not exist and current total is 19,840.

- [ ] **Step 3: Add the exact versioned mapping**

Transcribe all 69 `Item ID → ราคาใหม่` values from the approved spec appendix into `SHOP_PRICES`. Export a frozen object and throw `UNKNOWN_SHOP_ITEM` from `getShopPrice` for missing IDs. Replace each active `ShopItem.price` literal with `getShopPrice(item.id)` at construction time or an equivalent typed catalog merge that preserves the existing item order and metadata.

- [ ] **Step 4: Keep the Supabase catalog identical**

Update the wallet migration seed to contain the same 69 IDs, version `1`, and prices. Add a generated comparison fixture or test query so a mismatch fails before deployment.

- [ ] **Step 5: Run tests and typecheck**

Run: `cd pet-focus && npm test -- src/types/__tests__/shopCatalog.test.ts && npx tsc --noEmit`

Expected: PASS, with count 69 and total 12,000.

- [ ] **Step 6: Commit the catalog repricing**

```bash
git add shared/shopCatalog.ts pet-focus/src/types/shop.ts pet-focus/src/types/__tests__/shopCatalog.test.ts supabase/migrations/20260923000000_coin_wallet_ledger.sql supabase/tests/coin_wallet.sql
git commit -m "feat: rebalance shop catalog for three-month progression"
```

### Task 2: Make streak milestone rewards once-per-day

**Files:**
- Create: `pet-focus/src/features/focus/streakReward.ts`
- Create: `pet-focus/src/features/focus/__tests__/streakReward.test.ts`
- Modify: `pet-focus/src/stores/focusStore.ts`
- Modify: `pet-focus/src/hooks/useFocusSession.ts`

**Interfaces:**
- Produces: `calculateStreakCompletion(input: { dateKey: string; lastFocusDate: string | null; currentStreak: number; longestStreak: number; lastStreakBonusDate: string | null; streakFrozenPending: boolean; freezeTokens: number }): { currentStreak: number; longestStreak: number; lastFocusDate: string; freezeTokens: number; streakBonus: number; lastStreakBonusDate: string | null }`

- [ ] **Step 1: Write failing streak tests**

Assert first completion on streak day 1 pays 10; second completion on the same day pays 0; day 3 pays 30 once; day 7 pays 100 once and grants at most one freeze token; days 14 and 30 pay 200 and 500; a non-milestone day pays 0; a broken streak resets to day 1; a pending freeze preserves continuity; same Bangkok date remains the same across multiple sessions.

- [ ] **Step 2: Run tests to verify the current bug**

Run: `cd pet-focus && npm test -- src/features/focus/__tests__/streakReward.test.ts`

Expected: FAIL because current `completeSession` returns the milestone bonus again on the second same-day session.

- [ ] **Step 3: Implement the pure calculator**

Advance streak only when `lastFocusDate !== dateKey`. Pay `STREAK_BONUSES[nextStreak]` only when the date advanced and `lastStreakBonusDate !== dateKey`. Update `lastStreakBonusDate` only when a positive bonus is paid. Grant the seven-day freeze token only when advancing into a multiple of seven.

- [ ] **Step 4: Integrate persisted state and idempotent submission**

Add `lastStreakBonusDate` to `FocusState` and Zustand `partialize`. Replace inline streak calculations in `completeSession` with the pure result. Build the focus reward request from the session's stable request ID so base reward, catch-up multiplier, and streak bonus are credited once server-side even after a timeout.

- [ ] **Step 5: Run focused and full mobile checks**

Run: `cd pet-focus && npm test -- src/features/focus/__tests__/streakReward.test.ts && npm test && npx tsc --noEmit`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit the streak correction**

```bash
git add pet-focus/src/features/focus/streakReward.ts pet-focus/src/features/focus/__tests__/streakReward.test.ts pet-focus/src/stores/focusStore.ts pet-focus/src/hooks/useFocusSession.ts
git commit -m "fix: award streak bonuses once per day"
```

### Task 3: Verify progression examples and update documentation

**Files:**
- Create: `pet-focus/src/features/economy/__tests__/progression.test.ts`
- Modify: `docs/USER_GUIDE.md`
- Modify: `pet-focus/AGENTS.md`

**Interfaces:**
- Consumes: 12,000 catalog total and corrected streak rules
- Produces: executable progression examples and user-facing prices

- [ ] **Step 1: Add progression calculation tests**

Use `ceil((12_000 - 840) / dailyBaseCoins)` and assert 115 coins/day takes 98 days, 150 takes 75 days, 180 takes 62 days, and 200 takes 56 days. Assert the 840 bonus total is exactly `10 + 30 + 100 + 200 + 500` and is not automatically repeated after day 30.

- [ ] **Step 2: Run the progression tests**

Run: `cd pet-focus && npm test -- src/features/economy/__tests__/progression.test.ts`

Expected: PASS with the approved 56–98 day range examples.

- [ ] **Step 3: Update both documentation sources**

Document current focus rewards, once-per-day streak bonuses, ten outdoor rewards, shared real/in-game coin usage, 12,000 total catalog target, and the fact that real-world redemptions lengthen collection time. Update the product price list from the shared map rather than retaining stale individual prices.

- [ ] **Step 4: Run all related checks**

Run: `cd pet-focus && npm test && npx tsc --noEmit`

Run: `supabase test db supabase/tests/coin_wallet.sql`

Expected: every command exits 0 and both catalog representations match.

- [ ] **Step 5: Commit the verified economy documentation**

```bash
git add pet-focus/src/features/economy/__tests__/progression.test.ts docs/USER_GUIDE.md pet-focus/AGENTS.md
git commit -m "docs: align reward economy and shop pricing"
```

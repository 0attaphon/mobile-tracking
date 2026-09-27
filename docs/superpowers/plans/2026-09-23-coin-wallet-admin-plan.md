# Shared Coin Wallet — Token-Efficient Master Plan

> **For agentic workers:** Execute one phase at a time with `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Do not load every phase into one context.

**Goal:** Make Supabase the authoritative, auditable coin wallet while preserving offline rewards, balances, and inventory.

**Architecture:** Postgres owns confirmed balances, inventory, prices, and an idempotent ledger. Mobile may show queued rewards but spends only confirmed coins. Admin deductions and purchases use online transactional RPCs.

**Tech Stack:** Supabase/PostgreSQL, pgTAP, Expo SDK 52, RN 0.76, Zustand, AsyncStorage, Vitest, Next.js 15, React 19, TypeScript

**Spec:** `docs/superpowers/specs/2026-09-22-outdoor-quests-rewards-design.md`

## Token-Saving Protocol

For one work session read only:

1. This master index.
2. The active phase file.
3. Files listed by the active task.
4. `pet-focus/AGENTS.md` only for mobile phases.

Do not reload completed phases. Check boxes after verification. Start a fresh context at every phase boundary; a fresh context per task is optional.

## Global Constraints

- Supabase is authoritative for confirmed coins and inventory.
- Every mutation has a stable request UUID and is idempotent.
- Balances never become negative.
- Pending rewards cannot be spent or deducted.
- Purchases and admin deductions require network access.
- Preserve existing coins, owned items, and valid equipped items.
- Never expose or commit the Supabase `service_role` key.
- Keep Expo SDK 52 / RN 0.76 compatibility.

## Shared Contracts

```text
wallet_transaction_result(balance integer, ledger_id uuid, replayed boolean)
claim_student_reward(p_request_id uuid, p_reward_type text, p_source_id text, p_source_date date)
purchase_shop_item(p_item_id text, p_catalog_version integer, p_request_id uuid)
import_legacy_inventory(p_item_ids text[], p_request_id uuid)
admin_deduct_student_coins(p_student_code text, p_amount integer, p_request_id uuid, p_expected_balance integer)
get_my_wallet()
get_my_coin_history(p_limit integer)
```

```ts
type PendingReward = {
  requestId: string;
  studentId: string;
  rewardType: 'focus' | 'chore' | 'outdoor';
  sourceId: string;
  sourceDate: string;
  createdAt: string;
};
```

Stable errors: `ADMIN_REQUIRED`, `STUDENT_NOT_FOUND`, `INSUFFICIENT_COINS`, `BALANCE_CHANGED`, `ALREADY_OWNED`, `IDEMPOTENCY_CONFLICT`, `FOCUS_SESSION_ACTIVE`, `OFFLINE`, `UNKNOWN`.

## Review Focus

- Legacy delta queue with an unknowable delivery result must be surfaced for transition, never guessed or replayed automatically (Phase 2.3).
- A stale response must not overwrite a newer confirmed balance (Phases 2.3 and 5.2).
- Catalog v1 must contain exactly 69 known IDs totaling 12,000 coins (Phase 1.1).
- A focus milestone reward must not pay twice on the same Bangkok calendar day (Phase 1.2).
- Admin amounts must reject zero, negative, decimal, unsafe integer, and over-balance input (Phases 1.4 and 4.1).

## Phases and Gates

- [x] [Phase 1 — Database Contract and Security](coin-wallet/phase-1-database-security.md)
  - Gate: pgTAP passes; direct student creation and overlapping focus sessions are denied.
- [x] [Phase 2 — Mobile Reward Wallet](coin-wallet/phase-2-mobile-rewards.md)
  - Requires Phase 1. Gate: queue tests and typecheck pass.
- [ ] [Phase 3 — Inventory, Purchases, and Student History](coin-wallet/phase-3-shop-inventory.md)
  - Requires Phases 1–2. Gate: mobile tests, typecheck, and Android smoke checks pass.
- [ ] [Phase 4 — Admin Deduction](coin-wallet/phase-4-admin-deduction.md)
  - Requires Phase 1; may proceed independently of Phases 2–3. Gate: build and auth/idempotency smoke checks pass.
- [ ] [Phase 5 — Integrated Verification and Rollout](coin-wallet/phase-5-rollout-verification.md)
  - Requires Phases 1–4. Gate: all checks, concurrency matrix, docs, and rollback instructions pass.

## Rollout Invariant

Additive schema/catalog → compatible mobile build → verify legacy import and v2 queues → require compatible build for spending → revoke old delta RPC → enable admin UI.

Rollback hides new UI and stops new mutations; it never deletes ledger, balances, or inventory.

## Original Plan Mapping

| Original scope | New location |
|---|---|
| Task 1: ledger/RPC | Phase 1, Tasks 1.1–1.4 |
| Task 2: reward queue | Phase 2 |
| Task 3: inventory/shop/history | Phase 3 |
| Task 4: admin deduction | Phase 4 |
| Task 5: verification/docs | Phase 5 |
| Task 6: hardening | Phase 1, Task 1.5 |

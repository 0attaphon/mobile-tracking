# Phase 2 — Mobile Reward Wallet

> Read only the master plan, this file, `pet-focus/AGENTS.md`, and files in the active task.

**Goal:** Replace unrestricted coin deltas with a serialized, student-scoped, idempotent offline reward queue.

**Files:** `pet-focus/src/services/supabase/wallet.ts`, `pendingRewards.ts`, `__tests__/pendingRewards.test.ts`, `sync.ts`, `petStore.ts`, `package.json`, `package-lock.json`.

### Task 2.1: Vitest and Serialized Queue

- [x] Add `"test": "vitest run"` and Vitest.
- [x] Write failing tests: concurrent enqueues survive; duplicate request IDs collapse; failed flush preserves; successful replay removes; students are isolated; enqueue during flush survives.
- [x] Implement versioned storage at `supabase-pending-rewards-v2` with one module-level promise chain around all read/modify/write operations.
- [x] Preserve request IDs across retries and other students' queues.
- [x] Run focused tests and commit: `feat: queue idempotent wallet rewards` (`a50d980`).

### Task 2.2: Typed Wallet Client

- [x] Test claim success, replay, offline behavior, and stable error mapping.
- [x] Implement `claimStudentReward`, `fetchWallet`, `enqueueReward`, and `flushPendingRewards`.
- [x] Map server failures to master-plan error codes; UI must not parse raw error strings.
- [x] Run focused tests and commit: `feat: add typed mobile wallet client` (`3932459`).

Required signatures:

```ts
enqueueReward(reward: PendingReward): Promise<void>
flushPendingRewards(studentId: string): Promise<{
  confirmedBalance: number;
  remaining: number;
}>
fetchWallet(): Promise<{
  confirmedBalance: number;
  pendingCount: number;
}>
```

### Task 2.3: Store and Sync Integration

- [x] Test `confirmedCoins`, `pendingRewardCoins`, and display `coins = confirmed + pending`.
- [x] Enqueue a stable request before showing an optimistic pending reward.
- [x] Use only confirmed coins for spending; label pending rewards `รอยืนยัน`.
- [x] Remove new uses of `syncCoinDelta`; do not use `spendCoins` for purchases.
- [x] Detect the legacy delta queue separately: never guess whether an unanswered delta succeeded and never replay it through the v2 reward path; expose a migration-not-ready state until the documented transition clears it.
- [x] Flush after authenticated restoration and reconnect; ignore stale responses older than the newest wallet refresh.
- [x] Run the phase gate and commit: `feat: sync rewards through wallet requests`.

## Phase Gate

```bash
cd pet-focus
npm test -- src/services/supabase/__tests__/pendingRewards.test.ts
npx tsc --noEmit
```

Expected: both commands exit 0.

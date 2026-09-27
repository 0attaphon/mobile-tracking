# Phase 3 — Inventory, Purchases, and Student History

> Read only the master plan, this file, `pet-focus/AGENTS.md`, and files in the active task.

**Goal:** Migrate legacy ownership, transact purchases online, and show the student's ledger history.

**Files:** `wallet.ts`, `__tests__/wallet.test.ts`, `userStore.ts`, `IdentityGate.tsx`, `app/(tabs)/shop.tsx`, and `app/coin-history.tsx`.

### Task 3.1: Purchase/Inventory Client

- [x] Write failing RPC-mock tests: success hydrates balance/inventory; insufficient coins preserve ownership; replay owns one item; timeout retains request ID.
- [x] Implement:

```ts
refreshWalletAndInventory(): Promise<void>
purchaseItem(
  itemId: string,
  catalogVersion: number,
  requestId: string
): Promise<void>
```

- [x] Treat only server-returned confirmed balance and inventory as authoritative.
- [x] Run focused tests and commit: `feat: add transactional purchase client` (`481f126`).

### Task 3.2: One-Time Legacy Import

- [x] Test stable per-student migration ID, repeated boot, unknown IDs, and invalid equipped IDs.
- [x] Persist the migration request ID before calling `import_legacy_inventory`; retry with the same ID.
- [x] Hydrate ownership from the server and retain equipped IDs only when owned.
- [x] Verify offline startup still permits already-owned items.
- [ ] Commit: `feat: migrate legacy shop inventory`.

### Task 3.3: Transactional Shop UI

- [ ] Test offline rejection, disabled submission, insufficient balance, timeout retry, and focus refresh.
- [ ] Require network; persist one UUID before RPC; disable buy while submitting.
- [ ] On success hydrate wallet/inventory before applying the item. Never decrement locally.
- [ ] On timeout retain the UUID and offer retry; refresh wallet/inventory whenever shop gains focus.
- [ ] Commit: `feat: make shop purchases transactional`.

### Task 3.4: Student History

- [ ] Test only the authenticated student's latest 50 entries are parsed.
- [ ] Render Thai label, signed delta, resulting balance, and local date/time.
- [ ] Link from the coin badge or settings; never expose another student's data.
- [ ] Run the phase gate and commit: `feat: show student coin history`.

## Phase Gate

```bash
cd pet-focus
npm test
npx tsc --noEmit
```

Android smoke checks: purchase, simulated timeout/retry, reconnect after admin deduction, legacy import, and offline use of an owned item.

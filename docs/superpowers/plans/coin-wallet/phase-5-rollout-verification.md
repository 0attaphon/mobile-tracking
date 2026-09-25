# Phase 5 — Integrated Verification and Rollout

> Begin only after Phases 1–4 pass. Read the master, this file, and the three documentation targets.

**Goal:** Prove cross-client consistency and document a reversible production rollout.

**Files:** `docs/USER_GUIDE.md`, `pet-focus/AGENTS.md`, `supabase/README.md`.

### Task 5.1: Automated Gate

- [ ] Database: `supabase test db supabase/tests/coin_wallet.sql`.
- [ ] Mobile: `cd pet-focus && npm test && npx tsc --noEmit`.
- [ ] Admin: `cd admin-web && npm run build`.
- [ ] Record exact failures and fix wallet regressions in their owning phase before continuing.

### Task 5.2: Concurrency Matrix

- [ ] Purchase vs. deduction serializes on the student row; balance and ledger agree.
- [ ] Two deductions make the stale request refresh/reconfirm.
- [ ] Duplicate reward retry creates one credit/ledger row.
- [ ] Enqueue during flush remains queued.
- [ ] A stale mobile response cannot replace a newer confirmed balance.
- [ ] No sequence produces negative balance or duplicate inventory.

### Task 5.3: Docs and Rollout

- [ ] User guide: confirmed/pending coins, `รอยืนยัน`, online purchases, history, and reconnect behavior.
- [ ] Mobile AGENTS: fields, queue key, RPC flow, migration, and troubleshooting.
- [ ] Supabase README: admin operation, monitoring, rollout, and rollback.
- [ ] Record exact production order:

```text
1. Apply additive schema and catalog.
2. Deploy the compatible mobile build.
3. Verify legacy import and v2 reward queues.
4. Require the compatible build for spending.
5. Revoke the old delta RPC.
6. Enable the admin deduction UI.
```

- [ ] Rollback hides UI/stops mutations but preserves ledger, balances, and inventory.
- [ ] Commit: `docs: describe shared coin wallet operations`.

## Phase Gate

All commands exit 0, every concurrency case is recorded as passing, docs match deployed behavior, and all master checkboxes are complete.

# Phase 5 — Integrated Verification and Rollout

> Begin only after Phases 1–4 pass. Read the master, this file, and the three documentation targets.

**Goal:** Prove cross-client consistency and document a reversible production rollout.

**Files:** `docs/USER_GUIDE.md`, `pet-focus/AGENTS.md`, `supabase/README.md`.

### Task 5.1: Automated Gate

- [x] Database: pgTAP suite `supabase/tests/coin_wallet.sql` executed through project-scoped SQL in a rollback transaction (93/93 before and after migration); CLI unavailable.
- [x] Mobile: `cd pet-focus && npm test && npx tsc --noEmit`.
- [x] Admin: `cd admin-web && npm run build`.
- [x] Record exact failures and fix wallet regressions in their owning phase before continuing (restore fixture expected 8 ledger rows, not 6).

### Task 5.2: Concurrency Matrix

- [ ] Purchase vs. deduction serializes on the student row; balance and ledger agree.
- [ ] Two deductions make the stale request refresh/reconfirm.
- [x] Duplicate reward retry creates one credit/ledger row (sequential SQL replay verified; simultaneous transactions remain pending).
- [x] Enqueue during flush remains queued.
- [x] A stale mobile response cannot replace a newer confirmed balance.
- [ ] No sequence produces negative balance or duplicate inventory.

### Task 5.3: Docs and Rollout

- [x] User guide: confirmed/pending coins, `รอยืนยัน`, online purchases, history, and reconnect behavior.
- [x] Mobile AGENTS: fields, queue key, RPC flow, migration, and troubleshooting.
- [x] Supabase README: admin operation, monitoring, rollout, and rollback.
- [x] Record exact production order:

```text
1. Apply additive schema and catalog.
2. Deploy the compatible mobile build.
3. Verify legacy import and v2 reward queues.
4. Require the compatible build for spending.
5. Revoke the old delta RPC.
6. Enable the admin deduction UI.
```

- [x] Rollback hides UI/stops mutations but preserves ledger, balances, and inventory.
- [ ] Commit: `docs: describe shared coin wallet operations`.

## Phase Gate

All commands exit 0, every concurrency case is recorded as passing, docs match deployed behavior, and all master checkboxes are complete.

## Verification update — 2026-10-01

Mobile: 58/58 tests and TypeScript passed. Admin: 7/7 tests and production build passed; anonymous `/coins` returned HTTP 307 to `/login`. Documentation completed, including staged rollout and preserving-data rollback. Phase gate remains open pending two-session database concurrency, authenticated browser checks and Android smoke. Android: no connected device; listed Pixel_10 AVD is incomplete, and no ready dev-client APK was found. Existing unrelated workspace edits remain preserved.

Database: versioned admin migration applied to `pet-focus` (`nlpcrjahbbeodhvckcjm`), remote version `20261001151030`. pgTAP 93/93 passed before and after application. New RPC permissions verified; test fixtures/temporary pgTAP installation rolled back. This verifies sequential contract cases, not simultaneous two-session execution.

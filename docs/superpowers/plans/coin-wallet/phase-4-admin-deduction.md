# Phase 4 — Admin Deduction

> Read only the master plan, this file, and files in the active task.

**Goal:** Let an authenticated admin find an exact student code, preview and submit a safe idempotent deduction, and view recent deductions.

**Files:** `admin-web/src/app/coins/page.tsx`, `actions.ts`, `components/coins/CoinDeductionForm.tsx`, and `components/AdminNav.tsx`.

### Task 4.1: Strict Server Actions

- [ ] Test or smoke-fixture admin, non-admin, missing student, zero/negative/decimal/unsafe/excessive amount, stale balance, and replay.
- [x] Implement:

```ts
lookupStudentByCode(code: string)
deductCoins(input: {
  studentCode: string;
  amount: number;
  requestId: string;
  expectedBalance: number;
  expectedWalletVersion: number;
})
```

- [x] Call `requireAdmin()` before querying student data.
- [x] Trim and exact-match code; return only ID, code, nickname, class, balance, and wallet version.
- [x] Validate a safe positive integer and map stable errors to Thai messages.
- [x] Commit: `feat: add admin coin deduction actions`.

### Task 4.2: Lookup and Confirmation UI

- [x] Build lookup → identity/balance → amount confirmation states.
- [x] Show `ยอดเดิม → หัก → ยอดคงเหลือ` immediately.
- [x] Disable invalid/excessive confirmation and all fields during submission.
- [x] Generate one UUID on entering confirmation and reuse it for retries.
- [x] On `BALANCE_CHANGED`, refresh, clear confirmation, and require another click.
- [x] Commit: `feat: add admin deduction confirmation UI`.

### Task 4.3: History, Navigation, and Smoke Test

- [x] After success show returned balance and append one history row.
- [x] Render recent deductions allowed by the admin role; add `/coins` navigation.
- [ ] Build and smoke-test valid deduction, reload, same-ID replay, and no data for student/anonymous sessions.
- [x] Commit: `feat: let admins deduct student reward coins`.

Status: implementation, review and versioned SQL migration/pgTAP complete. The live admin/student browser smoke matrix remains open before the Phase 4 gate can be checked.

Update 2026-10-01: versioned migration applied to `pet-focus`; pgTAP passed 93/93 before and after application, with fixtures rolled back. Admin tests passed 7/7, production build passed, and anonymous `/coins` redirected to `/login` (307). Authenticated browser deduction/reload/replay and student-session smoke remain open.

## Phase Gate

```bash
cd admin-web
npm run build
```

Expected: exit 0 and `/coins` appears in the route list.

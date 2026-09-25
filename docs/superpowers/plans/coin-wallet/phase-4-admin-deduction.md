# Phase 4 — Admin Deduction

> Read only the master plan, this file, and files in the active task.

**Goal:** Let an authenticated admin find an exact student code, preview and submit a safe idempotent deduction, and view recent deductions.

**Files:** `admin-web/src/app/coins/page.tsx`, `actions.ts`, `components/coins/CoinDeductionForm.tsx`, and `components/AdminNav.tsx`.

### Task 4.1: Strict Server Actions

- [ ] Test or smoke-fixture admin, non-admin, missing student, zero/negative/decimal/unsafe/excessive amount, stale balance, and replay.
- [ ] Implement:

```ts
lookupStudentByCode(code: string)
deductCoins(input: {
  studentCode: string;
  amount: number;
  requestId: string;
  expectedBalance: number;
})
```

- [ ] Call `requireAdmin()` before querying student data.
- [ ] Trim and exact-match code; return only ID, code, nickname, class, and balance.
- [ ] Validate a safe positive integer and map stable errors to Thai messages.
- [ ] Commit: `feat: add admin coin deduction actions`.

### Task 4.2: Lookup and Confirmation UI

- [ ] Build lookup → identity/balance → amount confirmation states.
- [ ] Show `ยอดเดิม → หัก → ยอดคงเหลือ` immediately.
- [ ] Disable invalid/excessive confirmation and all fields during submission.
- [ ] Generate one UUID on entering confirmation and reuse it for retries.
- [ ] On `BALANCE_CHANGED`, refresh, clear confirmation, and require another click.
- [ ] Commit: `feat: add admin deduction confirmation UI`.

### Task 4.3: History, Navigation, and Smoke Test

- [ ] After success show returned balance and append one history row.
- [ ] Render recent deductions allowed by the admin role; add `/coins` navigation.
- [ ] Build and smoke-test valid deduction, reload, same-ID replay, and no data for student/anonymous sessions.
- [ ] Commit: `feat: let admins deduct student reward coins`.

## Phase Gate

```bash
cd admin-web
npm run build
```

Expected: exit 0 and `/coins` appears in the route list.

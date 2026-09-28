# Task 4.1 Implementation Report — Strict Server Actions

## Implementation

- Added `lookupStudentByCode(code)` and `deductCoins(input)` server actions in `admin-web/src/app/coins/actions.ts`.
- Both actions call `requireAdmin()` through a shared guard before running protected work. Student lookup trims the submitted code, uses exact equality on `students.student_id`, and returns only `id`, `code`, `nickname`, `className`, and `balance`.
- Deductions validate positive safe integer amounts, a nonnegative safe-integer expected balance, and a UUID request ID before calling the transactional `admin_deduct_student_coins` RPC. The action forwards the expected balance for stale-write protection and returns the RPC ledger ID, balance, and replay flag.
- Added stable error codes with Thai messages, mapping stable database codes from message/details/hint fields. Unknown failures stay generic.
- Added strict parsing for RPC output, including replay results, and a testable admin authorization guard.
- Kept changes within the assigned coin action files, plus the existing test script and TypeScript test-import setting in `admin-web/package.json` and `admin-web/tsconfig.json`.

## Tests and checks

- `npm test` — passed, 5 tests. Covers trim/blank code, zero/negative/decimal/unsafe/excessive amount, stale balance mapping, admin/non-admin guard ordering, stable Thai errors, and replay response parsing.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.

## Self-review and limits

- Actions do not issue a direct balance update; deduction remains delegated to the database RPC, consistent with the wallet design.
- Exact-match behavior is enforced by `.eq('student_id', normalized)` after trim.
- Replay semantics depend on the RPC returning the original ledger row with `replayed: true`; the action validates and forwards that response.
- No live Supabase admin/non-admin session or database smoke test was run. The guard and RPC response behavior are covered with local fixtures; database transaction and role behavior remain dependent on the migration/RPC implementation.

## Follow-up fixes (review findings)

- `runAdminAction` now catches rejected `requireAdmin()` loads and thrown protected Supabase/network work, returning the stable Thai `UNKNOWN` result. Resolved non-admin contexts still return `ADMIN_REQUIRED`; resolved RPC errors continue through stable error-code mapping.
- Validation now caps both `amount` and `expectedBalance` at PostgreSQL `int4` maximum (`2,147,483,647`) and maps database `INVALID_AMOUNT` to the same stable code.
- Added focused tests for thrown admin/action calls, `int4` boundary and overflow on both fields, and DB `INVALID_AMOUNT` mapping.

### Follow-up verification

- `cd admin-web && npm test` — passed, 7 tests.
- `cd admin-web && npx tsc --noEmit` — passed (exit 0, no diagnostics).
- `cd admin-web && npm run build` — passed (`next build` completed successfully).

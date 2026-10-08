# Coin wallet database verification — 2026-10-01

## Scope and authorization

Project: `pet-focus` (`nlpcrjahbbeodhvckcjm`), matching both clients' configured API URL. This is the existing production project, not an isolated test branch. Historical user approvals in chat `01a0d3dc-fd37-7f82-bec8-3fbe1481cf9f` authorized wallet migrations and pgTAP fixtures inside a transaction followed by rollback, then permanent migration only after GREEN. The current request continues that wallet work.

The default `mcp__supabase` connection now targets a different project (`Trading Point`). All wallet operations used project-scoped `mcp__codex_apps__supabase_*` tools.

## Database result

- Initial inspection: versioned deduction function absent; migration not applied; pgTAP not installed.
- First transactional run: 92/93 passed. Failure: `reinstall transfers ledger history to the new student ID` had 8 rows, expected 6. Two additional ABA fixture ledger rows legitimately transfer during restore.
- Fixed fixture expectation to 8, retaining all restore assertions.
- Transactional migration plus full suite: **93 passed, 0 failed**.
- Applied `admin_deduction_wallet_version`; remote version **20261001151030**.
- Full suite against deployed function, without temporary function replacement: **93 passed, 0 failed**.
- Post-test checks: fixture auth users absent; temporary pgTAP extension absent. Tests and extension creation were rolled back.
- Versioned deduction privileges: `anon = false`, `authenticated = true`; old balance-only deduction `authenticated = false`.

Local migration filenames reconciled with deployed history: `20261001151030_admin_deduction_wallet_version.sql`, `20260924145651_wallet_focus_streaks.sql`, and `20260925033211_revoke_legacy_coin_delta.sql`. Only local names and documentation references changed; migration SQL and remote history were preserved. This prevents CLI `db push` from treating these deployed migrations as new.

## Method and limits

CLI gate `supabase test db supabase/tests/coin_wallet.sql` could not run: Supabase CLI and PostgreSQL binaries absent. Docker socket was initially sandbox-restricted; approved read-only daemon check then hung and was cancelled. Instead, the complete SQL fixture ran through MCP with `BEGIN`, temporary pgTAP, `search_path = public, extensions`, and `ROLLBACK`. Assertions were captured into a temporary table so MCP's final result exposed pass/fail counts instead of only `finish()`.

The suite verifies idempotent reward/deduction replay, stale balance/version rejection including ABA, ledger arithmetic, nonnegative balances, ownership uniqueness, restore, and privilege enforcement. Read-only inspection confirms `FOR UPDATE` in purchase, reward claim, and versioned deduction functions.

**True overlapping database transactions remain unverified.** Single-session pgTAP proves sequential contracts, not two concurrent clients. Purchase-versus-deduction and two-simultaneous-deductions must still be exercised through two independent database connections or authenticated clients on an isolated test project. Do not mark the full Phase 5 concurrency gate complete from this report.

## Security advisor

Post-migration advisor reported existing categories: RPC-only tables with RLS and no policies, and publicly executable SECURITY DEFINER entrypoints. New versioned deduction is denied to `anon` and checks admin identity internally. This verification does not certify a clean project-wide advisor result. See [Supabase database linter](https://supabase.com/docs/guides/database/database-linter).

Android device and authenticated admin browser smoke checks are outside this database result. Application deployment remains separate from this migration.

## Integrated verification matrix

| Gate | Result and evidence |
| --- | --- |
| Mobile automated gate | 58/58 tests passed; TypeScript check passed. |
| Admin automated gate | 7/7 tests passed; production build passed. |
| Anonymous admin route | `/coins` returned HTTP 307 to login. |
| Enqueue during flush | Automated mobile regression passed. |
| Stale response cannot replace newer balance | Automated mobile regression passed. |
| Duplicate reward, nonnegative balance, unique inventory | Sequential SQL contracts passed in 93/93 pgTAP suite. |
| Purchase versus deduction with overlapping transactions | Pending: requires two independent connections or authenticated clients. |
| Two deductions with overlapping transactions | Pending: requires two independent connections or authenticated clients. |
| Android smoke | Pending: no connected device; Pixel 10 AVD exists without its system image and cannot run. |
| Authenticated admin browser smoke | Pending: no authenticated browser session available. |

Application and device evidence above was supplied by the coordinating agent; database evidence was executed by the database verification agent. Remaining rows keep the complete phase gate open.

# Phase 4 wallet version fix

## Status

Implemented the Phase 4 stale-confirmation fix. Admin deductions now require the confirmed balance and a per-student wallet version derived from the exact `coin_ledger` row count. The database checks both while holding the student row lock, so a balance that moves away and then returns to its previous value is rejected as `BALANCE_CHANGED`.

## Changes

- Added `admin_deduct_student_coins_v2` in `supabase/migrations/20260928000000_admin_deduction_wallet_version.sql`. It stores `expected_wallet_version` in ledger metadata and checks the version on replay along with the existing student, amount, actor, and balance identity checks.
- Revoked `PUBLIC`, `anon`, and `authenticated` execute access to the legacy balance-only RPC. Only the versioned RPC is granted to `authenticated`; its body still checks `is_admin()`.
- Admin lookup now fetches the exact ledger count and sends that version with the confirmation. The form refreshes the snapshot after success so a replay cannot leave the displayed wallet version behind newer ledger activity.
- Updated SQL coverage for grants, version metadata, replay mismatch, and the ABA balance scenario. The test plan is 93 assertions.
- Updated the Phase 4 contract and deployment/rollback guidance in `docs/superpowers/plans/2026-09-23-coin-wallet-admin-plan.md`.

## Compatibility and rollback

The migration preserves balances and ledger rows. Deploy the migration before the matching admin server actions/UI. During the short interval between those deploys, the older admin app will fail closed because the old RPC is revoked. Do not roll application code back to the four-argument call. If rolling back the application, hide/disable deductions and retain the migration and ledger. A database rollback must not re-enable the balance-only RPC; keep deductions disabled until the versioned app contract is restored.

The Supabase CLI was unavailable (`supabase: command not found`), so the migration file was created with the repository's timestamped migration naming convention. No migration was applied to a live database.

## Verification

- `admin-web`: `npm test` passed, 7/7.
- `admin-web`: `npm run build` passed, including Next.js type validation.
- `git diff --check` passed.
- Static assertion-count check confirmed the SQL file contains 93 pgTAP assertions, matching `plan(93)`.
- SQL execution could not be run: `psql` and `pg_prove` are unavailable, and the Docker daemon socket was inaccessible. The required SQL ABA and replay tests are present but still need execution in a Supabase/Postgres test environment.

## Remaining concern

The migration and SQL test have not been executed against PostgreSQL in this environment. The admin UI and TypeScript changes are covered by the completed test and build commands; a database migration/test run remains the outstanding verification step.

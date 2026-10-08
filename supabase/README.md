# Supabase setup — BUDDY RISE

## 1. Apply migrations

```bash
# from repo root (requires Supabase CLI linked to project)
supabase db push
```

Or apply [`migrations/20250619000000_initial_schema.sql`](migrations/20250619000000_initial_schema.sql) via Supabase Dashboard SQL editor.

## 2. Enable Anonymous Auth (mobile register) — **จำเป็น**

Supabase Dashboard → **Authentication** → **Providers** → เปิด **Anonymous sign-ins**

แอปใช้ anonymous session เท่านั้น (ไม่ส่ง email) — ถ้าไม่เปิดจะลงทะเบียนไม่ได้

ถ้าเคยโดน `over_email_send_rate_limit` จากการทดสอบ signup เก่า: รอ 15–60 นาที หรือดู **Authentication → Rate Limits** ใน Dashboard

## 3. Environment variables

- Mobile: copy [`pet-focus/.env.example`](../pet-focus/.env.example) → `pet-focus/.env`
- Admin: copy [`admin-web/.env.local.example`](../admin-web/.env.local.example) → `admin-web/.env.local`

**Never commit** db password or `service_role` key.

## 4. Seed admin user

Supabase Auth ยังต้องมี email ภายใน (ไม่แสดงให้ admin) — ใช้รูปแบบ `{username}@pet-focus.internal`

1. Dashboard → **Authentication** → **Users** → **Add user**
   - Email: `admin@pet-focus.internal` (ถ้า username = `admin`)
   - Password: ตั้งรหัสที่ admin จะใช้ login
2. Copy **User UID** จากหน้า user
3. รัน migration [`20250619100000_admin_username.sql`](migrations/20250619100000_admin_username.sql) ถ้ายังไม่ได้รัน
4. SQL editor:

```sql
insert into public.admin_users (user_id, username, email)
values (
  'YOUR-USER-UID-FROM-AUTH',
  'admin',
  'admin@pet-focus.internal'
);
```

5. Login ที่ admin-web ด้วย **username** `admin` + password (ไม่ใช่ email)

## 5. Register / reinstall

- RPC `register_student`: ถ้า `student_id` + `device_id` ตรงกับแถวเดิม (ลบแอปแล้วติดตั้งใหม่) จะผูก auth session ใหม่และคงประวัติ focus/usage/chore
- ใช้ migration [`20250619120000_register_student_device_restore.sql`](migrations/20250619120000_register_student_device_restore.sql)

**ถ้ารัน migration นี้ไปแล้วก่อนแก้ FK order:** รัน `create or replace function public.register_student(...)` ทั้งก้อนจากไฟล์ migration ล่าสุดใน Dashboard → SQL editor (ไม่ต้อง migrate ใหม่ทั้ง schema)

## 6. Verify

- Mobile: register student ID → row in `students`
- Admin: `cd admin-web && npm run dev` → login → dashboard shows counts

## 7. Deploy admin-web (Vercel)

1. Push repo ไป GitHub/GitLab/Bitbucket
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. **Root Directory** = `admin-web` (สำคัญ — โฟลเดอร์ `shared/` อยู่ระดับ repo root)
4. Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APK_DOWNLOAD_URL` — public URL ของไฟล์ APK (Supabase Storage / EAS artifact)
5. Deploy

### Supabase Auth (หลังได้ URL จริง)

Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: `https://YOUR-PROJECT.vercel.app`
- **Redirect URLs**: เพิ่ม `https://YOUR-PROJECT.vercel.app/**` (และ custom domain ถ้ามี)

### Deploy ด้วย CLI (ทางเลือก)

```bash
npm i -g vercel
cd admin-web
vercel link          # เลือก project / team
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_APK_DOWNLOAD_URL production
vercel --prod
```

## 8. Shared Coin Wallet — operation and rollout

This section describes the implemented contract and intended deployment order. It does **not** certify production migrations, device smoke checks, or admin login checks. Record the target project, migration list, mobile build, admin deployment, check results and operator before enabling production spending.

Confirmed coins live in `students.coins`; `coin_ledger` records each mutation and `student_inventory` records ownership. Pending mobile rewards cannot be spent or deducted. Prices are checked against the server catalog. UUID retries must preserve the original payload; never generate another UUID solely because a request timed out.

### Admin operation

Use the authenticated `/coins` page: look up student code, check identity and confirmed balance, enter a positive safe integer no larger than balance, review balance after deduction, then confirm. Server actions independently require admin authorization. The five-argument `admin_deduct_student_coins_v2` checks both expected balance and wallet version (ledger row count) while holding the student row lock. `BALANCE_CHANGED` requires a fresh lookup and confirmation; it must not silently deduct against another balance. Timeout retries use the original request UUID. The old four-argument overload must stay revoked.

### Exact production order

The sequence below is the initial transition design. For an existing project where the old delta RPC was already revoked during Phase 1, do not re-grant it to recreate this sequence. Keep spending restricted while completing the remaining mobile checks. For the current upgrade, the versioned admin migration must be applied before deploying the matching admin UI. Confirm live migration/privilege state instead of assuming it from file order.

1. Apply additive schema/catalog and focus/streak support: `20260923000000_coin_wallet_ledger.sql`, then `20260924145651_wallet_focus_streaks.sql`. Capture backups and current migration state first. Test migration behavior against a production-like database with existing balances/inventory.
2. Deploy the compatible Android mobile build using wallet v2 and transactional purchases.
3. Verify legacy inventory import, retained equipped items/active pet, pending rewards across restart/reconnect, stable UUID replay and history using pilot students. Preserve unresolved legacy `coin_delta` queues; reconcile delivery evidence before any adjustment.
4. Require the compatible build for spending. This is an operational release gate; the runbook does not claim an automatic minimum-version enforcement mechanism. Do not open general spending until distribution/restriction of old builds is verified.
5. Revoke the old delta RPC using `20260925033211_revoke_legacy_coin_delta.sql`. Check `PUBLIC`, `anon` and `authenticated` cannot execute `increment_student_coins(integer)`.
6. Apply `20261001151030_admin_deduction_wallet_version.sql`, then deploy/enable the matching admin deduction UI. Verify admin and non-admin authorization, stale confirmation, timeout replay and purchase-vs-deduction behavior before wider use.

**Do not run an unreviewed blanket `supabase db push` for the staged rollout.** It applies all pending migrations, including the delta revocation in step 5, before the mobile transition checks. Review pending migrations and use a controlled staging/apply procedure that preserves the above ordering; record applied versions in migration history. The versioned admin migration must precede the matching admin deployment. During that interval old admin deductions fail closed.

Required release checks:

```bash
supabase test db supabase/tests/coin_wallet.sql
cd pet-focus
npm test
npx tsc --noEmit
```

Run `npm run build` from `admin-web` separately. Record concurrency evidence for purchase vs deduction, two deductions with stale confirmation, duplicate reward replay, enqueue during flush, stale mobile response, non-negative balances and unique ownership. Local passing tests do not replace Android or production smoke checks.

### Monitoring and incident response

- Compare each student's latest ledger `balance_after` with `students.coins`, investigate mismatch before further mutations. Opening legacy balances may precede ledger history; do not assume ledger delta sum starts at zero.
- Monitor `OFFLINE`/`UNKNOWN`, `BALANCE_CHANGED`, `IDEMPOTENCY_CONFLICT`, reward queue age/count and unresolved `legacy_pending` on affected devices. Server cannot enumerate client-only pending queues; collect device diagnostics with student/request IDs, never face images or embeddings.
- Review `admin_deduction` ledger rows (`actor_user_id`, request UUID, amount, before/after balance, time and metadata) against redemptions. Never repair a timeout by issuing an untracked SQL balance update.
- Confirm the same UUID yields replay without another ledger/inventory change; investigate duplicate source/date credits, negative balances and duplicate student/item ownership. Treat conflicts as incidents, preserve ledger and original requests.

### Preserving-data rollback

Hide/disable new spending and admin deduction UI, stop issuing new reward/mutation requests, and retain queued rewards and pending purchases for later recovery. If UI controls cannot stop all clients, restrict mutation RPC execution for affected API roles through a reviewed temporary migration, recording exact grants for restoration; retain read access for investigation. Never roll back to a client that mutates local balances or calls the legacy delta RPC.

Keep `students.coins`, `coin_ledger`, `student_inventory`, catalog, challenge/idempotency records and device AsyncStorage intact. Do not drop tables, delete ledger entries, clear queues, rerun legacy imports with new UUIDs, or restore a database snapshot over newer ledger transactions. Leave the old delta and balance-only admin RPCs revoked. Restore the compatible application/versioned contract, audit preserved requests, restore only intended grants, then resume UUID retries and reconcile balances/inventory before reopening spending.

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

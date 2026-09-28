import { AdminNav } from '@/components/AdminNav'
import { CoinDeductionForm } from '@/components/coins/CoinDeductionForm'
import { requireAdmin } from '@/lib/supabase/server'

export default async function CoinsPage() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) return null

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">หักเหรียญนักเรียน</h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          ค้นหาด้วยรหัสนักเรียน ตรวจสอบยอด แล้วให้ผู้ดูแลยืนยันจำนวนเหรียญที่หัก
        </p>
        <CoinDeductionForm />
      </main>
    </>
  )
}

import Link from 'next/link'
import { AdminNav } from '@/components/AdminNav'
import { requireAdmin } from '@/lib/supabase/server'

export default async function StudentsPage() {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return null

  const { data: students } = await supabase
    .from('students')
    .select('id, student_id, created_at, class_name')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNav />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">รายชื่อนักเรียน</h1>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">รหัสนักเรียน</th>
                <th className="text-left px-4 py-3">ห้องเรียน</th>
                <th className="text-left px-4 py-3">ลงทะเบียนเมื่อ</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-medium">{s.student_id}</td>
                  <td className="px-4 py-3 text-slate-400">{s.class_name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(s.created_at).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="text-emerald-400 hover:underline">
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))}
              {(students ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    ยังไม่มีนักเรียนลงทะเบียน
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}

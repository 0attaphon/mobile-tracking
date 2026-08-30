import Link from 'next/link'
import { AdminNav } from '@/components/AdminNav'
import { AppUsageList } from '@/components/AppUsageList'
import { ClassNameEditor } from '@/components/ClassNameEditor'
import { PrintSummaryButton } from '@/components/PrintSummaryButton'
import { requireAdmin } from '@/lib/supabase/server'
import { resolveChoreQuestLabel } from '@shared/choreQuestLabels'

type AppUsage = { name: string; packageName: string; minutes: number; iconBase64?: string }

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return null

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoDate = weekAgo.toISOString().slice(0, 10)

  const [{ data: student }, { data: focusSessions }, { data: dailyUsage }, { data: chores }] =
    await Promise.all([
      supabase.from('students').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('focus_sessions')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('daily_usage')
        .select('*')
        .eq('student_id', id)
        .gte('date', weekAgoDate)
        .order('date', { ascending: false }),
      supabase
        .from('chore_completions')
        .select('*')
        .eq('student_id', id)
        .order('completed_at', { ascending: false })
        .limit(20),
    ])

  if (!student) {
    return (
      <>
        <div className="print:hidden">
          <AdminNav />
        </div>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <p>ไม่พบนักเรียน</p>
          <Link href="/students" className="text-emerald-400 text-sm">
            ← กลับ
          </Link>
        </main>
      </>
    )
  }

  const sessions = focusSessions ?? []
  const completed = sessions.filter((s) => s.status === 'completed').length
  const failed = sessions.filter((s) => s.status === 'failed').length
  const totalFocusMin = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)

  return (
    <>
      <div className="print:hidden">
        <AdminNav />
      </div>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="flex items-center justify-between">
            <Link href="/students" className="text-emerald-400 text-sm hover:underline print:hidden">
              ← กลับ
            </Link>
            <PrintSummaryButton />
          </div>
          <h1 className="text-2xl font-bold mt-2">รหัส {student.student_id}</h1>
          <p className="text-slate-400 text-sm">
            ลงทะเบียน {new Date(student.created_at).toLocaleString('th-TH')}
          </p>
          <div className="mt-3">
            <ClassNameEditor studentId={student.id} initialClassName={student.class_name} />
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Focus (20 ครั้งล่าสุด)</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MiniStat label="สำเร็จ" value={String(completed)} />
            <MiniStat label="ล้มเหลว" value={String(failed)} />
            <MiniStat label="นาทีรวม" value={String(totalFocusMin)} />
          </div>
          <SessionTable sessions={sessions} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Screen time (7 วัน)</h2>
          <UsageTable rows={dailyUsage ?? []} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">เควสทำงานบ้าน</h2>
          <ChoreTable rows={chores ?? []} />
        </section>
      </main>
    </>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function SessionTable({
  sessions,
}: {
  sessions: {
    status: string
    duration_minutes: number
    coins_earned: number
    created_at: string
  }[]
}) {
  if (sessions.length === 0) {
    return <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 text-sm">
      <table className="w-full">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="text-left px-3 py-2">วันที่</th>
            <th className="text-left px-3 py-2">สถานะ</th>
            <th className="text-left px-3 py-2">นาที</th>
            <th className="text-left px-3 py-2">เหรียญ</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="px-3 py-2">{new Date(s.created_at).toLocaleString('th-TH')}</td>
              <td className="px-3 py-2">{s.status}</td>
              <td className="px-3 py-2">{s.duration_minutes}</td>
              <td className="px-3 py-2">{s.coins_earned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UsageTable({
  rows,
}: {
  rows: {
    date: string
    total_screen_minutes: number
    focus_minutes: number
    top_apps: AppUsage[]
  }[]
}) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.date} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="font-medium">{row.date}</p>
          <p className="text-slate-400 text-sm">
            Screen {row.total_screen_minutes} นาที · Focus {row.focus_minutes} นาที
          </p>
          <AppUsageList apps={row.top_apps ?? []} limit={5} />
        </div>
      ))}
    </div>
  )
}

function ChoreTable({
  rows,
}: {
  rows: { quest_id: string; date: string; coins_earned: number; completed_at: string }[]
}) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 text-sm">
      <table className="w-full">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="text-left px-3 py-2">เควส</th>
            <th className="text-left px-3 py-2">วันที่</th>
            <th className="text-left px-3 py-2">เหรียญ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="px-3 py-2">{resolveChoreQuestLabel(r.quest_id)}</td>
              <td className="px-3 py-2">{r.date}</td>
              <td className="px-3 py-2">{r.coins_earned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

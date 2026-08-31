import Link from 'next/link'
import { AdminNav } from '@/components/AdminNav'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { buildDashboardChartData, lastNDays } from '@/lib/dashboardStats'
import { requireAdmin } from '@/lib/supabase/server'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default async function DashboardPage() {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return null

  const today = todayIsoDate()
  const days = lastNDays(7)
  const weekStart = days[0]

  const [
    { count: studentCount },
    { data: todayFocus },
    { data: todayUsage },
    { data: focusSessions7d },
    { data: dailyUsage7d },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('focus_sessions').select('status, duration_minutes').gte('created_at', `${today}T00:00:00`),
    supabase.from('daily_usage').select('total_screen_minutes').eq('date', today),
    supabase
      .from('focus_sessions')
      .select('status, duration_minutes, created_at')
      .gte('created_at', `${weekStart}T00:00:00`),
    supabase
      .from('daily_usage')
      .select('date, total_screen_minutes, focus_minutes, top_apps')
      .gte('date', weekStart),
  ])

  const focusRows = todayFocus ?? []
  const completed = focusRows.filter((r) => r.status === 'completed').length
  const failed = focusRows.filter((r) => r.status === 'failed').length
  const focusMinutes = focusRows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0)
  const usageRows = todayUsage ?? []
  const avgScreen =
    usageRows.length > 0
      ? Math.round(
          usageRows.reduce((sum, r) => sum + (r.total_screen_minutes ?? 0), 0) / usageRows.length
        )
      : 0

  const chartData = buildDashboardChartData(days, focusSessions7d ?? [], dailyUsage7d ?? [])

  return (
    <>
      <AdminNav />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="นักเรียนทั้งหมด" value={String(studentCount ?? 0)} />
          <StatCard label="Focus สำเร็จวันนี้" value={String(completed)} />
          <StatCard label="Focus ล้มเหลววันนี้" value={String(failed)} />
          <StatCard label="นาทีโฟกัสวันนี้" value={String(focusMinutes)} />
        </div>
        <div className="mt-4">
          <StatCard label="Screen time เฉลี่ยวันนี้ (นาที)" value={String(avgScreen)} />
        </div>

        <DashboardCharts data={chartData} />

        <Link
          href="/students"
          className="inline-block mt-8 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm"
        >
          ดูรายชื่อนักเรียน →
        </Link>
      </main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5">
      <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

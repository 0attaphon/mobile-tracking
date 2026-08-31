import type { StackedDayPoint } from '@/lib/dashboardStats'

export function StackedBarChart({
  title,
  subtitle,
  series,
}: {
  title: string
  subtitle?: string
  series: StackedDayPoint[]
}) {
  const maxVal = Math.max(...series.map((d) => d.completed + d.failed), 1)

  return (
    <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p> : null}
        </div>
        <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            สำเร็จ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80" />
            ล้มเหลว
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-44">
        {series.map((day) => {
          const total = day.completed + day.failed
          const totalPct = (total / maxVal) * 100
          const completedShare = total > 0 ? (day.completed / total) * 100 : 0
          return (
            <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full">
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">{total}</span>
              <div className="w-full flex-1 flex flex-col justify-end">
                <div
                  className="w-full flex flex-col-reverse overflow-hidden rounded-t-md"
                  style={{ height: `${totalPct}%`, minHeight: total > 0 ? '4px' : '0' }}
                  title={`${day.label}: สำเร็จ ${day.completed}, ล้มเหลว ${day.failed}`}
                >
                  {day.completed > 0 ? (
                    <div className="w-full bg-emerald-500" style={{ height: `${completedShare}%` }} />
                  ) : null}
                  {day.failed > 0 ? (
                    <div
                      className="w-full bg-red-500/80"
                      style={{ height: `${100 - completedShare}%` }}
                    />
                  ) : null}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 text-center leading-tight">{day.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

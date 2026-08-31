import type { DayPoint } from '@/lib/dashboardStats'

const BAR_COLOR = '#10b981'

export function BarChart({
  title,
  subtitle,
  series,
  unit,
  color = BAR_COLOR,
}: {
  title: string
  subtitle?: string
  series: DayPoint[]
  unit?: string
  color?: string
}) {
  const maxVal = Math.max(...series.map((d) => d.value), 1)

  return (
    <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle ? <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="flex items-end gap-2 h-44">
        {series.map((day) => {
          const pct = (day.value / maxVal) * 100
          return (
            <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full">
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                {day.value}
                {unit ? ` ${unit}` : ''}
              </span>
              <div className="w-full flex-1 flex flex-col justify-end">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${pct}%`, minHeight: day.value > 0 ? '4px' : '0', backgroundColor: color }}
                  title={`${day.label}: ${day.value}${unit ? ` ${unit}` : ''}`}
                />
              </div>
              <span className="text-[10px] text-slate-500 text-center leading-tight">{day.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

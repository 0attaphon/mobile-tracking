import {
  appAvatarColor,
  appIconSrc,
  appInitial,
  displayAppUsage,
  formatUsageMinutes,
  type AppUsageDisplay,
} from '@/lib/appUsageDisplay'

const BAR_COLORS = ['#5DB347', '#F5C518', '#F57C00', '#FF8C00', '#A0A878']

function AppIcon({ app }: { app: AppUsageDisplay }) {
  const src = appIconSrc(app.iconBase64)
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
    )
  }

  return (
    <div
      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
      style={{ backgroundColor: appAvatarColor(app.packageName) }}
    >
      {appInitial(app.name)}
    </div>
  )
}

export function AppUsageList({
  apps,
  maxMinutes,
  limit = 5,
}: {
  apps: AppUsageDisplay[]
  maxMinutes?: number
  limit?: number
}) {
  const normalized = displayAppUsage(apps).slice(0, limit)
  if (normalized.length === 0) return null

  const maxVal = maxMinutes ?? Math.max(...normalized.map((a) => a.minutes), 1)

  return (
    <div className="mt-2 space-y-2">
      {normalized.map((app, idx) => {
        const pct = app.minutes / maxVal
        return (
          <div key={`${app.packageName}-${idx}`}>
            <div className="flex items-center gap-2">
              <AppIcon app={app} />
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{app.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{formatUsageMinutes(app.minutes)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1 ml-10">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct * 100}%`, backgroundColor: BAR_COLORS[idx] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

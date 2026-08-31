import { AppUsageList } from '@/components/AppUsageList'
import { BarChart } from '@/components/dashboard/BarChart'
import { StackedBarChart } from '@/components/dashboard/StackedBarChart'
import type { DashboardChartData } from '@/lib/dashboardStats'

export function DashboardCharts({ data }: { data: DashboardChartData }) {
  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">แนวโน้ม 7 วันล่าสุด</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StackedBarChart
          title="Focus sessions"
          subtitle="จำนวนครั้งสำเร็จ vs ล้มเหลวต่อวัน"
          series={data.focusStacked}
        />
        <BarChart
          title="นาทีโฟกัสรวม"
          subtitle="รวมทุกนักเรียน"
          series={data.focusMinutes}
          unit="น."
          color="#34d399"
        />
        <BarChart
          title="Screen time เฉลี่ย"
          subtitle="เฉลี่ยต่อนักเรียนที่ sync ข้อมูล"
          series={data.avgScreenMinutes}
          unit="น."
          color="#f59e0b"
        />
        <BarChart
          title="นักเรียนที่ sync ข้อมูล"
          subtitle="จำนวนคนที่มี daily usage ต่อวัน"
          series={data.activeStudents}
          unit="คน"
          color="#6366f1"
        />
      </div>

      {data.topApps.length > 0 ? (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-1">แอปที่ใช้มากที่สุด (7 วัน)</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">รวมจากทุกนักเรียน</p>
          <AppUsageList apps={data.topApps} limit={5} />
        </div>
      ) : null}
    </div>
  )
}

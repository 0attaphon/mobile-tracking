'use client'

export function PrintSummaryButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
    >
      พิมพ์/บันทึกสรุป
    </button>
  )
}

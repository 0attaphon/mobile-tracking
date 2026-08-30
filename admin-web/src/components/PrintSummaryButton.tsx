'use client'

export function PrintSummaryButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-slate-700"
    >
      พิมพ์/บันทึกสรุป
    </button>
  )
}

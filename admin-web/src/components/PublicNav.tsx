import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

export function PublicNav() {
  return (
    <nav className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-emerald-600 dark:text-emerald-400">
        BUDDY RISE
      </Link>
      <Link href="/" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-sm">
        หน้าแรก
      </Link>
      <Link href="/download" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-sm">
        ดาวน์โหลด
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        <Link
          href="/login"
          className="text-sm border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-4 py-1.5"
        >
          Admin Login
        </Link>
      </div>
    </nav>
  )
}

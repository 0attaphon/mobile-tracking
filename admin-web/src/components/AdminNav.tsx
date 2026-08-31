import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

export function AdminNav() {
  return (
    <nav className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 px-6 py-4 flex items-center gap-6">
      <Link href="/dashboard" className="font-bold text-emerald-600 dark:text-emerald-400">
        BUDDY RISE Admin
      </Link>
      <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-sm">
        Dashboard
      </Link>
      <Link href="/students" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-sm">
        นักเรียน
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </nav>
  )
}

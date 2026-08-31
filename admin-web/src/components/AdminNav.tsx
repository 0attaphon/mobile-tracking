import Link from 'next/link'

export function AdminNav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center gap-6">
      <Link href="/dashboard" className="font-bold text-emerald-400">
        BUDDY RISE Admin
      </Link>
      <Link href="/dashboard" className="text-slate-300 hover:text-white text-sm">
        Dashboard
      </Link>
      <Link href="/students" className="text-slate-300 hover:text-white text-sm">
        นักเรียน
      </Link>
      <form action="/auth/signout" method="POST" className="ml-auto">
        <button type="submit" className="text-sm text-slate-400 hover:text-white">
          ออกจากระบบ
        </button>
      </form>
    </nav>
  )
}

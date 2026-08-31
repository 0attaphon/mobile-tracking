import Link from 'next/link'

export function PublicNav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-emerald-400">
        BUDDY RISE
      </Link>
      <Link href="/" className="text-slate-300 hover:text-white text-sm">
        หน้าแรก
      </Link>
      <Link href="/download" className="text-slate-300 hover:text-white text-sm">
        ดาวน์โหลด
      </Link>
      <Link
        href="/login"
        className="ml-auto text-sm border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-lg px-4 py-1.5"
      >
        Admin Login
      </Link>
    </nav>
  )
}

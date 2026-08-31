import { PublicNav } from '@/components/PublicNav'

export default function DownloadPage() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL

  return (
    <>
      <PublicNav />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">ดาวน์โหลด BUDDY RISE</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">ติดตั้งแอปบน Android เพื่อเริ่มใช้งาน</p>

        {apkUrl ? (
          <a
            href={apkUrl}
            download
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-8 py-3 font-medium mb-8"
          >
            ดาวน์โหลด APK
          </a>
        ) : (
          <p className="text-amber-700 bg-amber-100 border border-amber-300 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/30 rounded-lg px-4 py-3 mb-8 text-sm">
            ลิงก์ดาวน์โหลดยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ
          </p>
        )}

        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">วิธีติดตั้ง</h2>
          <ol className="list-decimal list-inside space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            <li>ดาวน์โหลดไฟล์ APK แล้วเปิดไฟล์บนมือถือ Android</li>
            <li>
              ถ้าระบบถาม ให้อนุญาต <span className="text-slate-800 dark:text-slate-300">Install unknown apps</span>{' '}
              สำหรับเบราว์เซอร์หรือ File Manager ที่ใช้เปิดไฟล์
            </li>
            <li>ติดตั้งแอปแล้วเปิด BUDDY RISE</li>
            <li>ลงทะเบียนด้วยรหัสนักเรียนที่ได้รับจากโรงเรียน (1 รหัส = 1 เครื่อง)</li>
          </ol>
        </div>

        <p className="text-slate-500 text-xs mt-6">รองรับ Android เท่านั้น</p>
      </main>
    </>
  )
}

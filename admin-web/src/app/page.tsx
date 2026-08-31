import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'

const features = [
  {
    title: 'Focus Mode',
    description: 'ตั้งเวลาโฟกัส 30–180 นาที สัตว์เลี้ยงมีความสุขและได้เหรียญเมื่อสำเร็จ เปิดแอปที่ห้ามใช้แล้ว session จะล้มเหลว',
  },
  {
    title: 'เควสทำงานบ้าน',
    description: 'ถ่ายรูปงานบ้านเพื่อรับเหรียญ ตรวจสอบด้วย AI บนเครื่อง ไม่เก็บรูปขึ้น cloud',
  },
  {
    title: 'Screen Time Stats',
    description: 'ดูเวลาใช้มือถือรายวัน สรุปสัปดาห์ และ AI tip ช่วยปรับพฤติกรรม',
  },
  {
    title: 'สัตว์เลี้ยง & ร้านค้า',
    description: 'เลี้ยงแมวหรือซื้อหมา แต่งตัวและตกแต่งห้องด้วยเหรียญที่สะสมได้',
  },
]

export default function LandingPage() {
  return (
    <>
      <PublicNav />
      <main>
        <section className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">BUDDY RISE</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            แอปช่วยลดเวลาใช้มือถือสำหรับนักเรียน ด้วยสัตว์เลี้ยงเสมือนเป็นแรงจูงใจ
            โฟกัสให้สำเร็จ สัตว์เลี้ยงมีความสุข ได้เหรียญไปแต่งตัวและตกแต่งห้อง
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/download"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-8 py-3 font-medium"
            >
              ดาวน์โหลด APK
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-4">รองรับ Android เท่านั้น</p>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">ฟีเจอร์หลัก</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <h2 className="text-xl font-bold mb-3">เริ่มใช้งาน</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto mb-6">
              ดาวน์โหลดแอป ติดตั้งบน Android แล้วลงทะเบียนด้วยรหัสนักเรียนที่ได้รับจากโรงเรียน
            </p>
            <Link
              href="/download"
              className="inline-block text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm"
            >
              ไปหน้าดาวน์โหลด →
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}

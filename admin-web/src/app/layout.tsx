import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'BUDDY RISE',
  description: 'แอปช่วยลดเวลาใช้มือถือสำหรับนักเรียน ด้วยสัตว์เลี้ยงเสมือนเป็นแรงจูงใจ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

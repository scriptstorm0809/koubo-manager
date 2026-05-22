import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '口播词管理',
  description: '口播文案管理器 - 手机提词器',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="min-h-full bg-[#0f0f0f] text-[#e5e5e5]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}

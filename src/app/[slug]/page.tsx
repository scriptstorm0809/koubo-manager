import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getScript } from '@/lib/scripts'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const script = await getScript(slug)
  return { title: script?.title || slug }
}

export default async function ScriptPage({ params }: Props) {
  const { slug } = await params
  const script = await getScript(slug)

  if (!script) notFound()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5] flex flex-col">
      <header className="sticky top-0 z-10 border-b border-[#2a2a2a] bg-[#0f0f0f]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-[#737373] hover:text-white transition-colors"
            >
              <span>‹</span>
              <span>返回</span>
            </Link>
            <span className="text-xs text-[#737373]">
              {script.wordCount} 字 · {script.estimatedDuration}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-6">
        <h1 className="text-xl font-semibold text-white mb-6 leading-snug">
          {script.title}
        </h1>
        <div
          className="reader-content"
          dangerouslySetInnerHTML={{ __html: script.contentHtml }}
        />
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'koubo-font-size'
const MIN = 14
const MAX = 28
const DEFAULT = 20

interface Props {
  script: {
    slug: string
    title: string
    wordCount: number
    estimatedDuration: string
    contentHtml: string
  }
}

export default function ScriptPage({ script }: Props) {
  const [fontSize, setFontSize] = useState(DEFAULT)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setFontSize(Number(saved))
  }, [])

  const adjust = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(MAX, Math.max(MIN, prev + delta))
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5] flex flex-col">
      <header className="sticky top-0 z-10 border-b border-[#2a2a2a] bg-[#0f0f0f]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-[#737373] hover:text-white transition-colors shrink-0"
          >
            <span>‹</span>
            <span>返回</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => adjust(-2)}
              className="w-8 h-8 flex items-center justify-center rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] text-sm hover:text-white transition-colors"
              aria-label="字体缩小"
            >
              A−
            </button>
            <span className="text-xs text-[#737373] w-6 text-center">{fontSize}</span>
            <button
              onClick={() => adjust(2)}
              className="w-8 h-8 flex items-center justify-center rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] text-sm hover:text-white transition-colors"
              aria-label="字体放大"
            >
              A+
            </button>
          </div>

          <span className="text-xs text-[#737373] shrink-0">
            {script.wordCount} 字 · {script.estimatedDuration}
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-6">
        <h1 className="text-xl font-semibold text-white mb-6 leading-snug">
          {script.title}
        </h1>
        <div
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: script.contentHtml }}
        />
      </main>
    </div>
  )
}

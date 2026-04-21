'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { ScriptMeta } from '@/lib/scripts'

type Filter = 'all' | 'unshot' | 'shot'

const STORAGE_KEY = 'koubo-shot-v2'

function getShotSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveShotSet(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export default function Home() {
  const [scripts, setScripts] = useState<ScriptMeta[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [shotSet, setShotSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    setShotSet(getShotSet())
    fetch('/api/scripts')
      .then((r) => r.json())
      .then((data) => setScripts(data))
  }, [])

  const toggleShot = useCallback((slug: string) => {
    setShotSet((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      saveShotSet(next)
      return next
    })
  }, [])

  const filtered = scripts.filter((s) => {
    if (filter === 'shot') return shotSet.has(s.slug)
    if (filter === 'unshot') return !shotSet.has(s.slug)
    return true
  })

  const shotCount = scripts.filter((s) => shotSet.has(s.slug)).length

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5]">
      <header className="sticky top-0 z-10 border-b border-[#2a2a2a] bg-[#0f0f0f]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">口播词</h1>
            <span className="text-sm text-[#737373]">
              已拍 {shotCount}/{scripts.length}
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {(['all', 'unshot', 'shot'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? f === 'shot'
                      ? 'bg-[#22c55e] text-black'
                      : f === 'unshot'
                      ? 'bg-[#e53935] text-white'
                      : 'bg-[#3a3a3a] text-white'
                    : 'bg-[#1a1a1a] text-[#737373] hover:bg-[#252525]'
                }`}
              >
                {f === 'all' ? '全部' : f === 'shot' ? '已拍' : '未拍'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#737373]">
            <span className="text-4xl">📭</span>
            <p className="mt-3 text-sm">
              {filter === 'all' ? '暂无口播词' : filter === 'shot' ? '还没有已拍的口播词' : '全部已拍完 🎉'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((s) => {
              const shot = shotSet.has(s.slug)
              return (
                <li key={s.slug}>
                  <Link
                    href={`/${s.slug}`}
                    className="group flex items-start gap-3 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4 transition-all hover:border-[#3a3a3a] active:scale-[0.99]"
                  >
                    <input
                      type="checkbox"
                      checked={shot}
                      onChange={() => {}}
                      onClick={(e) => {
                        e.preventDefault()
                        toggleShot(s.slug)
                      }}
                      className="mt-0.5"
                      aria-label={shot ? '标记为未拍' : '标记为已拍'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${shot ? 'text-[#737373] line-through' : 'text-[#e5e5e5]'}`}>
                        {s.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-[#737373]">
                        <span>{s.date}</span>
                        <span className="text-[#3a3a3a]">·</span>
                        <span>{s.wordCount} 字</span>
                        {s.estimatedDuration && (
                          <>
                            <span className="text-[#3a3a3a]">·</span>
                            <span>{s.estimatedDuration}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="mt-0.5 shrink-0 text-[#3a3a3a] transition-colors group-hover:text-[#737373]">
                      ›
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

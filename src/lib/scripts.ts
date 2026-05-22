import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const BUNDLED_DIR = path.join(process.cwd(), 'data/口播词')
const RUNTIME_DIR = process.env.KOUBO_RUNTIME_DIR || (process.env.VERCEL ? '/tmp/koubo' : null)

function getReadDirs(): string[] {
  const dirs = [BUNDLED_DIR]
  if (RUNTIME_DIR && RUNTIME_DIR !== BUNDLED_DIR) {
    dirs.push(RUNTIME_DIR)
  }
  return dirs
}

export interface ScriptMeta {
  slug: string
  title: string
  date: string
  status: string
  wordCount: number
  estimatedDuration: string
  sourceTopic: string
}

export interface Script extends ScriptMeta {
  contentHtml: string
}

function normalizeDate(value: unknown, fallback: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && value.trim()) return value.slice(0, 10)
  return fallback
}

export function getAllScriptDirs(): string[] {
  const dirs = new Set<string>()
  for (const base of getReadDirs()) {
    if (!fs.existsSync(base)) continue
    for (const d of fs.readdirSync(base)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dirs.add(d)
    }
  }
  return [...dirs].sort().reverse()
}

export async function getAllScripts(): Promise<ScriptMeta[]> {
  const dirs = getAllScriptDirs()
  const scripts: ScriptMeta[] = []
  const slugs = new Set<string>()

  for (const dir of dirs) {
    for (const base of getReadDirs()) {
      const dirPath = path.join(base, dir)
      if (!fs.existsSync(dirPath)) continue
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'))

      for (const file of files) {
        const slug = file.replace(/\.md$/, '')
        if (slugs.has(slug)) continue
        slugs.add(slug)

        const filePath = path.join(dirPath, file)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data, content } = matter(raw)

        scripts.push({
          slug,
          title: data.title || slug,
          date: normalizeDate(data.date, dir),
          status: data.status || 'draft',
          wordCount: data.word_count || Math.round(content.replace(/\n/g, '').length),
          estimatedDuration: data.estimated_duration || '',
          sourceTopic: data.source_topic || '',
        })
      }
    }
  }

  return scripts.sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export async function getScript(slug: string): Promise<Script | null> {
  const dirs = getAllScriptDirs()

  for (const dir of dirs) {
    for (const base of getReadDirs()) {
      const filePath = path.join(base, dir, `${slug}.md`)
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data, content } = matter(raw)
        const processed = await remark().use(html).process(content)
        const contentHtml = processed.toString()

        return {
          slug,
          title: data.title || slug,
          date: normalizeDate(data.date, dir),
          status: data.status || 'draft',
          wordCount: data.word_count || Math.round(content.replace(/\n/g, '').length),
          estimatedDuration: data.estimated_duration || '',
          sourceTopic: data.source_topic || '',
          contentHtml,
        }
      }
    }
  }
  return null
}

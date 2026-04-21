import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const KOUBO_DIR = path.join(process.cwd(), 'data/口播词')

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

function padDate(n: number) {
  return n.toString().padStart(2, '0')
}

function getTodayDir(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = padDate(now.getMonth() + 1)
  const day = padDate(now.getDate())
  return `${year}-${month}-${day}`
}

export function getAllScriptDirs(): string[] {
  if (!fs.existsSync(KOUBO_DIR)) return []
  return fs
    .readdirSync(KOUBO_DIR)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse()
}

export async function getAllScripts(): Promise<ScriptMeta[]> {
  const dirs = getAllScriptDirs()
  const scripts: ScriptMeta[] = []

  for (const dir of dirs) {
    const dirPath = path.join(KOUBO_DIR, dir)
    if (!fs.existsSync(dirPath)) continue
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'))

    for (const file of files) {
      const slug = file.replace(/\.md$/, '')
      const filePath = path.join(dirPath, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = matter(raw)

      scripts.push({
        slug,
        title: data.title || slug,
        date: data.date || dir,
        status: data.status || 'draft',
        wordCount: data.word_count || Math.round(content.replace(/\n/g, '').length),
        estimatedDuration: data.estimated_duration || '',
        sourceTopic: data.source_topic || '',
      })
    }
  }

  return scripts.sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export async function getScript(slug: string): Promise<Script | null> {
  const dirs = getAllScriptDirs()

  for (const dir of dirs) {
    const filePath = path.join(KOUBO_DIR, dir, `${slug}.md`)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = matter(raw)
      const processed = await remark().use(html).process(content)
      const contentHtml = processed.toString()

      return {
        slug,
        title: data.title || slug,
        date: data.date || dir,
        status: data.status || 'draft',
        wordCount: data.word_count || Math.round(content.replace(/\n/g, '').length),
        estimatedDuration: data.estimated_duration || '',
        sourceTopic: data.source_topic || '',
        contentHtml,
      }
    }
  }
  return null
}

import fs from 'fs'
import path from 'path'
import type { ScriptMeta } from '@/lib/scripts'

const KOUBO_DIR = process.env.KOUBO_RUNTIME_DIR
  ? process.env.KOUBO_RUNTIME_DIR
  : process.env.VERCEL
    ? '/tmp/koubo'
    : path.join(process.cwd(), 'data/口播词')
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5.5'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const SCRIPT_MIN_SCORE = 8

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const OPENROUTER_TIMEOUT_MS = readPositiveNumber(process.env.OPENROUTER_TIMEOUT_MS, 60_000)
const SEARCH_MAX_RESULTS = Math.min(readPositiveNumber(process.env.OPENROUTER_SEARCH_MAX_RESULTS, 3), 5)

interface GeneratedSource {
  title: string
  url: string
  evidence: string
}

interface GeneratedScript {
  title: string
  slug: string
  source_topic: string
  estimated_duration: string
  content: string
  sources: GeneratedSource[]
  viral_review: ViralReview
}

interface ViralReview {
  score: number
  opening_hook: string
  conflict_or_gap: string
  viewer_benefit: string
  plain_language_check: string
  broad_audience_fit: string
  too_niche: boolean
  revision_note: string
}

interface GeneratedScriptsResponse {
  scripts: GeneratedScript[]
}

interface OpenRouterChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  error?: {
    message?: string
  }
}

const responseSchema = {
  type: 'object',
  properties: {
    scripts: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '爆款口播标题，中文，直接表达事件或结论。',
          },
          slug: {
            type: 'string',
            description: '英文小写 slug，只能包含 a-z、0-9 和短横线。',
          },
          source_topic: {
            type: 'string',
            description: '选题来源和角度，中文。',
          },
          estimated_duration: {
            type: 'string',
            description: '预估口播时长，例如 1m20s。',
          },
          content: {
            type: 'string',
            description: '220 到 320 中文字口播正文，不要 Markdown 标题。',
          },
          sources: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                evidence: {
                  type: 'string',
                  description: '这条来源支撑了文案里的哪个事实。',
                },
              },
              required: ['title', 'url', 'evidence'],
              additionalProperties: false,
            },
          },
          viral_review: {
            type: 'object',
            properties: {
              score: {
                type: 'number',
                minimum: 0,
                maximum: 10,
                description: '按抖音口播爆款潜力打分，8 分以下必须重写，不能交付。',
              },
              opening_hook: {
                type: 'string',
                description: '首句钩子为什么能让人停下来。',
              },
              conflict_or_gap: {
                type: 'string',
                description: '文案里的冲突、反差或信息差。',
              },
              viewer_benefit: {
                type: 'string',
                description: '观众听完能得到的明确收益。',
              },
              plain_language_check: {
                type: 'string',
                description: '说明文案如何避免黑话，普通出海老板或运营能不能听懂。',
              },
              broad_audience_fit: {
                type: 'string',
                description: '说明为什么这个选题不小众，能被更广泛的出海人理解。',
              },
              too_niche: {
                type: 'boolean',
                description: '如果选题太垂直、太行业简报、普通观众读不懂，则为 true。',
              },
              revision_note: {
                type: 'string',
                description: '如果已经重写过，说明如何改得更爆款。',
              },
            },
            required: [
              'score',
              'opening_hook',
              'conflict_or_gap',
              'viewer_benefit',
              'plain_language_check',
              'broad_audience_fit',
              'too_niche',
              'revision_note',
            ],
            additionalProperties: false,
          },
        },
        required: ['title', 'slug', 'source_topic', 'estimated_duration', 'content', 'sources', 'viral_review'],
        additionalProperties: false,
      },
    },
  },
  required: ['scripts'],
  additionalProperties: false,
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

function sanitizeSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)

  return slug || `ai-overseas-topic-${Date.now()}`
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/\r\n/g, '\n').trim())
}

function wordCount(content: string): number {
  return content.replace(/\s/g, '').length
}

function extractMessageContent(data: OpenRouterResponse): string {
  const content = data.choices?.[0]?.message?.content

  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text || '')
      .join('')
      .trim()
  }

  return ''
}

function stripMarkdownCodeBlock(raw: string): string {
  let text = raw.trim()
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim()
  }
  return text
}

function repairTruncatedJson(text: string): string {
  let repaired = text.replace(/\\$/g, '')
  if (repaired.endsWith('{') || repaired.endsWith('[') || repaired.endsWith(',')) {
    repaired = repaired.replace(/,\s*$/, '')
  }

  const unescapedDoubleQuotes = (repaired.match(/(?<!\\)"/g) || []).length

  if (unescapedDoubleQuotes % 2 !== 0) {
    repaired += '"'
  }

  const bracketStack: string[] = []
  let insideString = false
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i]
    if (ch === '"' && repaired[i - 1] !== '\\') {
      insideString = !insideString
    } else if (!insideString) {
      if (ch === '{' || ch === '[') {
        bracketStack.push(ch)
      } else if (ch === '}' || ch === ']') {
        const expected = bracketStack[bracketStack.length - 1]
        if ((ch === '}' && expected === '{') || (ch === ']' && expected === '[')) {
          bracketStack.pop()
        }
      }
    }
  }

  while (bracketStack.length > 0) {
    const last = bracketStack.pop()
    repaired += last === '{' ? '}' : ']'
  }

  return repaired
}

function detectTruncation(content: string): boolean {
  const trimmed = content.trim()
  // Heuristic: valid complete JSON must end with } or ]
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) return true
  try {
    JSON.parse(trimmed)
    return false
  } catch {
    return true
  }
}

function repairJson(raw: string): string {
  let text = raw.trim()

  // Find the outermost { ... } by balancing braces
  let depth = 0
  let braceStart = -1
  let braceEnd = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) braceStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        braceEnd = i + 1
        break
      }
    }
  }

  if (braceStart >= 0 && braceEnd > braceStart) {
    text = text.slice(braceStart, braceEnd)
  }

  text = text.replace(/,(\s*[}\]])/g, '$1')

  // Insert missing commas between adjacent string values:
  // "foo""bar" → "foo","bar" (adjacent after optional whitespace)
  text = text.replace(/"(\s*)(?=")/g, (_, whitespace: string) => {
    return `",${whitespace}`
  })

  text = text.replace(/,\s*,/g, ',')

  return text
}

function parseGeneratedContent(content: string): GeneratedScriptsResponse {
  const clean = stripMarkdownCodeBlock(content)
  const repaired = repairJson(clean)

  let lastError: unknown
  const attempts = [repaired, clean, content]

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as GeneratedScriptsResponse
    } catch (e) {
      lastError = e
      continue
    }
  }

  // All attempts failed — check if the response was truncated (e.g., hit token limit)
  const isTruncated = detectTruncation(clean)

  if (isTruncated) {
    const truncatedRepaired = repairTruncatedJson(clean)
    try {
      const partial = JSON.parse(truncatedRepaired) as GeneratedScriptsResponse
      if (Array.isArray(partial.scripts) && partial.scripts.length > 0) {
        return partial
      }
    } catch {
    }
  }

  const match = content.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0]) as GeneratedScriptsResponse
    } catch {
    }
  }

  const err = lastError instanceof Error ? lastError.message : '模型没有返回可解析的 JSON。'
  const truncationHint = isTruncated ? '\n模型输出被截断，建议增加 max_tokens 或减少生成篇数。' : ''
  const preview = content.length > 500 ? content.slice(0, 500) + '…' : content
  throw new Error(`${err}${truncationHint}\n\n模型原始返回内容：\n${preview}`)
}

function validateGeneratedScripts(data: GeneratedScriptsResponse, count: number): GeneratedScript[] {
  if (!Array.isArray(data.scripts) || data.scripts.length === 0) {
    throw new Error('模型没有生成任何口播稿。')
  }

  const scripts = data.scripts.slice(0, count)

  for (const script of scripts) {
    if (!script.title?.trim() || !script.content?.trim()) {
      throw new Error('模型返回的口播稿缺少标题或正文。')
    }

    const validSources = script.sources?.filter((source) => /^https?:\/\//.test(source.url)) || []
    if (validSources.length === 0) {
      throw new Error(`「${script.title}」缺少可验证的来源链接。`)
    }

    if (!script.viral_review || script.viral_review.score < SCRIPT_MIN_SCORE || script.viral_review.too_niche) {
      throw new Error(`「${script.title}」爆款自检未通过，请重新生成。`)
    }

    script.sources = validSources
  }

  return scripts
}

function buildPrompt(count: number, today: string): string {
  return `今天是 ${today}。请只做 1 次综合 web search，快速找到最近 7-30 天和 App 出海、AI 出海、广告买量、订阅变现相关的强热点，然后生成 ${count} 篇中文抖音口播稿。

博主定位：
- AI 出海博主，讲给中国 App 出海开发者、老板、运营和增长负责人听。
- 方向：买量变贵、素材跑不动、订阅留不住、爆款产品怎么火、AI 怎么帮出海团队省钱。

选题要求：
- 必须有真实来源 URL，不能编数据。
- 选普通人能懂的热点，不选冷门 beta 功能、缩写指标、行业简报。
- 开头先讲“和你的 App/预算/订阅有什么关系”，不要先堆平台名和功能名。

抖音爆款机制：
- 前 3 秒停滑：数字冲击、痛点提问、反差判断、利益前置、反常识。
- 必须有冲突：装机多但不赚钱、广告越来越贵、功能普通但订阅强。
- 少黑话，多用“你”“你的 App”“投放预算”“订阅用户”。
- 一篇只讲一个观点，结尾给一句能转述的判断。

口播稿风格：
- 220 到 320 中文字。
- 开头第一句直接抛事件、数字或反常识判断。
- 中段按“现象 -> 为什么重要 -> 普通出海人怎么学”推进。
- 结尾给一个明确观点，不要写成新闻摘要。
- 语气贴近抖音真人口播，直接、有冲突、有画面感。

生成前自检：
- 一个不懂专业术语、但做 App 出海的人，听第一句能不能停下来？不行就重写。
- viral_review.score 必须 >= ${SCRIPT_MIN_SCORE}，too_niche 必须是 false。

请只返回符合 JSON Schema 的 JSON，不要加额外解释。`
}

async function callOpenRouter(count: number): Promise<GeneratedScript[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('缺少 OPENROUTER_API_KEY。\n本地开发：在项目根目录 .env.local 中配置。\n生产环境：在部署平台（Vercel 等）的 Environment Variables 中设置。')
  }

  const today = getTodayDir()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3003',
        'X-Title': 'Koubo Script Manager',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是资深中文短视频选题策划和口播文案编辑，擅长 AI 出海、App 增长、广告买量、订阅变现和海外产品案例拆解。',
          },
          {
            role: 'user',
            content: buildPrompt(count, today),
          },
        ],
        tools: [
          {
            type: 'openrouter:web_search',
            parameters: {
              max_results: SEARCH_MAX_RESULTS,
              max_total_results: SEARCH_MAX_RESULTS,
              search_context_size: 'low',
            },
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'koubo_scripts',
            strict: true,
            schema: responseSchema,
          },
        },
        temperature: 0.8,
        max_tokens: 8000,
      }),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenRouter 生成超时，请稍后重试，或在 .env.local 里配置更快的 OPENROUTER_MODEL。')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const data = (await response.json()) as OpenRouterResponse

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenRouter 请求失败：${response.status}`)
  }

  const content = extractMessageContent(data)
  if (!content) {
    throw new Error('OpenRouter 没有返回生成内容。')
  }

  return validateGeneratedScripts(parseGeneratedContent(content), count)
}

function buildMarkdown(script: GeneratedScript, date: string, slug: string): string {
  const count = wordCount(script.content)
  const sources = script.sources
    .map((source) => `- ${source.title}: ${source.url}\n  说明: ${source.evidence}`)
    .join('\n')
  const viralReview = [
    `- 爆款评分: ${script.viral_review.score}/10`,
    `- 开头钩子: ${script.viral_review.opening_hook}`,
    `- 冲突/信息差: ${script.viral_review.conflict_or_gap}`,
    `- 观众收益: ${script.viral_review.viewer_benefit}`,
    `- 通俗度: ${script.viral_review.plain_language_check}`,
    `- 大众适配: ${script.viral_review.broad_audience_fit}`,
    `- 修改说明: ${script.viral_review.revision_note}`,
  ].join('\n')

  const frontmatter = [
    '---',
    `title: ${yamlString(script.title)}`,
    `slug: ${yamlString(slug)}`,
    `date: ${yamlString(date)}`,
    'status: draft',
    `estimated_duration: ${yamlString(script.estimated_duration || '1m30s')}`,
    `word_count: ${count}`,
    `source_topic: ${yamlString(script.source_topic || script.title)}`,
    `viral_score: ${script.viral_review.score}`,
    `generated_by: ${yamlString(`openrouter/${OPENROUTER_MODEL}`)}`,
    '---',
    '',
  ].join('\n')

  return `${frontmatter}${script.content.trim()}\n\n---\n\n爆款自检：\n${viralReview}\n\n来源：\n${sources}\n`
}

export async function saveGeneratedScripts(scripts: GeneratedScript[]): Promise<ScriptMeta[]> {
  const date = getTodayDir()
  const dirPath = path.join(KOUBO_DIR, date)
  fs.mkdirSync(dirPath, { recursive: true })

  const saved: ScriptMeta[] = []

  for (const script of scripts) {
    const baseSlug = sanitizeSlug(script.slug || script.title)
    let slug = baseSlug
    let filePath = path.join(dirPath, `${slug}.md`)

    if (fs.existsSync(filePath)) {
      slug = `${baseSlug}-${Date.now().toString(36)}`
      filePath = path.join(dirPath, `${slug}.md`)
    }

    const markdown = buildMarkdown(script, date, slug)
    fs.writeFileSync(filePath, markdown, 'utf-8')

    saved.push({
      slug,
      title: script.title,
      date,
      status: 'draft',
      wordCount: wordCount(script.content),
      estimatedDuration: script.estimated_duration || '1m30s',
      sourceTopic: script.source_topic || script.title,
    })
  }

  return saved
}

export async function generateAndSaveScripts(count: number): Promise<ScriptMeta[]> {
  const safeCount = Math.min(Math.max(Math.floor(count) || 3, 1), 3)
  const scripts = await callOpenRouter(safeCount)
  return saveGeneratedScripts(scripts)
}

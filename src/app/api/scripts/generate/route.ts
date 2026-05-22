import { NextResponse } from 'next/server'
import { generateAndSaveScripts } from '@/lib/ai-script-generator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '生成口播稿失败。'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { count?: number }
    const scripts = await generateAndSaveScripts(body.count ?? 3)

    return NextResponse.json({ scripts })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: error instanceof Error && error.message.includes('OPENROUTER_API_KEY') ? 400 : 502 },
    )
  }
}

import { NextResponse } from 'next/server'
import { getAllScripts } from '@/lib/scripts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scripts = await getAllScripts()
  return NextResponse.json(scripts)
}

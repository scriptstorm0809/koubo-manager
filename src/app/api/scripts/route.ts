import { NextResponse } from 'next/server'
import { getAllScripts } from '@/lib/scripts'

export const revalidate = 60

export async function GET() {
  const scripts = await getAllScripts()
  return NextResponse.json(scripts)
}

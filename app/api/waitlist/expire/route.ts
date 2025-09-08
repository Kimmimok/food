import { NextResponse } from 'next/server'
import { expireCalledOlderThan } from '@/app/waitlist/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const minutes = body?.minutes ?? 5
    const result = await expireCalledOlderThan(minutes)
    // expireCalledOlderThan throws on error, so if we reach here assume success
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}

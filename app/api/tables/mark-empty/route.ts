import { NextResponse } from 'next/server'
import { markTableEmpty } from '@/app/tables/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const tableId = body?.tableId
    if (!tableId) return NextResponse.json({ success: false, error: 'missing tableId' }, { status: 400 })

    const result = await markTableEmpty(tableId)
    if (result?.success) return NextResponse.json({ success: true })
    return NextResponse.json({ success: false, error: result?.error ?? 'unknown' }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}

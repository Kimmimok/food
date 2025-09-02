import { NextResponse } from 'next/server'
import { ensureTableToken } from '@/app/order/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tableId } = body
    if (!tableId) return NextResponse.json({ error: 'missing tableId' }, { status: 400 })
    const token = await ensureTableToken(tableId)
    return NextResponse.json({ token })
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 })
  }
}

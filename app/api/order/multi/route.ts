import { NextResponse } from 'next/server'
import { addMultipleToTableOrder } from '@/app/order/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tableId, items } = body
    if (!tableId) return NextResponse.json({ error: 'missing tableId' }, { status: 400 })
  const res = await addMultipleToTableOrder({ tableId, items })
  return NextResponse.json({ ok: true, result: res })
  } catch (err:any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

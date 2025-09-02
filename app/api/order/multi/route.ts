import { NextResponse } from 'next/server'
import { addMultipleToTableOrder } from '@/app/order/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tableId, items } = body
    console.log('API received:', { tableId, items })

    if (!tableId) return NextResponse.json({ error: 'missing tableId' }, { status: 400 })

    // items가 이미 변환된 구조(menuItemId, qty)로 오므로 그대로 사용
    const result = await addMultipleToTableOrder({ tableId, items })
    return NextResponse.json({ ok: true, result })
  } catch (err:any) {
    console.error('Order API error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

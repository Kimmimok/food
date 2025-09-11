import { NextResponse } from 'next/server'
import { addOrderItem } from '@/app/tables/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, menuItemId, qty } = body
    if (!orderId || !menuItemId || !qty) return NextResponse.json({ ok: false, error: 'missing' }, { status: 400 })
    await addOrderItem({ orderId, menuItemId, qty })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body
    if (!orderId) return NextResponse.json({ ok: false, error: 'missing orderId' }, { status: 400 })

    const supabase = await supabaseServer()
    const { error } = await supabase
      .from('order_ticket')
      .update({ status: 'sent_to_kitchen' })
      .eq('id', orderId)
      .in('status', ['open'])
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getOrCreateOpenOrder } from '@/app/order/actions'

export async function GET(req: Request, ctx: any) {
  const tableId = ctx?.params?.tableId
  const supabase = await supabaseServer()

  const { data: table } = await supabase
    .from('dining_table')
    .select('id,label')
    .eq('id', tableId)
    .maybeSingle()

  // ensure open order exists
  const order = await getOrCreateOpenOrder(tableId, 'dine_in')
  const orderId = order?.id ?? order

  const { data: categories = [] } = await supabase
    .from('menu_category')
    .select('id,name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: items = [] } = await supabase
    .from('menu_item')
    .select('id,name,price,category_id,is_sold_out')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ table, orderId, categories, items })
}

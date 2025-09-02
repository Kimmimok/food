import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await supabaseServer()

  try {
    // Check order_item table
    const { data: items, error: itemsError } = await supabase
      .from('order_item')
      .select('id, status, name_snapshot, qty, created_at, menu_item:menu_item_id(station)')
      .limit(20)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Check for done status items
    const { data: doneItems, error: doneError } = await supabase
      .from('order_item')
      .select('id, status, name_snapshot, qty, created_at, menu_item:menu_item_id(station)')
      .eq('status', 'done')
      .limit(20)

    if (doneError) {
      return NextResponse.json({ error: doneError.message }, { status: 500 })
    }

    // Check menu_item table
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_item')
      .select('id, name, station')
      .limit(20)

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 })
    }

    return NextResponse.json({
      orderItems: items,
      doneItems: doneItems,
      menuItems: menuItems,
      doneItemsCount: doneItems?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

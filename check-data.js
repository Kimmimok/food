import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function checkData() {
  console.log('=== Checking order_item table ===')
  const { data: items, error: itemsError } = await supabase
    .from('order_item')
    .select('id, status, name_snapshot, qty, created_at')
    .limit(10)

  if (itemsError) {
    console.error('Error fetching order_item:', itemsError)
  } else {
    console.log('order_item data:', items)
  }

  console.log('\n=== Checking for done status items ===')
  const { data: doneItems, error: doneError } = await supabase
    .from('order_item')
    .select('id, status, name_snapshot, qty, created_at')
    .eq('status', 'done')
    .limit(10)

  if (doneError) {
    console.error('Error fetching done items:', doneError)
  } else {
    console.log('Done items:', doneItems)
  }

  console.log('\n=== Checking menu_item table ===')
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_item')
    .select('id, name, station')
    .limit(10)

  if (menuError) {
    console.error('Error fetching menu_item:', menuError)
  } else {
    console.log('menu_item data:', menuItems)
  }
}

checkData().catch(console.error)

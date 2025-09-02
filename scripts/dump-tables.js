import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// load .env.local first (project uses Next.js .env.local)
dotenv.config({ path: '.env.local' })

// support multiple env var names (NEXT_PUBLIC_* used in this repo)
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Supabase URL 또는 키가 환경변수에 없습니다. .env 파일에 NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 있어야 합니다.')
  process.exit(1)
}

console.log('Using Supabase URL:', url)
// hide full key in logs
console.log('Using key: (length)', key.length)

const sb = createClient(url, key)

async function main(){
  const { data: tables, error: e1 } = await sb.from('dining_table').select('id,label,status,capacity').order('label')
  if (e1) { console.error('tables error', e1); process.exit(1) }
  console.log('--- dining_table ---')
  console.table(tables)

  const { data: orders, error: e2 } = await sb.from('order_ticket')
    .select('id,order_no,table_id,status,created_at,closed_at')
    .in('status', ['completed','paid'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (e2) { console.error('orders error', e2); process.exit(1) }
  console.log('--- recent completed/paid orders ---')
  console.table(orders)

  const { data: payments, error: e3 } = await sb.from('payment')
    .select('id,order_id,amount,method,paid_at')
    .order('paid_at', { ascending: false })
    .limit(20)
  if (e3) { console.error('payments error', e3); process.exit(1) }
  console.log('--- recent payments ---')
  console.table(payments)
}

main().catch(e=>{ console.error(e); process.exit(1) })

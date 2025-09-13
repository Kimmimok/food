// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from './env'

export async function supabaseServer() {
  const cookieStore = await cookies()
  const h = await headers()

  const client = createServerClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } },
      headers: { get(name: string) { return h.get(name) } }
    }
  )

  // 현재 요청의 restaurant_id 설정
  const restaurantId = h.get('x-restaurant-id') || cookieStore.get('restaurant_id')?.value
  if (restaurantId) {
    await client.rpc('set_current_restaurant', { restaurant_id: restaurantId })
  }

  return client
}

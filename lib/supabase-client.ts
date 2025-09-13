import { createBrowserClient } from '@supabase/ssr'
import { env } from './env'

export function createClient() {
  const client = createBrowserClient(
    env.supabase.url,
    env.supabase.anonKey
  )

  // 현재 식당 ID 설정 (미들웨어에서 설정된 값 사용)
  if (typeof window !== 'undefined') {
    const restaurantId = document.cookie
      .split('; ')
      .find(row => row.startsWith('restaurant_id='))
      ?.split('=')[1]

    if (restaurantId) {
      client.rpc('set_current_restaurant', { restaurant_id: restaurantId })
    }
  }

  return client
}

export const supabase = createClient()

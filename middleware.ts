import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 환경변수에서 식당 설정 가져오기
const restaurantConfig = {
  [process.env.RESTAURANT_1_DOMAIN!]: {
    id: process.env.RESTAURANT_1_ID!,
    domain: process.env.RESTAURANT_1_DOMAIN!,
    name: process.env.RESTAURANT_1_NAME!,
  },
  [process.env.RESTAURANT_2_DOMAIN!]: {
    id: process.env.RESTAURANT_2_ID!,
    domain: process.env.RESTAURANT_2_DOMAIN!,
    name: process.env.RESTAURANT_2_NAME!,
  },
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl

  // 개발 환경에서는 localhost 허용
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const response = NextResponse.next()
    response.headers.set('x-restaurant-id', process.env.RESTAURANT_1_ID!)
    response.headers.set('x-restaurant-domain', process.env.RESTAURANT_1_DOMAIN!)
    return response
  }

  // 도메인별 식당 정보 찾기
  const restaurant = restaurantConfig[hostname]

  if (!restaurant) {
    // 알 수 없는 도메인 처리
    console.warn(`Unknown domain accessed: ${hostname}`)
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // 식당 정보를 헤더에 추가
  const response = NextResponse.next()
  response.headers.set('x-restaurant-id', restaurant.id)
  response.headers.set('x-restaurant-domain', restaurant.domain)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
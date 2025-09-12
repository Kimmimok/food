# 여러 식당을 위한 GitHub + Vercel 배포 전략

## 🎯 개요
여러 식당이 같은 애플리케이션을 사용할 때의 배포 전략을 비교하고 최적의 방법을 제안합니다.

---

## 📊 배포 전략 비교

| 전략 | 설명 | 복잡성 | 비용 | 관리 | 격리성 |
|------|------|--------|------|------|--------|
| **단일 저장소 + 단일 앱** | 하나의 코드베이스로 모든 식당 서비스 | 낮음 | 낮음 | 쉬움 | 낮음 |
| **단일 저장소 + 여러 앱** | 하나의 코드로 여러 Vercel 앱 배포 | 중간 | 중간 | 보통 | 높음 |
| **여러 저장소** | 각 식당별 별도 저장소 | 높음 | 높음 | 어려움 | 최고 |

---

## 🏗️ 전략 1: 단일 저장소 + 단일 Vercel 앱 (권장)

### 개념:
- 하나의 GitHub 저장소
- 하나의 Vercel 앱 배포
- 환경변수로 식당 구분
- 단일 도메인 (서브도메인 또는 경로 기반)

### 장점:
- ✅ **관리 용이성**: 하나의 코드베이스만 관리
- ✅ **비용 효율성**: 하나의 Vercel 앱만 사용
- ✅ **배포 단순성**: 한 번의 푸시로 모든 식당 업데이트
- ✅ **공유 리소스**: 공통 컴포넌트와 로직 재사용

### 단점:
- ❌ **격리성 부족**: 한 식당의 문제로 전체 영향 가능
- ❌ **커스터마이징 제한**: 모든 식당이 동일한 기능
- ❌ **단일 실패점**: 앱 다운 시 모든 식당 영향

### 구현 방법:

#### 1. 환경변수 설정
```bash
# Vercel 환경변수 (모든 식당 공통)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 식당별 환경변수
RESTAURANT_1_DOMAIN=restaurant1.yourdomain.com
RESTAURANT_2_DOMAIN=restaurant2.yourdomain.com
```

#### 2. 미들웨어 생성 (`middleware.ts`)
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl

  // 도메인별 식당 ID 매핑
  const restaurantMapping = {
    'restaurant1.yourdomain.com': 'restaurant_1',
    'restaurant2.yourdomain.com': 'restaurant_2',
    'default': 'restaurant_default'
  }

  const restaurantId = restaurantMapping[hostname] || restaurantMapping.default

  // 식당 ID를 헤더에 추가
  const response = NextResponse.next()
  response.headers.set('x-restaurant-id', restaurantId)

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
```

#### 3. Supabase 클라이언트 설정 (`lib/supabase-client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 식당별 클라이언트 (필요시)
export function createRestaurantClient(restaurantId: string) {
  const client = createClient()

  // RLS 정책에서 사용할 식당 ID 설정
  client.rpc('set_current_restaurant', { restaurant_id: restaurantId })

  return client
}
```

#### 4. Vercel 배포 설정 (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

---

## 🏗️ 전략 2: 단일 저장소 + 여러 Vercel 앱

### 개념:
- 하나의 GitHub 저장소
- 각 식당별로 별도 Vercel 앱 배포
- 각 앱마다 다른 환경변수
- 각 식당별 커스텀 도메인

### 장점:
- ✅ **높은 격리성**: 각 식당이 독립적
- ✅ **커스터마이징 용이**: 식당별 환경변수 설정 가능
- ✅ **독립적 배포**: 한 식당만 업데이트 가능
- ✅ **커스텀 도메인**: 각 식당별 도메인 설정 가능

### 단점:
- ❌ **관리 복잡성**: 여러 Vercel 앱 관리 필요
- ❌ **비용 증가**: 앱당 비용 발생
- ❌ **배포 복잡성**: 각 앱별 배포 설정 필요

### 구현 방법:

#### 1. GitHub 저장소 구조
```
food/
├── .github/
│   └── workflows/
│       ├── deploy-restaurant1.yml
│       ├── deploy-restaurant2.yml
│       └── deploy-restaurant3.yml
├── apps/
│   ├── restaurant1/
│   │   ├── vercel.json
│   │   └── env.example
│   ├── restaurant2/
│   │   ├── vercel.json
│   │   └── env.example
│   └── restaurant3/
│       ├── vercel.json
│       └── env.example
└── src/ (공통 코드)
```

#### 2. GitHub Actions 워크플로우 (`.github/workflows/deploy-restaurant1.yml`)
```yaml
name: Deploy Restaurant 1

on:
  push:
    branches: [ main ]
    paths:
      - 'apps/restaurant1/**'
      - 'src/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build
      env:
        NEXT_PUBLIC_RESTAURANT_ID: restaurant_1
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_RESTAURANT1_ID }}
        working-directory: ./
```

#### 3. 식당별 환경 설정 (`apps/restaurant1/vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_RESTAURANT_ID": "restaurant_1",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "DATABASE_URL": "@database-url-restaurant1"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_RESTAURANT_ID": "restaurant_1"
    }
  }
}
```

---

## 🏗️ 전략 3: 여러 저장소 (고급 격리)

### 개념:
- 각 식당별로 별도 GitHub 저장소
- 각 저장소별로 별도 Vercel 앱
- 완전한 코드 격리

### 장점:
- ✅ **최고 격리성**: 완전한 독립성
- ✅ **커스터마이징 자유도**: 각 식당별로 다른 코드 가능
- ✅ **보안 강화**: 한 식당 해킹해도 다른 식당 영향 없음

### 단점:
- ❌ **관리 복잡성**: 여러 저장소 관리
- ❌ **업데이트 복잡**: 공통 변경 시 모든 저장소 업데이트
- ❌ **비용 최고**: 저장소당 비용 발생
- ❌ **개발 비효율**: 코드 중복 발생

### 구현 방법:

#### 1. 저장소 구조
```
GitHub Organization: your-restaurant-org
├── restaurant-template (템플릿 저장소)
├── restaurant1-app
├── restaurant2-app
└── restaurant3-app
```

#### 2. 템플릿 저장소 활용
```bash
# 템플릿에서 새 저장소 생성
gh repo create restaurant1-app --template restaurant-template --private

# 초기 설정
cd restaurant1-app
npm install
```

#### 3. 각 저장소별 배포 설정
각 저장소마다 별도의 `vercel.json`과 GitHub Actions 설정

---

## 🎯 추천 전략 선택 가이드

### 소규모 (1-5개 식당):
**단일 저장소 + 단일 Vercel 앱**
- 관리 부담 최소
- 비용 효율적
- 빠른 시작 가능

### 중규모 (5-20개 식당):
**단일 저장소 + 여러 Vercel 앱**
- 적절한 격리성
- 관리 가능한 복잡성
- 비용과 효율성 균형

### 대규모 (20개 이상 식당):
**여러 저장소**
- 최고 수준의 격리
- 각 식당별 커스터마이징 가능
- 엔터프라이즈급 보안

---

## 🚀 구현 단계별 가이드

### 단계 1: 현재 프로젝트 분석
```bash
# 현재 프로젝트 구조 확인
tree -I node_modules

# 환경변수 템플릿 생성
cp .env.example .env.local
```

### 단계 2: 선택한 전략에 따른 설정
```bash
# 전략 1 선택 시
echo "단일 Vercel 앱 설정"
npm install next@latest

# 미들웨어 생성
touch middleware.ts

# 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

### 단계 3: 배포 테스트
```bash
# 로컬 테스트
npm run dev

# 빌드 테스트
npm run build

# Vercel CLI 설치 및 로그인
npm i -g vercel
vercel login
vercel link
```

### 단계 4: 프로덕션 배포
```bash
# Vercel 배포
vercel --prod

# 또는 GitHub 연동
# 1. GitHub 저장소 연결
# 2. 자동 배포 설정
# 3. 도메인 연결
```

---

## 💰 비용 비교

### 단일 저장소 + 단일 앱:
```
- Vercel: $0 (Hobby) 또는 $20/월 (Pro)
- GitHub: 무료
- 총합: $0-20/월
```

### 단일 저장소 + 여러 앱:
```
- Vercel: $20 × N개 앱
- GitHub: 무료
- 총합: $20 × N /월
```

### 여러 저장소:
```
- Vercel: $20 × N개 앱
- GitHub: $4 × N개 저장소 (Private)
- 총합: $24 × N /월
```

---

## 🔧 고급 기능 구현

### 1. 자동 배포 파이프라인
```yaml
# .github/workflows/deploy.yml
name: Deploy to Multiple Vercel Apps

on:
  push:
    branches: [ main ]

jobs:
  deploy-all:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        restaurant: [restaurant1, restaurant2, restaurant3]

    steps:
    - uses: actions/checkout@v4

    - name: Deploy ${{ matrix.restaurant }}
      run: |
        vercel --prod --yes
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        NEXT_PUBLIC_RESTAURANT_ID: ${{ matrix.restaurant }}
```

### 2. 환경별 설정 관리
```typescript
// config/restaurants.ts
export const restaurantConfig = {
  restaurant1: {
    name: '레스토랑 1',
    domain: 'restaurant1.yourdomain.com',
    theme: 'modern',
    features: ['waitlist', 'menu', 'orders']
  },
  restaurant2: {
    name: '레스토랑 2',
    domain: 'restaurant2.yourdomain.com',
    theme: 'classic',
    features: ['menu', 'orders']
  }
}
```

### 3. 모니터링 및 로깅
```typescript
// lib/monitoring.ts
export function logRestaurantEvent(restaurantId: string, event: string, data: any) {
  console.log(`[${restaurantId}] ${event}:`, data)

  // Vercel Analytics에 전송
  if (typeof window !== 'undefined') {
    // Analytics 코드
  }
}
```

---

## 🎯 결론 및 추천

### **대부분의 경우: 전략 1 (단일 저장소 + 단일 앱)**
- **장점**: 관리 용이성, 비용 효율성, 빠른 배포
- **적합**: 소규모에서 중규모 식당 체인
- **확장성**: 50개 식당까지 충분

### **성장 시 마이그레이션**
```
단일 앱 → 여러 앱 → 여러 저장소
  ↓         ↓         ↓
쉬움     보통     어려움
저비용   중비용   고비용
```

### **현재 프로젝트에 대한 추천**
현재 Next.js 프로젝트의 구조를 고려할 때:

1. **즉시 적용**: 전략 1로 시작
2. **미들웨어 추가**: 도메인 기반 라우팅
3. **환경변수 설정**: Supabase 연결 정보
4. **점진적 확장**: 필요시 전략 2로 전환

**시작하기 전에 현재 코드를 백업하고, 작은 규모부터 테스트 배포를 진행하세요!** 🚀
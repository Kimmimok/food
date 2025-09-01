# Restaurant POS System - AI Coding Instructions

## Architecture Overview

This is a **Next.js 15 App Router** restaurant POS system with **Supabase** backend, featuring real-time updates and server actions. The system handles menu management, table/order operations, kitchen display (KDS), waitlist management, cashier operations, and sales reporting.

## Key Patterns & Conventions

### Next.js 15 Dynamic API Compliance
**Critical**: All server components and actions must `await` dynamic APIs due to Next.js 15 strictness:
```tsx
// ✅ Correct pattern used throughout codebase
async function sb() {
  const c = await cookies()  // Must await
  const h = await headers()  // Must await
  return createServerClient(...)
}
```

### Supabase Client Patterns
- **Server-side**: Each file creates its own `sb()` helper function (see `app/*/actions.ts`, `app/*/page.tsx`)
- **Client-side**: Use singleton `supabase()` from `lib/supabase-client.ts`
- **No centralized server client**: Each module defines its own due to Next.js 15 requirements

### Server Actions Structure
All server actions follow this pattern:
```tsx
// app/[module]/actions.ts
'use server'
import { revalidatePath } from 'next/cache'

async function sb() { /* Supabase setup */ }

export async function actionName(params) {
  const supabase = await sb()
  // Database operations
  if (error) throw new Error(error.message)
  revalidatePath('/relevant-path')  // Always revalidate
}
```

### Component Organization
- **`app/`**: Server components (pages) and server actions
- **`components/`**: Client components grouped by domain (`kds/`, `orders/`, `reports/`)
- **`lib/`**: Shared utilities (Supabase clients)

### Real-time Updates
Client components use Supabase Realtime with standardized patterns:
```tsx
useEffect(() => {
  const client = supabase()
  const ch = client
    .channel('unique_channel_name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, handler)
    .subscribe()
  return () => { client.removeChannel(ch) }
}, [])
```

## Database Schema (Supabase)
Key tables: `menu_category`, `menu_item`, `dining_table`, `order_ticket`, `order_item`, `kitchen_queue`, `waitlist`, `payment`

## Development Workflow

### Common Commands
```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
```

### TypeScript Setup
- Path alias: `@/*` maps to project root
- Strict mode disabled for rapid prototyping
- `// @ts-nocheck` used in most files for development speed

### Styling
- **Tailwind CSS** with modern design system
- Consistent color palette: blue (primary), green (success), orange (warning), red (danger)
- Responsive grid layouts with sidebar navigation

## Module-Specific Notes

### Menu Management (`app/menu/`)
- Uses optimistic updates with `useOptimistic`
- Drag-and-drop reordering via `reorderMenuItems`
- Real-time sync across clients

### Tables & Orders (`app/tables/`)
- Table status flow: `empty` → `seated` → `dirty` → `empty`
- Order lifecycle integrated with table state
- Dynamic routes: `/tables/[tableId]` for order detail

### Kitchen Display (`app/kitchen/`)
- Station-based routing: `/kitchen/[station]`
- Queue status: `queued` → `in_progress` → `done` → `served`
- Bulk operations via server actions

### Waitlist (`app/waitlist/`)
- Status flow: `waiting` → `called` → `seated`/`canceled`/`no_show`
- Real-time position updates
- Table assignment integration

### Cashier (`app/cashier/`)
- Payment processing with multiple methods
- Order completion workflow
- Table cleanup automation

## Critical Dependencies
- **@supabase/ssr**: ^0.7.0 (SSR-compatible client)
- **next**: ^15.5.2 (App Router with dynamic API changes)
- **recharts**: ^3.1.2 (Sales reporting charts)
- **tailwindcss**: ^3.4.14 (Styling system)

## Common Gotchas
1. **Always await** `cookies()` and `headers()` in server code
2. **Server action forms** need `action` prop, not `onSubmit`
3. **Realtime subscriptions** must be cleaned up in `useEffect` return
4. **Path revalidation** required after all mutations
5. **TypeScript errors** often ignored with `@ts-nocheck` for development speed

## File Naming Conventions
- Server actions: `actions.ts` in each app directory
- Client components: PascalCase (e.g., `MenuList.tsx`)
- Page components: `page.tsx` (Next.js App Router requirement)
- Layout components: `layout.tsx` (Next.js App Router requirement)

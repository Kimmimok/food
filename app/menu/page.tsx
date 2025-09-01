// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import MenuList from '@/components/MenuList'
import CategoryTabs from '@/components/CategoryTabs'

async function supabaseServer() {
	const cookieStore = await cookies()
	const h = await headers()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: { get(name: string) { return cookieStore.get(name)?.value } },
			headers: { get(name: string) { return h.get(name) } }
		}
	)
}

export default async function Page() {
	const supabase = await supabaseServer()

	const { data: categories = [] } = await supabase
		.from('menu_category')
		.select('*')
		.eq('is_active', true)
		.order('sort_order', { ascending: true })

	const { data: items = [] } = await supabase
		.from('menu_item')
		.select('*')
		.eq('is_active', true)
		.order('sort_order', { ascending: true })

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">메뉴 관리</h1>
					<p className="text-gray-600 mt-1">메뉴 항목을 추가, 수정, 삭제하고 가격을 관리하세요</p>
				</div>
				<div className="flex items-center space-x-3">
					<div className="text-sm text-gray-500">
						총 {items.length}개 메뉴
					</div>
					<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						+ 새 메뉴 추가
					</button>
				</div>
			</div>
			
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="border-b border-gray-200 p-4">
					<CategoryTabs categories={categories as any} />
				</div>
				<div className="p-6">
					<MenuList categories={categories as any} initialItems={items as any} />
				</div>
			</div>
		</div>
	)
}

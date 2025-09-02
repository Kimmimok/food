// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import MenuList from '@/components/MenuList'
import CategoryTabs from '@/components/CategoryTabs'


export default async function Page() {
	const supabase = await supabaseServer()

	const { data: categories = [] } = await supabase
		.from('menu_category')
		.select('id, name, sort_order')
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
				<div className="flex-1">
					<div className="text-sm text-gray-500">총 {items.length}개 메뉴</div>
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

// @ts-nocheck
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

type Cat = { id: string; name: string; sort_order: number }

export default function CategoryTabs({ categories }: { categories: Cat[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get('cat') ?? 'all'
  const [showManage, setShowManage] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Cat | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState<'guest'|'member'|'manager'|'admin'>('guest')

  // 사용자 역할 확인
  useEffect(() => {
    const client = supabase()
    client.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null
      if (!user) return setUserRole('guest')
      client.from('user_profile').select('role').eq('id', user.id).maybeSingle().then(({ data: p }) => {
        setUserRole((p?.role as any) ?? 'member')
      }).catch(() => setUserRole('member'))
    })
  }, [])

  const tabs = useMemo(() => {
    const preferredOrder = ['식사', '안주', '주류', '음료']
    const normalize = (s = '') => s.toLowerCase()
    const mapKey = (name = '') => {
      const n = normalize(name)
      if (n.includes('식') || n.includes('meal') || n.includes('main')) return '식사'
      if (n.includes('안주') || n.includes('side') || n.includes('appetizer')) return '안주'
      if (n.includes('주류') || n.includes('alcohol') || n.includes('beer') || n.includes('wine')) return '주류'
      if (n.includes('음료') || n.includes('drink') || n.includes('beverage') || n.includes('juice')) return '음료'
      return name
    }

    const cloned = Array.isArray(categories) ? [...categories] : []
    cloned.sort((a: any, b: any) => {
      const ka = mapKey(a.name)
      const kb = mapKey(b.name)
      const ia = preferredOrder.indexOf(ka as string)
      const ib = preferredOrder.indexOf(kb as string)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

    return [{ id: 'all', name: '전체' }, ...cloned]
  }, [categories])

  const go = (id: string) => {
    const sp = new URLSearchParams(params as any)
    if (id === 'all') sp.delete('cat')
    else sp.set('cat', id)
    router.push(`/menu?${sp.toString()}`)
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase()
        .from('menu_category')
        .insert({
          name: newCategoryName.trim(),
          sort_order: categories.length + 1,
          is_active: true
        })
      
      if (error) throw error
      
      setNewCategoryName('')
      setShowManage(false)
      router.refresh()
    } catch (error) {
      console.error('카테고리 추가 실패:', error)
      alert('카테고리 추가에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return
    
    setIsLoading(true)
    try {
      console.log('카테고리 수정 시도:', { id: editingCategory.id, name: newCategoryName.trim() })
      
      const { data, error } = await supabase()
        .from('menu_category')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategory.id)
        .select()
      
      if (error) {
        console.error('Supabase 오류:', error)
        throw error
      }
      
      console.log('카테고리 수정 성공:', data)
      
      setNewCategoryName('')
      setEditingCategory(null)
      setShowManage(false)
      router.refresh()
    } catch (error: any) {
      console.error('카테고리 수정 실패:', error)
      alert(`카테고리 수정에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('정말로 이 카테고리를 삭제하시겠습니까?')) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase()
        .from('menu_category')
        .update({ is_active: false })
        .eq('id', categoryId)
      
      if (error) throw error
      
      setShowManage(false)
      router.refresh()
    } catch (error) {
      console.error('카테고리 삭제 실패:', error)
      alert('카테고리 삭제에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (category: Cat) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setNewCategoryName('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`px-3 py-1 rounded-full border text-sm ${current === t.id ? 'bg-black text-white border-black' : 'hover:bg-gray-100'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        
        {(userRole === 'manager' || userRole === 'admin') && (
          <button
            onClick={() => setShowManage(!showManage)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            카테고리 관리
          </button>
        )}
      </div>

      {showManage && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="mb-3">
            <h3 className="font-semibold">카테고리 관리</h3>
            <p className="text-xs text-gray-600">현재 역할: {userRole}</p>
          </div>
          
          {/* 새 카테고리 추가 */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="새 카테고리 이름"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm"
                disabled={isLoading}
              />
              {editingCategory ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditCategory}
                    disabled={isLoading || !newCategoryName.trim()}
                    className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? '수정중...' : '수정'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddCategory}
                  disabled={isLoading || !newCategoryName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '추가중...' : '추가'}
                </button>
              )}
            </div>
          </div>

          {/* 기존 카테고리 목록 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">기존 카테고리</h4>
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">{category.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    disabled={isLoading}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    disabled={isLoading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

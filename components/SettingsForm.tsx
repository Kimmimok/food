"use client"
import { useState } from 'react'
import { upsertRestaurantSettings, updateTableConfiguration } from '../app/settings/actions'

export default function SettingsForm({ initial }: { initial?: any }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    business_number: initial?.business_number ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    email: initial?.email ?? '',
  table_count: initial?.table_count ?? 0,
  default_table_capacity: initial?.default_table_capacity ?? 4,
  table_capacities: initial?.table_capacities ?? [],
  enable_new_order_sound: initial?.enable_new_order_sound ?? true,
  enable_new_order_popup: initial?.enable_new_order_popup ?? true,
  hide_urls_in_qr: initial?.hide_urls_in_qr ?? false,
  hide_urls_on_web: initial?.hide_urls_on_web ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
  // ensure table_count is a number or null
      // ensure numeric types
      const tableCount = form.table_count ? Number(form.table_count) : 0
      const capacities = Array.isArray(form.table_capacities) ? form.table_capacities.map((v:any)=>Number(v)||0) : []
      // By default submit both (backwards compatible)
      const restaurantPayload = {
        name: form.name,
        business_number: form.business_number,
        phone: form.phone,
        address: form.address,
        email: form.email,
  enable_new_order_sound: !!form.enable_new_order_sound,
  enable_new_order_popup: !!form.enable_new_order_popup,
  hide_urls_in_qr: !!form.hide_urls_in_qr,
  hide_urls_on_web: !!form.hide_urls_on_web,
      }
      await upsertRestaurantSettings(restaurantPayload as any)
      await updateTableConfiguration({ table_count: tableCount, default_table_capacity: form.default_table_capacity ? Number(form.default_table_capacity) : 4, table_capacities: capacities })
      setMsg('모든 설정이 성공적으로 저장되었습니다')
    } catch (err:any) {
      setMsg('설정 저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  const saveRestaurant = async (e:any) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const restaurantPayload = {
        name: form.name,
        business_number: form.business_number,
        phone: form.phone,
        address: form.address,
        email: form.email,
  enable_new_order_sound: !!form.enable_new_order_sound,
  enable_new_order_popup: !!form.enable_new_order_popup,
  hide_urls_in_qr: !!form.hide_urls_in_qr,
  hide_urls_on_web: !!form.hide_urls_on_web,
      }
      await upsertRestaurantSettings(restaurantPayload as any)
      setMsg('기본 정보가 저장되었습니다')
    } catch (err:any) {
      setMsg('기본 정보 저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  const saveTables = async (e:any) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const tableCount = form.table_count ? Number(form.table_count) : 0
      const capacities = Array.isArray(form.table_capacities) ? form.table_capacities.map((v:any)=>Number(v)||0) : []
      await updateTableConfiguration({ table_count: tableCount, default_table_capacity: form.default_table_capacity ? Number(form.default_table_capacity) : 4, table_capacities: capacities })
      setMsg('테이블 설정이 저장되었습니다')
    } catch (err:any) {
      setMsg('테이블 설정 저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  const saveAlerts = async (e:any) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const payload = {
        enable_new_order_sound: !!form.enable_new_order_sound,
        enable_new_order_popup: !!form.enable_new_order_popup,
        hide_urls_in_qr: !!form.hide_urls_in_qr,
        hide_urls_on_web: !!form.hide_urls_on_web,
      }
      await upsertRestaurantSettings(payload as any)
      setMsg('알림 설정이 저장되었습니다')
    } catch (err:any) {
      setMsg('알림 설정 저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8">
      {/* 기본 정보 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">🏪</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
            <p className="text-sm text-gray-600">레스토랑의 기본 정보를 설정합니다</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상호명 *</label>
            <input 
              value={form.name} 
              onChange={e=>setForm(s=>({...s, name: e.target.value}))} 
              placeholder="레스토랑 이름을 입력하세요" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사업자 번호</label>
            <input 
              value={form.business_number} 
              onChange={e=>setForm(s=>({...s, business_number: e.target.value}))} 
              placeholder="000-00-00000" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
            <input 
              value={form.phone} 
              onChange={e=>setForm(s=>({...s, phone: e.target.value}))} 
              placeholder="02-0000-0000" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
            <input 
              type="email"
              value={form.email} 
              onChange={e=>setForm(s=>({...s, email: e.target.value}))} 
              placeholder="restaurant@example.com" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
            <input 
              value={form.address} 
              onChange={e=>setForm(s=>({...s, address: e.target.value}))} 
              placeholder="서울시 강남구 테헤란로 000" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            type="button" 
            onClick={saveRestaurant} 
            disabled={loading} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? '저장 중...' : '기본 정보 저장'}
          </button>
        </div>
      </div>

      {/* 테이블 설정 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">🪑</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">테이블 설정</h2>
            <p className="text-sm text-gray-600">테이블 수와 수용 인원을 관리합니다</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">총 테이블 수</label>
            <input 
              type="number" 
              min="0"
              value={String(form.table_count)} 
              onChange={e=>setForm(s=>({...s, table_count: Number(e.target.value)}))} 
              placeholder="예: 20" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
            <p className="text-xs text-gray-500 mt-1">QR 코드 생성 및 주문 관리에 사용됩니다</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">기본 수용 인원</label>
            <input 
              type="number" 
              min="1"
              value={String(form.default_table_capacity)} 
              onChange={e=>setForm(s=>({...s, default_table_capacity: Number(e.target.value)}))} 
              placeholder="예: 4" 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
            <p className="text-xs text-gray-500 mt-1">새 테이블 생성 시 기본값으로 사용</p>
          </div>
        </div>

        {form.table_count > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">테이블별 개별 수용 인원 설정</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-64 overflow-y-auto">
              {Array.from({ length: Number(form.table_count||0) }, (_, i) => (
                <div key={i} className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1">테이블 {i+1}</label>
                  <input 
                    type="number" 
                    min="1"
                    value={String(form.table_capacities?.[i] ?? form.default_table_capacity ?? 4)} 
                    onChange={e=>{
                      const v = Number(e.target.value)
                      setForm(s=>{
                        const arr = Array.isArray(s.table_capacities) ? [...s.table_capacities] : []
                        arr[i] = v
                        return { ...s, table_capacities: arr }
                      })
                    }} 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">각 테이블별로 다른 수용 인원을 설정할 수 있습니다</p>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button 
            type="button" 
            onClick={saveTables} 
            disabled={loading} 
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading ? '저장 중...' : '테이블 설정 저장'}
          </button>
        </div>
      </div>

      {/* 알림 설정 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">🔔</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">알림 설정</h2>
            <p className="text-sm text-gray-600">새 주문 알림 방식을 설정합니다</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="sound-alert"
              checked={!!form.enable_new_order_sound}
              onChange={e=>setForm(s=>({...s, enable_new_order_sound: e.target.checked}))}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="sound-alert" className="font-medium text-gray-900 cursor-pointer">
                사운드 알림
              </label>
              <p className="text-sm text-gray-600 mt-1">
                새 주문이 들어올 때 소리로 알림을 받습니다
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="popup-alert"
              checked={!!form.enable_new_order_popup}
              onChange={e=>setForm(s=>({...s, enable_new_order_popup: e.target.checked}))}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="popup-alert" className="font-medium text-gray-900 cursor-pointer">
                팝업 알림
              </label>
              <p className="text-sm text-gray-600 mt-1">
                새 주문이 들어올 때 상세 내용을 팝업으로 표시합니다
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="hide-urls"
              checked={!!form.hide_urls_in_qr}
              onChange={e=>setForm(s=>({...s, hide_urls_in_qr: e.target.checked}))}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="hide-urls" className="font-medium text-gray-900 cursor-pointer">
                QR에서 URL 숨김
              </label>
              <p className="text-sm text-gray-600 mt-1">
                QR 목록에서 URL 노출, 복사, 열기 버튼을 숨깁니다 (프린트/다운로드는 유지됩니다)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="hide-urls-web"
              checked={!!form.hide_urls_on_web}
              onChange={e=>setForm(s=>({...s, hide_urls_on_web: e.target.checked}))}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="hide-urls-web" className="font-medium text-gray-900 cursor-pointer">
                웹 페이지에서도 하위 URL 숨김
              </label>
              <p className="text-sm text-gray-600 mt-1">
                웹(고객용) 페이지에서 주문 URL(예: /order/123)을 숨깁니다. 보안 목적의 설정입니다.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex">
            <span className="text-amber-600 text-sm mr-2">⚠️</span>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">알림 설정 안내</p>
              <ul className="space-y-1">
                <li>• 사운드 알림은 브라우저 정책상 첫 사용 시 수동 활성화가 필요할 수 있습니다</li>
                <li>• 설정 변경은 즉시 적용되며 모든 직원에게 동일하게 적용됩니다</li>
              </ul>
            </div>
        
          <div className="mt-4 flex justify-end">
            <button 
              type="button" 
              onClick={saveAlerts} 
              disabled={loading} 
              className="px-8 py-2 w-44 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? '저장 중...' : '알림 설정 저장'}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* 전체 저장 및 상태 메시지 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">설정 저장</h3>
            <p className="text-sm text-gray-600">모든 설정을 한 번에 저장합니다</p>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {loading ? '저장 중...' : '전체 설정 저장'}
          </button>
        </div>
        
        {msg && (
          <div className={`mt-4 p-4 rounded-lg ${
            msg.includes('실패') 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {msg.includes('실패') ? '❌' : '✅'}
              </span>
              {msg}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

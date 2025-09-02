"use client"
import { useState } from 'react'
import { upsertRestaurantSettings, updateTableConfiguration } from '@/app/settings/actions'

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
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
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
      }
      await upsertRestaurantSettings(restaurantPayload as any)
      await updateTableConfiguration({ table_count: tableCount, default_table_capacity: form.default_table_capacity ? Number(form.default_table_capacity) : 4, table_capacities: capacities })
      setMsg('저장되었습니다')
    } catch (err:any) {
      setMsg('저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  const saveRestaurant = async (e:any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const restaurantPayload = {
        name: form.name,
        business_number: form.business_number,
        phone: form.phone,
        address: form.address,
        email: form.email,
      }
      await upsertRestaurantSettings(restaurantPayload as any)
      setMsg('식당 정보가 저장되었습니다')
    } catch (err:any) {
      setMsg('저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  const saveTables = async (e:any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const tableCount = form.table_count ? Number(form.table_count) : 0
      const capacities = Array.isArray(form.table_capacities) ? form.table_capacities.map((v:any)=>Number(v)||0) : []
      await updateTableConfiguration({ table_count: tableCount, default_table_capacity: form.default_table_capacity ? Number(form.default_table_capacity) : 4, table_capacities: capacities })
      setMsg('테이블 설정이 저장되었습니다')
    } catch (err:any) {
      setMsg('저장 실패: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={form.name} onChange={e=>setForm(s=>({...s, name: e.target.value}))} placeholder="상호명" className="w-full border rounded px-3 py-2" />
      <input value={form.business_number} onChange={e=>setForm(s=>({...s, business_number: e.target.value}))} placeholder="사업자 번호" className="w-full border rounded px-3 py-2" />
      <input value={form.phone} onChange={e=>setForm(s=>({...s, phone: e.target.value}))} placeholder="전화번호" className="w-full border rounded px-3 py-2" />
      <input value={form.address} onChange={e=>setForm(s=>({...s, address: e.target.value}))} placeholder="주소" className="w-full border rounded px-3 py-2" />
      <input value={form.email} onChange={e=>setForm(s=>({...s, email: e.target.value}))} placeholder="이메일" className="w-full border rounded px-3 py-2" />
      <div>
        <label className="text-sm text-gray-600">테이블 수</label>
        <input type="number" value={String(form.table_count)} onChange={e=>setForm(s=>({...s, table_count: Number(e.target.value)}))} placeholder="테이블 수" className="w-full border rounded px-3 py-2 mt-1" />
        <div className="text-xs text-gray-400 mt-1">레스토랑의 테이블 총 갯수를 저장합니다. QR 생성 등에서 사용됩니다.</div>
      </div>
      <div>
        <label className="text-sm text-gray-600">테이블당 기본 수용 인원</label>
        <input type="number" value={String(form.default_table_capacity)} onChange={e=>setForm(s=>({...s, default_table_capacity: Number(e.target.value)}))} placeholder="테이블당 인원" className="w-full border rounded px-3 py-2 mt-1" />
        <div className="text-xs text-gray-400 mt-1">테이블 생성시 기본 수용 인원(예: 4명)</div>
      </div>

      <div>
        <label className="text-sm text-gray-600">테이블별 수용 인원 (테이블 수 입력 시 자동 생성)</label>
        <div className="space-y-2 mt-2">
          {Array.from({ length: Number(form.table_count||0) }, (_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-12">테이블 {i+1}</div>
              <input type="number" value={String(form.table_capacities?.[i] ?? form.default_table_capacity ?? 4)} onChange={e=>{
                const v = Number(e.target.value)
                setForm(s=>{
                  const arr = Array.isArray(s.table_capacities) ? [...s.table_capacities] : []
                  arr[i] = v
                  return { ...s, table_capacities: arr }
                })
              }} className="w-32 border rounded px-2 py-1" />
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-1">각 테이블별 수용 인원을 개별로 설정합니다. 비워두면 기본값을 사용합니다.</div>
      </div>
      {msg && <div className="text-sm text-green-600">{msg}</div>}
      <div className="flex items-center space-x-2">
        <button type="button" onClick={saveRestaurant} disabled={loading} className="px-3 py-2 rounded bg-blue-600 text-white">{loading? '처리중...' : '식당 정보 저장'}</button>
        <button type="button" onClick={saveTables} disabled={loading} className="px-3 py-2 rounded bg-green-600 text-white">{loading? '처리중...' : '테이블 설정 저장'}</button>
        <button type="submit" disabled={loading} className="px-3 py-2 rounded bg-black text-white">{loading? '처리중...' : '전체 저장'}</button>
      </div>
    </form>
  )
}

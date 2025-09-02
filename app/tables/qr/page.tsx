// @ts-nocheck
import { cookies, headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import QrClient from '@/components/QrClient'



export default async function TableQrPage() {
  const supabase = await supabaseServer()
  const { data: tables = [] } = await supabase.from('dining_table').select('id,label').order('label')
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">테이블 QR 코드</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tables.map(t => (
            <div key={t.id} className="border rounded p-3 flex flex-col items-center">
              <div className="font-medium mb-2">{t.label}</div>
              <QrClient url={`${base}/order/${t.id}`} />
              <div className="text-xs mt-2 break-all text-center">/order/{t.id}</div>
            </div>
          ))}
        </div>
      </div>
    )
}


import { supabaseServer } from '@/lib/supabase-server'
import SettingsForm from '@/components/SettingsForm'
import QrGenerator from '@/components/QrGenerator'
import { requireRole } from '@/lib/auth'

export default async function SettingsPage() {
  await requireRole(['manager','admin'])
  const supabase = await supabaseServer()
  const { data } = await supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle()
  const settings = data ?? null
  return (
    <div className="w-full p-6 min-h-screen">
      <h1 className="text-xl font-bold mb-4">레스토랑 설정</h1>
      <SettingsForm initial={settings} />
      <div className="mt-6">
        <QrGenerator defaultMax={settings?.table_count ?? 1} />
      </div>
    </div>
  )
}

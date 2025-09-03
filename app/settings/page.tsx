import { supabaseServer } from '../../lib/supabase-server'
import SettingsForm from '../../components/SettingsForm'
import QrGenerator from '../../components/QrGenerator'
import { requireRole } from '../../lib/auth'

export default async function SettingsPage() {
  // 관리자만 접근 가능
  await requireRole(['admin'])
  const supabase = await supabaseServer()
  const { data } = await supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle()
  const settings = data ?? null
  return (
    // 화면 가득 채우도록 여백 최소화
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full py-8 px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 설정</h1>
          <p className="text-gray-600">레스토랑 운영에 필요한 설정을 관리합니다</p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-3">
            <SettingsForm initial={settings} />
          </div>

          <div className="space-y-6 xl:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-blue-600 mr-2">📱</span>
                QR 코드 생성
              </h3>
              {/* QR generator 영역을 넓게 표시 */}
              <div className="w-full">
                <QrGenerator defaultMax={settings?.table_count ?? 1} settings={settings} />
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 도움말</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• 설정 변경 후 반드시 저장 버튼을 클릭하세요</li>
                <li>• 테이블 수 변경 시 기존 주문 데이터는 유지됩니다</li>
                <li>• 알림 설정은 즉시 적용됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

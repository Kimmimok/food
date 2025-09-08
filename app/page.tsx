import { requireRole } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export default async function Page() {
  await requireRole(['member','manager','admin'])
  
  const supabase = await supabaseServer()
  
  // 오늘 매출 계산
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: todayOrders } = await supabase
    .from('order_ticket')
    .select('total')
    .eq('status', 'paid')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
  
  const todaySales = todayOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  
  // 진행중 주문 수
  const { data: activeOrders } = await supabase
    .from('order_ticket')
    .select('id')
    .in('status', ['open', 'sent_to_kitchen'])
  
  const activeOrderCount = activeOrders?.length || 0
  
  // 대기 팀 수
  const { data: waitlist } = await supabase
    .from('waitlist')
    .select('id')
    .eq('status', 'waiting')
  
  const waitingTeams = waitlist?.length || 0
  
  // 사용중 테이블 수
  const { data: tables } = await supabase
    .from('dining_table')
    .select('id, status')
  
  const totalTables = tables?.length || 0
  const occupiedTables = tables?.filter(table => table.status === 'occupied').length || 0
  
  // 최근 주문
  const { data: recentOrders } = await supabase
    .from('order_ticket')
    .select(`
      id, created_at, status,
      dining_table (label),
      order_item (
        id, name_snapshot, qty
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)
  
  // 최근 알림 (실제로는 알림 테이블이 없으므로 주문 기반으로 생성)
  const notifications: Array<{type: 'info' | 'warning' | 'success', message: string, time: string}> = []
  
  if (activeOrderCount > 0) {
    notifications.push({
      type: 'info' as const,
      message: `진행중인 주문이 ${activeOrderCount}건 있습니다.`,
      time: '실시간'
    })
  }
  
  if (waitingTeams > 0) {
    notifications.push({
      type: 'warning' as const,
  message: `대기 팀이 ${waitingTeams}팀 있습니다.`,
      time: '실시간'
    })
  }
  
  if (todaySales > 0) {
    notifications.push({
      type: 'success' as const,
      message: `오늘 매출: ₩${todaySales.toLocaleString()}`,
      time: '실시간'
    })
  }
  
  // 기본 알림들 추가
  if (notifications.length === 0) {
    notifications.push({
      type: 'info' as const,
      message: '모든 시스템이 정상 작동중입니다.',
      time: '방금 전'
    })
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">레스토랑 운영 현황을 한눈에 확인하세요</p>
      </div>
      
      {/* 빠른 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          title="오늘 매출" 
          value={`₩${todaySales.toLocaleString()}`} 
          icon="💰" 
          trend="실시간" 
          color="green" 
        />
        <StatusCard 
          title="진행중 주문" 
          value={`${activeOrderCount}건`} 
          icon="🍽️" 
          trend="실시간" 
          color="blue" 
        />
        <StatusCard 
          title="대기 팀" 
          value={`${waitingTeams}팀`} 
          icon="⏰" 
          trend="실시간" 
          color="orange" 
        />
        <StatusCard 
          title="사용중 테이블" 
          value={`${occupiedTables}/${totalTables}`} 
          icon="🪑" 
          trend={`${Math.round((occupiedTables / totalTables) * 100) || 0}% 가동`} 
          color="purple" 
        />
      </div>
      
      {/* 빠른 액션 메뉴 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <QuickActionCard href="/tables" icon="🪑" label="테이블 관리" desc="좌석 현황 및 주문" />
          <QuickActionCard href="/menu" icon="📋" label="메뉴 관리" desc="메뉴 수정 및 가격" />
          <QuickActionCard href="/kitchen" icon="👨‍🍳" label="주방 화면" desc="주문 진행 상황" />
          <QuickActionCard href="/waitlist" icon="⏰" label="대기" desc="대기 고객 관리" />
          <QuickActionCard href="/cashier" icon="💳" label="계산대" desc="결제 및 정산" />
          <QuickActionCard href="/reports/sales" icon="📊" label="매출 분석" desc="일별 매출 리포트" />
        </div>
      </div>
      
      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 주문</h3>
          <div className="space-y-3">
            {recentOrders && recentOrders.length > 0 ? (
              recentOrders.map((order: any) => {
                const tableLabel = order.dining_table?.label || `테이블 ${order.table_id}`
                const items = order.order_item?.slice(0, 2).map((item: any) => item.name_snapshot).join(', ') || '주문 항목 없음'
                const time = new Date(order.created_at).toLocaleString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                const status = order.status === 'paid' ? '결제완료' : 
                               order.status === 'sent_to_kitchen' ? '준비중' : 
                               order.status === 'open' ? '주문접수' : order.status
                
                return (
                  <RecentOrderItem 
                    key={order.id}
                    table={tableLabel} 
                    items={items} 
                    time={time} 
                    status={status} 
                  />
                )
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                최근 주문이 없습니다.
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 및 공지</h3>
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <NotificationItem 
                key={index}
                type={notification.type} 
                message={notification.message} 
                time={notification.time} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, icon, trend, color }: {
  title: string;
  value: string;
  icon: string;
  trend: string;
  color: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800'
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-3 ${colorMap[color]}`}>
        {trend}
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, label, desc }: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <a 
      href={href}
      className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
    >
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </a>
  );
}

function RecentOrderItem({ table, items, time, status }: {
  table: string;
  items: string;
  time: string;
  status: string;
}) {
  const statusColor = status === '완료' ? 'text-green-600' : status === '준비중' ? 'text-orange-600' : 'text-blue-600';
  
  return (
    <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{table}</p>
        <p className="text-gray-600 text-xs mt-1">{items}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium ${statusColor}`}>{status}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

function NotificationItem({ type, message, time }: {
  type: 'info' | 'warning' | 'success';
  message: string;
  time: string;
}) {
  const iconMap = {
    info: '🔔',
    warning: '⚠️',
    success: '✅'
  };
  
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-lg">{iconMap[type]}</div>
      <div className="flex-1">
        <p className="text-gray-900 text-sm">{message}</p>
        <p className="text-gray-500 text-xs mt-1">{time}</p>
      </div>
    </div>
  );
}

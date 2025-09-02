import { requireRole } from '@/lib/auth'

export default async function Page() {
  await requireRole(['member','manager','admin'])
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
          value="₩1,250,000" 
          icon="💰" 
          trend="+12.5%" 
          color="green" 
        />
        <StatusCard 
          title="진행중 주문" 
          value="8건" 
          icon="🍽️" 
          trend="실시간" 
          color="blue" 
        />
        <StatusCard 
          title="대기 팀" 
          value="3팀" 
          icon="⏰" 
          trend="평균 15분" 
          color="orange" 
        />
        <StatusCard 
          title="사용중 테이블" 
          value="12/16" 
          icon="🪑" 
          trend="75% 가동" 
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
          <QuickActionCard href="/waitlist" icon="⏰" label="웨이팅" desc="대기 고객 관리" />
          <QuickActionCard href="/cashier" icon="💳" label="계산대" desc="결제 및 정산" />
          <QuickActionCard href="/reports/sales" icon="📊" label="매출 분석" desc="일별 매출 리포트" />
        </div>
      </div>
      
      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 주문</h3>
          <div className="space-y-3">
            <RecentOrderItem table="테이블 3" items="불고기정식, 김치찌개" time="5분 전" status="준비중" />
            <RecentOrderItem table="테이블 7" items="치킨까스, 콜라" time="8분 전" status="완료" />
            <RecentOrderItem table="테이블 1" items="비빔밥, 된장찌개" time="12분 전" status="서빙완료" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 및 공지</h3>
          <div className="space-y-3">
            <NotificationItem type="info" message="새로운 주문이 들어왔습니다. (테이블 5)" time="방금 전" />
            <NotificationItem type="warning" message="재료 부족: 삼겹살 (5인분 남음)" time="30분 전" />
            <NotificationItem type="success" message="일일 매출 목표를 달성했습니다!" time="1시간 전" />
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

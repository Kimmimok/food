import OrderTestClient from '@/components/OrderTestClient'

export default function OrderIndex() {
  return (
    <div className="max-w-screen-sm mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">주문 페이지</h1>
      <p className="text-sm text-gray-600 mb-4">테스트용: 아래에서 테이블 번호를 선택하거나 입력해 모바일 주문 페이지로 이동하세요.</p>
      <OrderTestClient />
    </div>
  )
}

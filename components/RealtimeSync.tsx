// Real-time sync utility for POS system
'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase-client'

interface RealtimeSyncProps {
  onUpdate?: () => void
}

export function RealtimeSync({ onUpdate }: RealtimeSyncProps) {
  useEffect(() => {
    const client = supabase()

    // 주문 항목 변경 감지
    const orderItemChannel = client
      .channel('order_item_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'order_item' 
      }, (payload: any) => {
        console.log('Order item changed, triggering update')
        onUpdate?.()
        // 페이지 새로고침 트리거
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'order_item' } 
        }))
        // 신규 주문 항목 INSERT의 경우, 알림 이벤트(참고용)만 발생시킵니다.
        if (payload?.eventType === 'INSERT') {
          window.dispatchEvent(new CustomEvent('pos:new-order', {
            detail: {
              source: 'order_item',
              order_item_id: payload.new?.id,
              order_ticket_id: payload.new?.order_ticket_id,
            }
          }))
        }
      })
      .subscribe()

    // 주문 티켓 변경 감지
    const orderTicketChannel = client
      .channel('order_ticket_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'order_ticket' 
      }, (payload: any) => {
        console.log('Order ticket changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'order_ticket' } 
        }))
        // 새 티켓 생성 또는 상태 전환(sent_to_kitchen) 시 새 주문 알림 발생
        try {
          const type = payload?.eventType
          const before = payload?.old
          const after = payload?.new
          const isInsert = type === 'INSERT'
          const justSent = type === 'UPDATE' && before?.status !== 'sent_to_kitchen' && after?.status === 'sent_to_kitchen'
          if (isInsert || justSent) {
            // 토스트 팝업 (전역 설정과 무관하게 간단 안내는 유지)
            window.dispatchEvent(new CustomEvent('notify', {
              detail: {
                message: '새 주문이 접수되었습니다.',
                type: 'success',
              }
            }))
            // 사운드 및 추가 처리를 위한 커스텀 이벤트
            window.dispatchEvent(new CustomEvent('pos:new-order', {
              detail: {
                source: 'order_ticket',
                order_ticket_id: after?.id,
                status: after?.status,
                table_id: after?.table_id,
              }
            }))
          }
        } catch (e) {
          // noop
        }
      })
      .subscribe()

    // 주방 큐 변경 감지
    const kitchenQueueChannel = client
      .channel('kitchen_queue_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'kitchen_queue' 
      }, (payload: any) => {
        console.log('Kitchen queue changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'kitchen_queue' } 
        }))
        // 주방 큐에 새 항목이 들어오면(INSERT) 알림 보조 이벤트만 발생
        if (payload?.eventType === 'INSERT') {
          window.dispatchEvent(new CustomEvent('pos:new-order', {
            detail: {
              source: 'kitchen_queue',
              kitchen_queue_id: payload.new?.id,
              order_item_id: payload.new?.order_item_id,
            }
          }))
        }
      })
      .subscribe()

    // 테이블 상태 변경 감지
    const diningTableChannel = client
      .channel('dining_table_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'dining_table' 
      }, () => {
        console.log('Dining table changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'dining_table' } 
        }))
      })
      .subscribe()

    // 결제 변경 감지
    const paymentChannel = client
      .channel('payment_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payment' 
      }, () => {
        console.log('Payment changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'payment' } 
        }))
      })
      .subscribe()

    return () => {
      client.removeChannel(orderItemChannel)
      client.removeChannel(orderTicketChannel)
      client.removeChannel(kitchenQueueChannel)
      client.removeChannel(diningTableChannel)
      client.removeChannel(paymentChannel)
    }
  }, [onUpdate])

  return null // This is a utility component with no UI
}

// Auto-refresh hook for pages
export function useAutoRefresh() {
  useEffect(() => {
    const handleDataUpdate = () => {
      // 3초 지연 후 새로고침 (데이터베이스 변경 전파 대기)
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }

    window.addEventListener('pos:data-updated', handleDataUpdate)
    
    return () => {
      window.removeEventListener('pos:data-updated', handleDataUpdate)
    }
  }, [])
}

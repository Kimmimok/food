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
      }, () => {
        console.log('Order item changed, triggering update')
        onUpdate?.()
        // 페이지 새로고침 트리거
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'order_item' } 
        }))
      })
      .subscribe()

    // 주문 티켓 변경 감지
    const orderTicketChannel = client
      .channel('order_ticket_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'order_ticket' 
      }, () => {
        console.log('Order ticket changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'order_ticket' } 
        }))
      })
      .subscribe()

    // 주방 큐 변경 감지
    const kitchenQueueChannel = client
      .channel('kitchen_queue_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'kitchen_queue' 
      }, () => {
        console.log('Kitchen queue changed, triggering update')
        onUpdate?.()
        window.dispatchEvent(new CustomEvent('pos:data-updated', { 
          detail: { table: 'kitchen_queue' } 
        }))
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

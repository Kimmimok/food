"use client"
import { useEffect } from 'react'

export default function CartClientScript() {
  useEffect(() => {
    const cart: Array<any> = []
    let submitted = false

    function findIndex(id: string) {
      return cart.findIndex(i => i.menuItemId === id)
    }

    function addToCart(id: string, name: string, qty: number) {
      const idx = findIndex(id)
      if (idx === -1) cart.push({ menuItemId: id, name, qty })
      else cart[idx].qty += qty
      sync()
      // dispatch update for ClientCart
      window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }))
    }

    function sync() {
      const hidden = document.querySelector('input[name="cart"]') as HTMLInputElement | null
      if (hidden) hidden.value = JSON.stringify(cart)
    }

    async function submitCart(e: Event) {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      // find submit button
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (submitted) return
      submitted = true
      if (submitBtn) {
        (submitBtn as HTMLButtonElement).disabled = true
        submitBtn.dataset.prevText = submitBtn.innerHTML
        submitBtn.innerHTML = '주문완료'
        submitBtn.setAttribute('aria-disabled', 'true')
      }

      const hidden = form.querySelector('input[name="cart"]') as HTMLInputElement | null
      const raw = hidden?.value || '[]'
      let parsed = []
      try { parsed = JSON.parse(raw) } catch {}
      try {
        const res = await fetch('/api/order/multi', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: parsed, tableId: form.getAttribute('data-table-id') })
        })
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문이 접수되었습니다', type: 'success' } }))
          // clear cart
          cart.length = 0
          sync()
          window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }))
          // keep button disabled and labeled '주문완료' to avoid duplicates
        } else {
          const txt = await res.text()
          window.dispatchEvent(new CustomEvent('notify', { detail: { message: '주문 실패: '+txt, type: 'error' } }))
          // restore button
          submitted = false
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.innerHTML = submitBtn.dataset.prevText || '주문하기'
            submitBtn.removeAttribute('aria-disabled')
          }
        }
      } catch (err:any) {
        window.dispatchEvent(new CustomEvent('notify', { detail: { message: '네트워크 오류', type: 'error' } }))
        submitted = false
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.innerHTML = submitBtn.dataset.prevText || '주문하기'
          submitBtn.removeAttribute('aria-disabled')
        }
      }
    }

  function onClick(e: Event) {
      const t = e.target as HTMLElement
      const btn = t.closest('.add-to-cart') as HTMLElement | null
      if (!btn) return
      const id = btn.getAttribute('data-menu-id') || ''
      const name = btn.getAttribute('data-menu-name') || ''
      const sel = document.querySelector(`select.qty-select[data-menu-id="${id}"]`) as HTMLSelectElement | null
      const qty = sel ? Number(sel.value) : 1
      addToCart(id, name, qty)
    }

    document.addEventListener('click', onClick)
    // intercept cart form submit. support forms marked with data-cart-form or fallback to form that contains input[name="cart"]
    let form = document.querySelector('form[data-cart-form="true"]') as HTMLFormElement | null
    if (!form) {
      const hidden = document.querySelector('input[name="cart"]') as HTMLInputElement | null
      form = hidden?.closest('form') as HTMLFormElement | null
    }
    // helper to toggle submit button state on cart updates
    function updateSubmitButtonState(itemsList: any[]) {
      if (!form) return
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (!submitBtn) return
      if (submitted) {
        submitBtn.disabled = true
        submitBtn.innerHTML = '주문완료'
        submitBtn.setAttribute('aria-disabled', 'true')
        return
      }
      const hasItems = Array.isArray(itemsList) && itemsList.length > 0
      submitBtn.disabled = !hasItems
      submitBtn.innerHTML = '주문하기'
      if (!hasItems) submitBtn.setAttribute('aria-disabled', 'true')
      else submitBtn.removeAttribute('aria-disabled')
    }

    if (form) form.addEventListener('submit', submitCart)

    // Listen to cart updates to enable/disable submit button
    function onUpdateForButton(e:any) {
      updateSubmitButtonState(Array.isArray(e.detail) ? e.detail : [])
    }
    window.addEventListener('cart:update', onUpdateForButton as EventListener)

    return () => {
      document.removeEventListener('click', onClick)
      if (form) form.removeEventListener('submit', submitCart)
      window.removeEventListener('cart:update', onUpdateForButton as EventListener)
    }
  }, [])

  return null
}

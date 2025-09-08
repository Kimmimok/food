"use client"
import { supabase } from '@/lib/supabase-client'

export default function LogoutButton() {
  const onClick = async () => {
    try {
      const client = supabase()
      await client.auth.signOut()
      window.location.href = '/auth/sign-in'
    } catch (e) {
      console.error(e)
      alert('로그아웃 실패')
    }
  }
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
      title="로그아웃"
    >
      로그아웃
    </button>
  )
}

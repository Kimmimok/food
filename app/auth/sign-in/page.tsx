// @ts-nocheck
"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setErr(error.message)
    else window.location.href = '/'
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">로그인</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" className="w-full border rounded px-3 py-2" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={loading} className="w-full px-3 py-2 rounded bg-black text-white">{loading? '처리중...' : '로그인'}</button>
      </form>
      <p className="text-sm">계정이 없으신가요? <Link href="/auth/sign-up" className="underline">회원가입</Link></p>
    </div>
  )
}

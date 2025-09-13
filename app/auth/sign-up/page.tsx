// @ts-nocheck
"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase().auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }

    // Supabase may require email confirmation. If data.user is present, try to create profile.
    const user = data?.user ?? null
    try {
      if (user && user.id) {
        await supabase().from('user_profile').upsert({ id: user.id, email, name, role: 'member' })
        setSuccess('회원가입이 완료되었습니다. 자동 로그인되었습니다.')
        // 안전하게 홈으로 이동
        window.location.href = '/'
        return
      }
    } catch (e: any) {
      // upsert 실패는 치명적이지 않음 (트리거가 있을 수 있음)
      console.error('profile upsert failed', e)
    }

    // 이메일 확인이 필요한 경우
    setSuccess('확인 이메일이 발송되었습니다. 이메일의 확인 링크를 클릭한 후 로그인하세요.')
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">회원가입</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름" className="w-full border rounded px-3 py-2" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" className="w-full border rounded px-3 py-2" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" className="w-full border rounded px-3 py-2" />
  {err && <p className="text-sm text-red-600">{err}</p>}
  {success && <p className="text-sm text-green-600">{success}</p>}
        <button disabled={loading} className="w-full px-3 py-2 rounded bg-black text-white">{loading? '처리중...' : '가입'}</button>
      </form>
    </div>
  )
}

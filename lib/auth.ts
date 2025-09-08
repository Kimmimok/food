// @ts-nocheck
import { redirect } from 'next/navigation'
import { supabaseServer } from './supabase-server'

export type AppRole = 'guest' | 'member' | 'manager' | 'admin'

export async function getUserAndRole(): Promise<{ user: any; role: AppRole }> {
  const supabase = await supabaseServer()
  const { data } = await supabase.auth.getUser()
  const user = data?.user ?? null
  if (!user) return { user: null, role: 'guest' }
  const { data: profile } = await supabase
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return { user, role: (profile?.role as AppRole) ?? 'member' }
}

export async function requireRole(allowed: AppRole[]) {
  const { user, role } = await getUserAndRole()
  if (!user || !allowed.includes(role)) {
    redirect('/auth/sign-in')
  }
  return { user, role }
}

import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import Shell from './Shell'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  return (
    <Shell user={user} profile={profile}>
      {children}
    </Shell>
  )
}

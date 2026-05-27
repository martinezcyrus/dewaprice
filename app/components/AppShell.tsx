import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import NavBar from './NavBar'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
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
    <div className="min-h-screen bg-slate-50">
      <NavBar user={user} profile={profile} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}

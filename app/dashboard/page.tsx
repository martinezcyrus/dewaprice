import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  const { data: items } = await supabase
    .from('items')
    .select('id, description, created_at, supplier, categories(name)')
    .order('created_at', { ascending: false })

  const { data: cats } = await supabase.from('categories').select('id')

  const suppliers = new Set((items || []).map((i: any) => i.supplier).filter(Boolean))

  const stats = {
    items: items?.length || 0,
    categories: cats?.length || 0,
    suppliers: suppliers.size,
  }

  const recentItems = (items || []).slice(0, 5)

  return (
    <DashboardClient
      userName={firstName}
      stats={stats}
      recentItems={recentItems}
    />
  )
}

import { createClient } from '../../lib/server'
import { redirect } from 'next/navigation'
import AppShell from '../../components/AppShell'
import CategoriesAdmin from './CategoriesAdmin'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const { data: categories } = await supabase
    .from('estimator_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <AppShell>
      <CategoriesAdmin
        userId={user.id}
        initialCategories={categories || []}
        userRole={profile?.role || 'user'}
      />
    </AppShell>
  )
}

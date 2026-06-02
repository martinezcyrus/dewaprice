import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import EstimatorClient from './EstimatorClient'

export default async function EstimatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prices } = await supabase
    .from('items')
    .select('id, description, unit, base_price, category_id, method_tags')
    .order('id')

  const { data: savedEstimates } = await supabase
    .from('estimates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: categories } = await supabase
    .from('estimator_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <AppShell>
      <EstimatorClient
        userId={user.id}
        initialPrices={prices || []}
        initialEstimates={savedEstimates || []}
        initialCategories={categories || []}
      />
    </AppShell>
  )
}

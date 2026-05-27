import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import EstimatorClient from './EstimatorClient'

export default async function EstimatorPage() {
  const supabase = createClient()
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

  return (
    <EstimatorClient
      userId={user.id}
      initialPrices={prices || []}
      initialEstimates={savedEstimates || []}
    />
  )
}

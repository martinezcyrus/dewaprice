import { createClient } from '../lib/server'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import PricesClient from './PricesClient'

export default async function PricesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: items } = await supabase
    .from('items')
    .select('id, description, full_description, category_id, unit, base_price, base_currency, supplier, supplier_contact, business_unit_id, notes, image_url, created_by, updated_by, created_at, updated_at, method_tags, categories(name)')
    .order('id', { ascending: false })
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .order('id')
  return (
    <AppShell>
      <PricesClient
        initialItems={items || []}
        initialCategories={categories || []}
        userId={user.id}
        userEmail={user.email || ''}
      />
    </AppShell>
  )
}

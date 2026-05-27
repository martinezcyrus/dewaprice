import { createClient } from './lib/client'
import LayoutClient from './LayoutClient'
import './globals.css'

export const metadata = {
  title: 'DewaPrice',
  description: 'Dewatering Price & Estimator Tool',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        <LayoutClient user={user} profile={profile}>
          {children}
        </LayoutClient>
      </body>
    </html>
  )
}

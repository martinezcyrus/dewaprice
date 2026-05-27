'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '../lib/client'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button onClick={handleSignOut} className={className}>
      {children ?? 'Sign out'}
    </button>
  )
}

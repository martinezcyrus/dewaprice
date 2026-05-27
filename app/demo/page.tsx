'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DemoPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const loginAsGuest = async () => {
      // Sign out any existing session first
      await supabase.auth.signOut()

      const { error } = await supabase.auth.signInWithPassword({
        email: 'guest@dewaprice.app',
        password: 'DemoGuest2024!',
      })

      if (error) {
        setError(error.message)
        setStatus('error')
        return
      }

      window.location.href = '/dashboard'
    }

    loginAsGuest()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d2137, #163351, #1a3d5c)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        padding: '48px', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        maxWidth: '400px', width: '90%'
      }}>
        {status === 'loading' ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0d2137', marginBottom: '8px' }}>
              Loading Demo...
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              Setting up your read-only demo session
            </p>
            <div style={{
              width: '48px', height: '48px', border: '4px solid #e0e0e0',
              borderTop: '4px solid #1565C0', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto'
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#c62828', marginBottom: '8px' }}>
              Demo Login Failed
            </h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
            <p style={{ color: '#999', fontSize: '12px' }}>
              Contact <strong>cyrusjaysonm@gmail.com</strong> for access
            </p>
          </>
        )}
      </div>
    </div>
  )
}

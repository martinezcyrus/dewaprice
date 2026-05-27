'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/client'

export default function DemoPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const autoLogin = async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'guest@dewaprice.app',
        password: 'DemoGuest2024!',
      })

      if (error) {
        setError('Demo account unavailable. Please contact the admin.')
        return
      }

      router.refresh()
      router.push('/dashboard')
    }

    autoLogin()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '48px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)', textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💧</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0d2137', margin: '0 0 8px 0' }}>
          DewaPrice Demo
        </h1>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 24px 0' }}>
          Logging you in as a guest...
        </p>
        {!error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1565C0' }}>
            <div style={{
              width: '20px', height: '20px', border: '3px solid #E3F2FD',
              borderTop: '3px solid #1565C0', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}/>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Setting up demo access...</span>
          </div>
        ) : (
          <div>
            <div style={{
              background: '#ffebee', border: '1px solid #ffcdd2',
              color: '#c62828', padding: '12px 16px', borderRadius: '8px',
              marginBottom: '16px', fontSize: '13px'
            }}>
              ⚠️ {error}
            </div>
            <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Demo Access"
              style={{
                display: 'inline-block', padding: '12px 24px',
                background: 'linear-gradient(135deg, #1565C0, #0288D1)',
                color: 'white', borderRadius: '8px', fontSize: '14px',
                fontWeight: '600', textDecoration: 'none'
              }}>
              📧 Contact Admin
            </a>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', marginTop: '24px' }}>
          👁️ Demo mode — read only · 🇵🇭 Philippines BU
        </p>
      </div>
    </div>
  )
}

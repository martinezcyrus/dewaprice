'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💧</div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#0f2027',
            margin: '0 0 8px 0'
          }}>DewaPrice</h1>
          <p style={{
            color: '#666666',
            fontSize: '14px',
            margin: 0
          }}>Dewatering Price & Estimator Tool</p>
          <div style={{
            width: '48px',
            height: '3px',
            background: 'linear-gradient(90deg, #2196F3, #00BCD4)',
            margin: '16px auto 0',
            borderRadius: '2px'
          }}/>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fff3f3',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#333333',
            marginBottom: '6px'
          }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1.5px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#000000',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#333333',
            marginBottom: '6px'
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1.5px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#000000',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading
              ? '#90CAF9'
              : 'linear-gradient(135deg, #1565C0, #0288D1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#999999',
          marginTop: '24px',
          marginBottom: 0
        }}>
          🇵🇭 Philippines BU — Internal tool
        </p>
      </div>
    </div>
  )
}

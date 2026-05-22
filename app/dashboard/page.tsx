'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: '#0f2027',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Top Navigation */}
      <nav style={{
        background: 'linear-gradient(135deg, #0f2027, #203a43)',
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>💧</span>
          <span style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>DewaPrice</span>
          <span style={{
            background: '#2196F3',
            color: 'white',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '99px',
            fontWeight: '600'
          }}>🇵🇭 Philippines</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            color: '#90CAF9',
            fontSize: '13px'
          }}>{user?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '32px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#0f2027',
            margin: '0 0 8px 0'
          }}>Welcome back! 👋</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
            Dewatering Price & Estimator Tool — Philippines BU
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {[
            { icon: '💰', label: 'Price Database', value: 'Philippines', sub: 'Active', color: '#E3F2FD' },
            { icon: '🏗️', label: 'Dewatering Estimator', value: 'Coming Soon', sub: 'Phase 4', color: '#E8F5E9' },
            { icon: '📊', label: 'Rental Calculator', value: 'Coming Soon', sub: 'Phase 5', color: '#FFF3E0' },
            { icon: '🌍', label: 'Other BUs', value: 'Coming Soon', sub: 'KSA • Canada • ME', color: '#F3E5F5' },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: card.color,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '12px'
              }}>{card.icon}</div>
              <div style={{
                fontSize: '13px',
                color: '#999',
                marginBottom: '4px'
              }}>{card.label}</div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#0f2027',
                marginBottom: '4px'
              }}>{card.value}</div>
              <div style={{
                fontSize: '12px',
                color: '#2196F3'
              }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#0f2027',
            margin: '0 0 16px 0'
          }}>Quick Actions</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {[
              { icon: '🔍', label: 'Search Prices', desc: 'Find material prices', href: '/prices' },
              { icon: '➕', label: 'Add Price', desc: 'Add new item', href: '/prices/add' },
              { icon: '🏗️', label: 'Run Estimator', desc: 'Estimate dewatering cost', href: '/estimator' },
              { icon: '📊', label: 'Rental Rates', desc: 'Calculate rental price', href: '/rental' },
            ].map((action, i) => (
              <div
                key={i}
                onClick={() => window.location.href = action.href}
                style={{
                  padding: '16px',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#2196F3')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{action.icon}</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0f2027',
                  marginBottom: '4px'
                }}>{action.label}</div>
                <div style={{
                  fontSize: '12px',
                  color: '#999'
                }}>{action.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

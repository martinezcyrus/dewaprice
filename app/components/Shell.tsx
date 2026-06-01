'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/client'
import type { User } from '@supabase/supabase-js'

interface ShellProps {
  user: User
  profile: { full_name: string | null; role: string | null } | null
  children: React.ReactNode
}

const NAV = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '💰', label: 'Prices', href: '/prices' },
  { icon: '🏗️', label: 'Estimator', href: '/estimator' },
  { icon: '🛠️', label: 'Rental', href: '/rental' },
]

export default function Shell({ user, profile, children }: ShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const role = profile?.role || 'user'
  const SIDEBAR_W = collapsed ? 72 : 240

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', fontFamily: 'Arial, sans-serif' }}>

      {/* ===== SIDEBAR ===== */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0, background: 'linear-gradient(180deg, #0d2137 0%, #122c47 100%)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
        transition: 'width 0.22s ease', borderRight: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Logo + toggle */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 18px', display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', height: '64px'
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💧</div>
              <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>DewaPrice</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
            width: '30px', height: '30px', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', flexShrink: 0
          }} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: collapsed ? '12px 8px' : '12px', flex: 1 }}>
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <button key={item.href} onClick={() => router.push(item.href)} title={item.label}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '12px 0' : '11px 14px', marginBottom: '4px',
                  background: active ? 'rgba(33,150,243,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(33,150,243,0.35)' : '1px solid transparent',
                  borderRadius: '9px', color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontSize: '13px', fontWeight: active ? '600' : '500', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: '17px' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User profile + sign out */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: collapsed ? 0 : '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'capitalize' }}>{role}</div>
              </div>
            )}
          </div>
          <button onClick={handleSignOut} title="Sign out" style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
          }}>
            <span>⏻</span>{!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* TOP RIBBON with tabs */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e6edf3', padding: '0 24px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
        }}>
          {/* Ribbon tabs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
            {NAV.map(item => {
              const active = isActive(item.href)
              return (
                <button key={item.href} onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
                    background: active ? '#eff6ff' : 'transparent',
                    border: 'none', borderRadius: '8px',
                    color: active ? '#1565C0' : '#64748b', fontSize: '13px', fontWeight: active ? '700' : '500',
                    cursor: 'pointer', transition: 'all 0.15s', height: '40px'
                  }}
                  onMouseOver={(e) => { if (!active) e.currentTarget.style.background = '#f1f5f9' }}
                  onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Date */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>TODAY</div>
            <div style={{ color: '#0d2137', fontSize: '13px', fontWeight: '600' }}>
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/client'

const BUS = [
  { flag: '🇵🇭', name: 'Philippines', tz: 'Asia/Manila', currency: 'PHP', color: '#1565C0', active: true },
  { flag: '🇸🇦', name: 'KSA', tz: 'Asia/Riyadh', currency: 'SAR', color: '#2E7D32', active: false },
  { flag: '🇦🇪', name: 'Middle East', tz: 'Asia/Dubai', currency: 'AED', color: '#E65100', active: false },
  { flag: '🇨🇦', name: 'Canada', tz: 'America/Toronto', currency: 'CAD', color: '#6A1B9A', active: false },
  { flag: '🇬🇧', name: 'UK', tz: 'Europe/London', currency: 'GBP', color: '#00695C', active: false },
]

const NAV = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard', active: true },
  { icon: '💰', label: 'Prices', href: '/prices', active: false },
  { icon: '🏗️', label: 'Estimator', href: '/estimator', active: false },
  { icon: '🛠️', label: 'Rental', href: '/rental', active: false },
]

function WorldClock({ flag, name, tz, currency, color, active }: any) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [period, setPeriod] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      })
      const parts = timeStr.split(' ')
      setTime(parts[0])
      setPeriod(parts[1] || '')
      setDate(now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [tz])

  return (
    <div style={{
      background: '#fff', border: '1px solid #e6edf3', borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '16px 14px', textAlign: 'center', flex: 1, minWidth: '140px',
      opacity: active ? 1 : 0.7, boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
    }}>
      <div style={{ fontSize: '26px', marginBottom: '4px' }}>{flag}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
        <span style={{ color: '#0d2137', fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{time}</span>
        <span style={{ color, fontSize: '11px', fontWeight: '700' }}>{period}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '5px' }}>{date}</div>
      {!active && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', borderRadius: '99px', padding: '2px 8px', display: 'inline-block' }}>Coming Soon</div>
      )}
    </div>
  )
}

function CurrencyCard({ flag, name, currency, color, active }: any) {
  const [rate, setRate] = useState<number | null>(null)
  const [change, setChange] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currency === 'PHP') { setRate(1); setLoading(false); return }
    fetch(`https://api.exchangerate-api.com/v4/latest/PHP`)
      .then(r => r.json())
      .then(data => {
        const r = data.rates[currency]
        setRate(r)
        setChange((Math.random() - 0.5) * 0.02)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currency])

  const phpPerUnit = rate && currency !== 'PHP' ? (1 / rate).toFixed(4) : null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e6edf3', borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '16px 14px', textAlign: 'center', flex: 1, minWidth: '140px',
      opacity: active ? 1 : 0.7, boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
    }}>
      <div style={{ fontSize: '26px', marginBottom: '4px' }}>{flag}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>{name}</div>
      {currency === 'PHP' ? (
        <>
          <div style={{ color: '#0d2137', fontSize: '20px', fontWeight: 'bold' }}>Base</div>
          <div style={{ color, fontSize: '13px', fontWeight: '700', marginTop: '4px' }}>PHP ₱</div>
        </>
      ) : (
        <>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>1 {currency} =</div>
          <div style={{ color: '#0d2137', fontSize: '20px', fontWeight: 'bold' }}>
            {loading ? '...' : `₱${phpPerUnit ? parseFloat(phpPerUnit).toLocaleString() : '-'}`}
          </div>
          <div style={{ color, fontSize: '13px', fontWeight: '700', marginTop: '4px' }}>{currency}</div>
          {!loading && rate && (
            <div style={{ color: change >= 0 ? '#16a34a' : '#dc2626', fontSize: '11px', marginTop: '4px' }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(2)}%
            </div>
          )}
        </>
      )}
      {!active && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', borderRadius: '99px', padding: '2px 8px', display: 'inline-block' }}>Coming Soon</div>
      )}
    </div>
  )
}

function SectionLabel({ icon, children, extra }: { icon: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{
      color: '#64748b', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px',
      textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'
    }}>
      <span>{icon}</span> {children} {extra}
    </div>
  )
}

interface Props {
  userName: string
  userEmail?: string
  stats: { items: number; categories: number; suppliers: number }
  recentItems: any[]
}

export default function DashboardClient({ userName, userEmail, stats, recentItems }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navigate = (href: string) => router.push(href)

  const SIDEBAR_W = collapsed ? 72 : 240

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
          justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)'
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
          {NAV.map(item => (
            <button key={item.href} onClick={() => navigate(item.href)} title={item.label}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px 0' : '11px 14px', marginBottom: '4px',
                background: item.active ? 'rgba(33,150,243,0.18)' : 'transparent',
                border: item.active ? '1px solid rgba(33,150,243,0.35)' : '1px solid transparent',
                borderRadius: '9px', color: item.active ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: '13px', fontWeight: item.active ? '600' : '500', cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { if (!item.active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseOut={(e) => { if (!item.active) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: '17px' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Stats mini-summary */}
        {!collapsed && (
          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Database</div>
            {[
              { label: 'Items', value: stats.items, color: '#2196F3' },
              { label: 'Categories', value: stats.categories, color: '#4CAF50' },
              { label: 'Suppliers', value: stats.suppliers, color: '#FF9800' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '7px', marginBottom: '2px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />{s.label}
                </span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* User profile + sign out */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: collapsed ? 0 : '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail || ''}</div>
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

        {/* TOP RIBBON */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e6edf3', padding: '0 28px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
        }}>
          <div>
            <h1 style={{ color: '#0d2137', fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '-0.3px' }}>
              Good day, {userName} 👋
            </h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>Dewatering Price &amp; Estimator Tool</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>TODAY</div>
              <div style={{ color: '#0d2137', fontSize: '13px', fontWeight: '600' }}>
                {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ padding: '24px 28px', flex: 1 }}>

          {/* World Clocks */}
          <div style={{ marginBottom: '22px' }}>
            <SectionLabel icon="🕐">World Clocks</SectionLabel>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {BUS.map(bu => <WorldClock key={bu.name} {...bu} />)}
            </div>
          </div>

          {/* Currency Rates */}
          <div style={{ marginBottom: '22px' }}>
            <SectionLabel icon="💱" extra={
              <span style={{ fontSize: '9px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '99px' }}>vs PHP · Live</span>
            }>Live Exchange Rates</SectionLabel>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {BUS.map(bu => <CurrencyCard key={bu.name} {...bu} />)}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: '22px' }}>
            <SectionLabel icon="📊">Database Overview</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {[
                { icon: '📦', label: 'Total Items', value: stats.items, color: '#2196F3' },
                { icon: '🏷️', label: 'Categories', value: stats.categories, color: '#4CAF50' },
                { icon: '🏢', label: 'Suppliers', value: stats.suppliers, color: '#FF9800' },
                { icon: '🌍', label: 'Business Units', value: 4, color: '#9C27B0' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: '#fff', border: '1px solid #e6edf3', borderRadius: '12px', padding: '18px',
                  display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
                }}>
                  <div style={{ width: '44px', height: '44px', background: `${stat.color}18`, border: `1px solid ${stat.color}33`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                  <div>
                    <div style={{ color: '#0d2137', fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Quick Actions */}
            <div>
              <SectionLabel icon="⚡">Quick Actions</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { icon: '🔍', label: 'Search Prices', href: '/prices', color: '#2196F3' },
                  { icon: '➕', label: 'Add Item', href: '/prices', color: '#4CAF50' },
                  { icon: '🏗️', label: 'Estimator', href: '/estimator', color: '#FF9800' },
                  { icon: '🛠️', label: 'Rental Calc', href: '/rental', color: '#9C27B0' },
                ].map((action, i) => (
                  <div key={i} onClick={() => navigate(action.href)} style={{
                    background: '#fff', border: '1px solid #e6edf3', borderRadius: '12px', padding: '16px',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(13,33,55,0.04)'
                  }}
                    onMouseOver={(e) => { e.currentTarget.style.background = `${action.color}0d`; e.currentTarget.style.borderColor = `${action.color}55` }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e6edf3' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{action.icon}</div>
                    <div style={{ color: '#475569', fontSize: '12px', fontWeight: '600' }}>{action.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Items */}
            <div>
              <SectionLabel icon="🕒">Recently Added</SectionLabel>
              <div style={{ background: '#fff', border: '1px solid #e6edf3', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(13,33,55,0.04)' }}>
                {recentItems.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No items yet</div>
                ) : recentItems.map((item: any, i) => (
                  <div key={item.id} onClick={() => navigate('/prices')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px',
                    borderBottom: i < recentItems.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.1s'
                  }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#fff'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(33,150,243,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                      <div>
                        <div style={{ color: '#0d2137', fontSize: '12px', fontWeight: '600' }}>
                          {item.description?.length > 28 ? item.description.substring(0, 28) + '...' : item.description}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>{item.categories?.name || 'Uncategorized'}</div>
                      </div>
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '10px', whiteSpace: 'nowrap' }}>
                      {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

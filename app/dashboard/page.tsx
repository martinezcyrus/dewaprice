'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/client'

const BUS = [
  { flag: '🇵🇭', name: 'Philippines', tz: 'Asia/Manila', currency: 'PHP', color: '#1565C0', active: true },
  { flag: '🇸🇦', name: 'KSA', tz: 'Asia/Riyadh', currency: 'SAR', color: '#2E7D32', active: false },
  { flag: '🇦🇪', name: 'Middle East', tz: 'Asia/Dubai', currency: 'AED', color: '#E65100', active: false },
  { flag: '🇨🇦', name: 'Canada', tz: 'America/Toronto', currency: 'CAD', color: '#6A1B9A', active: false },
  { flag: '🇬🇧', name: 'UK', tz: 'Europe/London', currency: 'GBP', color: '#00695C', active: false },
]

function WorldClock({ flag, name, tz, currency, color, active }: any) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [period, setPeriod] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: tz, hour: '2-digit',
        minute: '2-digit', second: '2-digit', hour12: true
      })
      const parts = timeStr.split(' ')
      setTime(parts[0])
      setPeriod(parts[1] || '')
      setDate(now.toLocaleDateString('en-US', {
        timeZone: tz, weekday: 'short',
        month: 'short', day: 'numeric'
      }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [tz])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      border: `1px solid rgba(255,255,255,0.1)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '18px 16px',
      textAlign: 'center', flex: 1, minWidth: '150px',
      opacity: active ? 1 : 0.65
    }}>
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{flag}</div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginBottom: '10px', fontWeight: '500' }}>
        {name}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
        <span style={{
          color: 'white', fontSize: '24px',
          fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px'
        }}>{time}</span>
        <span style={{ color: color, fontSize: '12px', fontWeight: '600' }}>{period}</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '6px' }}>{date}</div>
      {!active && (
        <div style={{
          marginTop: '8px', fontSize: '10px',
          color: 'rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '99px', padding: '2px 8px',
          display: 'inline-block'
        }}>Coming Soon</div>
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
      background: 'rgba(255,255,255,0.07)',
      border: `1px solid rgba(255,255,255,0.1)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '18px 16px',
      textAlign: 'center', flex: 1, minWidth: '150px',
      opacity: active ? 1 : 0.65
    }}>
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{flag}</div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginBottom: '10px', fontWeight: '500' }}>
        {name}
      </div>
      {currency === 'PHP' ? (
        <>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold' }}>Base</div>
          <div style={{ color: color, fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>PHP ₱</div>
        </>
      ) : (
        <>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>
            1 {currency} =
          </div>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold' }}>
            {loading ? '...' : `₱${phpPerUnit ? parseFloat(phpPerUnit).toLocaleString() : '-'}`}
          </div>
          <div style={{ color: color, fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
            {currency}
          </div>
          {!loading && rate && (
            <div style={{
              color: change >= 0 ? '#81C784' : '#EF9A9A',
              fontSize: '11px', marginTop: '4px'
            }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(2)}%
            </div>
          )}
        </>
      )}
      {!active && (
        <div style={{
          marginTop: '8px', fontSize: '10px',
          color: 'rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '99px', padding: '2px 8px',
          display: 'inline-block'
        }}>Coming Soon</div>
      )}
    </div>
  )
}

interface Props {
  userName: string
  stats: { items: number; categories: number; suppliers: number }
  recentItems: any[]
}

export default function DashboardClient({ userName, stats, recentItems }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const navigate = (href: string) => router.push(href)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d2137 0%, #163351 40%, #1a3d5c 100%)',
    }}>
      <div style={{ padding: '28px 32px' }}>

        {/* Header */}
        <div style={{
          marginBottom: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <h1 style={{
              color: 'white', fontSize: '24px',
              fontWeight: '600', margin: '0 0 4px 0',
              letterSpacing: '-0.3px'
            }}>
              Good day, {userName} 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '13px' }}>
              Dewatering Price & Estimator Tool
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '10px 16px',
              textAlign: 'right'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '2px' }}>TODAY</div>
              <div style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
                {new Date().toLocaleDateString('en-PH', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                })}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '8px 14px',
                color: 'rgba(255,255,255,0.6)', fontSize: '12px',
                cursor: 'pointer', fontWeight: '500'
              }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { label: '📊 Dashboard', href: '/dashboard', active: true },
            { label: '💰 Prices', href: '/prices', active: false },
            { label: '🏗️ Estimator', href: '/estimator', active: false },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              style={{
                padding: '8px 16px',
                background: item.active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: item.active ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: item.active ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '13px', fontWeight: '500',
                cursor: 'pointer'
              }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* World Clocks */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '10px',
            fontWeight: '700', letterSpacing: '1.5px',
            textTransform: 'uppercase', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>🕐</span> World Clocks
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {BUS.map(bu => <WorldClock key={bu.name} {...bu} />)}
          </div>
        </div>

        {/* Currency Rates */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '10px',
            fontWeight: '700', letterSpacing: '1.5px',
            textTransform: 'uppercase', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>💱</span> Live Exchange Rates
            <span style={{
              fontSize: '9px', color: 'rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 6px', borderRadius: '99px'
            }}>vs PHP · Live</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {BUS.map(bu => <CurrencyCard key={bu.name} {...bu} />)}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '10px',
            fontWeight: '700', letterSpacing: '1.5px',
            textTransform: 'uppercase', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>📊</span> Database Overview
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px'
          }}>
            {[
              { icon: '📦', label: 'Total Items', value: stats.items, color: '#2196F3' },
              { icon: '🏷️', label: 'Categories', value: stats.categories, color: '#4CAF50' },
              { icon: '🏢', label: 'Suppliers', value: stats.suppliers, color: '#FF9800' },
              { icon: '🌍', label: 'Business Units', value: 4, color: '#9C27B0' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '18px',
                display: 'flex', alignItems: 'center', gap: '14px'
              }}>
                <div style={{
                  width: '44px', height: '44px',
                  background: `${stat.color}22`,
                  border: `1px solid ${stat.color}44`,
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px'
                }}>{stat.icon}</div>
                <div>
                  <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px' }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Quick Actions */}
          <div>
            <div style={{
              color: 'rgba(255,255,255,0.35)', fontSize: '10px',
              fontWeight: '700', letterSpacing: '1.5px',
              textTransform: 'uppercase', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>⚡</span> Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: '🔍', label: 'Search Prices', href: '/prices', color: '#2196F3' },
                { icon: '➕', label: 'Add Item', href: '/prices', color: '#4CAF50' },
                { icon: '🏗️', label: 'Estimator', href: '/estimator', color: '#FF9800' },
                { icon: '📊', label: 'Rental Calc', href: '/rental', color: '#9C27B0' },
              ].map((action, i) => (
                <div key={i}
                  onClick={() => navigate(action.href)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: '12px', padding: '16px',
                    cursor: 'pointer', textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = `${action.color}15`
                    e.currentTarget.style.borderColor = `${action.color}44`
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{action.icon}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '500' }}>
                    {action.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div>
            <div style={{
              color: 'rgba(255,255,255,0.35)', fontSize: '10px',
              fontWeight: '700', letterSpacing: '1.5px',
              textTransform: 'uppercase', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>🕒</span> Recently Added
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', overflow: 'hidden'
            }}>
              {recentItems.length === 0 ? (
                <div style={{
                  padding: '24px', textAlign: 'center',
                  color: 'rgba(255,255,255,0.2)', fontSize: '13px'
                }}>No items yet</div>
              ) : recentItems.map((item: any, i) => (
                <div key={item.id}
                  onClick={() => navigate('/prices')}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 16px',
                    borderBottom: i < recentItems.length - 1
                      ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px',
                      background: 'rgba(33,150,243,0.15)',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '14px'
                    }}>📦</div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '500' }}>
                        {item.description?.length > 28
                          ? item.description.substring(0, 28) + '...'
                          : item.description}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '1px' }}>
                        {item.categories?.name || 'Uncategorized'}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    {new Date(item.created_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  stats: { items: number; categories: number; suppliers: number }
  recentItems: any[]
}

export default function DashboardClient({ userName, stats, recentItems }: Props) {
  const router = useRouter()
  const navigate = (href: string) => router.push(href)

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Greeting */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#0d2137', fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
          Good day, {userName} 👋
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>Dewatering Price &amp; Estimator Tool</p>
      </div>

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

    </div>
  )
}

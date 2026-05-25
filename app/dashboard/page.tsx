'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TIMEZONES = [
  { label: 'Manila', country: '🇵🇭', tz: 'Asia/Manila', currency: 'PHP', color: '#1565C0' },
  { label: 'Riyadh', country: '🇸🇦', tz: 'Asia/Riyadh', currency: 'SAR', color: '#2E7D32' },
  { label: 'Dubai', country: '🇦🇪', tz: 'Asia/Dubai', currency: 'AED', color: '#E65100' },
  { label: 'Toronto', country: '🇨🇦', tz: 'America/Toronto', currency: 'CAD', color: '#6A1B9A' },
  { label: 'London', country: '🇬🇧', tz: 'Europe/London', currency: 'GBP', color: '#00695C' },
]

function WorldClock({ label, country, tz, color }: any) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [tz])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '16px',
      textAlign: 'center', flex: 1, minWidth: '140px'
    }}>
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{country}</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px' }}>
        {time}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>{date}</div>
    </div>
  )
}

function CurrencyCard({ currency, color }: any) {
  const [rate, setRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currency === 'PHP') { setRate(1); setLoading(false); return }
    fetch(`https://api.exchangerate-api.com/v4/latest/PHP`)
      .then(r => r.json())
      .then(data => {
        setRate(data.rates[currency])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currency])

  const phpPerUnit = rate ? (1 / rate).toFixed(2) : null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`,
      borderRadius: '12px', padding: '16px',
      textAlign: 'center', flex: 1, minWidth: '140px'
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
        {currency === 'PHP' ? 'Base Currency' : `1 ${currency} =`}
      </div>
      <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold' }}>
        {currency === 'PHP' ? '₱1.00' : loading ? '...' : `₱${phpPerUnit}`}
      </div>
      <div style={{ color: color, fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
        {currency}
      </div>
      {currency !== 'PHP' && rate && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px' }}>
          ₱1 = {rate.toFixed(4)} {currency}
        </div>
      )}
    </div>
  )
}

// SVG Background Pattern
function DewateringBackground() {
  return (
    <svg style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      opacity: 0.06, pointerEvents: 'none', zIndex: 0
    }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Pipes */}
          <line x1="0" y1="40" x2="80" y2="40" stroke="white" strokeWidth="2"/>
          <line x1="40" y1="0" x2="40" y2="80" stroke="white" strokeWidth="2"/>
          {/* Pipe joints */}
          <circle cx="40" cy="40" r="4" fill="white"/>
          <circle cx="0" cy="40" r="3" fill="white"/>
          <circle cx="80" cy="40" r="3" fill="white"/>
          <circle cx="40" cy="0" r="3" fill="white"/>
          <circle cx="40" cy="80" r="3" fill="white"/>
        </pattern>
        <pattern id="pumps" width="160" height="160" patternUnits="userSpaceOnUse">
          {/* Pump symbol */}
          <circle cx="80" cy="80" r="12" fill="none" stroke="white" strokeWidth="1.5"/>
          <line x1="74" y1="80" x2="86" y2="80" stroke="white" strokeWidth="1.5"/>
          <line x1="80" y1="74" x2="80" y2="86" stroke="white" strokeWidth="1.5"/>
          {/* Well symbol */}
          <rect x="10" y="10" width="16" height="20" fill="none" stroke="white" strokeWidth="1.5" rx="2"/>
          <line x1="18" y1="30" x2="18" y2="45" stroke="white" strokeWidth="1.5"/>
          {/* Drill rig */}
          <polygon points="140,10 148,10 144,2" fill="none" stroke="white" strokeWidth="1.5"/>
          <line x1="144" y1="10" x2="144" y2="30" stroke="white" strokeWidth="1.5"/>
          <line x1="136" y1="30" x2="152" y2="30" stroke="white" strokeWidth="1.5"/>
          {/* Water drops */}
          <ellipse cx="30" cy="130" rx="4" ry="6" fill="white" opacity="0.5"/>
          <ellipse cx="130" cy="50" rx="3" ry="5" fill="white" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <rect width="100%" height="100%" fill="url(#pumps)"/>
    </svg>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({ items: 0, categories: 0, suppliers: 0 })
  const [recentItems, setRecentItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: profile } = await supabase
        .from('profiles').select('full_name')
        .eq('id', data.session.user.id).single()
      setUserName(profile?.full_name || data.session.user.email || '')

      const { data: items } = await supabase.from('items').select('id, description, created_at, categories(name)', )
      const { data: cats } = await supabase.from('categories').select('id')
      const suppliers = new Set(items?.map((i: any) => i.supplier).filter(Boolean))
      setStats({
        items: items?.length || 0,
        categories: cats?.length || 0,
        suppliers: suppliers.size
      })
      setRecentItems((items || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0a1628 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      <DewateringBackground />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            color: 'white', fontSize: '26px',
            fontWeight: 'bold', margin: '0 0 4px 0'
          }}>
            Welcome back, {userName.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '14px' }}>
            Dewatering Price & Estimator Tool — Philippines BU
          </p>
        </div>

        {/* World Clocks */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            fontWeight: '600', letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '12px'
          }}>🕐 World Clocks</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {TIMEZONES.map(tz => (
              <WorldClock key={tz.label} {...tz} />
            ))}
          </div>
        </div>

        {/* Currency Rates */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            fontWeight: '600', letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '12px'
          }}>💱 Live Exchange Rates (vs PHP)</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {TIMEZONES.map(tz => (
              <CurrencyCard key={tz.currency} currency={tz.currency} color={tz.color} />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            fontWeight: '600', letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '12px'
          }}>📊 Database Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { icon: '📦', label: 'Total Items', value: stats.items, color: '#1565C0' },
              { icon: '🏷️', label: 'Categories', value: stats.categories, color: '#2E7D32' },
              { icon: '🏢', label: 'Suppliers', value: stats.suppliers, color: '#E65100' },
              { icon: '🌍', label: 'Business Units', value: 4, color: '#6A1B9A' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${stat.color}44`,
                borderRadius: '12px', padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>
                  {loading ? '...' : stat.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            fontWeight: '600', letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '12px'
          }}>⚡ Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { icon: '🔍', label: 'Search Prices', desc: 'Find material prices', href: '/prices', color: '#1565C0' },
              { icon: '➕', label: 'Add Item', desc: 'Add to price database', href: '/prices', color: '#2E7D32' },
              { icon: '🏗️', label: 'Run Estimator', desc: 'Estimate project cost', href: '/estimator', color: '#E65100' },
              { icon: '📊', label: 'Rental Rates', desc: 'Calculate rental price', href: '/rental', color: '#6A1B9A' },
            ].map((action, i) => (
              <div key={i} onClick={() => window.location.href = action.href}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${action.color}44`,
                  borderRadius: '12px', padding: '20px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = `${action.color}22`
                  e.currentTarget.style.borderColor = action.color
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.borderColor = `${action.color}44`
                }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{action.icon}</div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  {action.label}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  {action.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Items */}
        <div>
          <div style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            fontWeight: '600', letterSpacing: '1px',
            textTransform: 'uppercase', marginBottom: '12px'
          }}>🕒 Recently Added</div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', overflow: 'hidden'
          }}>
            {recentItems.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                No items yet
              </div>
            ) : recentItems.map((item: any, i) => (
              <div key={item.id}
                onClick={() => window.location.href = '/prices'}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < recentItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  cursor: 'pointer'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px',
                    background: 'rgba(33,150,243,0.2)',
                    borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px'
                  }}>📦</div>
                  <div>
                    <div style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
                      {item.description}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                      {item.categories?.name || 'Uncategorized'}
                    </div>
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
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

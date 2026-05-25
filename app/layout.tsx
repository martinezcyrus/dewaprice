'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (!isLoginPage) {
      import('./lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(async ({ data }) => {
          if (data.session) {
            setUserEmail(data.session.user.email || '')
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', data.session.user.id)
              .single()
            setUserName(profile?.full_name || data.session.user.email || '')
          }
        })
      })
    }
  }, [pathname])

  const handleLogout = () => {
    import('./lib/supabase').then(({ supabase }) => {
      supabase.auth.signOut().then(() => {
        window.location.href = '/login'
      })
    })
  }

  const navItems = [
    { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
    { icon: '💰', label: 'Prices', href: '/prices' },
    { icon: '🏗️', label: 'Estimator', href: '/estimator' },
    { icon: '📊', label: 'Rental', href: '/rental' },
    { icon: '⚙️', label: 'Admin', href: '/admin' },
  ]

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'Arial, sans-serif' }}>
        {isLoginPage ? (
          children
        ) : (
          <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>

            {/* TOP BAR */}
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
              height: '56px',
              background: 'linear-gradient(135deg, #0a1628, #1a3a5c)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
            }}>
              {/* Left: hamburger + logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none', color: 'white',
                    width: '36px', height: '36px',
                    borderRadius: '8px', fontSize: '18px',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>☰</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px' }}>💧</span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                    DewaPrice
                  </span>
                  <span style={{
                    background: '#2196F3', color: 'white',
                    fontSize: '10px', padding: '2px 8px',
                    borderRadius: '99px', fontWeight: '600'
                  }}>🇵🇭 PH</span>
                </div>
              </div>

              {/* Center: nav links */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {navItems.slice(0, 4).map((item) => (
                  <a key={item.href} href={item.href}
                    style={{
                      color: pathname === item.href ? '#64B5F6' : 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: pathname === item.href ? '600' : '400',
                      background: pathname === item.href ? 'rgba(33,150,243,0.2)' : 'transparent',
                      borderBottom: pathname === item.href ? '2px solid #64B5F6' : '2px solid transparent',
                      transition: 'all 0.2s'
                    }}>
                    {item.icon} {item.label}
                  </a>
                ))}
              </div>

              {/* Right: user info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
                    {userName}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                    {userEmail}
                  </div>
                </div>
                <div style={{
                  width: '32px', height: '32px',
                  background: '#2196F3', borderRadius: '50%',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white',
                  fontWeight: 'bold', fontSize: '14px'
                }}>
                  {userName.charAt(0).toUpperCase() || '?'}
                </div>
                <button onClick={handleLogout} style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '6px 12px', borderRadius: '6px',
                  fontSize: '12px', cursor: 'pointer'
                }}>Sign out</button>
              </div>
            </div>

            {/* SIDEBAR OVERLAY */}
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 300,
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                }}>
                {/* Sidebar Panel */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '260px', height: '100%',
                    background: 'rgba(10, 22, 40, 0.92)',
                    backdropFilter: 'blur(16px)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', flexDirection: 'column',
                    paddingTop: '56px',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
                  }}>

                  {/* User Card */}
                  <div style={{
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{
                        width: '44px', height: '44px',
                        background: 'linear-gradient(135deg, #2196F3, #00BCD4)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white',
                        fontWeight: 'bold', fontSize: '18px'
                      }}>
                        {userName.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                          {userName}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                          {userEmail}
                        </div>
                        <div style={{
                          background: '#2196F3', color: 'white',
                          fontSize: '10px', padding: '1px 6px',
                          borderRadius: '99px', display: 'inline-block',
                          marginTop: '2px'
                        }}>Admin</div>
                      </div>
                    </div>
                  </div>

                  {/* Nav Items */}
                  <div style={{ padding: '12px 12px', flex: 1 }}>
                    <div style={{
                      fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                      fontWeight: '600', letterSpacing: '1px',
                      padding: '8px 8px 4px', textTransform: 'uppercase'
                    }}>Main Menu</div>
                    {navItems.map((item) => (
                      <a key={item.href} href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          gap: '12px', padding: '12px 16px',
                          borderRadius: '10px', marginBottom: '2px',
                          color: pathname === item.href ? 'white' : 'rgba(255,255,255,0.6)',
                          textDecoration: 'none', fontSize: '14px',
                          fontWeight: pathname === item.href ? '600' : '400',
                          background: pathname === item.href
                            ? 'linear-gradient(135deg, rgba(33,150,243,0.3), rgba(0,188,212,0.2))'
                            : 'transparent',
                          borderLeft: pathname === item.href
                            ? '3px solid #2196F3' : '3px solid transparent',
                          transition: 'all 0.2s'
                        }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        {item.label}
                        {pathname === item.href && (
                          <span style={{
                            marginLeft: 'auto', width: '6px', height: '6px',
                            background: '#2196F3', borderRadius: '50%'
                          }} />
                        )}
                      </a>
                    ))}
                  </div>

                  {/* Bottom */}
                  <div style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.3)',
                      textAlign: 'center', marginBottom: '8px'
                    }}>
                      DewaPrice v1.0 · Philippines BU
                    </div>
                    <button onClick={handleLogout} style={{
                      width: '100%', padding: '10px',
                      background: 'rgba(255,59,59,0.2)',
                      color: '#ff6b6b', border: '1px solid rgba(255,59,59,0.3)',
                      borderRadius: '8px', fontSize: '13px',
                      cursor: 'pointer', fontWeight: '500'
                    }}>🚪 Sign Out</button>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE CONTENT */}
            <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
              {children}
            </div>
          </div>
        )}
      </body>
    </html>
  )
}

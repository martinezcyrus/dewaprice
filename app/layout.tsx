'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
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
            const fullName = profile?.full_name || ''
            const firstName = fullName.split(' ')[0] || data.session.user.email?.split('@')[0] || 'User'
            setUserName(firstName)
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
          <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

            {/* TOP BAR */}
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
              height: '56px',
              background: 'linear-gradient(135deg, #0d2137, #1a3a5c)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
            }}>
              {/* Left: arrow toggle + logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white', width: '36px', height: '36px',
                    borderRadius: '8px', fontSize: '16px',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                  {sidebarOpen ? '←' : '→'}
                </button>
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

              {/* Right: user */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: 'linear-gradient(135deg, #2196F3, #00BCD4)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white',
                  fontWeight: 'bold', fontSize: '14px'
                }}>
                  {userName.charAt(0).toUpperCase() || '?'}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                  {userName}
                </span>
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
                  background: 'rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(3px)',
                }}>
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '260px', height: '100%',
                    background: 'rgba(13, 33, 55, 0.88)',
                    backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column',
                    paddingTop: '56px',
                    boxShadow: '4px 0 32px rgba(0,0,0,0.3)'
                  }}>

                  {/* Close arrow inside sidebar */}
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end',
                    padding: '12px 16px 0'
                  }}>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.6)',
                        width: '32px', height: '32px',
                        borderRadius: '8px', fontSize: '14px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}>←</button>
                  </div>

                  {/* User Card */}
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                          {userEmail}
                        </div>
                        <span style={{
                          background: 'rgba(33,150,243,0.3)',
                          color: '#64B5F6',
                          fontSize: '10px', padding: '1px 8px',
                          borderRadius: '99px', display: 'inline-block',
                          marginTop: '3px', fontWeight: '600'
                        }}>Admin</span>
                      </div>
                    </div>
                  </div>

                  {/* Nav Items */}
                  <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                    <div style={{
                      fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                      fontWeight: '600', letterSpacing: '1.5px',
                      padding: '8px 8px 6px',
                      textTransform: 'uppercase'
                    }}>Navigation</div>
                    {navItems.map((item) => (
                      <a key={item.href} href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          gap: '12px', padding: '11px 14px',
                          borderRadius: '10px', marginBottom: '2px',
                          color: pathname === item.href ? 'white' : 'rgba(255,255,255,0.55)',
                          textDecoration: 'none', fontSize: '14px',
                          fontWeight: pathname === item.href ? '600' : '400',
                          background: pathname === item.href
                            ? 'linear-gradient(135deg, rgba(33,150,243,0.25), rgba(0,188,212,0.15))'
                            : 'transparent',
                          borderLeft: pathname === item.href
                            ? '3px solid #2196F3' : '3px solid transparent',
                          transition: 'all 0.15s'
                        }}>
                        <span style={{ fontSize: '17px' }}>{item.icon}</span>
                        {item.label}
                        {pathname === item.href && (
                          <span style={{
                            marginLeft: 'auto',
                            width: '6px', height: '6px',
                            background: '#2196F3', borderRadius: '50%'
                          }} />
                        )}
                      </a>
                    ))}

                    {/* BU Section */}
                    <div style={{
                      fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                      fontWeight: '600', letterSpacing: '1.5px',
                      padding: '16px 8px 6px',
                      textTransform: 'uppercase'
                    }}>Business Units</div>
                    {[
                      { flag: '🇵🇭', name: 'Philippines', status: 'Active' },
                      { flag: '🇸🇦', name: 'KSA', status: 'Coming Soon' },
                      { flag: '🇨🇦', name: 'Canada', status: 'Coming Soon' },
                      { flag: '🇦🇪', name: 'Middle East', status: 'Coming Soon' },
                    ].map((bu) => (
                      <div key={bu.name} style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 14px',
                        borderRadius: '8px', marginBottom: '2px',
                        opacity: bu.status === 'Active' ? 1 : 0.5
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>{bu.flag}</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                            {bu.name}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10px', padding: '2px 6px',
                          borderRadius: '99px',
                          background: bu.status === 'Active' ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.08)',
                          color: bu.status === 'Active' ? '#81C784' : 'rgba(255,255,255,0.3)'
                        }}>{bu.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom */}
                  <div style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.2)',
                      textAlign: 'center', marginBottom: '10px'
                    }}>DewaPrice v1.0</div>
                    <button onClick={handleLogout} style={{
                      width: '100%', padding: '10px',
                      background: 'rgba(239,83,80,0.15)',
                      color: '#EF9A9A',
                      border: '1px solid rgba(239,83,80,0.25)',
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

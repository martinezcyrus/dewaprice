'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'
import './globals.css'

// ── GUEST CONTEXT — shared across all pages ──
export const GuestContext = createContext<{
  isGuest: boolean
  showPermissionModal: (action?: string) => void
}>({
  isGuest: false,
  showPermissionModal: () => {},
})

export function useGuest() {
  return useContext(GuestContext)
}

// ── PERMISSION MODAL ──
function PermissionModal({ action, onClose }: { action: string, onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '32px',
        maxWidth: '400px', width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        textAlign: 'center'
      }} onClick={e => e.stopPropagation()}>

        {/* Lock icon */}
        <div style={{
          width: '64px', height: '64px', background: '#FFF3E0',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
          fontSize: '28px', border: '2px solid #FFE0B2'
        }}>🔒</div>

        <h2 style={{
          fontSize: '18px', fontWeight: '700',
          color: '#0d2137', margin: '0 0 8px 0'
        }}>Access Restricted</h2>

        <p style={{
          fontSize: '14px', color: '#555',
          lineHeight: '1.6', margin: '0 0 8px 0'
        }}>
          <strong>{action}</strong> requires admin or editor access.
        </p>

        <p style={{
          fontSize: '13px', color: '#888',
          lineHeight: '1.6', margin: '0 0 24px 0'
        }}>
          You're currently in <strong>Demo Mode</strong> — all features are visible
          but editing is disabled. Contact the admin to request full access.
        </p>

        {/* Admin info */}
        <div style={{
          background: '#F3F4F6', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '20px',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Request Access From
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0d2137', marginBottom: '2px' }}>
            Cyrus Martinez
          </div>
          <div style={{ fontSize: '12px', color: '#1565C0' }}>
            cyrusjaysonm@gmail.com
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px',
            background: '#f0f0f0', color: '#333',
            border: 'none', borderRadius: '8px',
            fontSize: '13px', cursor: 'pointer', fontWeight: '600'
          }}>Close</button>
          <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request&body=Hi Cyrus, I would like to request full access to DewaPrice."
            style={{
              flex: 1, padding: '10px',
              background: '#1565C0', color: 'white',
              border: 'none', borderRadius: '8px',
              fontSize: '13px', cursor: 'pointer', fontWeight: '600',
              textDecoration: 'none', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
            📧 Contact Admin
          </a>
        </div>
      </div>
    </div>
  )
}

// ── DEMO BANNER ──
function DemoBanner({ onRequestAccess }: { onRequestAccess: () => void }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return (
    <div
      onClick={() => setVisible(true)}
      style={{
        position: 'fixed', bottom: '16px', right: '16px',
        background: '#E65100', color: 'white',
        padding: '8px 14px', borderRadius: '99px',
        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
        zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
      👁️ Demo Mode
    </div>
  )
  return (
    <div style={{
      background: 'linear-gradient(135deg, #E65100, #BF360C)',
      color: 'white', padding: '10px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '8px',
      fontSize: '13px', zIndex: 1000,
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>👁️</span>
        <div>
          <strong>Demo Mode</strong> — You're viewing DewaPrice as a guest.
          All features are visible but editing is disabled.
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        
          href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request&body=Hi Cyrus, I would like to request full access to DewaPrice."
          style={{
            background: 'white', color: '#E65100',
            padding: '6px 14px', borderRadius: '6px',
            fontSize: '12px', fontWeight: '700',
            textDecoration: 'none', whiteSpace: 'nowrap'
          }}>
          📩 Request Access
        </a>
        <button onClick={() => setVisible(false)} style={{
          background: 'transparent', border: 'none',
          color: 'white', cursor: 'pointer', fontSize: '18px',
          opacity: 0.7, padding: '0 4px'
        }}>×</button>
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [permissionModal, setPermissionModal] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const isGuest = profile?.role === 'guest'
  const isAdmin = profile?.role === 'admin'

  const showPermissionModal = (action = 'This action') => {
    setPermissionModal(action)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setUser(data.session.user)
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single()
        setProfile(prof)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user)
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(prof)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const noLayoutPages = ['/login', '/demo']
  const showLayout = user && !noLayoutPages.includes(pathname)

  if (loading) return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d2137', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px', fontFamily: 'Arial' }}>⏳ Loading...</div>
      </body>
    </html>
  )

  if (!showLayout) return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        <GuestContext.Provider value={{ isGuest, showPermissionModal }}>
          {children}
        </GuestContext.Provider>
      </body>
    </html>
  )

  const navLinks = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/prices', label: '💰 Prices' },
    { href: '/estimator', label: '🏗️ Estimator' },
    { href: '/rental', label: '🔧 Rental' },
    ...(isAdmin ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ]

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        <GuestContext.Provider value={{ isGuest, showPermissionModal }}>

          {/* Permission Modal */}
          {permissionModal && (
            <PermissionModal
              action={permissionModal}
              onClose={() => setPermissionModal(null)}
            />
          )}

          {/* Demo Banner */}
          {isGuest && <DemoBanner onRequestAccess={() => setPermissionModal('Full Access')} />}

          {/* Top Navbar */}
          <nav style={{
            background: 'linear-gradient(135deg, #0d2137, #1a3d5c)',
            color: 'white', padding: '0 20px',
            display: 'flex', alignItems: 'center',
            height: '56px', position: 'sticky', top: 0, zIndex: 100,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{
              background: 'none', border: 'none', color: 'white',
              fontSize: '20px', cursor: 'pointer', marginRight: '16px', padding: '4px'
            }}>→</button>

            <div style={{ fontWeight: '700', fontSize: '16px', marginRight: '32px', letterSpacing: '0.5px' }}>
              💧 DewaPrice
              {isGuest && <span style={{ fontSize: '10px', background: '#E65100', color: 'white', padding: '2px 8px', borderRadius: '99px', marginLeft: '8px', fontWeight: '600' }}>DEMO</span>}
            </div>

            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              {navLinks.map(link => (
                <a key={link.href} href={link.href} style={{
                  color: pathname === link.href ? 'white' : 'rgba(255,255,255,0.6)',
                  textDecoration: 'none', padding: '6px 12px', borderRadius: '6px',
                  fontSize: '13px', fontWeight: pathname === link.href ? '600' : '400',
                  background: pathname === link.href ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.15s'
                }}>{link.label}</a>
              ))}
            </div>

            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              {isGuest ? '👁️ Demo Guest' : `👋 ${firstName}`}
              {isAdmin && <span style={{ fontSize: '10px', background: '#2E7D32', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>ADMIN</span>}
            </div>
          </nav>

          {/* Sidebar */}
          {sidebarOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
                onClick={() => setSidebarOpen(false)}/>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px',
                background: 'rgba(13,33,55,0.97)',
                backdropFilter: 'blur(12px)', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>💧 DewaPrice</div>
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>

                {/* User info */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                    {isGuest ? 'Demo Account' : 'Logged In As'}
                  </div>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                    {isGuest ? '👁️ Demo Guest' : firstName}
                  </div>
                  {isAdmin && <div style={{ fontSize: '11px', color: '#4CAF50', marginTop: '2px' }}>⚙️ Administrator</div>}
                  {isGuest && <div style={{ fontSize: '11px', color: '#FF9800', marginTop: '2px' }}>🔒 Read-only access</div>}
                </div>

                {/* Nav links */}
                {navLinks.map(link => (
                  <a key={link.href} href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      color: pathname === link.href ? 'white' : 'rgba(255,255,255,0.65)',
                      textDecoration: 'none', padding: '10px 14px', borderRadius: '8px',
                      fontSize: '14px', fontWeight: pathname === link.href ? '600' : '400',
                      background: pathname === link.href ? 'rgba(255,255,255,0.12)' : 'transparent',
                    }}>{link.label}</a>
                ))}

                <div style={{ flex: 1 }}/>

                {/* BU flags */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '8px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Business Units</div>
                  {[
                    { flag: '🇵🇭', label: 'Philippines', active: true },
                    { flag: '🇸🇦', label: 'KSA', active: false },
                    { flag: '🇦🇪', label: 'Middle East', active: false },
                    { flag: '🇨🇦', label: 'Canada', active: false },
                  ].map(bu => (
                    <div key={bu.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', opacity: bu.active ? 1 : 0.4 }}>
                      <span style={{ fontSize: '18px' }}>{bu.flag}</span>
                      <span style={{ color: 'white', fontSize: '13px' }}>{bu.label}</span>
                      {bu.active && <span style={{ fontSize: '10px', background: '#2E7D32', color: 'white', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto' }}>Active</span>}
                      {!bu.active && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Soon</span>}
                    </div>
                  ))}
                </div>

                {/* Sign out */}
                {!isGuest ? (
                  <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{
                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.15)', padding: '10px',
                    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', width: '100%'
                  }}>🚪 Sign Out</button>
                ) : (
                  <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request" style={{
                    background: '#E65100', color: 'white',
                    border: 'none', padding: '10px',
                    borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                    width: '100%', textAlign: 'center', textDecoration: 'none',
                    display: 'block', fontWeight: '600'
                  }}>📩 Request Full Access</a>
                )}
              </div>
            </div>
          )}

          {/* Page content */}
          <main>{children}</main>

        </GuestContext.Provider>
      </body>
    </html>
  )
}

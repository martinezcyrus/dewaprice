'use client'

import { useState, createContext, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/client'

export const GuestContext = createContext<{
  isGuest: boolean
  isAdmin: boolean
  showPermissionModal: (action?: string) => void
}>({
  isGuest: false,
  isAdmin: false,
  showPermissionModal: () => {},
})

export function useGuest() {
  return useContext(GuestContext)
}

function PermissionModal({ action, onClose }: { action: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '36px', maxWidth: '420px', width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: '72px', height: '72px', background: '#FFF3E0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px', border: '3px solid #FFE0B2' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0d2137', margin: '0 0 10px 0' }}>Access Restricted</h2>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', margin: '0 0 6px 0' }}>
          <strong style={{ color: '#E65100' }}>{action}</strong> requires admin or editor access.
        </p>
        <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.7', margin: '0 0 24px 0' }}>
          You're in <strong>Demo Mode</strong> — all features visible but editing is disabled.
        </p>
        <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Request Access From</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#1565C0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px', flexShrink: 0 }}>C</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d2137' }}>Cyrus Martinez</div>
              <div style={{ fontSize: '12px', color: '#1565C0' }}>cyrusjaysonm@gmail.com</div>
              <div style={{ fontSize: '11px', color: '#999' }}>Dewatering Engineer · WJ Philippines</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request&body=Hi Cyrus,%0A%0AI viewed your DewaPrice demo and would like to request full access.%0A%0ARegards"
            style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1565C0, #0288D1)', color: 'white', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📧 Contact Admin
          </a>
        </div>
      </div>
    </div>
  )
}

function DemoBanner() {
  const [minimized, setMinimized] = useState(false)
  if (minimized) return (
    <div onClick={() => setMinimized(false)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#E65100', color: 'white', padding: '10px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', zIndex: 1000 }}>
      👁️ Demo Mode
    </div>
  )
  return (
    <div style={{ background: 'linear-gradient(135deg, #E65100, #BF360C)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px', fontSize: '13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>👁️</span>
        <div><strong>Demo Mode</strong> — Read-only guest view. All features visible · Editing disabled.</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request"
          style={{ background: 'white', color: '#E65100', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
          📩 Request Full Access
        </a>
        <button onClick={() => setMinimized(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', borderRadius: '4px' }}>−</button>
      </div>
    </div>
  )
}

interface Props {
  user: any
  profile: any
  children: React.ReactNode
}

export default function LayoutClient({ user, profile, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [permissionModal, setPermissionModal] = useState<string | null>(null)

  const isGuest = profile?.role === 'guest'
  const isAdmin = profile?.role === 'admin'
  const showPermissionModal = (action = 'This action') => setPermissionModal(action)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const noLayoutPages = ['/login', '/demo']
  const onPublicPage = noLayoutPages.some(p => pathname.startsWith(p))

  // Public pages — no navbar/sidebar
  if (onPublicPage || !user) {
    return (
      <GuestContext.Provider value={{ isGuest, isAdmin, showPermissionModal }}>
        {children}
      </GuestContext.Provider>
    )
  }

  const navLinks = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/prices', label: '💰 Prices' },
    { href: '/estimator', label: '🏗️ Estimator' },
    { href: '/rental', label: '🔧 Rental' },
    ...(isAdmin ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ]

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'

  return (
    <GuestContext.Provider value={{ isGuest, isAdmin, showPermissionModal }}>

      {permissionModal && <PermissionModal action={permissionModal} onClose={() => setPermissionModal(null)} />}
      {isGuest && <DemoBanner />}

      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(135deg, #0d2137, #1a3d5c)', color: 'white', padding: '0 20px', display: 'flex', alignItems: 'center', height: '56px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', marginRight: '16px', padding: '4px' }}>☰</button>
        <div style={{ fontWeight: '700', fontSize: '16px', marginRight: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💧 DewaPrice
          {isGuest && <span style={{ fontSize: '10px', background: '#E65100', color: 'white', padding: '2px 8px', borderRadius: '99px', fontWeight: '700' }}>DEMO</span>}
          {isAdmin && <span style={{ fontSize: '10px', background: '#2E7D32', color: 'white', padding: '2px 8px', borderRadius: '99px', fontWeight: '700' }}>ADMIN</span>}
        </div>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {navLinks.map(link => (
            <a key={link.href} href={link.href}
              style={{ color: pathname === link.href ? 'white' : 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: pathname === link.href ? '600' : '400', background: pathname === link.href ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
              {link.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
          {isGuest ? '👁️ Demo Guest' : `👋 ${firstName}`}
        </div>
      </nav>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px', background: 'rgba(13,33,55,0.97)', backdropFilter: 'blur(12px)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>💧 DewaPrice</div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>
                {isGuest ? 'Demo Account' : 'Logged In As'}
              </div>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>{isGuest ? '👁️ Demo Guest' : firstName}</div>
              {isAdmin && <div style={{ fontSize: '11px', color: '#4CAF50', marginTop: '3px' }}>⚙️ Administrator</div>}
              {isGuest && <div style={{ fontSize: '11px', color: '#FF9800', marginTop: '3px' }}>🔒 Read-only · Demo Mode</div>}
            </div>
            {navLinks.map(link => (
              <a key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}
                style={{ color: pathname === link.href ? 'white' : 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: pathname === link.href ? '600' : '400', background: pathname === link.href ? 'rgba(255,255,255,0.12)' : 'transparent', display: 'block' }}>
                {link.link}
                {link.label}
              </a>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '10px' }}>Business Units</div>
              {[
                { flag: '🇵🇭', label: 'Philippines', active: true },
                { flag: '🇸🇦', label: 'KSA', active: false },
                { flag: '🇦🇪', label: 'Middle East', active: false },
                { flag: '🇨🇦', label: 'Canada', active: false },
              ].map(bu => (
                <div key={bu.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', opacity: bu.active ? 1 : 0.4 }}>
                  <span style={{ fontSize: '18px' }}>{bu.flag}</span>
                  <span style={{ color: 'white', fontSize: '13px' }}>{bu.label}</span>
                  {bu.active && <span style={{ fontSize: '10px', background: '#2E7D32', color: 'white', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto' }}>Active</span>}
                  {!bu.active && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Soon</span>}
                </div>
              ))}
            </div>
            {!isGuest ? (
              <button onClick={handleSignOut}
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                🚪 Sign Out
              </button>
            ) : (
              <a href="mailto:cyrusjaysonm@gmail.com?subject=DewaPrice Access Request"
                style={{ background: '#E65100', color: 'white', padding: '12px', borderRadius: '8px', fontSize: '13px', width: '100%', textAlign: 'center' as const, textDecoration: 'none', display: 'block', fontWeight: '700', boxSizing: 'border-box' as const }}>
                📩 Request Full Access
              </a>
            )}
          </div>
        </div>
      )}

      <main>{children}</main>

    </GuestContext.Provider>
  )
}

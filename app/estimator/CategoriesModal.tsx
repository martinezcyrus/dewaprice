'use client'

import CategoriesAdmin from '../admin/categories/CategoriesAdmin'

interface Category {
  id: string
  code: string
  name: string
  color: string
  default_markup: number
  sort_order: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  initialCategories: Category[]
  userRole: string
}

export default function CategoriesModal({ isOpen, onClose, userId, initialCategories, userRole }: Props) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TITLE BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #eee',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0d2137', margin: '0 0 2px 0' }}>
              ⚙️ Manage Categories
            </h2>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              Changes apply to the estimator and BOQ immediately
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#555',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <CategoriesAdmin
            userId={userId}
            initialCategories={initialCategories}
            userRole={userRole}
            embedded={true}
          />
        </div>
      </div>
    </div>
  )
}

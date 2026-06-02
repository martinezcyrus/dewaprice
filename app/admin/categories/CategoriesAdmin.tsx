'use client'

import { useState } from 'react'
import { createClient } from '../../lib/client'
import { useGuest } from '../../LayoutClient'

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
  userId: string
  initialCategories: Category[]
  userRole: string
}

export default function CategoriesAdmin({ userId, initialCategories, userRole }: Props) {
  const supabase = createClient()
  const { isGuest, showPermissionModal } = useGuest()

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newCategory, setNewCategory] = useState({
    code: '',
    name: '',
    color: '#1565C0',
    default_markup: 40,
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#000',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  }

  const checkGuest = (action: string): boolean => {
    if (isGuest) {
      showPermissionModal(action)
      return false
    }
    return true
  }

  const handleAdd = async () => {
    if (!checkGuest('Adding categories')) return
    if (!newCategory.code || !newCategory.name) {
      alert('Please fill in code and name')
      return
    }
    setSaving(true)
    const maxOrder = Math.max(...categories.map((c) => c.sort_order), 0)
    const { data, error } = await supabase
      .from('estimator_categories')
      .insert([
        {
          code: newCategory.code,
          name: newCategory.name,
          color: newCategory.color,
          default_markup: newCategory.default_markup,
          sort_order: maxOrder + 1,
          is_active: true,
          created_by: userId,
        },
      ])
      .select()
      .single()
    if (error) {
      alert('Error: ' + error.message)
    } else if (data) {
      setCategories([...categories, data])
      setNewCategory({ code: '', name: '', color: '#1565C0', default_markup: 40 })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  const handleUpdate = async (id: string, updates: Partial<Category>) => {
    if (!checkGuest('Editing categories')) return
    setSaving(true)
    const { error } = await supabase
      .from('estimator_categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setCategories(categories.map((c) => (c.id === id ? { ...c, ...updates } : c)))
      setEditingId(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!checkGuest('Deleting categories')) return
    if (!confirm(`Delete category "${name}"?\n\nOld estimates will keep this category, but new estimates won't see it.`))
      return
    setSaving(true)
    const { error } = await supabase
      .from('estimator_categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setCategories(categories.filter((c) => c.id !== id))
    }
    setSaving(false)
  }

const handleMove = async (id: string, direction: 'up' | 'down') => {
    if (!checkGuest('Reordering categories')) return

    // Always compute from fresh state, not stale closure
    setCategories((prev) => {
      const sorted = prev.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order)
      const idx = sorted.findIndex((c) => c.id === id)
      if (idx === -1) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === sorted.length - 1) return prev

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      const current = sorted[idx]
      const swap = sorted[swapIdx]

      // Fire updates to DB (async, fire and forget for snappy UI)
      Promise.all([
        supabase
          .from('estimator_categories')
          .update({ sort_order: swap.sort_order, updated_at: new Date().toISOString() })
          .eq('id', current.id),
        supabase
          .from('estimator_categories')
          .update({ sort_order: current.sort_order, updated_at: new Date().toISOString() })
          .eq('id', swap.id),
      ]).then(([r1, r2]) => {
        if (r1.error || r2.error) {
          alert('Error reordering: ' + (r1.error?.message || r2.error?.message))
        }
      })

      // Update local state immediately
      return prev.map((c) => {
        if (c.id === current.id) return { ...c, sort_order: swap.sort_order }
        if (c.id === swap.id) return { ...c, sort_order: current.sort_order }
        return c
      })
    })
  }

  const activeCategories = categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0d2137', margin: '0 0 4px 0' }}>
              ⚙️ Estimator Categories
            </h1>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Manage cost categories that appear in the estimator and BOQ
            </p>
          </div>
          <button
            onClick={() => {
              if (!checkGuest('Adding categories')) return
              setShowAddForm(!showAddForm)
            }}
            style={{
              padding: '10px 20px',
              background: showAddForm ? '#e0e0e0' : 'linear-gradient(135deg, #1565C0, #0288D1)',
              color: showAddForm ? '#333' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {showAddForm ? '✕ Cancel' : '➕ Add Category'}
          </button>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
          <div
            style={{
              background: '#E3F2FD',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: '1.5px solid #bbdefb',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
              ➕ New Category
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <label style={labelStyle}>Code *</label>
                <input
                  type="text"
                  placeholder="e.g. 8"
                  value={newCategory.code}
                  onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Site Preparation"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  style={{ ...inputStyle, padding: '4px', height: '36px' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Default Markup %</label>
                <input
                  type="number"
                  value={newCategory.default_markup}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, default_markup: parseFloat(e.target.value) || 0 })
                  }
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{
                  background: saving ? '#90CAF9' : '#1565C0',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {saving ? '⏳ Saving...' : '💾 Save Category'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CATEGORIES TABLE */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #f0f0f0',
              background: '#fafafa',
              fontSize: '13px',
              color: '#666',
            }}
          >
            <strong>{activeCategories.length}</strong> active categories · Use ⬆️ ⬇️ to reorder · ✏️ to edit · 🗑️ to delete
          </div>

          {activeCategories.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No categories yet</div>
              <div style={{ fontSize: '13px' }}>Click "Add Category" to create your first one</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['Order', 'Code', 'Name', 'Color', 'Default Markup', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          fontWeight: '700',
                          color: '#555',
                          borderBottom: '2px solid #e8e8e8',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCategories.map((cat, idx) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      isFirst={idx === 0}
                      isLast={idx === activeCategories.length - 1}
                      displayPosition={idx + 1}
                      isEditing={editingId === cat.id}
                      onStartEdit={() => {
                        if (!checkGuest('Editing categories')) return
                        setEditingId(cat.id)
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={(updates) => handleUpdate(cat.id, updates)}
                      onDelete={() => handleDelete(cat.id, cat.name)}
                      onMoveUp={() => handleMove(cat.id, 'up')}
                      onMoveDown={() => handleMove(cat.id, 'down')}
                      saving={saving}
                      inputStyle={inputStyle}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INFO BOX */}
        <div
          style={{
            marginTop: '20px',
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            borderRadius: '10px',
            padding: '14px 18px',
            fontSize: '13px',
            color: '#5D4037',
            lineHeight: '1.7',
          }}
        >
          <strong>📌 Note:</strong> Deleting a category is a <strong>soft delete</strong> — old saved estimates will
          keep their original categories even after deletion. New estimates won't see deleted categories.
        </div>
      </div>
    </div>
  )
}

// ─── ROW COMPONENT ───
interface RowProps {
  category: Category
  isFirst: boolean
  isLast: boolean
  displayPosition: number
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (updates: Partial<Category>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  saving: boolean
  inputStyle: React.CSSProperties
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  displayPosition,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  saving,
  inputStyle,
}: RowProps) {
  const [edit, setEdit] = useState({
    code: category.code,
    name: category.name,
    color: category.color,
    default_markup: category.default_markup,
  })

  if (isEditing) {
    return (
      <tr style={{ background: '#fffbf0', borderBottom: '1px solid #f0f0f0' }}>
        <td style={{ padding: '8px 14px', color: '#999' }}>{displayPosition}</td>
        <td style={{ padding: '8px 14px' }}>
          <input
            type="text"
            value={edit.code}
            onChange={(e) => setEdit({ ...edit, code: e.target.value })}
            style={{ ...inputStyle, width: '60px' }}
          />
        </td>
        <td style={{ padding: '8px 14px' }}>
          <input
            type="text"
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '8px 14px' }}>
          <input
            type="color"
            value={edit.color}
            onChange={(e) => setEdit({ ...edit, color: e.target.value })}
            style={{ ...inputStyle, width: '50px', height: '32px', padding: '2px' }}
          />
        </td>
        <td style={{ padding: '8px 14px' }}>
          <input
            type="number"
            value={edit.default_markup}
            onChange={(e) => setEdit({ ...edit, default_markup: parseFloat(e.target.value) || 0 })}
            style={{ ...inputStyle, width: '80px' }}
          />
          %
        </td>
        <td style={{ padding: '8px 14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onSave(edit)}
              disabled={saving}
              style={{
                background: '#1565C0',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {saving ? '⏳' : '💾 Save'}
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                background: '#f0f0f0',
                color: '#333',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0', background: 'white' }}>
      <td style={{ padding: '10px 14px', color: '#999', fontWeight: '600' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ minWidth: '20px' }}>{displayPosition}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={onMoveUp}
              disabled={isFirst || saving}
              title="Move up"
              style={{
                background: isFirst ? '#f5f5f5' : '#E3F2FD',
                color: isFirst ? '#ccc' : '#1565C0',
                border: 'none',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: isFirst ? 'not-allowed' : 'pointer',
                lineHeight: '1',
              }}
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast || saving}
              title="Move down"
              style={{
                background: isLast ? '#f5f5f5' : '#E3F2FD',
                color: isLast ? '#ccc' : '#1565C0',
                border: 'none',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: isLast ? 'not-allowed' : 'pointer',
                lineHeight: '1',
              }}
            >
              ▼
            </button>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span
          style={{
            background: `${category.color}15`,
            color: category.color,
            padding: '3px 10px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          {category.code}
        </span>
      </td>
      <td style={{ padding: '10px 14px', color: '#0d2137', fontWeight: '500' }}>{category.name}</td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              background: category.color,
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
            }}
          />
          <span style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{category.color}</span>
        </div>
      </td>
      <td style={{ padding: '10px 14px', color: '#1565C0', fontWeight: '700' }}>{category.default_markup}%</td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onStartEdit}
            style={{
              background: '#E3F2FD',
              color: '#1565C0',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            style={{
              background: '#ffebee',
              color: '#c62828',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  )
}

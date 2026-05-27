'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGuest } from '../layout'

const METHODS = [
  { id: 'wellpoint', label: 'Wellpoint System', short: 'WP', color: '#1565C0', icon: '💧' },
  { id: 'deepwell', label: 'Deep Wells', short: 'DW', color: '#2E7D32', icon: '🕳️' },
  { id: 'eductor', label: 'Eductor Wells', short: 'ED', color: '#E65100', icon: '🌀' },
  { id: 'sump', label: 'Sump Pumping', short: 'SP', color: '#6A1B9A', icon: '🪣' },
  { id: 'open cut', label: 'Open Cut', short: 'OC', color: '#00695C', icon: '⛏️' },
  { id: 'general', label: 'General / All', short: 'ALL', color: '#555', icon: '🔧' },
]

const BU_LIST = [
  { id: 1, label: '🇵🇭 Philippines' },
  { id: 2, label: '🇸🇦 KSA' },
  { id: 3, label: '🇨🇦 Canada' },
  { id: 4, label: '🇦🇪 Middle East' },
]

function MethodBadge({ tag }: { tag: string }) {
  const m = METHODS.find(x => x.id === tag)
  if (!m) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '99px', background: `${m.color}15`, border: `1px solid ${m.color}44`, color: m.color, fontSize: '12px', fontWeight: '600' }}>
      {m.icon} {m.label}
    </span>
  )
}

function MethodSelector({ selected, onChange }: { selected: string[], onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
      {METHODS.map(m => {
        const on = selected.includes(m.id)
        return (
          <div key={m.id} onClick={() => onChange(on ? selected.filter(x => x !== m.id) : [...selected, m.id])}
            style={{ padding: '5px 12px', borderRadius: '99px', border: `1.5px solid ${on ? m.color : '#e0e0e0'}`, background: on ? `${m.color}15` : 'white', color: on ? m.color : '#666', fontSize: '12px', fontWeight: on ? '600' : '400', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' as const, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {m.icon} {m.label}
          </div>
        )
      })}
    </div>
  )
}

export default function PricesPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('philippines')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { isGuest, showPermissionModal } = useGuest()
  const [newItem, setNewItem] = useState({
    description: '', full_description: '', category_id: '', unit: '', base_price: '',
    supplier: '', supplier_contact: '', notes: '', image_url: '', business_unit_id: '1',
    method_tags: [] as string[]
  })

  const tabs = [
    { id: 'philippines', label: '🇵🇭 Philippines', active: true },
    { id: 'ksa', label: '🇸🇦 KSA', active: false },
    { id: 'canada', label: '🇨🇦 Canada', active: false },
    { id: 'middleeast', label: '🇦🇪 Middle East', active: false },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: '6px',
    fontSize: '13px', color: '#000', backgroundColor: '#fff', boxSizing: 'border-box', outline: 'none'
  }

  useEffect(() => {
  const init = async () => {
    let { data } = await supabase.auth.getSession()
    
    // If no session, wait 1 second and try again
    if (!data.session) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const retry = await supabase.auth.getSession()
      data = retry.data
    }

    if (!data.session) { window.location.replace('/login'); return }
    setUserId(data.session.user.id)
    setUserEmail(data.session.user.email || '')
    fetchData()
  }
  init()
}, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: cats } = await supabase.from('categories').select('id, name, icon').order('id')
    setCategories(cats || [])
    const { data: itms, error } = await supabase
      .from('items')
      .select('id, description, full_description, category_id, unit, base_price, base_currency, supplier, supplier_contact, business_unit_id, notes, image_url, created_by, updated_by, created_at, updated_at, method_tags, categories(name)')
      .order('id', { ascending: false })
    if (error) console.error('Items error:', error.message)
    setItems(itms || [])
    setLoading(false)
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('item-images').upload(fileName, file)
    if (error) { alert('Upload error: ' + error.message); setUploading(false); return null }
    const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(fileName)
    setUploading(false)
    return urlData.publicUrl
  }

  const handleAddItem = async () => {
    if (!newItem.description || !newItem.base_price) { alert('Please fill in description and price.'); return }
    setSaving(true)
    const { error } = await supabase.from('items').insert([{
      description: newItem.description, full_description: newItem.full_description,
      category_id: newItem.category_id || null, unit: newItem.unit,
      base_price: parseFloat(newItem.base_price), base_currency: 'PHP',
      supplier: newItem.supplier, supplier_contact: newItem.supplier_contact,
      notes: newItem.notes, image_url: newItem.image_url,
      business_unit_id: parseInt(newItem.business_unit_id) || 1,
      method_tags: newItem.method_tags, created_by: userId, updated_by: userId
    }])
    if (error) alert('Error: ' + error.message)
    else {
      setShowAddForm(false)
      setNewItem({ description: '', full_description: '', category_id: '', unit: '', base_price: '', supplier: '', supplier_contact: '', notes: '', image_url: '', business_unit_id: '1', method_tags: [] })
      fetchData()
    }
    setSaving(false)
  }

  const handleEditSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('items').update({
      description: selectedItem.description, full_description: selectedItem.full_description,
      category_id: selectedItem.category_id, unit: selectedItem.unit,
      base_price: parseFloat(selectedItem.base_price), supplier: selectedItem.supplier,
      supplier_contact: selectedItem.supplier_contact, notes: selectedItem.notes,
      image_url: selectedItem.image_url, method_tags: selectedItem.method_tags || [],
      updated_by: userId, updated_at: new Date().toISOString()
    }).eq('id', selectedItem.id)
    if (error) alert('Error: ' + error.message)
    else { setEditMode(false); fetchData(); setSelectedItem(null) }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('items').delete().eq('id', id)
    setSelectedItem(null)
    fetchData()
  }

  const clearAll = () => {
    setSearch(''); setSearchInput(''); setSelectedCategory(''); setSelectedMethod(''); setShowSuggestions(false)
  }

  const q = search.trim().toLowerCase()
  const filtered = items.filter(item => {
    const matchSearch = !q || (item.description || '').toLowerCase().includes(q) || (item.supplier || '').toLowerCase().includes(q) || (item.categories?.name || '').toLowerCase().includes(q) || (item.unit || '').toLowerCase().includes(q)
    const matchCat = !selectedCategory || String(item.category_id) === String(selectedCategory)
    const matchMethod = !selectedMethod || (Array.isArray(item.method_tags) && item.method_tags.includes(selectedMethod))
    return matchSearch && matchCat && matchMethod
  })

  const suggestions = searchInput.trim().length >= 1
    ? items.filter(item => (item.description || '').toLowerCase().includes(searchInput.toLowerCase()) || (item.supplier || '').toLowerCase().includes(searchInput.toLowerCase()) || (item.categories?.name || '').toLowerCase().includes(searchInput.toLowerCase())).slice(0, 8)
    : []

  const formatDate = (d: string) => !d ? '-' : new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const getBUFlag = (id: number) => ({ 1: '🇵🇭', 2: '🇸🇦', 3: '🇨🇦', 4: '🇦🇪' } as Record<number,string>)[id] || '🌍'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ padding: '28px 32px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0d2137', margin: '0 0 4px 0' }}>💰 Price Database</h1>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              {items.length} items · Click any row to view details
              {isGuest && <span style={{ color: '#E65100', marginLeft: '8px' }}>· 👁️ Demo Mode — editing disabled</span>}
            </p>
          </div>
          <button onClick={() => {
            if (isGuest) { showPermissionModal('Adding new items'); return }
            setShowAddForm(!showAddForm)
          }} style={{ background: showAddForm ? '#e0e0e0' : 'linear-gradient(135deg, #1565C0, #0288D1)', color: showAddForm ? '#333' : 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            {showAddForm ? '✕ Cancel' : '➕ Add Item'}
          </button>
        </div>

        {/* BU TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => tab.active && setActiveTab(tab.id)} style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', fontSize: '13px', fontWeight: '600', cursor: tab.active ? 'pointer' : 'not-allowed', background: activeTab === tab.id ? 'white' : '#e0e0e0', color: activeTab === tab.id ? '#0d2137' : '#999', opacity: tab.active ? 1 : 0.6, boxShadow: activeTab === tab.id ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              {tab.label} {!tab.active && '🔒'}
            </button>
          ))}
        </div>

        {activeTab !== 'philippines' ? (
          <div style={{ background: 'white', borderRadius: '0 12px 12px 12px', padding: '80px 32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d2137', marginBottom: '8px' }}>Coming Soon</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>This business unit's price database is under development.</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '0 12px 12px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'visible' }}>

            {/* ADD FORM */}
            {showAddForm && !isGuest && (
              <div style={{ padding: '24px', background: '#E3F2FD', borderBottom: '1px solid #bbdefb', borderRadius: '0 12px 0 0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', marginBottom: '16px', marginTop: 0 }}>➕ Add New Item</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Description *', key: 'description', placeholder: 'e.g. Submersible pump 4"' },
                    { label: 'Unit', key: 'unit', placeholder: 'unit / m / kg / day' },
                    { label: 'Unit Price (PHP) *', key: 'base_price', type: 'number', placeholder: '0.00' },
                    { label: 'Supplier', key: 'supplier', placeholder: 'Supplier name' },
                    { label: 'Contact', key: 'supplier_contact', placeholder: 'Phone or email' },
                    { label: 'Notes', key: 'notes', placeholder: 'Optional notes' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>{field.label}</label>
                      <input type={field.type || 'text'} placeholder={field.placeholder} value={newItem[field.key as keyof typeof newItem] as string} onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Category</label>
                    <select value={newItem.category_id} onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })} style={inputStyle}>
                      <option value=''>Select category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Business Unit</label>
                    <select value={newItem.business_unit_id} onChange={(e) => setNewItem({ ...newItem, business_unit_id: e.target.value })} style={inputStyle}>
                      {BU_LIST.map(bu => <option key={bu.id} value={bu.id}>{bu.label}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                      Applicable Dewatering Methods <span style={{ color: '#999', fontWeight: '400', marginLeft: '6px' }}>(select all that apply)</span>
                    </label>
                    <MethodSelector selected={newItem.method_tags} onChange={(v) => setNewItem({ ...newItem, method_tags: v })} />
                    {newItem.method_tags.length === 0 && <div style={{ fontSize: '11px', color: '#E65100', marginTop: '6px' }}>⚠️ No method selected — this item won't be auto-included in estimator schedules</div>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Full Description</label>
                    <textarea placeholder="Detailed specs, usage notes, lead time..." value={newItem.full_description} onChange={(e) => setNewItem({ ...newItem, full_description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Item Photo</label>
                    <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const url = await handleImageUpload(file); if (url) setNewItem({ ...newItem, image_url: url }) } }} style={{ fontSize: '13px', color: '#000' }} />
                    {uploading && <span style={{ fontSize: '12px', color: '#1565C0', marginLeft: '8px' }}>⏳ Uploading...</span>}
                    {newItem.image_url && <img src={newItem.image_url} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px', display: 'block', border: '2px solid #1565C0' }} />}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={handleAddItem} disabled={saving} style={{ background: saving ? '#90CAF9' : '#1565C0', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{saving ? '⏳ Saving...' : '💾 Save Item'}</button>
                  <button onClick={() => setShowAddForm(false)} style={{ background: '#e0e0e0', color: '#333', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* SEARCH & FILTER */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' as const }}>
                <div style={{ display: 'flex' }}>
                  <input type="text" placeholder="🔍 Search description, supplier, category..." value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setSearch(e.target.value); setShowSuggestions(true) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setShowSuggestions(false) } if (e.key === 'Escape') setShowSuggestions(false) }}
                    onFocus={() => { if (searchInput) setShowSuggestions(true) }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    style={{ ...inputStyle, flex: 1, padding: '10px 16px', borderRadius: '8px 0 0 8px', borderRight: 'none' }} />
                  {searchInput && <button onClick={() => { setSearchInput(''); setSearch('') }} style={{ background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderLeft: 'none', borderRight: 'none', color: '#999', padding: '0 10px', fontSize: '18px', cursor: 'pointer' }}>×</button>}
                  <button onClick={() => { setSearch(searchInput); setShowSuggestions(false) }} style={{ background: 'linear-gradient(135deg, #1565C0, #0288D1)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '0 8px 8px 0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>🔍 Search</button>
                </div>
                {showSuggestions && searchInput.trim().length >= 1 && (
                  <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, zIndex: 999, background: 'white', border: '1.5px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 12px 12px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: '300px', overflowY: 'auto' as const }}>
                    {suggestions.length > 0 ? (
                      <>
                        <div style={{ padding: '6px 16px', fontSize: '10px', color: '#999', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' as const, borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</div>
                        {suggestions.map((item: any) => (
                          <div key={item.id} onMouseDown={() => { setSearchInput(item.description); setSearch(item.description); setShowSuggestions(false) }}
                            style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: 'white' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f0f7ff'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                            {item.image_url ? <img src={item.image_url} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : <div style={{ width: '36px', height: '36px', background: '#f0f0f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📦</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', color: '#0d2137', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.description}</div>
                              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>{item.categories?.name || 'Uncategorized'}</span><span>·</span>
                                <span style={{ color: '#1565C0', fontWeight: '700' }}>₱{parseFloat(item.base_price).toLocaleString()}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', color: '#bbb', flexShrink: 0 }}>↵</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>😕 No results for "<strong>{searchInput}</strong>"</div>
                    )}
                  </div>
                )}
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ ...inputStyle, minWidth: '160px', padding: '10px 12px' }}>
                <option value=''>All categories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)} style={{ ...inputStyle, minWidth: '180px', padding: '10px 12px' }}>
                <option value=''>All methods</option>
                {METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
              </select>
              <button onClick={clearAll} style={{ padding: '10px 14px', background: (search || selectedCategory || selectedMethod) ? '#1565C0' : '#f5f5f5', color: (search || selectedCategory || selectedMethod) ? 'white' : '#666', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>📋 View All</button>
            </div>

            {/* STATUS BAR */}
            <div style={{ padding: '10px 24px', background: (search || selectedMethod) ? '#E8F4FD' : '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                {search && <span style={{ fontSize: '13px', color: '#1565C0' }}>🔍 "<strong>{search}</strong>"</span>}
                {selectedMethod && (() => { const m = METHODS.find(x => x.id === selectedMethod); return m ? <span style={{ background: `${m.color}15`, color: m.color, padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>{m.icon} {m.label}</span> : null })()}
                <span style={{ fontSize: '13px', color: '#666' }}><strong>{filtered.length}</strong> of {items.length} items</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {search && <button onClick={() => { setSearch(''); setSearchInput('') }} style={{ background: 'white', color: '#1565C0', border: '1.5px solid #1565C0', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✕ Clear Search</button>}
                {selectedCategory && <button onClick={() => setSelectedCategory('')} style={{ background: 'white', color: '#666', border: '1.5px solid #e0e0e0', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕ Clear Category</button>}
                {selectedMethod && <button onClick={() => setSelectedMethod('')} style={{ background: 'white', color: '#666', border: '1.5px solid #e0e0e0', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕ Clear Method</button>}
              </div>
            </div>

            {/* TABLE */}
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>Loading prices...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{search ? `No results for "${search}"` : 'No items found'}</div>
                <button onClick={clearAll} style={{ marginTop: '12px', background: '#1565C0', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📋 View All Items</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['', 'Category', 'Description', 'Unit', 'Price (PHP)', 'Supplier', 'Methods', 'BU', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left' as const, fontWeight: '700', color: '#555', borderBottom: '2px solid #e8e8e8', fontSize: '11px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: any) => (
                      <tr key={item.id} onClick={() => { setSelectedItem(item); setEditMode(false) }}
                        style={{ borderBottom: '1px solid #f0f0f0', background: 'white', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f0f7ff'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '8px 14px' }}>
                          {item.image_url ? <img src={item.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e0e0' }} /> : <div style={{ width: '40px', height: '40px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #e8e8e8' }}>📦</div>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: '#E3F2FD', color: '#1565C0', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' as const }}>{item.categories?.name || 'Uncategorized'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                          <div style={{ color: '#0d2137', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.description}</div>
                          {item.full_description && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.full_description.substring(0, 50)}...</div>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#666' }}>{item.unit || '-'}</td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1565C0', whiteSpace: 'nowrap' as const, fontSize: '14px' }}>₱{parseFloat(item.base_price).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', color: '#555', maxWidth: '130px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.supplier || '-'}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {(item.method_tags || []).length === 0 ? <span style={{ fontSize: '11px', color: '#ddd' }}>—</span> : (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const }}>
                              {(item.method_tags || []).map((tag: string) => { const m = METHODS.find(x => x.id === tag); return m ? <span key={tag} style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}33`, whiteSpace: 'nowrap' as const }}>{m.icon} {m.short}</span> : null })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '20px', textAlign: 'center' as const }}>{getBUFlag(item.business_unit_id)}</td>
                        <td style={{ padding: '10px 14px', color: '#aaa', fontSize: '11px', whiteSpace: 'nowrap' as const }}>{formatDate(item.created_at)}</td>
                        <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => { if (isGuest) { showPermissionModal('Editing items'); return } setSelectedItem(item); setEditMode(true) }} style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>✏️</button>
                            <button onClick={() => { if (isGuest) { showPermissionModal('Deleting items'); return } handleDelete(item.id) }} style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ITEM DETAIL / EDIT MODAL */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '20px' }} onClick={() => { setSelectedItem(null); setEditMode(false) }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#0d2137', margin: 0 }}>{editMode ? '✏️ Edit Item' : '📋 Item Details'}</h2>
              <button onClick={() => { setSelectedItem(null); setEditMode(false) }} style={{ background: '#f5f5f5', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {selectedItem.image_url ? <img src={selectedItem.image_url} alt={selectedItem.description} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e0e0e0' }} /> : <div style={{ width: '100%', height: '100px', background: '#f5f5f5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: '1px solid #e8e8e8' }}>📦</div>}
              {editMode && !isGuest && (
                <div style={{ marginTop: '8px' }}>
                  <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const url = await handleImageUpload(file); if (url) setSelectedItem({ ...selectedItem, image_url: url }) } }} style={{ fontSize: '13px', color: '#000' }} />
                  {uploading && <span style={{ fontSize: '12px', color: '#1565C0' }}> ⏳ Uploading...</span>}
                </div>
              )}
            </div>

            {!editMode ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { label: 'Description', value: selectedItem.description },
                    { label: 'Category', value: selectedItem.categories?.name || 'Uncategorized' },
                    { label: 'Unit', value: selectedItem.unit || '-' },
                    { label: 'Unit Price', value: `₱${parseFloat(selectedItem.base_price).toLocaleString()}` },
                    { label: 'Supplier', value: selectedItem.supplier || '-' },
                    { label: 'Contact', value: selectedItem.supplier_contact || '-' },
                    { label: 'Notes', value: selectedItem.notes || '-' },
                    { label: 'Business Unit', value: `${getBUFlag(selectedItem.business_unit_id)} ${BU_LIST.find(b => b.id === selectedItem.business_unit_id)?.label.split(' ').slice(1).join(' ') || 'Philippines'}` },
                  ].map(field => (
                    <div key={field.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{field.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0d2137' }}>{field.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>Applicable Dewatering Methods</div>
                  {(selectedItem.method_tags || []).length === 0 ? <div style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>No methods assigned</div> : <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>{(selectedItem.method_tags || []).map((tag: string) => <MethodBadge key={tag} tag={tag} />)}</div>}
                </div>
                {selectedItem.full_description && (
                  <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' as const }}>Full Description</div>
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.7' }}>{selectedItem.full_description}</div>
                  </div>
                )}
                <div style={{ background: '#E8F5E9', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#2E7D32', marginBottom: '16px', lineHeight: '1.8' }}>
                  <div>📅 Added: {formatDate(selectedItem.created_at)}</div>
                  {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && <div>✏️ Last edited: {formatDate(selectedItem.updated_at)}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { if (isGuest) { showPermissionModal('Editing items'); return } setEditMode(true) }} style={{ background: '#1565C0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit Item</button>
                  <button onClick={() => { if (isGuest) { showPermissionModal('Deleting items'); return } handleDelete(selectedItem.id) }} style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>🗑️ Delete</button>
                  <button onClick={() => setSelectedItem(null)} style={{ background: '#f0f0f0', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Description', key: 'description' },
                    { label: 'Unit', key: 'unit' },
                    { label: 'Unit Price (PHP)', key: 'base_price', type: 'number' },
                    { label: 'Supplier', key: 'supplier' },
                    { label: 'Supplier Contact', key: 'supplier_contact' },
                    { label: 'Notes', key: 'notes' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>{field.label}</label>
                      <input type={field.type || 'text'} value={selectedItem[field.key] || ''} onChange={(e) => setSelectedItem({ ...selectedItem, [field.key]: e.target.value })} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Category</label>
                    <select value={selectedItem.category_id || ''} onChange={(e) => setSelectedItem({ ...selectedItem, category_id: e.target.value })} style={inputStyle}>
                      <option value=''>Select category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Applicable Dewatering Methods</label>
                    <MethodSelector selected={selectedItem.method_tags || []} onChange={(v) => setSelectedItem({ ...selectedItem, method_tags: v })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Full Description</label>
                    <textarea value={selectedItem.full_description || ''} onChange={(e) => setSelectedItem({ ...selectedItem, full_description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleEditSave} disabled={saving} style={{ background: saving ? '#90CAF9' : '#1565C0', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
                  <button onClick={() => setEditMode(false)} style={{ background: '#f0f0f0', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

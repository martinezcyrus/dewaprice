'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PricesPage() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('philippines')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newItem, setNewItem] = useState({
    description: '',
    full_description: '',
    category_id: '',
    unit: '',
    base_price: '',
    supplier: '',
    supplier_contact: '',
    notes: '',
    image_url: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }
      const user = data.session.user
      setUserEmail(user.email || '')
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.full_name || user.email || '')
      fetchData()
    })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(cats || [])

    const { data: itms } = await supabase
      .from('items')
      .select(`
        *,
        categories(name),
        creator:profiles!items_created_by_fkey(full_name),
        editor:profiles!items_updated_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
    setItems(itms || [])
    setLoading(false)
  }

  const handleImageUpload = async (file, itemId = null) => {
    if (!file) return null
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(fileName, file)
    if (error) {
      alert('Error uploading image: ' + error.message)
      setUploading(false)
      return null
    }
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName)
    setUploading(false)
    return urlData.publicUrl
  }

  const handleAddItem = async () => {
    if (!newItem.description || !newItem.base_price) {
      alert('Please fill in at least description and price.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('items').insert([{
      description: newItem.description,
      full_description: newItem.full_description,
      category_id: newItem.category_id || null,
      unit: newItem.unit,
      base_price: parseFloat(newItem.base_price),
      base_currency: 'PHP',
      supplier: newItem.supplier,
      supplier_contact: newItem.supplier_contact,
      notes: newItem.notes,
      image_url: newItem.image_url,
      business_unit_id: 1,
      created_by: userId,
      updated_by: userId
    }])
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setShowAddForm(false)
      setNewItem({
        description: '', full_description: '', category_id: '',
        unit: '', base_price: '', supplier: '',
        supplier_contact: '', notes: '', image_url: ''
      })
      fetchData()
    }
    setSaving(false)
  }

  const handleEditSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('items')
      .update({
        description: selectedItem.description,
        full_description: selectedItem.full_description,
        category_id: selectedItem.category_id,
        unit: selectedItem.unit,
        base_price: parseFloat(selectedItem.base_price),
        supplier: selectedItem.supplier,
        supplier_contact: selectedItem.supplier_contact,
        notes: selectedItem.notes,
        image_url: selectedItem.image_url,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedItem.id)
    if (error) {
      alert('Error updating: ' + error.message)
    } else {
      setEditMode(false)
      fetchData()
      setSelectedItem(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('items').delete().eq('id', id)
    setSelectedItem(null)
    fetchData()
  }

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      item.categories?.name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory ||
      item.category_id === parseInt(selectedCategory)
    return matchSearch && matchCat
  })

  const handleLogout = () => {
    supabase.auth.signOut().then(() => {
      window.location.href = '/login'
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const tabs = [
    { id: 'philippines', label: '🇵🇭 Philippines', active: true },
    { id: 'ksa', label: '🇸🇦 KSA', active: false },
    { id: 'canada', label: '🇨🇦 Canada', active: false },
    { id: 'middleeast', label: '🇦🇪 Middle East', active: false },
  ]

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#000000',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'Arial, sans-serif' }}>

      {/* Navigation */}
      <nav style={{
        background: 'linear-gradient(135deg, #0f2027, #203a43)',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div onClick={() => window.location.href = '/dashboard'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '24px' }}>💧</span>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>DewaPrice</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: '🏠 Dashboard', href: '/dashboard' },
              { label: '💰 Prices', href: '/prices' },
              { label: '🏗️ Estimator', href: '/estimator' },
              { label: '📊 Rental', href: '/rental' },
            ].map((nav, i) => (
              <button key={i} onClick={() => window.location.href = nav.href}
                style={{
                  background: nav.href === '/prices' ? 'rgba(33,150,243,0.3)' : 'transparent',
                  color: 'white', border: 'none',
                  padding: '8px 14px', borderRadius: '8px',
                  fontSize: '13px', cursor: 'pointer'
                }}>{nav.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#90CAF9', fontSize: '13px' }}>{userEmail}</span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.1)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 14px', borderRadius: '8px',
            fontSize: '13px', cursor: 'pointer'
          }}>Sign out</button>
        </div>
      </nav>

      <div style={{ padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f2027', margin: '0 0 4px 0' }}>
              💰 Price Database
            </h1>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              {items.length} items · Click any row to view details or edit
            </p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            background: 'linear-gradient(135deg, #1565C0, #0288D1)',
            color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: '8px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>➕ Add Item</button>
        </div>

        {/* BU Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => tab.active && setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px 8px 0 0',
                border: 'none', fontSize: '13px', fontWeight: '600',
                cursor: tab.active ? 'pointer' : 'not-allowed',
                background: activeTab === tab.id ? 'white' : '#e0e0e0',
                color: activeTab === tab.id ? '#0f2027' : '#999',
                opacity: tab.active ? 1 : 0.6
              }}>
              {tab.label} {!tab.active && '🔒'}
            </button>
          ))}
        </div>

        {activeTab !== 'philippines' ? (
          <div style={{
            background: 'white', borderRadius: '0 12px 12px 12px',
            padding: '80px 32px', textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f2027', marginBottom: '8px' }}>
              Coming Soon
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              This business unit's price database is under development.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: '0 12px 12px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden'
          }}>

            {/* Add Form */}
            {showAddForm && (
              <div style={{ padding: '24px', background: '#E3F2FD', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f2027', marginBottom: '16px' }}>
                  ➕ Add New Item
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Description *', key: 'description', type: 'text', placeholder: 'e.g. Submersible pump 4"' },
                    { label: 'Unit', key: 'unit', type: 'text', placeholder: 'unit / m / kg / day' },
                    { label: 'Unit Price (PHP) *', key: 'base_price', type: 'number', placeholder: '0.00' },
                    { label: 'Supplier', key: 'supplier', type: 'text', placeholder: 'Supplier name' },
                    { label: 'Contact', key: 'supplier_contact', type: 'text', placeholder: 'Phone or email' },
                    { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Optional notes' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {field.label}
                      </label>
                      <input type={field.type} placeholder={field.placeholder}
                        value={newItem[field.key]}
                        onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                        style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      Category
                    </label>
                    <select value={newItem.category_id}
                      onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                      style={inputStyle}>
                      <option value=''>Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      Full Description
                    </label>
                    <textarea placeholder="Detailed description of this item..."
                      value={newItem.full_description}
                      onChange={(e) => setNewItem({ ...newItem, full_description: e.target.value })}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      Item Photo
                    </label>
                    <input type="file" accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await handleImageUpload(file)
                          if (url) setNewItem({ ...newItem, image_url: url })
                        }
                      }}
                      style={{ fontSize: '13px', color: '#000' }} />
                    {uploading && <span style={{ fontSize: '12px', color: '#666' }}> Uploading...</span>}
                    {newItem.image_url && (
                      <img src={newItem.image_url} alt="preview"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={handleAddItem} disabled={saving} style={{
                    background: '#1565C0', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}>{saving ? 'Saving...' : 'Save Item'}</button>
                  <button onClick={() => setShowAddForm(false)} style={{
                    background: '#e0e0e0', color: '#333', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', cursor: 'pointer'
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Search & Filter */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', gap: '12px', flexWrap: 'wrap' as const
            }}>
              <input type="text" placeholder="🔍 Search description, supplier, category..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: '200px', padding: '10px 16px' }} />
              <select value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ ...inputStyle, minWidth: '180px', padding: '10px 16px' }}>
                <option value=''>All categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div style={{
                padding: '10px 16px', background: '#f5f5f5',
                borderRadius: '8px', fontSize: '13px', color: '#666'
              }}>{filtered.length} items</div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading prices...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                No items found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['', 'Category', 'Description', 'Unit', 'Unit Price (PHP)', 'Supplier', 'Added by', 'Date Added', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', textAlign: 'left',
                          fontWeight: '600', color: '#555',
                          borderBottom: '1px solid #e0e0e0',
                          whiteSpace: 'nowrap' as const
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={item.id}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          background: i % 2 === 0 ? 'white' : '#fafafa',
                          cursor: 'pointer'
                        }}
                        onClick={() => { setSelectedItem(item); setEditMode(false) }}>
                        <td style={{ padding: '8px 16px' }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.description}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                          ) : (
                            <div style={{
                              width: '40px', height: '40px', background: '#f0f0f0',
                              borderRadius: '6px', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '18px'
                            }}>📦</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: '#E3F2FD', color: '#1565C0',
                            padding: '2px 8px', borderRadius: '99px',
                            fontSize: '11px', fontWeight: '600'
                          }}>{item.categories?.name || 'Uncategorized'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0f2027', fontWeight: '500' }}>
                          {item.description}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>{item.unit || '-'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1565C0' }}>
                          ₱{parseFloat(item.base_price).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>{item.supplier || '-'}</td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>
                          👤 {item.creator?.full_name || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#999', fontSize: '12px' }}>
                          {formatDate(item.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setSelectedItem(item); setEditMode(true) }}
                            style={{
                              background: '#E3F2FD', color: '#1565C0',
                              border: 'none', padding: '4px 10px',
                              borderRadius: '6px', fontSize: '12px',
                              cursor: 'pointer', marginRight: '4px'
                            }}>✏️ Edit</button>
                          <button onClick={() => handleDelete(item.id)}
                            style={{
                              background: '#ffebee', color: '#c62828',
                              border: 'none', padding: '4px 10px',
                              borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                            }}>🗑️</button>
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

      {/* Item Detail / Edit Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 100,
          padding: '20px'
        }} onClick={() => { setSelectedItem(null); setEditMode(false) }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: '32px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f2027', margin: 0 }}>
                {editMode ? '✏️ Edit Item' : '📋 Item Details'}
              </h2>
              <button onClick={() => { setSelectedItem(null); setEditMode(false) }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>
                ✕
              </button>
            </div>

            {/* Image */}
            <div style={{ marginBottom: '20px' }}>
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.description}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px' }} />
              ) : (
                <div style={{
                  width: '100%', height: '120px', background: '#f5f5f5',
                  borderRadius: '12px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '48px'
                }}>📦</div>
              )}
              {editMode && (
                <div style={{ marginTop: '8px' }}>
                  <input type="file" accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await handleImageUpload(file)
                        if (url) setSelectedItem({ ...selectedItem, image_url: url })
                      }
                    }}
                    style={{ fontSize: '13px', color: '#000' }} />
                  {uploading && <span style={{ fontSize: '12px', color: '#666' }}> Uploading...</span>}
                </div>
              )}
            </div>

            {/* Fields */}
            {editMode ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: 'Description', key: 'description' },
                  { label: 'Unit', key: 'unit' },
                  { label: 'Unit Price (PHP)', key: 'base_price', type: 'number' },
                  { label: 'Supplier', key: 'supplier' },
                  { label: 'Supplier Contact', key: 'supplier_contact' },
                  { label: 'Notes', key: 'notes' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {field.label}
                    </label>
                    <input type={field.type || 'text'}
                      value={selectedItem[field.key] || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, [field.key]: e.target.value })}
                      style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select value={selectedItem.category_id || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, category_id: e.target.value })}
                    style={inputStyle}>
                    <option value=''>Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    Full Description
                  </label>
                  <textarea value={selectedItem.full_description || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, full_description: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Category', value: selectedItem.categories?.name || 'Uncategorized' },
                    { label: 'Unit', value: selectedItem.unit || '-' },
                    { label: 'Unit Price', value: `₱${parseFloat(selectedItem.base_price).toLocaleString()}` },
                    { label: 'Supplier', value: selectedItem.supplier || '-' },
                    { label: 'Contact', value: selectedItem.supplier_contact || '-' },
                    { label: 'Notes', value: selectedItem.notes || '-' },
                  ].map(field => (
                    <div key={field.label} style={{
                      background: '#f8f9fa', borderRadius: '8px', padding: '12px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{field.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f2027' }}>{field.value}</div>
                    </div>
                  ))}
                </div>
                {selectedItem.full_description && (
                  <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Full Description</div>
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
                      {selectedItem.full_description}
                    </div>
                  </div>
                )}
                {/* Who added / edited */}
                <div style={{
                  background: '#E8F5E9', borderRadius: '8px',
                  padding: '12px', fontSize: '12px', color: '#2E7D32'
                }}>
                  <div>👤 <strong>Added by:</strong> {selectedItem.creator?.full_name || 'Unknown'} — {formatDate(selectedItem.created_at)}</div>
                  {selectedItem.editor?.full_name && (
                    <div style={{ marginTop: '4px' }}>
                      ✏️ <strong>Last edited by:</strong> {selectedItem.editor?.full_name} — {formatDate(selectedItem.updated_at)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              {editMode ? (
                <>
                  <button onClick={handleEditSave} disabled={saving} style={{
                    background: '#1565C0', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button onClick={() => setEditMode(false)} style={{
                    background: '#e0e0e0', color: '#333', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', cursor: 'pointer'
                  }}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} style={{
                    background: '#1565C0', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}>✏️ Edit Item</button>
                  <button onClick={() => handleDelete(selectedItem.id)} style={{
                    background: '#ffebee', color: '#c62828', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', cursor: 'pointer'
                  }}>🗑️ Delete</button>
                  <button onClick={() => setSelectedItem(null)} style={{
                    background: '#e0e0e0', color: '#333', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    fontSize: '14px', cursor: 'pointer'
                  }}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

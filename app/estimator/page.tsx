'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── TYPES ──
interface SiteInputs {
  excavationLength: string
  excavationWidth: string
  excavationDepth: string
  groundwaterDepth: string
  requiredDrawdown: string
  soilType: string
  permeabilityK: string
  useCustomK: boolean
  aquiferType: string
  aquiferThickness: string
  projectDuration: string
  riskLevel: string
  markup: string
  projectName: string
  location: string
}

interface EquipmentItem {
  description: string
  unit: string
  quantity: number
  duration: number
  unitPrice: number
  totalCost: number
  markupPct: number
  sellingPrice: number
}

interface CalcResults {
  method: string
  methodReason: string
  alternativeMethod: string
  radiusOfInfluence: number
  equivalentRadius: number
  totalInflow: number
  designFlow: number
  drawdown: number
  wellpointCount: number
  wellpointStages: number
  headerPipeLength: number
  wellCount: number
  wellSpacing: number
  wellDepth: number
  pumpFlowRate: number
  pumpTDH: number
  pumpPower: number
  equipment: EquipmentItem[]
  totalCostPrice: number
  totalSellingPrice: number
}

// ── SOIL PERMEABILITY TABLE ──
const SOIL_K: Record<string, number> = {
  'Gravel': 1e-2,
  'Coarse sand': 1e-3,
  'Medium sand': 1e-4,
  'Fine sand': 1e-5,
  'Silty sand': 1e-6,
  'Silt': 1e-7,
  'Clay': 1e-8,
}

const METHOD_COLORS: Record<string, string> = {
  'Wellpoint System': '#1565C0',
  'Deep Wells': '#2E7D32',
  'Eductor Wells': '#E65100',
  'Sump Pumping': '#6A1B9A',
  'Open Cut Dewatering': '#00695C',
}

export default function EstimatorPage() {
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<SiteInputs>({
    excavationLength: '',
    excavationWidth: '',
    excavationDepth: '',
    groundwaterDepth: '',
    requiredDrawdown: '',
    soilType: 'Medium sand',
    permeabilityK: '',
    useCustomK: false,
    aquiferType: 'Unconfined',
    aquiferThickness: '',
    projectDuration: '',
    riskLevel: 'Medium',
    markup: '20',
    projectName: '',
    location: '',
  })
  const [results, setResults] = useState<CalcResults | null>(null)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [overrideMethod, setOverrideMethod] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [dbPrices, setDbPrices] = useState<any[]>([])
  const [savedEstimates, setSavedEstimates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)

      // ── Fetch prices WITH method_tags ──
      const { data: prices } = await supabase
        .from('items')
        .select('id, description, unit, base_price, category_id, method_tags')
        .order('id')
      setDbPrices(prices || [])

      // ── Fetch saved estimates ──
      const { data: estimates } = await supabase
        .from('estimates')
        .select('*')
        .eq('user_id', data.session.user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setSavedEstimates(estimates || [])
    })
  }, [])

  const inp = (key: keyof SiteInputs) => ({
    value: inputs[key] as string,
    onChange: (e: any) => setInputs({ ...inputs, [key]: e.target.value })
  })

  const getK = () => {
    if (inputs.useCustomK && inputs.permeabilityK) return parseFloat(inputs.permeabilityK)
    return SOIL_K[inputs.soilType] || 1e-4
  }

  // ── PRICE LOOKUP — uses method_tags first, falls back to keyword ──
  const findPrice = (keyword: string, methodTag?: string) => {
    if (methodTag) {
      const taggedItem = dbPrices.find(p =>
        Array.isArray(p.method_tags) &&
        p.method_tags.includes(methodTag) &&
        p.description.toLowerCase().includes(keyword.toLowerCase())
      )
      if (taggedItem) return taggedItem.base_price || 0
    }
    const item = dbPrices.find(p =>
      p.description.toLowerCase().includes(keyword.toLowerCase())
    )
    return item?.base_price || 0
  }

  // ── AUTO METHOD SELECTION ──
  const selectMethod = (drawdown: number, k: number, L: number, W: number) => {
    const perimeter = 2 * (L + W)
    if (k <= 1e-7) return {
      method: 'Eductor Wells',
      reason: 'Low permeability soil (k ≤ 1×10⁻⁷ m/s) requires vacuum-assisted dewatering. Eductors are ideal for silt and fine-grained soils.',
      alt: 'Deep Wells'
    }
    if (drawdown <= 1.5 && k >= 1e-4) return {
      method: 'Sump Pumping',
      reason: 'Minor drawdown required (≤1.5m) with permeable soil. Simple sump pumping is sufficient and most economical.',
      alt: 'Wellpoint System'
    }
    if (drawdown <= 5 && k >= 1e-5 && perimeter <= 300) return {
      method: 'Wellpoint System',
      reason: `Drawdown of ${drawdown.toFixed(1)}m is within wellpoint range (≤5m). Soil permeability and excavation size are suitable for a wellpoint system.`,
      alt: 'Deep Wells'
    }
    if (drawdown > 5 || k >= 1e-3) return {
      method: 'Deep Wells',
      reason: `Drawdown of ${drawdown.toFixed(1)}m exceeds wellpoint capability or high permeability requires large capacity wells.`,
      alt: 'Wellpoint System'
    }
    return {
      method: 'Open Cut Dewatering',
      reason: 'Shallow temporary excavation with low inflow. Open cut with sump is most practical.',
      alt: 'Sump Pumping'
    }
  }

  // ── MAIN CALCULATION ENGINE ──
  const calculate = () => {
    setCalculating(true)
    const L = parseFloat(inputs.excavationLength) || 0
    const W = parseFloat(inputs.excavationWidth) || 0
    const D = parseFloat(inputs.excavationDepth) || 0
    const GWT = parseFloat(inputs.groundwaterDepth) || 0
    const duration = parseFloat(inputs.projectDuration) || 1
    const markup = parseFloat(inputs.markup) || 20
    const k = getK()
    const H = parseFloat(inputs.aquiferThickness) || (D - GWT + 5)
    const drawdown = D - GWT + parseFloat(inputs.requiredDrawdown || '0.5')
    const safetyFactor = inputs.riskLevel === 'High' ? 2.0 : inputs.riskLevel === 'Medium' ? 1.5 : 1.25

    // Radius of influence (Sichardt)
    const R = 3000 * drawdown * Math.sqrt(k)
    // Equivalent radius
    const re = Math.sqrt((L * W) / Math.PI)
    const hw = 0.5
    // Total inflow (Dupuit-Thiem)
    const lnRre = Math.log(R / Math.max(re, 0.1))
    const Q_ms = (Math.PI * k * (H * H - hw * hw)) / lnRre
    const Q_m3hr = Q_ms * 3600
    const Q_design = Q_m3hr * safetyFactor
    const TDH = drawdown + 5
    const pumpPower = (Q_design / 3600 * 1000 * 9.81 * TDH) / (0.65 * 0.90) / 1000

    const methodResult = overrideMethod && selectedMethod
      ? { method: selectedMethod, reason: 'Method manually selected by engineer.', alt: '' }
      : selectMethod(drawdown, k, L, W)

    const method = methodResult.method
    const perimeter = 2 * (L + W)
    const durationMonths = Math.max(1, Math.ceil(duration / 4))

    let equipment: EquipmentItem[] = []
    let wellpointCount = 0, wellpointStages = 0, headerPipeLength = 0
    let wellCount = 0, wellSpacing = 0, wellDepth = 0

    const addItem = (
      description: string, unit: string,
      qty: number, dur: number, unitPrice: number
    ) => {
      const isTimeBased = ['month', 'week', 'day'].includes(unit)
      const totalCost = unitPrice * qty * (isTimeBased ? dur : 1)
      const sellingPrice = totalCost * (1 + markup / 100)
      equipment.push({
        description, unit, quantity: qty,
        duration: dur, unitPrice, totalCost,
        markupPct: markup, sellingPrice
      })
    }

    // ── WELLPOINT SYSTEM ──
    if (method === 'Wellpoint System') {
      wellpointCount = Math.ceil(perimeter / 1.2)
      wellpointStages = Math.max(1, Math.ceil(drawdown / 4.5))
      headerPipeLength = perimeter

      addItem('Wellpoint pump diesel 6" (duty)', 'month', 1, durationMonths,
        findPrice('Wellpoint pump diesel 6', 'wellpoint') || 85000)
      addItem('Wellpoint pump diesel 6" (standby)', 'month', 1, durationMonths,
        findPrice('Wellpoint pump diesel 6', 'wellpoint') || 85000)
      addItem('Wellpoint tip with screen 50mm', 'unit', wellpointCount, 1,
        findPrice('Wellpoint tip', 'wellpoint') || 680)
      addItem('Wellpoint riser pipe 50mm', 'm', wellpointCount * 6, 1,
        findPrice('Wellpoint riser', 'wellpoint') || 420)
      addItem('Header pipe 150mm', 'm', headerPipeLength, 1,
        findPrice('Header pipe 150', 'wellpoint') || 890)
      addItem('Swing connector flexible', 'unit', wellpointCount, 1,
        findPrice('Swing connector', 'wellpoint') || 320)
      addItem('Filter sock geotextile 50mm', 'm', wellpointCount * 6, 1,
        findPrice('Filter sock', 'wellpoint') || 85)
      addItem('Generator 30 kVA diesel', 'month', 1, durationMonths,
        findPrice('Generator 30', 'general') || 45000)
      addItem('Pump operator skilled', 'day', 1, duration * 7,
        findPrice('Pump operator', 'general') || 1200)
      addItem('General laborer', 'day', 2, duration * 7,
        findPrice('General laborer', 'general') || 800)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1,
        findPrice('Mobilization per trip', 'general') || 8500)

    // ── DEEP WELLS ──
    } else if (method === 'Deep Wells') {
      wellCount = Math.max(2, Math.ceil(Q_design / 15))
      wellSpacing = perimeter / wellCount
      wellDepth = D + drawdown + 3

      addItem('Deep well pump 4" (5.5 kW) duty', 'month', wellCount, durationMonths,
        findPrice('Deep well pump', 'deepwell') || 38000)
      addItem('Deep well pump 4" (5.5 kW) standby', 'month', 1, durationMonths,
        findPrice('Deep well pump', 'deepwell') || 38000)
      addItem('HDPE pipe 4" SDR11 (rising main)', 'm', wellCount * wellDepth, 1,
        findPrice('HDPE pipe 4', 'deepwell') || 620)
      addItem('Gravel filter pack washed', 'm³', wellCount * 2, 1,
        findPrice('Gravel filter', 'deepwell') || 1800)
      addItem('Generator 30 kVA diesel', 'month', 1, durationMonths,
        findPrice('Generator 30', 'general') || 45000)
      addItem('Control panel (DOL starter)', 'unit', wellCount, 1,
        findPrice('Control panel', 'deepwell') || 12500)
      addItem('Power cable 4mm² per meter', 'm', wellCount * wellDepth, 1,
        findPrice('Power cable', 'deepwell') || 95)
      addItem('Pump operator skilled', 'day', 1, duration * 7,
        findPrice('Pump operator', 'general') || 1200)
      addItem('Driller operator', 'day', 2, Math.ceil(wellCount / 2) * 3,
        findPrice('Driller operator', 'deepwell') || 2500)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1,
        findPrice('Mobilization per trip', 'general') || 8500)

    // ── EDUCTOR WELLS ──
    } else if (method === 'Eductor Wells') {
      wellCount = Math.max(4, Math.ceil(perimeter / 3))
      wellDepth = D + drawdown + 2

      addItem('Submersible pump 4" (2.2 kW) supply', 'month', 2, durationMonths,
        findPrice('Submersible pump 4', 'sump') || 22000)
      addItem('Submersible pump 3" (1.5 kW) return', 'month', 1, durationMonths,
        findPrice('Submersible pump 3', 'sump') || 14500)
      addItem('uPVC pipe 2" x 6m supply line', 'length', Math.ceil(perimeter / 6) * 2, 1,
        findPrice('uPVC pipe 2', 'general') || 480)
      addItem('uPVC pipe 3" x 6m return line', 'length', Math.ceil(perimeter / 6), 1,
        findPrice('uPVC pipe 3', 'general') || 780)
      addItem('Gravel filter pack washed', 'm³', wellCount * 1.5, 1,
        findPrice('Gravel filter', 'deepwell') || 1800)
      addItem('Generator 15 kVA diesel', 'month', 1, durationMonths,
        findPrice('Generator 15', 'general') || 28000)
      addItem('Pump operator skilled', 'day', 1, duration * 7,
        findPrice('Pump operator', 'general') || 1200)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1,
        findPrice('Mobilization per trip', 'general') || 8500)

    // ── SUMP PUMPING ──
    } else if (method === 'Sump Pumping') {
      const sumpCount = Math.max(1, Math.ceil(L * W / 500))

      addItem('Submersible pump 2" (0.75 kW) duty', 'month', sumpCount, durationMonths,
        findPrice('Submersible pump 2', 'sump') || 8500)
      addItem('Submersible pump 2" (0.75 kW) standby', 'month', 1, durationMonths,
        findPrice('Submersible pump 2', 'sump') || 8500)
      addItem('Flexible discharge hose 3"', 'm', Math.ceil(Math.max(L, W) + 20), 1,
        findPrice('Flexible discharge', 'sump') || 185)
      addItem('Excavation sump (machine)', 'm³', sumpCount * 2, 1,
        findPrice('Excavation sump', 'sump') || 450)
      addItem('Pump operator skilled', 'day', 1, duration * 7,
        findPrice('Pump operator', 'general') || 1200)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 1, 1,
        findPrice('Mobilization per trip', 'general') || 8500)

    // ── OPEN CUT ──
    } else {
      addItem('Submersible pump 3" (1.5 kW) duty', 'month', 2, durationMonths,
        findPrice('Submersible pump 3', 'sump') || 14500)
      addItem('Flexible discharge hose 3"', 'm', Math.ceil(Math.max(L, W) + 20), 1,
        findPrice('Flexible discharge', 'sump') || 185)
      addItem('General laborer', 'day', 2, duration * 7,
        findPrice('General laborer', 'general') || 800)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 1, 1,
        findPrice('Mobilization per trip', 'general') || 8500)
    }

    // ── CONSUMABLES (all methods) ──
    const dieselLiters = durationMonths * 30 * 8 * 15
    addItem('Diesel fuel per liter', 'L', dieselLiters, 1,
      findPrice('Diesel fuel', 'general') || 68)

    const totalCostPrice = equipment.reduce((s, e) => s + e.totalCost, 0)
    const totalSellingPrice = equipment.reduce((s, e) => s + e.sellingPrice, 0)

    setResults({
      method, methodReason: methodResult.reason,
      alternativeMethod: methodResult.alt,
      radiusOfInfluence: R, equivalentRadius: re,
      totalInflow: Q_m3hr, designFlow: Q_design,
      drawdown, wellpointCount, wellpointStages,
      headerPipeLength, wellCount, wellSpacing, wellDepth,
      pumpFlowRate: Q_design, pumpTDH: TDH, pumpPower,
      equipment, totalCostPrice, totalSellingPrice,
    })

    setSelectedMethod(method)
    setStep(3)
    setCalculating(false)
  }

  const handleSave = async () => {
    if (!results) return
    setSaving(true)
    await supabase.from('estimates').insert([{
      user_id: userId,
      project_name: inputs.projectName || 'Unnamed project',
      input_data: inputs,
      result_data: results,
    }])
    const { data: estimates } = await supabase
      .from('estimates').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setSavedEstimates(estimates || [])
    setSaving(false)
    setShowSaved(true)
    alert('✅ Estimate saved!')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e0e0e0', borderRadius: '8px',
    fontSize: '14px', color: '#000', backgroundColor: '#fff',
    boxSizing: 'border-box', outline: 'none'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px',
    fontWeight: '600', color: '#444', marginBottom: '5px'
  }

  const sectionStyle: React.CSSProperties = {
    background: 'white', borderRadius: '12px',
    padding: '24px', marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e8edf2'
  }

  const methodColor = results ? (METHOD_COLORS[results.method] || '#1565C0') : '#1565C0'

  const isStep1Valid = inputs.excavationLength && inputs.excavationWidth &&
    inputs.excavationDepth && inputs.groundwaterDepth && inputs.projectDuration

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '28px',
          flexWrap: 'wrap' as const, gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0d2137', margin: '0 0 4px 0' }}>
              🏗️ Dewatering Estimator
            </h1>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Input site parameters → get method recommendation + cost estimate
            </p>
          </div>
          {savedEstimates.length > 0 && (
            <button
              onClick={() => setShowSaved(!showSaved)}
              style={{
                padding: '10px 16px',
                background: showSaved ? '#1565C0' : 'white',
                color: showSaved ? 'white' : '#1565C0',
                border: '1.5px solid #1565C0',
                borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer'
              }}>
              📂 Saved Estimates ({savedEstimates.length})
            </button>
          )}
        </div>

        {/* ── SAVED ESTIMATES PANEL ── */}
        {showSaved && savedEstimates.length > 0 && (
          <div style={{ ...sectionStyle, border: '1.5px solid #1565C0', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
              📂 Saved Estimates
            </h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {savedEstimates.map((est: any) => {
                const result = est.result_data
                const input = est.input_data
                const color = METHOD_COLORS[result?.method] || '#1565C0'
                return (
                  <div key={est.id} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#f8f9fa',
                    borderRadius: '10px',
                    border: '1px solid #e0e0e0',
                    flexWrap: 'wrap' as const, gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px',
                        background: `${color}15`,
                        border: `2px solid ${color}44`,
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '18px'
                      }}>🏗️</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d2137' }}>
                          {est.project_name || 'Unnamed Project'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                          <span style={{
                            background: `${color}15`, color,
                            padding: '1px 6px', borderRadius: '99px',
                            fontWeight: '600', marginRight: '8px'
                          }}>{result?.method}</span>
                          {input?.location && `📍 ${input.location} · `}
                          {input?.excavationLength}×{input?.excavationWidth}×{input?.excavationDepth}m
                        </div>
                        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                          {new Date(est.created_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '11px', color: '#999' }}>Cost Price</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                          ₱{(result?.totalCostPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '11px', color: '#999' }}>Selling Price</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color }}>
                          ₱{(result?.totalSellingPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setInputs(input)
                            setResults(result)
                            setSelectedMethod(result?.method)
                            setStep(3)
                            setShowSaved(false)
                          }}
                          style={{
                            padding: '7px 14px',
                            background: color, color: 'white',
                            border: 'none', borderRadius: '6px',
                            fontSize: '12px', fontWeight: '600',
                            cursor: 'pointer'
                          }}>📂 Load</button>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this estimate?')) return
                            await supabase.from('estimates').delete().eq('id', est.id)
                            setSavedEstimates(savedEstimates.filter((e: any) => e.id !== est.id))
                          }}
                          style={{
                            padding: '7px 10px',
                            background: '#ffebee', color: '#c62828',
                            border: 'none', borderRadius: '6px',
                            fontSize: '12px', cursor: 'pointer'
                          }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP INDICATOR ── */}
        <div style={{
          display: 'flex', marginBottom: '28px',
          background: 'white', borderRadius: '12px',
          padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e8edf2'
        }}>
          {[
            { n: 1, label: '1. Site Parameters' },
            { n: 2, label: '2. Review & Calculate' },
            { n: 3, label: '3. Results & Estimate' },
          ].map((s) => (
            <div key={s.n}
              onClick={() => (results || s.n <= step) && setStep(s.n)}
              style={{
                flex: 1, padding: '12px',
                textAlign: 'center' as const,
                borderRadius: '8px',
                background: step === s.n ? '#1565C0' : 'transparent',
                color: step === s.n ? 'white' : step > s.n ? '#1565C0' : '#999',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: step === s.n ? '600' : '400',
                transition: 'all 0.2s'
              }}>
              {step > s.n ? '✅ ' : ''}{s.label}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════
            STEP 1 — SITE PARAMETERS
        ══════════════════════════════ */}
        {step === 1 && (
          <div>
            {/* Project Info */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                📋 Project Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Project Name</label>
                  <input {...inp('projectName')} placeholder="e.g. Seatrium Subic Deepwell" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Site Location</label>
                  <input {...inp('location')} placeholder="e.g. Subic Bay, Zambales" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Excavation Geometry */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                📐 Excavation Geometry
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Length (m) *</label>
                  <input {...inp('excavationLength')} type="number" placeholder="e.g. 50" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Width (m) *</label>
                  <input {...inp('excavationWidth')} type="number" placeholder="e.g. 30" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Excavation Depth (m) *</label>
                  <input {...inp('excavationDepth')} type="number" placeholder="e.g. 6" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Groundwater */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                💧 Groundwater Conditions
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>GWT Depth (m below ground) *</label>
                  <input {...inp('groundwaterDepth')} type="number" placeholder="e.g. 1.5" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Extra Drawdown Below Formation (m)</label>
                  <input {...inp('requiredDrawdown')} type="number" placeholder="e.g. 0.5" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Aquifer Type</label>
                  <select {...inp('aquiferType')} style={inputStyle}>
                    <option>Unconfined</option>
                    <option>Confined</option>
                    <option>Artesian</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Aquifer Thickness (m)</label>
                  <input {...inp('aquiferThickness')} type="number" placeholder="e.g. 15" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Soil */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                🪨 Soil & Permeability
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Soil Type</label>
                  <select {...inp('soilType')} style={inputStyle}>
                    {Object.keys(SOIL_K).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    Estimated k = {SOIL_K[inputs.soilType]?.toExponential(0)} m/s
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    <input
                      type="checkbox"
                      checked={inputs.useCustomK}
                      onChange={(e) => setInputs({ ...inputs, useCustomK: e.target.checked })}
                      style={{ marginRight: '6px' }}
                    />
                    Use custom k (from soil report)
                  </label>
                  {inputs.useCustomK && (
                    <input {...inp('permeabilityK')} type="number"
                      placeholder="e.g. 0.0001" step="0.000001" style={inputStyle} />
                  )}
                </div>
              </div>

              {/* k reference table */}
              <div style={{ marginTop: '16px', background: '#f8f9fa', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                  📊 Permeability Reference
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px', fontSize: '12px' }}>
                  {Object.entries(SOIL_K).map(([soil, k]) => (
                    <div key={soil} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '3px 8px', borderRadius: '4px',
                      background: inputs.soilType === soil ? '#E3F2FD' : 'transparent',
                      color: inputs.soilType === soil ? '#1565C0' : '#666',
                      fontWeight: inputs.soilType === soil ? '600' : '400'
                    }}>
                      <span>{soil}</span>
                      <span style={{ fontFamily: 'monospace' }}>{k.toExponential(0)} m/s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Parameters */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                ⚙️ Project Parameters
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Duration (weeks) *</label>
                  <input {...inp('projectDuration')} type="number" placeholder="e.g. 8" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Risk Level</label>
                  <select {...inp('riskLevel')} style={inputStyle}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    Safety factor: {inputs.riskLevel === 'High' ? '2.0' : inputs.riskLevel === 'Medium' ? '1.5' : '1.25'}×
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Markup %</label>
                  <input {...inp('markup')} type="number" placeholder="e.g. 20" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Method Override */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 8px 0' }}>
                🔧 Method Selection
              </h2>
              <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0' }}>
                System auto-recommends the best method based on your inputs. Override if needed.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>
                <input type="checkbox" checked={overrideMethod}
                  onChange={(e) => setOverrideMethod(e.target.checked)} />
                Override — select method manually
              </label>
              {overrideMethod && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  {Object.keys(METHOD_COLORS).map(m => (
                    <div key={m} onClick={() => setSelectedMethod(m)} style={{
                      padding: '12px', borderRadius: '8px', textAlign: 'center' as const,
                      border: `2px solid ${selectedMethod === m ? METHOD_COLORS[m] : '#e0e0e0'}`,
                      background: selectedMethod === m ? `${METHOD_COLORS[m]}11` : 'white',
                      color: selectedMethod === m ? METHOD_COLORS[m] : '#555',
                      cursor: 'pointer', fontSize: '13px',
                      fontWeight: selectedMethod === m ? '600' : '400',
                      transition: 'all 0.15s'
                    }}>{m}</div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setStep(2)} disabled={!isStep1Valid} style={{
              width: '100%', padding: '14px',
              background: isStep1Valid
                ? 'linear-gradient(135deg, #1565C0, #0288D1)' : '#ccc',
              color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '15px',
              fontWeight: '600', cursor: isStep1Valid ? 'pointer' : 'not-allowed'
            }}>
              Review Inputs → Next Step
            </button>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — REVIEW
        ══════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                📋 Input Summary — Please Review
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'Project', value: inputs.projectName || 'Unnamed' },
                  { label: 'Location', value: inputs.location || '-' },
                  { label: 'Excavation', value: `${inputs.excavationLength}m × ${inputs.excavationWidth}m × ${inputs.excavationDepth}m deep` },
                  { label: 'GWT Depth', value: `${inputs.groundwaterDepth}m below ground` },
                  { label: 'Soil Type', value: inputs.soilType },
                  { label: 'Permeability k', value: inputs.useCustomK ? `${inputs.permeabilityK} m/s (custom)` : `${SOIL_K[inputs.soilType]?.toExponential(0)} m/s` },
                  { label: 'Aquifer Type', value: inputs.aquiferType },
                  { label: 'Duration', value: `${inputs.projectDuration} weeks` },
                  { label: 'Risk Level', value: inputs.riskLevel },
                  { label: 'Markup', value: `${inputs.markup}%` },
                  { label: 'Method', value: overrideMethod && selectedMethod ? `${selectedMethod} (manual)` : 'Auto-select' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '3px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0d2137', fontWeight: '500' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div style={{ marginTop: '16px', padding: '14px', background: '#E3F2FD', borderRadius: '8px', fontSize: '13px', color: '#1565C0' }}>
                <strong>Quick preview:</strong>
                <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                  <span>📐 Perimeter: {(2 * (parseFloat(inputs.excavationLength || '0') + parseFloat(inputs.excavationWidth || '0'))).toFixed(1)}m</span>
                  <span>📐 Area: {(parseFloat(inputs.excavationLength || '0') * parseFloat(inputs.excavationWidth || '0')).toFixed(1)}m²</span>
                  <span>💧 Drawdown: ~{(parseFloat(inputs.excavationDepth || '0') - parseFloat(inputs.groundwaterDepth || '0') + parseFloat(inputs.requiredDrawdown || '0.5')).toFixed(1)}m</span>
                  <span>⚠️ Safety factor: {inputs.riskLevel === 'High' ? '2.0' : inputs.riskLevel === 'Medium' ? '1.5' : '1.25'}×</span>
                </div>
              </div>

              {/* Price database status */}
              <div style={{ marginTop: '12px', padding: '12px 14px', background: dbPrices.length > 0 ? '#E8F5E9' : '#FFF3E0', borderRadius: '8px', fontSize: '12px' }}>
                {dbPrices.length > 0 ? (
                  <span style={{ color: '#2E7D32' }}>
                    ✅ {dbPrices.length} prices loaded from your database —
                    {dbPrices.filter(p => Array.isArray(p.method_tags) && p.method_tags.length > 0).length} items have method tags
                  </span>
                ) : (
                  <span style={{ color: '#E65100' }}>
                    ⚠️ No prices loaded — estimates will use default fallback prices
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{
                padding: '14px 24px', background: '#f0f0f0',
                color: '#333', border: 'none', borderRadius: '10px',
                fontSize: '14px', cursor: 'pointer'
              }}>← Edit Inputs</button>
              <button onClick={calculate} disabled={calculating} style={{
                flex: 1, padding: '14px',
                background: calculating ? '#90CAF9' : 'linear-gradient(135deg, #1565C0, #0288D1)',
                color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '15px',
                fontWeight: '600', cursor: 'pointer'
              }}>
                {calculating ? '⏳ Calculating...' : '⚡ Run Calculations →'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 3 — RESULTS
        ══════════════════════════════ */}
        {step === 3 && results && (
          <div>
            {/* Method Banner */}
            <div style={{ ...sectionStyle, borderTop: `4px solid ${methodColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>
                    Recommended Method
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: methodColor, marginBottom: '8px' }}>
                    {results.method}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', maxWidth: '600px' }}>
                    {results.methodReason}
                  </div>
                  {results.alternativeMethod && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                      Alternative: {results.alternativeMethod}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <button onClick={() => { setStep(1); setOverrideMethod(true) }} style={{
                    padding: '8px 16px', background: 'white',
                    color: methodColor, border: `1.5px solid ${methodColor}`,
                    borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer'
                  }}>🔧 Change Method</button>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '8px 16px', background: methodColor,
                    color: 'white', border: 'none',
                    borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer'
                  }}>{saving ? '⏳...' : '💾 Save'}</button>
                </div>
              </div>
            </div>

            {/* Hydraulic Results */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                🔢 Hydraulic Calculations
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Required Drawdown', value: `${results.drawdown.toFixed(2)} m` },
                  { label: 'Radius of Influence', value: `${results.radiusOfInfluence.toFixed(1)} m` },
                  { label: 'Equivalent Radius', value: `${results.equivalentRadius.toFixed(1)} m` },
                  { label: 'Total Inflow Q', value: `${results.totalInflow.toFixed(1)} m³/hr` },
                  { label: 'Design Flow (with SF)', value: `${results.designFlow.toFixed(1)} m³/hr` },
                  { label: 'Total Dynamic Head', value: `${results.pumpTDH.toFixed(1)} m` },
                  { label: 'Required Power', value: `${results.pumpPower.toFixed(1)} kW` },
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#f8f9fa', borderRadius: '8px',
                    padding: '12px', textAlign: 'center' as const
                  }}>
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: methodColor }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* System summary */}
              {results.method === 'Wellpoint System' && (
                <div style={{ background: `${methodColor}11`, borderRadius: '8px', padding: '14px', border: `1px solid ${methodColor}33` }}>
                  <div style={{ fontWeight: '600', color: methodColor, marginBottom: '8px', fontSize: '13px' }}>Wellpoint System Design</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                    <span>📍 Wellpoints: <strong>{results.wellpointCount} nos</strong></span>
                    <span>📊 Stages: <strong>{results.wellpointStages}</strong></span>
                    <span>📏 Header pipe: <strong>{results.headerPipeLength.toFixed(0)}m</strong></span>
                    <span>📐 Spacing: <strong>~1.2m c/c</strong></span>
                  </div>
                </div>
              )}
              {(results.method === 'Deep Wells' || results.method === 'Eductor Wells') && (
                <div style={{ background: `${methodColor}11`, borderRadius: '8px', padding: '14px', border: `1px solid ${methodColor}33` }}>
                  <div style={{ fontWeight: '600', color: methodColor, marginBottom: '8px', fontSize: '13px' }}>{results.method} Design</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                    <span>🕳️ Wells: <strong>{results.wellCount} nos</strong></span>
                    <span>📏 Spacing: <strong>{results.wellSpacing.toFixed(1)}m</strong></span>
                    <span>📐 Depth: <strong>{results.wellDepth.toFixed(1)}m</strong></span>
                    <span>💧 Flow/well: <strong>~15 m³/hr</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment & Cost Table */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: 0 }}>
                  📦 Equipment Schedule & Cost Estimate
                </h2>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {inputs.markup}% markup · {inputs.projectDuration} weeks
                </div>
              </div>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Description', 'Unit', 'Qty', 'Duration', 'Unit Price', 'Cost Price', 'Markup', 'Selling Price'].map(h => (
                        <th key={h} style={{
                          padding: '10px 12px', textAlign: 'left' as const,
                          fontWeight: '700', color: '#555',
                          borderBottom: '2px solid #e0e0e0',
                          fontSize: '11px', textTransform: 'uppercase' as const,
                          whiteSpace: 'nowrap' as const
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.equipment.map((item, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid #f0f0f0',
                        background: i % 2 === 0 ? 'white' : '#fafafa'
                      }}>
                        <td style={{ padding: '10px 12px', color: '#0d2137', fontWeight: '500' }}>{item.description}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{item.unit}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>
                          {['month', 'week', 'day'].includes(item.unit) ? `${item.duration} ${item.unit}s` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#555' }}>₱{item.unitPrice.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#333', fontWeight: '500' }}>₱{item.totalCost.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{item.markupPct}%</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: methodColor }}>₱{item.sellingPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Total Cost Price</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d2137' }}>
                    ₱{results.totalCostPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Before markup</div>
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Gross Margin ({inputs.markup}%)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E65100' }}>
                    ₱{(results.totalSellingPrice - results.totalCostPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Your profit</div>
                </div>
                <div style={{ background: `${methodColor}11`, border: `2px solid ${methodColor}`, borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: methodColor, fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Total Selling Price</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: methodColor }}>
                    ₱{results.totalSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '12px', color: methodColor, opacity: 0.7, marginTop: '2px' }}>Client price incl. markup</div>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 12px 0' }}>
                ⚠️ Assumptions & Notes
              </h2>
              <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.9' }}>
                <div>• Hydraulic calculations based on Dupuit-Thiem equation for {inputs.aquiferType.toLowerCase()} aquifer</div>
                <div>• Permeability: {inputs.useCustomK ? `${inputs.permeabilityK} m/s (from soil report)` : `${SOIL_K[inputs.soilType]?.toExponential(0)} m/s (estimated from ${inputs.soilType})`}</div>
                <div>• Radius of influence: Sichardt formula (R = 3000 × s × √k)</div>
                <div>• Design flow includes {inputs.riskLevel === 'High' ? '2.0×' : inputs.riskLevel === 'Medium' ? '1.5×' : '1.25×'} safety factor</div>
                <div>• Equipment prices pulled from DewaPrice Philippines database using method tags</div>
                <div>• Labor based on standard daily rates — adjust for overtime or specialist requirements</div>
                <div>• Mobilization based on Metro Manila — adjust for provincial or international sites</div>
                <div>• <strong>For budgeting purposes only</strong> — detailed design required before construction</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
              <button onClick={() => { setStep(1); setResults(null) }} style={{
                padding: '12px 20px', background: '#f0f0f0',
                color: '#333', border: 'none', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer'
              }}>← New Estimate</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '12px 20px', background: methodColor,
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}>{saving ? '⏳ Saving...' : '💾 Save Estimate'}</button>
              <button onClick={() => window.print()} style={{
                padding: '12px 20px', background: 'white',
                color: '#333', border: '1.5px solid #e0e0e0',
                borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
              }}>🖨️ Print</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

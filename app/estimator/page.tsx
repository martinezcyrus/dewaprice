'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

// ── CROSS SECTION SVG ──
function CrossSection({ inputs }: { inputs: SiteInputs }) {
  const W = parseFloat(inputs.excavationWidth) || 20
  const D = parseFloat(inputs.excavationDepth) || 6
  const GWT = parseFloat(inputs.groundwaterDepth) || 1.5
  const DD = parseFloat(inputs.requiredDrawdown) || 0.5
  const soil = inputs.soilType || 'Medium sand'

  const svgW = 340, svgH = 380
  const lm = 72, rm = 80, tm = 50, bm = 30
  const drawW = svgW - lm - rm
  const drawH = svgH - tm - bm

  const totalDepth = Math.max(D + 4, 10)
  const scale = drawH / totalDepth

  const gx = lm, gy = tm
  const gwtY = gy + Math.min(GWT, D - 0.5) * scale
  const formY = gy + D * scale
  const drawdownY = formY + DD * scale
  const aquiferY = gy + (D + 3) * scale
  const excW = drawW * 0.55
  const excX = gx + (drawW - excW) / 2

  const soilColors: Record<string, string> = {
    'Gravel': '#C8B88A',
    'Coarse sand': '#D4B483',
    'Medium sand': '#C9A96E',
    'Fine sand': '#BFA05E',
    'Silty sand': '#A89070',
    'Silt': '#9E8B7A',
    'Clay': '#8B7A6A',
  }
  const soilColor = soilColors[soil] || '#C9A96E'

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      <defs>
        <pattern id="cs-soil" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={soilColor} opacity="0.5"/>
          <circle cx="7" cy="7" r="1" fill={soilColor} opacity="0.4"/>
        </pattern>
        <pattern id="cs-gravel" width="8" height="8" patternUnits="userSpaceOnUse">
          <ellipse cx="4" cy="4" rx="2.5" ry="1.5" fill={soilColor} opacity="0.4"/>
        </pattern>
        <marker id="cs-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </marker>
      </defs>

      {/* Unsaturated soil */}
      <rect x={gx} y={gy} width={drawW} height={gwtY - gy} fill={soilColor} opacity="0.4"/>
      <rect x={gx} y={gy} width={drawW} height={gwtY - gy} fill="url(#cs-soil)"/>

      {/* Saturated zone */}
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill="#4A90D9" opacity="0.12"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill={soilColor} opacity="0.35"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill="url(#cs-soil)"/>

      {/* Aquifer */}
      <rect x={gx} y={formY} width={drawW} height={aquiferY - formY} fill="#4A90D9" opacity="0.2"/>
      <rect x={gx} y={aquiferY} width={drawW} height={gy + drawH - aquiferY} fill={soilColor} opacity="0.5"/>

      {/* Excavation cutout */}
      <rect x={excX} y={gy} width={excW} height={formY - gy} fill="white" opacity="0.96"/>

      {/* Excavation walls */}
      <line x1={excX} y1={gy} x2={excX} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>
      <line x1={excX + excW} y1={gy} x2={excX + excW} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>

      {/* Ground surface */}
      <line x1={gx} y1={gy} x2={gx + drawW} y2={gy} stroke="#333" strokeWidth="2" opacity="0.8"/>
      <rect x={gx} y={gy - 7} width={drawW} height={7} fill="#5D8A3C" opacity="0.65" rx="2"/>

      {/* Formation level line */}
      <line x1={gx} y1={formY} x2={gx + drawW} y2={formY} stroke="#8B6914" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.7"/>

      {/* GWT line (blue dashed) */}
      <line x1={gx} y1={gwtY} x2={gx + drawW} y2={gwtY} stroke="#1565C0" strokeWidth="1.5" strokeDasharray="10 5" opacity="0.9"/>

      {/* Drawdown target */}
      {drawdownY < aquiferY && (
        <line x1={gx} y1={drawdownY} x2={gx + drawW} y2={drawdownY} stroke="#00897B" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.8"/>
      )}

      {/* Water droplets in saturated zone (outside excavation) */}
      {[0.15, 0.35, 0.65, 0.85].map((frac, i) => {
        const wx = gx + frac * drawW
        const wy = gwtY + (formY - gwtY) * 0.5
        if (wx > excX - 6 && wx < excX + excW + 6) return null
        return <ellipse key={i} cx={wx} cy={wy} rx="3.5" ry="4.5" fill="#4A90D9" opacity="0.35"/>
      })}

      {/* Width dimension arrow */}
      <line x1={excX} y1={tm - 8} x2={excX + excW} y2={tm - 8} stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={excX + excW / 2} y={tm - 13} textAnchor="middle" fontSize="10" fill="#555" fontFamily="Arial, sans-serif">W: {W}m</text>

      {/* Depth dimension arrow */}
      <line x1={excX + excW + 8} y1={gy} x2={excX + excW + 8} y2={formY} stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={excX + excW + 14} y={gy + (formY - gy) / 2} fontSize="10" fill="#555" fontFamily="Arial, sans-serif" dominantBaseline="central">D: {D}m</text>

      {/* Right side labels */}
      {[
        { y: gy, label: 'Ground', color: '#333' },
        { y: gwtY, label: `GWT ${GWT}m`, color: '#1565C0' },
        { y: formY, label: 'Formation', color: '#8B6914' },
        ...(drawdownY < aquiferY ? [{ y: drawdownY, label: `Drawdown`, color: '#00897B' }] : []),
      ].map((item, i) => (
        <g key={i}>
          <line x1={gx - 4} y1={item.y} x2={gx} y2={item.y} stroke={item.color} strokeWidth="0.5"/>
          <text x={gx - 6} y={item.y + 1} textAnchor="end" fontSize="9.5" fill={item.color} fontFamily="Arial, sans-serif" dominantBaseline="central">{item.label}</text>
        </g>
      ))}

      {/* Soil type label */}
      <text x={gx + drawW / 2} y={gy + (gwtY - gy) / 2} textAnchor="middle" fontSize="9" fill="#666" fontFamily="Arial, sans-serif" dominantBaseline="central" opacity="0.8">{soil}</text>
      <text x={gx + drawW / 2} y={gwtY + (formY - gwtY) / 2} textAnchor="middle" fontSize="9" fill="#1565C0" fontFamily="Arial, sans-serif" dominantBaseline="central" opacity="0.7">Saturated</text>

      {/* Excavation label */}
      <text x={excX + excW / 2} y={gy + (formY - gy) / 2} textAnchor="middle" fontSize="10" fill="#999" fontFamily="Arial, sans-serif" dominantBaseline="central">Excavation</text>

      {/* Title */}
      <text x={svgW / 2} y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#333" fontFamily="Arial, sans-serif">Cross Section</text>
    </svg>
  )
}

// ── PLAN VIEW SVG (top view of wells) ──
function PlanView({ results, inputs }: { results: CalcResults, inputs: SiteInputs }) {
  const L = parseFloat(inputs.excavationLength) || 30
  const W = parseFloat(inputs.excavationWidth) || 20
  const method = results.method
  const color = METHOD_COLORS[method] || '#1565C0'

  const svgW = 340, svgH = 320
  const margin = 60
  const maxDim = Math.max(L, W)
  const scale = Math.min(
    (svgW - margin * 2) / (L + 8),
    (svgH - margin * 2) / (W + 8)
  )

  const cx = svgW / 2
  const cy = svgH / 2
  const excW = L * scale
  const excH = W * scale
  const ex = cx - excW / 2
  const ey = cy - excH / 2

  // Generate well positions around perimeter
  const wells: { x: number; y: number }[] = []

  if (method === 'Wellpoint System') {
    const spacing = 1.2
    const nL = Math.max(2, Math.ceil(L / spacing))
    const nW = Math.max(2, Math.ceil(W / spacing))
    // Top & bottom
    for (let i = 0; i <= nL; i++) {
      const px = ex + (i / nL) * excW
      wells.push({ x: px, y: ey - 10 })
      wells.push({ x: px, y: ey + excH + 10 })
    }
    // Left & right (skip corners)
    for (let i = 1; i < nW; i++) {
      const py = ey + (i / nW) * excH
      wells.push({ x: ex - 10, y: py })
      wells.push({ x: ex + excW + 10, y: py })
    }
  } else if (method === 'Deep Wells' || method === 'Eductor Wells') {
    const n = results.wellCount || 6
    const perimeter = 2 * (L + W)
    let dist = 0
    for (let i = 0; i < n; i++) {
      const target = (i / n) * perimeter
      let px, py
      if (target < L) { px = ex + (target / L) * excW; py = ey - 14 }
      else if (target < L + W) { px = ex + excW + 14; py = ey + ((target - L) / W) * excH }
      else if (target < 2 * L + W) { px = ex + excW - ((target - L - W) / L) * excW; py = ey + excH + 14 }
      else { px = ex - 14; py = ey + excH - ((target - 2 * L - W) / W) * excH }
      wells.push({ x: px, y: py })
    }
  } else if (method === 'Sump Pumping') {
    // Sumps at corners
    const corners = [
      { x: ex + 12, y: ey + 12 },
      { x: ex + excW - 12, y: ey + 12 },
      { x: ex + excW - 12, y: ey + excH - 12 },
      { x: ex + 12, y: ey + excH - 12 },
    ]
    corners.forEach(c => wells.push(c))
  }

  const isInsideExc = (wx: number, wy: number) =>
    method === 'Sump Pumping'

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      {/* Header pipe / perimeter line for wellpoint */}
      {method === 'Wellpoint System' && (
        <rect x={ex - 10} y={ey - 10} width={excW + 20} height={excH + 20}
          fill="none" stroke={color} strokeWidth="2" strokeDasharray="0" rx="2" opacity="0.4"/>
      )}

      {/* Excavation outline */}
      <rect x={ex} y={ey} width={excW} height={excH}
        fill="#f0f4f8" stroke="#333" strokeWidth="2" rx="3" opacity="0.9"/>

      {/* Excavation label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#555" fontFamily="Arial, sans-serif">
        {L}m × {W}m
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#999" fontFamily="Arial, sans-serif">
        Excavation
      </text>

      {/* Radius of influence (dashed circle) */}
      {results.radiusOfInfluence > 0 && results.radiusOfInfluence < 200 && (
        <ellipse cx={cx} cy={cy}
          rx={Math.min(results.radiusOfInfluence * scale * 0.5, svgW * 0.45)}
          ry={Math.min(results.radiusOfInfluence * scale * 0.5, svgH * 0.45)}
          fill="none" stroke={color} strokeWidth="1" strokeDasharray="6 4" opacity="0.25"/>
      )}

      {/* Wells / wellpoints */}
      {wells.slice(0, 80).map((w, i) => (
        <g key={i}>
          {method === 'Wellpoint System' ? (
            <circle cx={w.x} cy={w.y} r="3.5" fill={color} opacity="0.8"/>
          ) : method === 'Sump Pumping' ? (
            <rect x={w.x - 6} y={w.y - 6} width="12" height="12" fill={color} opacity="0.7" rx="2"/>
          ) : (
            <g>
              <circle cx={w.x} cy={w.y} r="7" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9"/>
              <circle cx={w.x} cy={w.y} r="3" fill={color} opacity="0.7"/>
            </g>
          )}
        </g>
      ))}

      {/* Dimension arrows */}
      <line x1={ex} y1={ey - 22} x2={ex + excW} y2={ey - 22}
        stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={cx} y={ey - 27} textAnchor="middle" fontSize="10" fill="#555" fontFamily="Arial, sans-serif">
        Length: {L}m
      </text>
      <line x1={ex - 22} y1={ey} x2={ex - 22} y2={ey + excH}
        stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={ex - 26} y={cy} textAnchor="middle" fontSize="10" fill="#555" fontFamily="Arial, sans-serif"
        transform={`rotate(-90, ${ex - 26}, ${cy})`}>
        Width: {W}m
      </text>

      {/* Legend */}
      <g>
        {method === 'Wellpoint System' && (
          <>
            <circle cx={ex} cy={ey + excH + 28} r="4" fill={color} opacity="0.8"/>
            <text x={ex + 10} y={ey + excH + 32} fontSize="10" fill="#555" fontFamily="Arial, sans-serif">
              Wellpoint ({wells.length} nos @ 1.2m c/c)
            </text>
            <line x1={ex} y1={ey + excH + 44} x2={ex + 24} y2={ey + excH + 44} stroke={color} strokeWidth="2" opacity="0.4"/>
            <text x={ex + 30} y={ey + excH + 48} fontSize="10" fill="#555" fontFamily="Arial, sans-serif">
              Header pipe
            </text>
          </>
        )}
        {(method === 'Deep Wells' || method === 'Eductor Wells') && (
          <>
            <circle cx={ex} cy={ey + excH + 28} r="7" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9"/>
            <circle cx={ex} cy={ey + excH + 28} r="3" fill={color} opacity="0.7"/>
            <text x={ex + 14} y={ey + excH + 32} fontSize="10" fill="#555" fontFamily="Arial, sans-serif">
              {method === 'Deep Wells' ? 'Deep well' : 'Eductor well'} ({results.wellCount} nos)
            </text>
          </>
        )}
        {method === 'Sump Pumping' && (
          <>
            <rect x={ex - 5} y={ey + excH + 22} width="12" height="12" fill={color} opacity="0.7" rx="2"/>
            <text x={ex + 14} y={ey + excH + 32} fontSize="10" fill="#555" fontFamily="Arial, sans-serif">
              Sump location (4 corners)
            </text>
          </>
        )}
      </g>

      {/* Title */}
      <text x={svgW / 2} y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#333" fontFamily="Arial, sans-serif">
        Plan View — Well Layout
      </text>
    </svg>
  )
}

// ── RESULTS CROSS SECTION (with wells shown) ──
function ResultsCrossSection({ results, inputs }: { results: CalcResults, inputs: SiteInputs }) {
  const W = parseFloat(inputs.excavationWidth) || 20
  const D = parseFloat(inputs.excavationDepth) || 6
  const GWT = parseFloat(inputs.groundwaterDepth) || 1.5
  const DD = parseFloat(inputs.requiredDrawdown) || 0.5
  const method = results.method
  const color = METHOD_COLORS[method] || '#1565C0'

  const svgW = 340, svgH = 380
  const lm = 72, rm = 80, tm = 50, bm = 30
  const drawW = svgW - lm - rm
  const drawH = svgH - tm - bm

  const totalDepth = Math.max(D + 4, 10)
  const scale = drawH / totalDepth

  const gx = lm, gy = tm
  const gwtY = gy + Math.min(GWT, D - 0.5) * scale
  const formY = gy + D * scale
  const drawdownY = formY + DD * scale
  const aquiferY = gy + (D + 3) * scale
  const excW = drawW * 0.55
  const excX = gx + (drawW - excW) / 2

  const wellDepth = results.wellDepth || D + DD + 2
  const wellY = gy + Math.min(wellDepth, totalDepth - 0.5) * scale
  const riserTop = gy - 20

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      <defs>
        <pattern id="rc-soil" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#C9A96E" opacity="0.4"/>
          <circle cx="7" cy="7" r="1" fill="#C9A96E" opacity="0.35"/>
        </pattern>
        <marker id="rc-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </marker>
      </defs>

      {/* Soil layers */}
      <rect x={gx} y={gy} width={drawW} height={gwtY - gy} fill="#C9A96E" opacity="0.35"/>
      <rect x={gx} y={gy} width={drawW} height={gwtY - gy} fill="url(#rc-soil)"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill="#4A90D9" opacity="0.1"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill="#C9A96E" opacity="0.3"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY - gwtY} fill="url(#rc-soil)"/>
      <rect x={gx} y={formY} width={drawW} height={aquiferY - formY} fill="#4A90D9" opacity="0.18"/>
      <rect x={gx} y={aquiferY} width={drawW} height={gy + drawH - aquiferY} fill="#C9A96E" opacity="0.45"/>

      {/* Excavation */}
      <rect x={excX} y={gy} width={excW} height={formY - gy} fill="white" opacity="0.95"/>
      <line x1={excX} y1={gy} x2={excX} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>
      <line x1={excX + excW} y1={gy} x2={excX + excW} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>

      {/* Ground surface */}
      <line x1={gx} y1={gy} x2={gx + drawW} y2={gy} stroke="#333" strokeWidth="2" opacity="0.8"/>
      <rect x={gx} y={gy - 7} width={drawW} height={7} fill="#5D8A3C" opacity="0.6" rx="2"/>

      {/* Level lines */}
      <line x1={gx} y1={gwtY} x2={gx + drawW} y2={gwtY} stroke="#1565C0" strokeWidth="1.5" strokeDasharray="10 5" opacity="0.8"/>
      <line x1={gx} y1={formY} x2={gx + drawW} y2={formY} stroke="#8B6914" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.7"/>
      {drawdownY < aquiferY && (
        <line x1={gx} y1={drawdownY} x2={gx + drawW} y2={drawdownY} stroke="#00897B" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.8"/>
      )}

      {/* ── METHOD-SPECIFIC ELEMENTS ── */}
      {method === 'Wellpoint System' && (
        <>
          {/* Header pipe */}
          <rect x={excX - 14} y={gy - 2} width={14} height="6" fill={color} opacity="0.7" rx="2"/>
          <rect x={excX + excW} y={gy - 2} width={14} height="6" fill={color} opacity="0.7" rx="2"/>
          {/* Riser pipes + wellpoints */}
          {[-1, 1].map((side, si) => {
            const rx = side === -1 ? excX - 7 : excX + excW + 7
            return [0.2, 0.5, 0.8].map((frac, i) => {
              const depth = D * 0.8
              const riserY = gy + depth * scale
              return (
                <g key={`${si}-${i}`}>
                  <line x1={rx} y1={gy + 4} x2={rx} y2={riserY} stroke={color} strokeWidth="1.5" opacity="0.6"/>
                  <ellipse cx={rx} cy={riserY} rx="4" ry="6" fill={color} opacity="0.7"/>
                  <circle cx={rx} cy={riserY + 8} r="3" fill={color} opacity="0.4"/>
                </g>
              )
            })
          })}
          {/* Pump */}
          <rect x={excX + excW / 2 - 14} y={gy - 30} width="28" height="22" fill={color} opacity="0.8" rx="4"/>
          <text x={excX + excW / 2} y={gy - 16} textAnchor="middle" fontSize="8" fill="white" fontFamily="Arial, sans-serif">PUMP</text>
          <line x1={excX - 7} y1={gy + 1} x2={excX + excW / 2 - 14} y2={gy - 19} stroke={color} strokeWidth="1.5" opacity="0.5"/>
          <line x1={excX + excW + 7} y1={gy + 1} x2={excX + excW / 2 + 14} y2={gy - 19} stroke={color} strokeWidth="1.5" opacity="0.5"/>
          {/* Discharge */}
          <line x1={excX + excW / 2 + 14} y1={gy - 19} x2={gx + drawW + 10} y2={gy - 19} stroke={color} strokeWidth="2" opacity="0.6"/>
          <text x={gx + drawW + 12} y={gy - 15} fontSize="9" fill={color} fontFamily="Arial, sans-serif">Discharge</text>
        </>
      )}

      {method === 'Deep Wells' && (
        <>
          {[-1, 1].map((side, si) => {
            const wx = side === -1 ? excX - 12 : excX + excW + 12
            return (
              <g key={si}>
                {/* Casing */}
                <rect x={wx - 5} y={gy} width="10" height={wellY - gy} fill="none" stroke={color} strokeWidth="2" opacity="0.7" rx="2"/>
                {/* Screen */}
                <rect x={wx - 5} y={drawdownY} width="10" height={wellY - drawdownY} fill={color} opacity="0.15" rx="2"/>
                {[...Array(4)].map((_, li) => {
                  const ly = drawdownY + li * ((wellY - drawdownY) / 4)
                  return <line key={li} x1={wx - 5} x2={wx + 5} y1={ly} y2={ly} stroke={color} strokeWidth="0.5" opacity="0.5"/>
                })}
                {/* Pump symbol */}
                <circle cx={wx} cy={gy + 16} r="9" fill={color} opacity="0.8"/>
                <text x={wx} y={gy + 20} textAnchor="middle" fontSize="7" fill="white" fontFamily="Arial, sans-serif">P</text>
                {/* Rising main */}
                <line x1={wx} y1={gy + 25} x2={wx} y2={gy + (wellY - gy) * 0.3} stroke={color} strokeWidth="1.5" opacity="0.4" strokeDasharray="4 2"/>
                {/* Discharge */}
                <line x1={wx} y1={gy + 7} x2={side === -1 ? gx - 10 : gx + drawW + 10} y2={gy + 7} stroke={color} strokeWidth="1.5" opacity="0.5"/>
              </g>
            )
          })}
          <text x={gx - 12} y={gy + 11} textAnchor="end" fontSize="9" fill={color} fontFamily="Arial, sans-serif">Discharge</text>
        </>
      )}

      {method === 'Sump Pumping' && (
        <>
          {/* Sump pit */}
          <rect x={excX + excW / 2 - 12} y={formY - 12} width="24" height="20" fill={color} opacity="0.2" rx="2"/>
          <line x1={excX + excW / 2 - 12} y1={formY - 12} x2={excX + excW / 2 - 12} y2={formY + 8} stroke={color} strokeWidth="1.5" opacity="0.5"/>
          <line x1={excX + excW / 2 + 12} y1={formY - 12} x2={excX + excW / 2 + 12} y2={formY + 8} stroke={color} strokeWidth="1.5" opacity="0.5"/>
          {/* Pump */}
          <circle cx={excX + excW / 2} cy={formY - 20} r="10" fill={color} opacity="0.75"/>
          <text x={excX + excW / 2} y={formY - 16} textAnchor="middle" fontSize="7" fill="white" fontFamily="Arial, sans-serif">PUMP</text>
          {/* Discharge */}
          <line x1={excX + excW / 2 + 10} y1={formY - 20} x2={gx + drawW + 10} y2={formY - 20} stroke={color} strokeWidth="1.5" opacity="0.5"/>
        </>
      )}

      {method === 'Eductor Wells' && (
        <>
          {[-1, 1].map((side, si) => {
            const wx = side === -1 ? excX - 12 : excX + excW + 12
            const edDepth = results.wellDepth || D + 2
            const edY = gy + Math.min(edDepth, totalDepth - 0.5) * scale
            return (
              <g key={si}>
                <rect x={wx - 4} y={gy} width="8" height={edY - gy} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" rx="2"/>
                <ellipse cx={wx} cy={edY} rx="5" ry="7" fill={color} opacity="0.5"/>
                <line x1={wx} y1={gy} x2={wx} y2={gy - 18} stroke={color} strokeWidth="2" opacity="0.6"/>
              </g>
            )
          })}
          <rect x={excX + excW / 2 - 16} y={gy - 30} width="32" height="22" fill={color} opacity="0.75" rx="4"/>
          <text x={excX + excW / 2} y={gy - 16} textAnchor="middle" fontSize="7.5" fill="white" fontFamily="Arial, sans-serif">SUPPLY</text>
        </>
      )}

      {/* Right labels */}
      {[
        { y: gy, label: 'GL', color: '#333' },
        { y: gwtY, label: `GWT`, color: '#1565C0' },
        { y: formY, label: 'FGL', color: '#8B6914' },
        ...(drawdownY < aquiferY ? [{ y: drawdownY, label: 'DWL', color: '#00897B' }] : []),
      ].map((item, i) => (
        <g key={i}>
          <line x1={gx - 4} y1={item.y} x2={gx} y2={item.y} stroke={item.color} strokeWidth="0.5"/>
          <text x={gx - 6} y={item.y + 1} textAnchor="end" fontSize="9" fill={item.color} fontFamily="Arial, sans-serif" dominantBaseline="central">{item.label}</text>
        </g>
      ))}

      {/* Title */}
      <text x={svgW / 2} y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#333" fontFamily="Arial, sans-serif">
        System Cross Section
      </text>
    </svg>
  )
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
      const { data: prices } = await supabase
        .from('items')
        .select('id, description, unit, base_price, category_id, method_tags')
        .order('id')
      setDbPrices(prices || [])
      const { data: estimates } = await supabase
        .from('estimates').select('*')
        .eq('user_id', data.session.user.id)
        .order('created_at', { ascending: false }).limit(10)
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

  const findPrice = (keyword: string, methodTag?: string) => {
    if (methodTag) {
      const tagged = dbPrices.find(p =>
        Array.isArray(p.method_tags) && p.method_tags.includes(methodTag) &&
        p.description.toLowerCase().includes(keyword.toLowerCase())
      )
      if (tagged) return tagged.base_price || 0
    }
    const item = dbPrices.find(p => p.description.toLowerCase().includes(keyword.toLowerCase()))
    return item?.base_price || 0
  }

  const selectMethod = (drawdown: number, k: number, L: number, W: number) => {
    const perimeter = 2 * (L + W)
    if (k <= 1e-7) return { method: 'Eductor Wells', reason: 'Low permeability soil (k ≤ 1×10⁻⁷ m/s) requires vacuum-assisted dewatering. Eductors are ideal for silt and fine-grained soils.', alt: 'Deep Wells' }
    if (drawdown <= 1.5 && k >= 1e-4) return { method: 'Sump Pumping', reason: 'Minor drawdown required (≤1.5m) with permeable soil. Simple sump pumping is sufficient and most economical.', alt: 'Wellpoint System' }
    if (drawdown <= 5 && k >= 1e-5 && perimeter <= 300) return { method: 'Wellpoint System', reason: `Drawdown of ${drawdown.toFixed(1)}m is within wellpoint range (≤5m). Soil permeability and excavation size are suitable for a wellpoint system.`, alt: 'Deep Wells' }
    if (drawdown > 5 || k >= 1e-3) return { method: 'Deep Wells', reason: `Drawdown of ${drawdown.toFixed(1)}m exceeds wellpoint capability or high permeability requires large capacity wells.`, alt: 'Wellpoint System' }
    return { method: 'Open Cut Dewatering', reason: 'Shallow temporary excavation with low inflow. Open cut with sump is most practical.', alt: 'Sump Pumping' }
  }

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
    const R = 3000 * drawdown * Math.sqrt(k)
    const re = Math.sqrt((L * W) / Math.PI)
    const hw = 0.5
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

    const addItem = (description: string, unit: string, qty: number, dur: number, unitPrice: number) => {
      const isTimeBased = ['month', 'week', 'day'].includes(unit)
      const totalCost = unitPrice * qty * (isTimeBased ? dur : 1)
      const sellingPrice = totalCost * (1 + markup / 100)
      equipment.push({ description, unit, quantity: qty, duration: dur, unitPrice, totalCost, markupPct: markup, sellingPrice })
    }

    if (method === 'Wellpoint System') {
      wellpointCount = Math.ceil(perimeter / 1.2)
      wellpointStages = Math.max(1, Math.ceil(drawdown / 4.5))
      headerPipeLength = perimeter
      addItem('Wellpoint pump diesel 6" (duty)', 'month', 1, durationMonths, findPrice('Wellpoint pump diesel 6', 'wellpoint') || 85000)
      addItem('Wellpoint pump diesel 6" (standby)', 'month', 1, durationMonths, findPrice('Wellpoint pump diesel 6', 'wellpoint') || 85000)
      addItem('Wellpoint tip with screen 50mm', 'unit', wellpointCount, 1, findPrice('Wellpoint tip', 'wellpoint') || 680)
      addItem('Wellpoint riser pipe 50mm', 'm', wellpointCount * 6, 1, findPrice('Wellpoint riser', 'wellpoint') || 420)
      addItem('Header pipe 150mm', 'm', headerPipeLength, 1, findPrice('Header pipe 150', 'wellpoint') || 890)
      addItem('Swing connector flexible', 'unit', wellpointCount, 1, findPrice('Swing connector', 'wellpoint') || 320)
      addItem('Filter sock geotextile 50mm', 'm', wellpointCount * 6, 1, findPrice('Filter sock', 'wellpoint') || 85)
      addItem('Generator 30 kVA diesel', 'month', 1, durationMonths, findPrice('Generator 30', 'general') || 45000)
      addItem('Pump operator skilled', 'day', 1, duration * 7, findPrice('Pump operator', 'general') || 1200)
      addItem('General laborer', 'day', 2, duration * 7, findPrice('General laborer', 'general') || 800)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1, findPrice('Mobilization per trip', 'general') || 8500)
    } else if (method === 'Deep Wells') {
      wellCount = Math.max(2, Math.ceil(Q_design / 15))
      wellSpacing = perimeter / wellCount
      wellDepth = D + drawdown + 3
      addItem('Deep well pump 4" (5.5 kW) duty', 'month', wellCount, durationMonths, findPrice('Deep well pump', 'deepwell') || 38000)
      addItem('Deep well pump 4" (5.5 kW) standby', 'month', 1, durationMonths, findPrice('Deep well pump', 'deepwell') || 38000)
      addItem('HDPE pipe 4" SDR11 (rising main)', 'm', wellCount * wellDepth, 1, findPrice('HDPE pipe 4', 'deepwell') || 620)
      addItem('Gravel filter pack washed', 'm³', wellCount * 2, 1, findPrice('Gravel filter', 'deepwell') || 1800)
      addItem('Generator 30 kVA diesel', 'month', 1, durationMonths, findPrice('Generator 30', 'general') || 45000)
      addItem('Control panel (DOL starter)', 'unit', wellCount, 1, findPrice('Control panel', 'deepwell') || 12500)
      addItem('Power cable 4mm² per meter', 'm', wellCount * wellDepth, 1, findPrice('Power cable', 'deepwell') || 95)
      addItem('Pump operator skilled', 'day', 1, duration * 7, findPrice('Pump operator', 'general') || 1200)
      addItem('Driller operator', 'day', 2, Math.ceil(wellCount / 2) * 3, findPrice('Driller operator', 'deepwell') || 2500)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1, findPrice('Mobilization per trip', 'general') || 8500)
    } else if (method === 'Eductor Wells') {
      wellCount = Math.max(4, Math.ceil(perimeter / 3))
      wellDepth = D + drawdown + 2
      addItem('Submersible pump 4" (2.2 kW) supply', 'month', 2, durationMonths, findPrice('Submersible pump 4', 'sump') || 22000)
      addItem('Submersible pump 3" (1.5 kW) return', 'month', 1, durationMonths, findPrice('Submersible pump 3', 'sump') || 14500)
      addItem('uPVC pipe 2" x 6m supply line', 'length', Math.ceil(perimeter / 6) * 2, 1, findPrice('uPVC pipe 2', 'general') || 480)
      addItem('uPVC pipe 3" x 6m return line', 'length', Math.ceil(perimeter / 6), 1, findPrice('uPVC pipe 3', 'general') || 780)
      addItem('Gravel filter pack washed', 'm³', wellCount * 1.5, 1, findPrice('Gravel filter', 'deepwell') || 1800)
      addItem('Generator 15 kVA diesel', 'month', 1, durationMonths, findPrice('Generator 15', 'general') || 28000)
      addItem('Pump operator skilled', 'day', 1, duration * 7, findPrice('Pump operator', 'general') || 1200)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 2, 1, findPrice('Mobilization per trip', 'general') || 8500)
    } else if (method === 'Sump Pumping') {
      const sumpCount = Math.max(1, Math.ceil(L * W / 500))
      addItem('Submersible pump 2" (0.75 kW) duty', 'month', sumpCount, durationMonths, findPrice('Submersible pump 2', 'sump') || 8500)
      addItem('Submersible pump 2" (0.75 kW) standby', 'month', 1, durationMonths, findPrice('Submersible pump 2', 'sump') || 8500)
      addItem('Flexible discharge hose 3"', 'm', Math.ceil(Math.max(L, W) + 20), 1, findPrice('Flexible discharge', 'sump') || 185)
      addItem('Excavation sump (machine)', 'm³', sumpCount * 2, 1, findPrice('Excavation sump', 'sump') || 450)
      addItem('Pump operator skilled', 'day', 1, duration * 7, findPrice('Pump operator', 'general') || 1200)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 1, 1, findPrice('Mobilization per trip', 'general') || 8500)
    } else {
      addItem('Submersible pump 3" (1.5 kW) duty', 'month', 2, durationMonths, findPrice('Submersible pump 3', 'sump') || 14500)
      addItem('Flexible discharge hose 3"', 'm', Math.ceil(Math.max(L, W) + 20), 1, findPrice('Flexible discharge', 'sump') || 185)
      addItem('General laborer', 'day', 2, duration * 7, findPrice('General laborer', 'general') || 800)
      addItem('Mobilization per trip (Metro Manila)', 'trip', 1, 1, findPrice('Mobilization per trip', 'general') || 8500)
    }

    const dieselLiters = durationMonths * 30 * 8 * 15
    addItem('Diesel fuel per liter', 'L', dieselLiters, 1, findPrice('Diesel fuel', 'general') || 68)

    const totalCostPrice = equipment.reduce((s, e) => s + e.totalCost, 0)
    const totalSellingPrice = equipment.reduce((s, e) => s + e.sellingPrice, 0)

    setResults({
      method, methodReason: methodResult.reason, alternativeMethod: methodResult.alt,
      radiusOfInfluence: R, equivalentRadius: re, totalInflow: Q_m3hr,
      designFlow: Q_design, drawdown, wellpointCount, wellpointStages,
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
      input_data: inputs, result_data: results,
    }])
    const { data: estimates } = await supabase
      .from('estimates').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(10)
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
  const isStep1Valid = !!(inputs.excavationLength && inputs.excavationWidth && inputs.excavationDepth && inputs.groundwaterDepth && inputs.projectDuration)

  const showDiagram = !!(parseFloat(inputs.excavationWidth) && parseFloat(inputs.excavationDepth) && parseFloat(inputs.groundwaterDepth))

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap' as const, gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0d2137', margin: '0 0 4px 0' }}>🏗️ Dewatering Estimator</h1>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Input site parameters → get method recommendation + cost estimate</p>
          </div>
          {savedEstimates.length > 0 && (
            <button onClick={() => setShowSaved(!showSaved)} style={{ padding: '10px 16px', background: showSaved ? '#1565C0' : 'white', color: showSaved ? 'white' : '#1565C0', border: '1.5px solid #1565C0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              📂 Saved ({savedEstimates.length})
            </button>
          )}
        </div>

        {/* ── SAVED ESTIMATES ── */}
        {showSaved && savedEstimates.length > 0 && (
          <div style={{ ...sectionStyle, border: '1.5px solid #1565C0', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>📂 Saved Estimates</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {savedEstimates.map((est: any) => {
                const result = est.result_data
                const input = est.input_data
                const color = METHOD_COLORS[result?.method] || '#1565C0'
                return (
                  <div key={est.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e0e0e0', flexWrap: 'wrap' as const, gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: `${color}15`, border: `2px solid ${color}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏗️</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d2137' }}>{est.project_name || 'Unnamed'}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                          <span style={{ background: `${color}15`, color, padding: '1px 6px', borderRadius: '99px', fontWeight: '600', marginRight: '8px' }}>{result?.method}</span>
                          {input?.excavationLength}×{input?.excavationWidth}×{input?.excavationDepth}m
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '11px', color: '#999' }}>Selling Price</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color }}> ₱{(result?.totalSellingPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setInputs(input); setResults(result); setSelectedMethod(result?.method); setStep(3); setShowSaved(false) }} style={{ padding: '7px 14px', background: color, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>📂 Load</button>
                        <button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('estimates').delete().eq('id', est.id); setSavedEstimates(savedEstimates.filter((e: any) => e.id !== est.id)) }} style={{ padding: '7px 10px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP INDICATOR ── */}
        <div style={{ display: 'flex', marginBottom: '28px', background: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8edf2' }}>
          {[{ n: 1, label: '1. Site Parameters' }, { n: 2, label: '2. Review & Calculate' }, { n: 3, label: '3. Results & Estimate' }].map(s => (
            <div key={s.n} onClick={() => (results || s.n <= step) && setStep(s.n)} style={{ flex: 1, padding: '12px', textAlign: 'center' as const, borderRadius: '8px', background: step === s.n ? '#1565C0' : 'transparent', color: step === s.n ? 'white' : step > s.n ? '#1565C0' : '#999', cursor: 'pointer', fontSize: '13px', fontWeight: step === s.n ? '600' : '400', transition: 'all 0.2s' }}>
              {step > s.n ? '✅ ' : ''}{s.label}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════
            STEP 1 — SITE PARAMETERS
        ══════════════════════════════ */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: showDiagram ? '1fr 340px' : '1fr', gap: '20px', alignItems: 'start' }}>

            {/* LEFT — Input Form */}
            <div>
              {/* Project Info */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>📋 Project Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Project Name</label><input {...inp('projectName')} placeholder="e.g. Seatrium Subic Deepwell" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Site Location</label><input {...inp('location')} placeholder="e.g. Subic Bay, Zambales" style={inputStyle}/></div>
                </div>
              </div>

              {/* Excavation */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>📐 Excavation Geometry</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div><label style={labelStyle}>Length (m) *</label><input {...inp('excavationLength')} type="number" placeholder="50" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Width (m) *</label><input {...inp('excavationWidth')} type="number" placeholder="30" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Depth (m) *</label><input {...inp('excavationDepth')} type="number" placeholder="6" style={inputStyle}/></div>
                </div>
              </div>

              {/* Groundwater */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>💧 Groundwater Conditions</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                  <div><label style={labelStyle}>GWT Depth (m) *</label><input {...inp('groundwaterDepth')} type="number" placeholder="1.5" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Extra Drawdown (m)</label><input {...inp('requiredDrawdown')} type="number" placeholder="0.5" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Aquifer Type</label><select {...inp('aquiferType')} style={inputStyle}><option>Unconfined</option><option>Confined</option><option>Artesian</option></select></div>
                  <div><label style={labelStyle}>Aquifer Thickness (m)</label><input {...inp('aquiferThickness')} type="number" placeholder="15" style={inputStyle}/></div>
                </div>
              </div>

              {/* Soil */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>🪨 Soil & Permeability</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Soil Type</label>
                    <select {...inp('soilType')} style={inputStyle}>{Object.keys(SOIL_K).map(s => <option key={s}>{s}</option>)}</select>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>k = {SOIL_K[inputs.soilType]?.toExponential(0)} m/s</div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <input type="checkbox" checked={inputs.useCustomK} onChange={(e) => setInputs({ ...inputs, useCustomK: e.target.checked })} style={{ marginRight: '6px' }}/>
                      Custom k (from soil report)
                    </label>
                    {inputs.useCustomK && <input {...inp('permeabilityK')} type="number" placeholder="e.g. 0.0001" step="0.000001" style={{ ...inputStyle, marginTop: '4px' }}/>}
                  </div>
                </div>

                {/* k reference table */}
                <div style={{ marginTop: '14px', background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>📊 Permeability Reference</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '3px', fontSize: '11px' }}>
                    {Object.entries(SOIL_K).map(([soil, k]) => (
                      <div key={soil} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', borderRadius: '4px', background: inputs.soilType === soil ? '#E3F2FD' : 'transparent', color: inputs.soilType === soil ? '#1565C0' : '#666', fontWeight: inputs.soilType === soil ? '600' : '400' }}>
                        <span>{soil}</span><span style={{ fontFamily: 'monospace' }}>{k.toExponential(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project Parameters */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>⚙️ Project Parameters</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div><label style={labelStyle}>Duration (weeks) *</label><input {...inp('projectDuration')} type="number" placeholder="8" style={inputStyle}/></div>
                  <div>
                    <label style={labelStyle}>Risk Level</label>
                    <select {...inp('riskLevel')} style={inputStyle}><option>Low</option><option>Medium</option><option>High</option></select>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>SF: {inputs.riskLevel === 'High' ? '2.0' : inputs.riskLevel === 'Medium' ? '1.5' : '1.25'}×</div>
                  </div>
                  <div><label style={labelStyle}>Markup %</label><input {...inp('markup')} type="number" placeholder="20" style={inputStyle}/></div>
                </div>
              </div>

              {/* Method override */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 8px 0' }}>🔧 Method Selection</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input type="checkbox" checked={overrideMethod} onChange={(e) => setOverrideMethod(e.target.checked)}/>
                  Override — select method manually
                </label>
                {overrideMethod && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    {Object.keys(METHOD_COLORS).map(m => (
                      <div key={m} onClick={() => setSelectedMethod(m)} style={{ padding: '10px', borderRadius: '8px', textAlign: 'center' as const, border: `2px solid ${selectedMethod === m ? METHOD_COLORS[m] : '#e0e0e0'}`, background: selectedMethod === m ? `${METHOD_COLORS[m]}11` : 'white', color: selectedMethod === m ? METHOD_COLORS[m] : '#555', cursor: 'pointer', fontSize: '12px', fontWeight: selectedMethod === m ? '600' : '400', transition: 'all 0.15s' }}>{m}</div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setStep(2)} disabled={!isStep1Valid} style={{ width: '100%', padding: '14px', background: isStep1Valid ? 'linear-gradient(135deg, #1565C0, #0288D1)' : '#ccc', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: isStep1Valid ? 'pointer' : 'not-allowed' }}>
                Review Inputs → Next Step
              </button>
            </div>

            {/* RIGHT — Live Cross Section Diagram */}
            {showDiagram && (
              <div style={{ position: 'sticky' as const, top: '76px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8edf2' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '12px', textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                    Live Cross Section
                  </div>
                  <CrossSection inputs={inputs}/>

                  {/* Quick stats */}
                  <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Perimeter', value: `${(2 * ((parseFloat(inputs.excavationLength) || 0) + (parseFloat(inputs.excavationWidth) || 0))).toFixed(0)}m` },
                      { label: 'Area', value: `${((parseFloat(inputs.excavationLength) || 0) * (parseFloat(inputs.excavationWidth) || 0)).toFixed(0)}m²` },
                      { label: 'Drawdown', value: `~${Math.max(0, (parseFloat(inputs.excavationDepth) || 0) - (parseFloat(inputs.groundwaterDepth) || 0) + parseFloat(inputs.requiredDrawdown || '0.5')).toFixed(1)}m` },
                      { label: 'Soil k', value: `${(inputs.useCustomK && inputs.permeabilityK ? parseFloat(inputs.permeabilityK) : SOIL_K[inputs.soilType] || 1e-4).toExponential(0)} m/s` },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase' as const, marginBottom: '2px' }}>{stat.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1565C0' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#bbb', textAlign: 'center' as const }}>Updates as you type</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — REVIEW
        ══════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>📋 Input Summary — Please Review</h2>
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
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '13px', color: '#0d2137', fontWeight: '500' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Cross section preview in review */}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px' }}>
                  <CrossSection inputs={inputs}/>
                </div>
                <div>
                  <div style={{ padding: '14px', background: '#E3F2FD', borderRadius: '8px', fontSize: '13px', color: '#1565C0', marginBottom: '12px' }}>
                    <strong>Preview calculations:</strong>
                    <div style={{ marginTop: '8px', display: 'grid', gap: '4px' }}>
                      <span>📐 Perimeter: {(2 * (parseFloat(inputs.excavationLength || '0') + parseFloat(inputs.excavationWidth || '0'))).toFixed(1)}m</span>
                      <span>📐 Area: {(parseFloat(inputs.excavationLength || '0') * parseFloat(inputs.excavationWidth || '0')).toFixed(1)}m²</span>
                      <span>💧 Drawdown: ~{(parseFloat(inputs.excavationDepth || '0') - parseFloat(inputs.groundwaterDepth || '0') + parseFloat(inputs.requiredDrawdown || '0.5')).toFixed(1)}m</span>
                      <span>⚠️ Safety factor: {inputs.riskLevel === 'High' ? '2.0' : inputs.riskLevel === 'Medium' ? '1.5' : '1.25'}×</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', background: dbPrices.length > 0 ? '#E8F5E9' : '#FFF3E0', borderRadius: '8px', fontSize: '12px' }}>
                    {dbPrices.length > 0
                      ? <span style={{ color: '#2E7D32' }}>✅ {dbPrices.length} prices loaded · {dbPrices.filter(p => Array.isArray(p.method_tags) && p.method_tags.length > 0).length} items tagged</span>
                      : <span style={{ color: '#E65100' }}>⚠️ No prices loaded — will use default fallback prices</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '14px 24px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>← Edit Inputs</button>
              <button onClick={calculate} disabled={calculating} style={{ flex: 1, padding: '14px', background: calculating ? '#90CAF9' : 'linear-gradient(135deg, #1565C0, #0288D1)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
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
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Recommended Method</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: methodColor, marginBottom: '8px' }}>{results.method}</div>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', maxWidth: '600px' }}>{results.methodReason}</div>
                  {results.alternativeMethod && <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>Alternative: {results.alternativeMethod}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <button onClick={() => { setStep(1); setOverrideMethod(true) }} style={{ padding: '8px 16px', background: 'white', color: methodColor, border: `1.5px solid ${methodColor}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🔧 Change</button>
                  <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: methodColor, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{saving ? '⏳' : '💾 Save'}</button>
                </div>
              </div>
            </div>

            {/* ── DIAGRAMS SIDE BY SIDE ── */}
            <div style={{ ...sectionStyle }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>
                📐 System Diagrams
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Plan View */}
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px' }}>
                  <PlanView results={results} inputs={inputs}/>
                </div>
                {/* Cross Section with wells */}
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px' }}>
                  <ResultsCrossSection results={results} inputs={inputs}/>
                </div>
              </div>

              {/* System summary below diagrams */}
              <div style={{ marginTop: '16px', background: `${methodColor}11`, borderRadius: '8px', padding: '14px', border: `1px solid ${methodColor}33` }}>
                <div style={{ fontWeight: '600', color: methodColor, marginBottom: '8px', fontSize: '13px' }}>System Design Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '13px', color: '#555' }}>
                  {results.method === 'Wellpoint System' && (
                    <>
                      <span>📍 Wellpoints: <strong>{results.wellpointCount} nos</strong></span>
                      <span>📊 Stages: <strong>{results.wellpointStages}</strong></span>
                      <span>📏 Header pipe: <strong>{results.headerPipeLength.toFixed(0)}m</strong></span>
                      <span>📐 Spacing: <strong>~1.2m c/c</strong></span>
                    </>
                  )}
                  {(results.method === 'Deep Wells' || results.method === 'Eductor Wells') && (
                    <>
                      <span>🕳️ Wells: <strong>{results.wellCount} nos</strong></span>
                      <span>📏 Spacing: <strong>{results.wellSpacing.toFixed(1)}m</strong></span>
                      <span>📐 Depth: <strong>{results.wellDepth.toFixed(1)}m</strong></span>
                      <span>💧 Design flow: <strong>{results.designFlow.toFixed(1)} m³/hr</strong></span>
                    </>
                  )}
                  {(results.method === 'Sump Pumping' || results.method === 'Open Cut Dewatering') && (
                    <>
                      <span>💧 Design flow: <strong>{results.designFlow.toFixed(1)} m³/hr</strong></span>
                      <span>📐 Drawdown: <strong>{results.drawdown.toFixed(1)}m</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hydraulic Results */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 16px 0' }}>🔢 Hydraulic Calculations</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'Drawdown', value: `${results.drawdown.toFixed(2)} m` },
                  { label: 'Radius of Influence', value: `${results.radiusOfInfluence.toFixed(1)} m` },
                  { label: 'Equiv. Radius', value: `${results.equivalentRadius.toFixed(1)} m` },
                  { label: 'Total Inflow Q', value: `${results.totalInflow.toFixed(1)} m³/hr` },
                  { label: 'Design Flow', value: `${results.designFlow.toFixed(1)} m³/hr` },
                  { label: 'TDH', value: `${results.pumpTDH.toFixed(1)} m` },
                  { label: 'Required Power', value: `${results.pumpPower.toFixed(1)} kW` },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: methodColor }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment & Cost */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: 0 }}>📦 Equipment Schedule & Cost Estimate</h2>
                <div style={{ fontSize: '12px', color: '#999' }}>{inputs.markup}% markup · {inputs.projectDuration} weeks</div>
              </div>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Description', 'Unit', 'Qty', 'Duration', 'Unit Price', 'Cost Price', 'Markup', 'Selling Price'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: '700', color: '#555', borderBottom: '2px solid #e0e0e0', fontSize: '11px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.equipment.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', color: '#0d2137', fontWeight: '500' }}>{item.description}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{item.unit}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{['month', 'week', 'day'].includes(item.unit) ? `${item.duration} ${item.unit}s` : '-'}</td>
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
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d2137' }}>₱{results.totalCostPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Before markup</div>
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Gross Margin ({inputs.markup}%)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E65100' }}>₱{(results.totalSellingPrice - results.totalCostPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Your profit</div>
                </div>
                <div style={{ background: `${methodColor}11`, border: `2px solid ${methodColor}`, borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: methodColor, fontWeight: '700', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Total Selling Price</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: methodColor }}>₱{results.totalSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '12px', color: methodColor, opacity: 0.7, marginTop: '2px' }}>Client price incl. markup</div>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div style={sectionStyle}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0d2137', margin: '0 0 12px 0' }}>⚠️ Assumptions & Notes</h2>
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
              <button onClick={() => { setStep(1); setResults(null) }} style={{ padding: '12px 20px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>← New Estimate</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '12px 20px', background: methodColor, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{saving ? '⏳ Saving...' : '💾 Save Estimate'}</button>
              <button onClick={() => window.print()} style={{ padding: '12px 20px', background: 'white', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>🖨️ Print</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

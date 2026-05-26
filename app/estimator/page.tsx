'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── TYPES ──
interface SiteInputs {
  excavationLength: string; excavationWidth: string; excavationDepth: string
  groundwaterDepth: string; requiredDrawdown: string; soilType: string
  permeabilityK: string; useCustomK: boolean; aquiferType: string
  aquiferThickness: string; projectDuration: string; riskLevel: string
  projectName: string; location: string; preparedBy: string
  dieselLitersPerHrPerPump: string; operatingHrsPerDay: string; dieselPricePerLiter: string
}

interface CategoryMarkups {
  mobilization: number; drilling: number; installation: number
  rental: number; diesel: number; om: number; demobilization: number
}

interface EquipmentItem {
  id: string; section: string; sectionId: string
  description: string; unit: string; quantity: number
  duration: number; unitCost: number; totalCost: number
  markupPct: number; sellingPrice: number; margin: number
}

interface CalcResults {
  method: string; methodReason: string; alternativeMethod: string
  radiusOfInfluence: number; equivalentRadius: number; totalInflow: number
  designFlow: number; drawdown: number
  wellpointCount: number; wellpointStages: number; headerPipeLength: number
  wellCount: number; wellSpacing: number; wellDepth: number
  pumpFlowRate: number; pumpTDH: number; pumpPower: number
  dieselLiters: number; dieselCost: number
  equipment: EquipmentItem[]
  totalCostPrice: number; totalSellingPrice: number; grossMargin: number
}

const SOIL_K: Record<string, number> = {
  'Gravel': 1e-2, 'Coarse sand': 1e-3, 'Medium sand': 1e-4,
  'Fine sand': 1e-5, 'Silty sand': 1e-6, 'Silt': 1e-7, 'Clay': 1e-8,
}

const METHOD_COLORS: Record<string, string> = {
  'Wellpoint System': '#1565C0', 'Deep Wells': '#2E7D32',
  'Eductor Wells': '#E65100', 'Sump Pumping': '#6A1B9A',
  'Open Cut Dewatering': '#00695C',
}

const CURRENCIES = [
  { code: 'PHP', symbol: '₱', flag: '🇵🇭', rate: 1 },
  { code: 'SAR', symbol: '﷼', flag: '🇸🇦', rate: 0.066 },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', rate: 0.067 },
  { code: 'USD', symbol: '$', flag: '🇺🇸', rate: 0.018 },
]

const SECTION_LABELS: Record<string, string> = {
  'A': 'A. Mobilization',
  '2': '2. Drilling & Installation',
  '3': '3. Installation & Commissioning',
  '4': '4. Rental of System',
  '5': '5. Diesel Fuel',
  '6': '6. O&M — Pumping System',
  '7': '7. Demobilization',
}

const SECTION_COLORS: Record<string, string> = {
  'A': '#1976D2', '2': '#2E7D32', '3': '#1565C0',
  '4': '#6A1B9A', '5': '#E65100', '6': '#00695C', '7': '#455A64',
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
  const drawW = svgW - lm - rm, drawH = svgH - tm - bm
  const totalDepth = Math.max(D + 4, 10), scale = drawH / totalDepth
  const gx = lm, gy = tm
  const gwtY = gy + Math.min(GWT, D - 0.5) * scale
  const formY = gy + D * scale
  const drawdownY = formY + DD * scale
  const aquiferY = gy + (D + 3) * scale
  const excW = drawW * 0.55, excX = gx + (drawW - excW) / 2
  const soilColor = ({ 'Gravel': '#C8B88A', 'Coarse sand': '#D4B483', 'Medium sand': '#C9A96E', 'Fine sand': '#BFA05E', 'Silty sand': '#A89070', 'Silt': '#9E8B7A', 'Clay': '#8B7A6A' } as Record<string,string>)[soil] || '#C9A96E'
  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      <defs>
        <pattern id="cs-soil" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={soilColor} opacity="0.5"/>
          <circle cx="7" cy="7" r="1" fill={soilColor} opacity="0.4"/>
        </pattern>
        <marker id="cs-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>
      <rect x={gx} y={gy} width={drawW} height={gwtY-gy} fill={soilColor} opacity="0.4"/>
      <rect x={gx} y={gy} width={drawW} height={gwtY-gy} fill="url(#cs-soil)"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY-gwtY} fill="#4A90D9" opacity="0.12"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY-gwtY} fill={soilColor} opacity="0.35"/>
      <rect x={gx} y={gwtY} width={drawW} height={formY-gwtY} fill="url(#cs-soil)"/>
      <rect x={gx} y={formY} width={drawW} height={aquiferY-formY} fill="#4A90D9" opacity="0.2"/>
      <rect x={gx} y={aquiferY} width={drawW} height={gy+drawH-aquiferY} fill={soilColor} opacity="0.5"/>
      <rect x={excX} y={gy} width={excW} height={formY-gy} fill="white" opacity="0.96"/>
      <line x1={excX} y1={gy} x2={excX} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>
      <line x1={excX+excW} y1={gy} x2={excX+excW} y2={formY} stroke="#555" strokeWidth="2" strokeDasharray="6 3" opacity="0.6"/>
      <line x1={gx} y1={gy} x2={gx+drawW} y2={gy} stroke="#333" strokeWidth="2" opacity="0.8"/>
      <rect x={gx} y={gy-7} width={drawW} height={7} fill="#5D8A3C" opacity="0.65" rx="2"/>
      <line x1={gx} y1={formY} x2={gx+drawW} y2={formY} stroke="#8B6914" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.7"/>
      <line x1={gx} y1={gwtY} x2={gx+drawW} y2={gwtY} stroke="#1565C0" strokeWidth="1.5" strokeDasharray="10 5" opacity="0.9"/>
      {drawdownY < aquiferY && <line x1={gx} y1={drawdownY} x2={gx+drawW} y2={drawdownY} stroke="#00897B" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.8"/>}
      {[0.15,0.35,0.65,0.85].map((frac,i)=>{
        const wx=gx+frac*drawW, wy=gwtY+(formY-gwtY)*0.5
        if(wx>excX-6&&wx<excX+excW+6) return null
        return <ellipse key={i} cx={wx} cy={wy} rx="3.5" ry="4.5" fill="#4A90D9" opacity="0.35"/>
      })}
      <line x1={excX} y1={tm-8} x2={excX+excW} y2={tm-8} stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={excX+excW/2} y={tm-13} textAnchor="middle" fontSize="10" fill="#555" fontFamily="Arial">W: {W}m</text>
      <line x1={excX+excW+8} y1={gy} x2={excX+excW+8} y2={formY} stroke="#666" strokeWidth="1" markerStart="url(#cs-arr)" markerEnd="url(#cs-arr)"/>
      <text x={excX+excW+14} y={gy+(formY-gy)/2} fontSize="10" fill="#555" fontFamily="Arial" dominantBaseline="central">D: {D}m</text>
      {[{y:gy,label:'GL',color:'#333'},{y:gwtY,label:`GWT`,color:'#1565C0'},{y:formY,label:'FGL',color:'#8B6914'},...(drawdownY<aquiferY?[{y:drawdownY,label:'DWL',color:'#00897B'}]:[])].map((item,i)=>(
        <g key={i}>
          <line x1={gx-4} y1={item.y} x2={gx} y2={item.y} stroke={item.color} strokeWidth="0.5"/>
          <text x={gx-6} y={item.y+1} textAnchor="end" fontSize="9.5" fill={item.color} fontFamily="Arial" dominantBaseline="central">{item.label}</text>
        </g>
      ))}
      <text x={gx+drawW/2} y={gy+(gwtY-gy)/2} textAnchor="middle" fontSize="9" fill="#666" fontFamily="Arial" dominantBaseline="central">{soil}</text>
      <text x={gx+drawW/2} y={gwtY+(formY-gwtY)/2} textAnchor="middle" fontSize="9" fill="#1565C0" fontFamily="Arial" dominantBaseline="central" opacity="0.7">Saturated</text>
      <text x={excX+excW/2} y={gy+(formY-gy)/2} textAnchor="middle" fontSize="10" fill="#999" fontFamily="Arial" dominantBaseline="central">Excavation</text>
      <text x={svgW/2} y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#333" fontFamily="Arial">Cross Section</text>
    </svg>
  )
}

// ── PLAN VIEW SVG ──
function PlanView({ results, inputs }: { results: CalcResults, inputs: SiteInputs }) {
  const L = parseFloat(inputs.excavationLength) || 30
  const W = parseFloat(inputs.excavationWidth) || 20
  const method = results.method
  const color = METHOD_COLORS[method] || '#1565C0'
  const svgW = 340, svgH = 320
  const cx = svgW/2, cy = svgH/2
  const scale = Math.min((svgW-120)/(L+8),(svgH-120)/(W+8))
  const excW = L*scale, excH = W*scale
  const ex = cx-excW/2, ey = cy-excH/2
  const wells: {x:number,y:number}[] = []
  if (method==='Wellpoint System') {
    const nL=Math.max(2,Math.ceil(L/1.2)), nW=Math.max(2,Math.ceil(W/1.2))
    for(let i=0;i<=nL;i++){const px=ex+(i/nL)*excW;wells.push({x:px,y:ey-10});wells.push({x:px,y:ey+excH+10})}
    for(let i=1;i<nW;i++){const py=ey+(i/nW)*excH;wells.push({x:ex-10,y:py});wells.push({x:ex+excW+10,y:py})}
  } else if(method==='Deep Wells'||method==='Eductor Wells') {
    const n=results.wellCount||6, perimeter=2*(L+W)
    for(let i=0;i<n;i++){
      const target=(i/n)*perimeter; let px:number,py:number
      if(target<L){px=ex+(target/L)*excW;py=ey-14}
      else if(target<L+W){px=ex+excW+14;py=ey+((target-L)/W)*excH}
      else if(target<2*L+W){px=ex+excW-((target-L-W)/L)*excW;py=ey+excH+14}
      else{px=ex-14;py=ey+excH-((target-2*L-W)/W)*excH}
      wells.push({x:px,y:py})
    }
  } else if(method==='Sump Pumping') {
    [{x:ex+12,y:ey+12},{x:ex+excW-12,y:ey+12},{x:ex+excW-12,y:ey+excH-12},{x:ex+12,y:ey+excH-12}].forEach(c=>wells.push(c))
  }
  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{display:'block'}}>
      <defs>
        <marker id="pv-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5"/>
        </marker>
      </defs>
      {method==='Wellpoint System'&&<rect x={ex-10} y={ey-10} width={excW+20} height={excH+20} fill="none" stroke={color} strokeWidth="2" opacity="0.4" rx="2"/>}
      <rect x={ex} y={ey} width={excW} height={excH} fill="#f0f4f8" stroke="#333" strokeWidth="2" rx="3" opacity="0.9"/>
      <text x={cx} y={cy-8} textAnchor="middle" fontSize="11" fill="#555" fontFamily="Arial">{L}m × {W}m</text>
      <text x={cx} y={cy+8} textAnchor="middle" fontSize="10" fill="#999" fontFamily="Arial">Excavation</text>
      {results.radiusOfInfluence>0&&results.radiusOfInfluence<200&&(
        <ellipse cx={cx} cy={cy} rx={Math.min(results.radiusOfInfluence*scale*0.5,svgW*0.45)} ry={Math.min(results.radiusOfInfluence*scale*0.5,svgH*0.45)} fill="none" stroke={color} strokeWidth="1" strokeDasharray="6 4" opacity="0.25"/>
      )}
      {wells.slice(0,80).map((w,i)=>(
        <g key={i}>
          {method==='Wellpoint System'?<circle cx={w.x} cy={w.y} r="3.5" fill={color} opacity="0.8"/>
           :method==='Sump Pumping'?<rect x={w.x-6} y={w.y-6} width="12" height="12" fill={color} opacity="0.7" rx="2"/>
           :<g><circle cx={w.x} cy={w.y} r="7" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9"/><circle cx={w.x} cy={w.y} r="3" fill={color} opacity="0.7"/></g>}
        </g>
      ))}
      <line x1={ex} y1={ey-22} x2={ex+excW} y2={ey-22} stroke="#666" strokeWidth="1" markerStart="url(#pv-arr)" markerEnd="url(#pv-arr)"/>
      <text x={cx} y={ey-27} textAnchor="middle" fontSize="10" fill="#555" fontFamily="Arial">Length: {L}m</text>
      <text x={svgW/2} y="14" textAnchor="middle" fontSize="11" fontWeight="600" fill="#333" fontFamily="Arial">Plan View — Well Layout</text>
    </svg>
  )
}

export default function EstimatorPage() {
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<SiteInputs>({
    excavationLength:'',excavationWidth:'',excavationDepth:'',
    groundwaterDepth:'',requiredDrawdown:'',soilType:'Medium sand',
    permeabilityK:'',useCustomK:false,aquiferType:'Unconfined',
    aquiferThickness:'',projectDuration:'',riskLevel:'Medium',
    projectName:'',location:'',preparedBy:'',
    dieselLitersPerHrPerPump:'2.5',operatingHrsPerDay:'8',dieselPricePerLiter:'68',
  })
  const [markups, setMarkups] = useState<CategoryMarkups>({
    mobilization:40,drilling:45,installation:40,rental:100,diesel:15,om:20,demobilization:40,
  })
  const [results, setResults] = useState<CalcResults|null>(null)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [overrideMethod, setOverrideMethod] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [dbPrices, setDbPrices] = useState<any[]>([])
  const [savedEstimates, setSavedEstimates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [userId, setUserId] = useState('')
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [generatingBoq, setGeneratingBoq] = useState(false)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data})=>{
      if(!data.session){window.location.href='/login';return}
      setUserId(data.session.user.id)
      const {data:prices}=await supabase.from('items').select('id,description,unit,base_price,category_id,method_tags').order('id')
      setDbPrices(prices||[])
      const {data:estimates}=await supabase.from('estimates').select('*').eq('user_id',data.session.user.id).order('created_at',{ascending:false}).limit(10)
      setSavedEstimates(estimates||[])
    })
  },[])

  const inp=(key:keyof SiteInputs)=>({
    value:inputs[key] as string,
    onChange:(e:any)=>setInputs({...inputs,[key]:e.target.value})
  })
  const getK=()=>inputs.useCustomK&&inputs.permeabilityK?parseFloat(inputs.permeabilityK):SOIL_K[inputs.soilType]||1e-4

  const findPrice=(keyword:string,methodTag?:string)=>{
    if(methodTag){
      const t=dbPrices.find(p=>Array.isArray(p.method_tags)&&p.method_tags.includes(methodTag)&&p.description.toLowerCase().includes(keyword.toLowerCase()))
      if(t) return t.base_price||0
    }
    const item=dbPrices.find(p=>p.description.toLowerCase().includes(keyword.toLowerCase()))
    return item?.base_price||0
  }

  const selectMethod=(drawdown:number,k:number,L:number,W:number)=>{
    const perimeter=2*(L+W)
    if(k<=1e-7) return{method:'Eductor Wells',reason:'Low permeability (k ≤ 1×10⁻⁷ m/s) — vacuum-assisted dewatering required.',alt:'Deep Wells'}
    if(drawdown<=1.5&&k>=1e-4) return{method:'Sump Pumping',reason:'Minor drawdown (≤1.5m) with permeable soil — sump pumping is most economical.',alt:'Wellpoint System'}
    if(drawdown<=5&&k>=1e-5&&perimeter<=300) return{method:'Wellpoint System',reason:`Drawdown of ${drawdown.toFixed(1)}m within wellpoint range. Soil and excavation size suitable.`,alt:'Deep Wells'}
    if(drawdown>5||k>=1e-3) return{method:'Deep Wells',reason:`Drawdown of ${drawdown.toFixed(1)}m exceeds wellpoint capability or high permeability requires large capacity wells.`,alt:'Wellpoint System'}
    return{method:'Open Cut Dewatering',reason:'Shallow temporary excavation with low inflow. Open cut with sump is practical.',alt:'Sump Pumping'}
  }

  const calculate=()=>{
    setCalculating(true)
    const L=parseFloat(inputs.excavationLength)||0
    const W=parseFloat(inputs.excavationWidth)||0
    const D=parseFloat(inputs.excavationDepth)||0
    const GWT=parseFloat(inputs.groundwaterDepth)||0
    const duration=parseFloat(inputs.projectDuration)||1
    const k=getK()
    const H=parseFloat(inputs.aquiferThickness)||(D-GWT+5)
    const drawdown=D-GWT+parseFloat(inputs.requiredDrawdown||'0.5')
    const safetyFactor=inputs.riskLevel==='High'?2.0:inputs.riskLevel==='Medium'?1.5:1.25
    const R=3000*drawdown*Math.sqrt(k)
    const re=Math.sqrt((L*W)/Math.PI)
    const hw=0.5
    const lnRre=Math.log(R/Math.max(re,0.1))
    const Q_ms=(Math.PI*k*(H*H-hw*hw))/lnRre
    const Q_m3hr=Q_ms*3600
    const Q_design=Q_m3hr*safetyFactor
    const TDH=drawdown+5
    const pumpPower=(Q_design/3600*1000*9.81*TDH)/(0.65*0.90)/1000
    const methodResult=overrideMethod&&selectedMethod?{method:selectedMethod,reason:'Method manually selected by engineer.',alt:''}:selectMethod(drawdown,k,L,W)
    const method=methodResult.method
    const perimeter=2*(L+W)
    const durationMonths=Math.max(1,Math.ceil(duration/4))
    const projectDays=duration*7
    const mu=markups

    let equipment:EquipmentItem[]=[]
    let wellpointCount=0,wellpointStages=0,headerPipeLength=0
    let wellCount=0,wellSpacing=0,wellDepth=0

    const addItem=(
      sectionId:string,description:string,unit:string,
      qty:number,dur:number,unitCost:number,markupPct:number
    )=>{
      const isTime=['month','week','day'].includes(unit)
      const totalCost=unitCost*qty*(isTime?dur:1)
      const sellingPrice=totalCost*(1+markupPct/100)
      const margin=sellingPrice>0?(sellingPrice-totalCost)/sellingPrice:0
      equipment.push({
        id:`${sectionId}-${equipment.length}`,section:SECTION_LABELS[sectionId]||sectionId,
        sectionId,description,unit,quantity:qty,duration:dur,unitCost,
        totalCost,markupPct,sellingPrice,margin
      })
    }

    // SECTION A — Mobilization
    addItem('A','Truck delivery — pumps & accessories','trip',2,1,findPrice('Mobilization per trip','general')||8500,mu.mobilization)
    addItem('A','Truck delivery — HDPE pipes & casings','trip',2,1,findPrice('Delivery HDPE','general')||8500,mu.mobilization)

    // SECTION 2 — Drilling & Installation
    if(method==='Wellpoint System'){
      wellpointCount=Math.ceil(perimeter/1.2)
      wellpointStages=Math.max(1,Math.ceil(drawdown/4.5))
      headerPipeLength=perimeter
      addItem('2','Jetting crew + pump (wellpoint installation)','day',Math.ceil(wellpointCount/40),1,findPrice('Jetting crew','wellpoint')||4000,mu.drilling)
      addItem('2','Wellpoint riser 50mm with 1m perforated screen','unit',wellpointCount,1,findPrice('Wellpoint tip','wellpoint')||680,mu.drilling)
      addItem('2','Filter aggregate / silica sand','tons',wellpointCount*0.1,1,findPrice('Filter aggregate','wellpoint')||1800,mu.drilling)
    } else if(method==='Deep Wells'||method==='Eductor Wells') {
      wellCount=Math.max(2,Math.ceil(Q_design/15))
      wellSpacing=perimeter/wellCount
      wellDepth=D+drawdown+3
      addItem('2','Drilling costs — piling rig','well-m',wellCount*wellDepth,1,findPrice('Drilling costs','deepwell')||300,mu.drilling)
      addItem('2','PVC well screens 200mm corrugated','m',wellCount*wellDepth*0.7,1,findPrice('PVC Wellscreen','deepwell')||102,mu.drilling)
      addItem('2','PVC plain casings 200mm','m',wellCount*wellDepth*0.3,1,findPrice('PVC Plain Casing','deepwell')||95,mu.drilling)
      addItem('2','Gravel filter pack washed (4-10mm)','tons',wellCount*2,1,findPrice('Gravel filter','deepwell')||1800,mu.drilling)
      addItem('2','Well development — compressor rental','eqpt-month',1,durationMonths*0.2,findPrice('Compressor','general')||4500,mu.drilling)
    } else {
      addItem('2','Excavation sump (machine)','m³',4,1,findPrice('Excavation sump','sump')||450,mu.drilling)
    }

    // SECTION 3 — Installation & Commissioning
    addItem('3','Site engineer','month',1,durationMonths,findPrice('Site Engineer','general')||19938,mu.installation)
    addItem('3','Foreman','month',1,durationMonths,findPrice('Foreman','general')||13011,mu.installation)
    addItem('3','Electrician','month',1,durationMonths,findPrice('Electrician','general')||13764,mu.installation)
    addItem('3','General laborers','month',4,durationMonths,findPrice('Laborer','general')||5208,mu.installation)
    if(method==='Wellpoint System'){
      addItem('3','Header pipe 150mm PVC/HDPE (perimeter)','m',headerPipeLength,1,findPrice('Header pipe 150','wellpoint')||890,mu.installation)
      addItem('3','Swing connectors, valves, consumables','unit',wellpointCount,1,findPrice('Swing connector','wellpoint')||320,mu.installation)
      addItem('3','Layflat discharge hoses 150mm','m',Math.ceil(Math.max(parseFloat(inputs.excavationLength)||30,parseFloat(inputs.excavationWidth)||20)+20),1,findPrice('Layflat hose','wellpoint')||185,mu.installation)
    } else if(method==='Deep Wells'||method==='Eductor Wells') {
      addItem('3','HDPE rising main 4" per pump','m',wellCount*wellDepth,1,findPrice('HDPE pipe 4','deepwell')||620,mu.installation)
      addItem('3','Well head assembly — valve, NRV, nipples','set',wellCount,1,findPrice('Well head','deepwell')||2860,mu.installation)
      addItem('3','Power cable 4mm² armoured','m',wellCount*wellDepth,1,findPrice('Power cable','deepwell')||95,mu.installation)
    } else {
      addItem('3','Flexible discharge hose 3"','m',Math.ceil(Math.max(parseFloat(inputs.excavationLength)||30,parseFloat(inputs.excavationWidth)||20)+20),1,findPrice('Flexible discharge','sump')||185,mu.installation)
    }

    // SECTION 4 — Rental
    let numDutyPumps=1
    if(method==='Wellpoint System'){
      addItem('4','Wellpoint pump 6" diesel (duty)','month',1,durationMonths,findPrice('Wellpoint pump diesel 6','wellpoint')||85000,mu.rental)
      addItem('4','Wellpoint pump 6" diesel (standby)','month',1,durationMonths,findPrice('Wellpoint pump diesel 6','wellpoint')||85000,mu.rental)
      numDutyPumps=1
      addItem('4','Generator 30 kVA diesel','month',1,durationMonths,findPrice('Generator 30','general')||45000,mu.rental)
      addItem('4','Control cabin (Mini-MAC)','month',1,durationMonths,findPrice('Control cabin','general')||8333,mu.rental)
      addItem('4','Discharge tank 5,000L','month',1,durationMonths,findPrice('Discharge tank','general')||8000,mu.rental)
      addItem('4','Electromagnetic flowmeter','month',1,durationMonths,findPrice('Flowmeter','general')||4500,mu.rental)
    } else if(method==='Deep Wells'||method==='Eductor Wells') {
      numDutyPumps=wellCount
      addItem('4',`Deep well pump 4" (5.5 kW) — duty (${wellCount} nos)`,'month',wellCount,durationMonths,findPrice('Deep well pump','deepwell')||38000,mu.rental)
      addItem('4','Deep well pump 4" (5.5 kW) — standby','month',1,durationMonths,findPrice('Deep well pump','deepwell')||38000,mu.rental)
      addItem('4','Generator 30 kVA diesel','month',Math.ceil(wellCount/5),durationMonths,findPrice('Generator 30','general')||45000,mu.rental)
      addItem('4','Control panel (DOL starter) per pump','unit',wellCount,1,findPrice('Control panel','deepwell')||12500,mu.rental)
      addItem('4','Discharge tank 5,000L','month',1,durationMonths,findPrice('Discharge tank','general')||8000,mu.rental)
      addItem('4','Electromagnetic flowmeter','month',1,durationMonths,findPrice('Flowmeter','general')||4500,mu.rental)
    } else if(method==='Sump Pumping') {
      const sumpCount=Math.max(1,Math.ceil((parseFloat(inputs.excavationLength)||30)*(parseFloat(inputs.excavationWidth)||20)/500))
      numDutyPumps=sumpCount
      addItem('4','Submersible pump 2" (0.75 kW) — duty','month',sumpCount,durationMonths,findPrice('Submersible pump 2','sump')||8500,mu.rental)
      addItem('4','Submersible pump 2" (0.75 kW) — standby','month',1,durationMonths,findPrice('Submersible pump 2','sump')||8500,mu.rental)
    } else {
      numDutyPumps=2
      addItem('4','Submersible pump 3" (1.5 kW) — duty','month',2,durationMonths,findPrice('Submersible pump 3','sump')||14500,mu.rental)
      addItem('4','Submersible pump 3" (1.5 kW) — standby','month',1,durationMonths,findPrice('Submersible pump 3','sump')||14500,mu.rental)
    }

    // SECTION 5 — Diesel (formula-based)
    const lphpp=parseFloat(inputs.dieselLitersPerHrPerPump)||2.5
    const hpd=parseFloat(inputs.operatingHrsPerDay)||8
    const dprl=parseFloat(inputs.dieselPricePerLiter)||68
    const dieselLiters=numDutyPumps*lphpp*hpd*projectDays
    const dieselCost=dieselLiters*dprl
    addItem('5',`Diesel fuel (${numDutyPumps} pump${numDutyPumps>1?'s':''} × ${lphpp} L/hr × ${hpd} hrs/day × ${projectDays} days)`,'liters',dieselLiters,1,dprl,mu.diesel)

    // SECTION 6 — O&M
    addItem('6','Pump operator (skilled)','day',1,projectDays,findPrice('Pump operator','general')||1200,mu.om)
    addItem('6','Night technician','day',1,projectDays,findPrice('Technician','general')||800,mu.om)
    addItem('6','General laborer','day',2,projectDays,findPrice('General laborer','general')||600,mu.om)

    // SECTION 7 — Demobilization
    addItem('7','Removal & transport — pumps, generators','trip',2,1,findPrice('Mobilization per trip','general')||8500,mu.demobilization)
    addItem('7','Removal & transport — pipes, hoses, tanks','trip',2,1,findPrice('Mobilization per trip','general')||8500,mu.demobilization)

    const totalCostPrice=equipment.reduce((s,e)=>s+e.totalCost,0)
    const totalSellingPrice=equipment.reduce((s,e)=>s+e.sellingPrice,0)
    const grossMargin=totalSellingPrice>0?(totalSellingPrice-totalCostPrice)/totalSellingPrice:0

    setResults({
      method,methodReason:methodResult.reason,alternativeMethod:methodResult.alt,
      radiusOfInfluence:R,equivalentRadius:re,totalInflow:Q_m3hr,
      designFlow:Q_design,drawdown,wellpointCount,wellpointStages,
      headerPipeLength,wellCount,wellSpacing,wellDepth,
      pumpFlowRate:Q_design,pumpTDH:TDH,pumpPower,
      dieselLiters,dieselCost,equipment,
      totalCostPrice,totalSellingPrice,grossMargin,
    })
    setSelectedMethod(method)
    setStep(3)
    setCalculating(false)
  }

  const handleSave=async()=>{
    if(!results) return
    setSaving(true)
    await supabase.from('estimates').insert([{user_id:userId,project_name:inputs.projectName||'Unnamed',input_data:inputs,result_data:results,markup_data:markups}])
    const{data:estimates}=await supabase.from('estimates').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(10)
    setSavedEstimates(estimates||[])
    setSaving(false)
    setShowSaved(true)
    alert('✅ Estimate saved!')
  }

  // ── BOQ DOWNLOAD (client-side using SheetJS) ──
  const handleDownloadBOQ=async()=>{
    if(!results) return
    setGeneratingBoq(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const sym = currency.symbol
      const fx  = currency.rate

      // Group equipment by section
      const sections: Record<string, EquipmentItem[]> = {}
      results.equipment.forEach(item => {
        if (!sections[item.sectionId]) sections[item.sectionId] = []
        sections[item.sectionId].push(item)
      })

      // ── BOQ Sheet ──
      const boqRows: any[][] = []
      boqRows.push([`BILL OF QUANTITIES — DEWATERING WORKS`])
      boqRows.push([])
      boqRows.push(['Project:', inputs.projectName||'Unnamed','','Location:', inputs.location||'-'])
      boqRows.push(['Method:', results.method,'','Duration:', `${inputs.projectDuration} weeks`])
      boqRows.push(['Currency:', currency.code,'','Prepared by:', inputs.preparedBy||'-'])
      boqRows.push([])
      boqRows.push(['Item','Description','Unit','Qty',`Unit Rate (${sym})`,`Item Rate (${sym})`])

      const sectionOrder = ['A','2','3','4','5','6','7']
      let itemIdx = 1
      let grandTotal = 0

      for (const sid of sectionOrder) {
        const items = sections[sid]
        if (!items || items.length === 0) continue
        boqRows.push([`${sid}.  ${(SECTION_LABELS[sid]||sid).replace(/^\w+\.\s*/,'')}`.toUpperCase()])
        let secTotal = 0
        for (const item of items) {
          const rate = item.sellingPrice / Math.max(item.quantity,1) * fx
          const itemRate = item.sellingPrice * fx
          secTotal += itemRate
          boqRows.push([`${sid}.${itemIdx++}`, item.description, item.unit, item.quantity,
            { v: rate, t: 'n', z: `"${sym}"#,##0.00` },
            { v: itemRate, t: 'n', z: `"${sym}"#,##0.00` }])
        }
        boqRows.push(['','','','',`Subtotal — ${SECTION_LABELS[sid]?.replace(/^\w+\.\s*/,'')||sid}`,
          { v: secTotal, t: 'n', z: `"${sym}"#,##0.00` }])
        boqRows.push([])
        grandTotal += secTotal
        itemIdx = 1
      }
      boqRows.push([])
      boqRows.push([`TOTAL (excl. VAT) [${currency.code}]`,'','','','',{ v: grandTotal, t: 'n', z: `"${sym}"#,##0.00` }])
      boqRows.push([])
      boqRows.push(['NOTES & ASSUMPTIONS'])
      boqRows.push(['1. Prices are exclusive of VAT.'])
      boqRows.push([`2. All rates are in ${currency.code} (${sym}).`])
      boqRows.push(['3. Hydraulic calculations based on Dupuit-Thiem equation.'])
      boqRows.push(['4. Design flow includes safety factor — refer to engineering report.'])
      boqRows.push(['5. For budgeting purposes only. Detailed design required before construction.'])

      const boqWs = XLSX.utils.aoa_to_sheet(boqRows)
      boqWs['!cols'] = [{wch:8},{wch:45},{wch:10},{wch:8},{wch:16},{wch:16}]
      XLSX.utils.book_append_sheet(wb, boqWs, 'BOQ')

      // ── Costing Sheet ──
      const costRows: any[][] = []
      costRows.push(['INTERNAL COSTING SHEET — DEWATERING WORKS'])
      costRows.push([])
      costRows.push(['Project:', inputs.projectName||'Unnamed','Location:', inputs.location||'-'])
      costRows.push(['Method:', results.method,'Currency:', currency.code])
      costRows.push([])
      costRows.push(['Item','Description','Unit','Qty',`Unit Cost (${sym})`,`Total Cost (${sym})`,'Markup%',`Selling Price (${sym})`,'Margin%'])

      let totalCostFx = 0, totalSellFx = 0

      for (const sid of sectionOrder) {
        const items = sections[sid]
        if (!items || items.length === 0) continue
        costRows.push([`${sid}.  ${(SECTION_LABELS[sid]||sid).replace(/^\w+\.\s*/,'')}`.toUpperCase()])
        let secCost = 0, secSell = 0
        let idx2 = 1
        for (const item of items) {
          const costFx = item.totalCost * fx
          const sellFx = item.sellingPrice * fx
          secCost += costFx; secSell += sellFx
          costRows.push([`${sid}.${idx2++}`, item.description, item.unit, item.quantity,
            { v: item.unitCost*fx, t:'n', z:`"${sym}"#,##0.00` },
            { v: costFx, t:'n', z:`"${sym}"#,##0.00` },
            { v: item.markupPct/100, t:'n', z:'0.0%' },
            { v: sellFx, t:'n', z:`"${sym}"#,##0.00` },
            { v: item.margin, t:'n', z:'0.0%' },
          ])
        }
        totalCostFx += secCost; totalSellFx += secSell
        costRows.push(['','','','',`Subtotal`,
          { v:secCost, t:'n', z:`"${sym}"#,##0.00` },'',
          { v:secSell, t:'n', z:`"${sym}"#,##0.00` },
          { v:secSell>0?(secSell-secCost)/secSell:0, t:'n', z:'0.0%' }])
        costRows.push([])
      }
      costRows.push([])
      costRows.push(['TOTAL COST PRICE','','','','',{ v:totalCostFx, t:'n', z:`"${sym}"#,##0.00` },'',{ v:totalSellFx, t:'n', z:`"${sym}"#,##0.00` },{ v:totalSellFx>0?(totalSellFx-totalCostFx)/totalSellFx:0, t:'n', z:'0.0%' }])
      costRows.push(['GROSS PROFIT','','','','',{ v:totalSellFx-totalCostFx, t:'n', z:`"${sym}"#,##0.00` },'','',''])

      const costWs = XLSX.utils.aoa_to_sheet(costRows)
      costWs['!cols'] = [{wch:8},{wch:40},{wch:10},{wch:8},{wch:16},{wch:16},{wch:10},{wch:16},{wch:10}]
      XLSX.utils.book_append_sheet(wb, costWs, 'Costing (Internal)')

      // Download
      const filename = `DewaPrice_BOQ_${(inputs.projectName||'Estimate').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch(err) {
      alert('Error generating BOQ: ' + err)
    }
    setGeneratingBoq(false)
  }

  const fmt=(v:number)=>`${currency.symbol}${(v*currency.rate).toLocaleString(undefined,{maximumFractionDigits:0})}`
  const isStep1Valid=!!(inputs.excavationLength&&inputs.excavationWidth&&inputs.excavationDepth&&inputs.groundwaterDepth&&inputs.projectDuration)
  const showDiagram=!!(parseFloat(inputs.excavationWidth)&&parseFloat(inputs.excavationDepth)&&parseFloat(inputs.groundwaterDepth))
  const methodColor=results?(METHOD_COLORS[results.method]||'#1565C0'):'#1565C0'

  const inputStyle:React.CSSProperties={width:'100%',padding:'10px 14px',border:'1.5px solid #e0e0e0',borderRadius:'8px',fontSize:'14px',color:'#000',backgroundColor:'#fff',boxSizing:'border-box',outline:'none'}
  const labelStyle:React.CSSProperties={display:'block',fontSize:'12px',fontWeight:'600',color:'#444',marginBottom:'5px'}
  const sectionStyle:React.CSSProperties={background:'white',borderRadius:'12px',padding:'24px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',border:'1px solid #e8edf2'}

  // Group equipment by section for display
  const groupedEquipment=results?Object.entries(
    results.equipment.reduce((acc,item)=>{
      if(!acc[item.sectionId]) acc[item.sectionId]=[]
      acc[item.sectionId].push(item)
      return acc
    },{} as Record<string,EquipmentItem[]>)
  ):[]

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:'Arial, sans-serif'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'28px 24px'}}>

        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'28px',flexWrap:'wrap' as const,gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:'600',color:'#0d2137',margin:'0 0 4px 0'}}>🏗️ Dewatering Estimator</h1>
            <p style={{color:'#666',fontSize:'13px',margin:0}}>Input site parameters → method recommendation → BOQ export</p>
          </div>
          {savedEstimates.length>0&&(
            <button onClick={()=>setShowSaved(!showSaved)} style={{padding:'10px 16px',background:showSaved?'#1565C0':'white',color:showSaved?'white':'#1565C0',border:'1.5px solid #1565C0',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
              📂 Saved ({savedEstimates.length})
            </button>
          )}
        </div>

        {/* SAVED ESTIMATES */}
        {showSaved&&savedEstimates.length>0&&(
          <div style={{...sectionStyle,border:'1.5px solid #1565C0',marginBottom:'24px'}}>
            <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>📂 Saved Estimates</h2>
            <div style={{display:'grid',gap:'10px'}}>
              {savedEstimates.map((est:any)=>{
                const result=est.result_data, input=est.input_data
                const color=METHOD_COLORS[result?.method]||'#1565C0'
                return(
                  <div key={est.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'#f8f9fa',borderRadius:'10px',border:'1px solid #e0e0e0',flexWrap:'wrap' as const,gap:'10px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <div style={{width:'40px',height:'40px',background:`${color}15`,border:`2px solid ${color}44`,borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🏗️</div>
                      <div>
                        <div style={{fontSize:'14px',fontWeight:'600',color:'#0d2137'}}>{est.project_name||'Unnamed'}</div>
                        <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>
                          <span style={{background:`${color}15`,color,padding:'1px 6px',borderRadius:'99px',fontWeight:'600',marginRight:'8px'}}>{result?.method}</span>
                          {input?.excavationLength}×{input?.excavationWidth}×{input?.excavationDepth}m
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <div style={{textAlign:'right' as const}}>
                        <div style={{fontSize:'11px',color:'#999'}}>Selling Price</div>
                        <div style={{fontSize:'14px',fontWeight:'700',color}}>{currency.symbol}{((result?.totalSellingPrice||0)*currency.rate).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>{setInputs(input);setResults(result);setSelectedMethod(result?.method);setStep(3);setShowSaved(false)}} style={{padding:'7px 14px',background:color,color:'white',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>📂 Load</button>
                        <button onClick={async()=>{if(!confirm('Delete?'))return;await supabase.from('estimates').delete().eq('id',est.id);setSavedEstimates(savedEstimates.filter((e:any)=>e.id!==est.id))}} style={{padding:'7px 10px',background:'#ffebee',color:'#c62828',border:'none',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP INDICATOR */}
        <div style={{display:'flex',marginBottom:'28px',background:'white',borderRadius:'12px',padding:'4px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',border:'1px solid #e8edf2'}}>
          {[{n:1,label:'1. Site Parameters'},{n:2,label:'2. Review & Calculate'},{n:3,label:'3. Results & BOQ'}].map(s=>(
            <div key={s.n} onClick={()=>(results||s.n<=step)&&setStep(s.n)} style={{flex:1,padding:'12px',textAlign:'center' as const,borderRadius:'8px',background:step===s.n?'#1565C0':'transparent',color:step===s.n?'white':step>s.n?'#1565C0':'#999',cursor:'pointer',fontSize:'13px',fontWeight:step===s.n?'600':'400',transition:'all 0.2s'}}>
              {step>s.n?'✅ ':''}{s.label}
            </div>
          ))}
        </div>

        {/* ════════════════════════ STEP 1 ════════════════════════ */}
        {step===1&&(
          <div style={{display:'grid',gridTemplateColumns:showDiagram?'1fr 340px':'1fr',gap:'20px',alignItems:'start'}}>
            <div>
              {/* Project Info */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>📋 Project Information</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
                  <div><label style={labelStyle}>Project Name</label><input {...inp('projectName')} placeholder="e.g. Seatrium Subic" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Site Location</label><input {...inp('location')} placeholder="e.g. Subic Bay" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Prepared By</label><input {...inp('preparedBy')} placeholder="e.g. C. Martinez" style={inputStyle}/></div>
                </div>
              </div>

              {/* Excavation */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>📐 Excavation Geometry</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
                  <div><label style={labelStyle}>Length (m) *</label><input {...inp('excavationLength')} type="number" placeholder="50" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Width (m) *</label><input {...inp('excavationWidth')} type="number" placeholder="30" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Depth (m) *</label><input {...inp('excavationDepth')} type="number" placeholder="6" style={inputStyle}/></div>
                </div>
              </div>

              {/* Groundwater */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>💧 Groundwater Conditions</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'14px'}}>
                  <div><label style={labelStyle}>GWT Depth (m) *</label><input {...inp('groundwaterDepth')} type="number" placeholder="1.5" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Extra Drawdown (m)</label><input {...inp('requiredDrawdown')} type="number" placeholder="0.5" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Aquifer Type</label><select {...inp('aquiferType')} style={inputStyle}><option>Unconfined</option><option>Confined</option><option>Artesian</option></select></div>
                  <div><label style={labelStyle}>Aquifer Thickness (m)</label><input {...inp('aquiferThickness')} type="number" placeholder="15" style={inputStyle}/></div>
                </div>
              </div>

              {/* Soil */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>🪨 Soil & Permeability</h2>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                  <div>
                    <label style={labelStyle}>Soil Type</label>
                    <select {...inp('soilType')} style={inputStyle}>{Object.keys(SOIL_K).map(s=><option key={s}>{s}</option>)}</select>
                    <div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>k = {SOIL_K[inputs.soilType]?.toExponential(0)} m/s</div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <input type="checkbox" checked={inputs.useCustomK} onChange={(e)=>setInputs({...inputs,useCustomK:e.target.checked})} style={{marginRight:'6px'}}/>
                      Custom k (from soil report)
                    </label>
                    {inputs.useCustomK&&<input {...inp('permeabilityK')} type="number" placeholder="e.g. 0.0001" step="0.000001" style={{...inputStyle,marginTop:'4px'}}/>}
                  </div>
                </div>
                <div style={{marginTop:'14px',background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#555',marginBottom:'6px'}}>📊 Permeability Reference</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'3px',fontSize:'11px'}}>
                    {Object.entries(SOIL_K).map(([soil,k])=>(
                      <div key={soil} style={{display:'flex',justifyContent:'space-between',padding:'2px 6px',borderRadius:'4px',background:inputs.soilType===soil?'#E3F2FD':'transparent',color:inputs.soilType===soil?'#1565C0':'#666',fontWeight:inputs.soilType===soil?'600':'400'}}>
                        <span>{soil}</span><span style={{fontFamily:'monospace'}}>{k.toExponential(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project Parameters */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>⚙️ Project Parameters</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
                  <div><label style={labelStyle}>Duration (weeks) *</label><input {...inp('projectDuration')} type="number" placeholder="8" style={inputStyle}/></div>
                  <div>
                    <label style={labelStyle}>Risk Level</label>
                    <select {...inp('riskLevel')} style={inputStyle}><option>Low</option><option>Medium</option><option>High</option></select>
                    <div style={{fontSize:'11px',color:'#999',marginTop:'4px'}}>SF: {inputs.riskLevel==='High'?'2.0':inputs.riskLevel==='Medium'?'1.5':'1.25'}×</div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-end'}}>
                    <div style={{fontSize:'12px',color:'#666',padding:'10px',background:'#f8f9fa',borderRadius:'8px',width:'100%'}}>
                      Project days: <strong>{Math.round(parseFloat(inputs.projectDuration||'0')*7)}</strong><br/>
                      Months: <strong>{Math.ceil(parseFloat(inputs.projectDuration||'0')/4)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diesel Parameters */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 8px 0'}}>⛽ Diesel Fuel Parameters</h2>
                <p style={{color:'#666',fontSize:'13px',margin:'0 0 14px 0'}}>Used for the Section 5 diesel formula: pumps × L/hr × hrs/day × days × price/L</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
                  <div><label style={labelStyle}>Consumption (L/hr per pump)</label><input {...inp('dieselLitersPerHrPerPump')} type="number" placeholder="2.5" step="0.1" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Operating hours/day</label><input {...inp('operatingHrsPerDay')} type="number" placeholder="8" style={inputStyle}/></div>
                  <div><label style={labelStyle}>Diesel price (₱/L)</label><input {...inp('dieselPricePerLiter')} type="number" placeholder="68" style={inputStyle}/></div>
                </div>
              </div>

              {/* Category Markups */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 8px 0'}}>📊 Category Markups</h2>
                <p style={{color:'#666',fontSize:'13px',margin:'0 0 14px 0'}}>Set markup % per cost section — matches your costing template structure</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'10px'}}>
                  {[
                    {key:'mobilization',label:'A. Mobilization',color:SECTION_COLORS['A']},
                    {key:'drilling',label:'2. Drilling & Install',color:SECTION_COLORS['2']},
                    {key:'installation',label:'3. Installation',color:SECTION_COLORS['3']},
                    {key:'rental',label:'4. Rental',color:SECTION_COLORS['4']},
                    {key:'diesel',label:'5. Diesel Fuel',color:SECTION_COLORS['5']},
                    {key:'om',label:'6. O&M',color:SECTION_COLORS['6']},
                    {key:'demobilization',label:'7. Demobilization',color:SECTION_COLORS['7']},
                  ].map(({key,label,color})=>(
                    <div key={key} style={{background:`${color}11`,border:`1.5px solid ${color}33`,borderRadius:'10px',padding:'12px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color,marginBottom:'6px',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>{label}</div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <input type="number" value={markups[key as keyof CategoryMarkups]}
                          onChange={e=>setMarkups({...markups,[key]:parseFloat(e.target.value)||0})}
                          style={{...inputStyle,padding:'6px 10px',fontSize:'16px',fontWeight:'700',color,textAlign:'right' as const,background:'white'}}/>
                        <span style={{fontSize:'16px',fontWeight:'700',color}}>%</span>
                      </div>
                      <div style={{fontSize:'10px',color:'#999',marginTop:'4px'}}>
                        Margin: {(markups[key as keyof CategoryMarkups]/(100+markups[key as keyof CategoryMarkups])*100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Method Override */}
              <div style={sectionStyle}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 8px 0'}}>🔧 Method Selection</h2>
                <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',cursor:'pointer',marginBottom:'12px'}}>
                  <input type="checkbox" checked={overrideMethod} onChange={e=>setOverrideMethod(e.target.checked)}/>
                  Override — select method manually
                </label>
                {overrideMethod&&(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'8px'}}>
                    {Object.keys(METHOD_COLORS).map(m=>(
                      <div key={m} onClick={()=>setSelectedMethod(m)} style={{padding:'10px',borderRadius:'8px',textAlign:'center' as const,border:`2px solid ${selectedMethod===m?METHOD_COLORS[m]:'#e0e0e0'}`,background:selectedMethod===m?`${METHOD_COLORS[m]}11`:'white',color:selectedMethod===m?METHOD_COLORS[m]:'#555',cursor:'pointer',fontSize:'12px',fontWeight:selectedMethod===m?'600':'400',transition:'all 0.15s'}}>{m}</div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={()=>setStep(2)} disabled={!isStep1Valid} style={{width:'100%',padding:'14px',background:isStep1Valid?'linear-gradient(135deg, #1565C0, #0288D1)':'#ccc',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'600',cursor:isStep1Valid?'pointer':'not-allowed'}}>
                Review Inputs → Next Step
              </button>
            </div>

            {/* RIGHT — Live Cross Section */}
            {showDiagram&&(
              <div style={{position:'sticky' as const,top:'76px'}}>
                <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',border:'1px solid #e8edf2'}}>
                  <div style={{fontSize:'12px',fontWeight:'600',color:'#555',marginBottom:'12px',textAlign:'center' as const,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Live Cross Section</div>
                  <CrossSection inputs={inputs}/>
                  <div style={{marginTop:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    {[
                      {label:'Perimeter',value:`${(2*((parseFloat(inputs.excavationLength)||0)+(parseFloat(inputs.excavationWidth)||0))).toFixed(0)}m`},
                      {label:'Area',value:`${((parseFloat(inputs.excavationLength)||0)*(parseFloat(inputs.excavationWidth)||0)).toFixed(0)}m²`},
                      {label:'Drawdown',value:`~${Math.max(0,(parseFloat(inputs.excavationDepth)||0)-(parseFloat(inputs.groundwaterDepth)||0)+parseFloat(inputs.requiredDrawdown||'0.5')).toFixed(1)}m`},
                      {label:'k',value:`${(inputs.useCustomK&&inputs.permeabilityK?parseFloat(inputs.permeabilityK):SOIL_K[inputs.soilType]||1e-4).toExponential(0)} m/s`},
                    ].map(stat=>(
                      <div key={stat.label} style={{background:'#f8f9fa',borderRadius:'8px',padding:'8px 10px',textAlign:'center' as const}}>
                        <div style={{fontSize:'10px',color:'#999',fontWeight:'600',textTransform:'uppercase' as const,marginBottom:'2px'}}>{stat.label}</div>
                        <div style={{fontSize:'14px',fontWeight:'700',color:'#1565C0'}}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'10px',fontSize:'11px',color:'#bbb',textAlign:'center' as const}}>Updates as you type</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ STEP 2 ════════════════════════ */}
        {step===2&&(
          <div>
            <div style={sectionStyle}>
              <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>📋 Input Summary — Please Review</h2>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',alignItems:'start'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[
                    {label:'Project',value:inputs.projectName||'Unnamed'},
                    {label:'Location',value:inputs.location||'-'},
                    {label:'Excavation',value:`${inputs.excavationLength}×${inputs.excavationWidth}×${inputs.excavationDepth}m`},
                    {label:'GWT Depth',value:`${inputs.groundwaterDepth}m`},
                    {label:'Soil Type',value:inputs.soilType},
                    {label:'k',value:`${(inputs.useCustomK?parseFloat(inputs.permeabilityK):SOIL_K[inputs.soilType]||1e-4).toExponential(0)} m/s`},
                    {label:'Duration',value:`${inputs.projectDuration} weeks`},
                    {label:'Risk Level',value:inputs.riskLevel},
                    {label:'Method',value:overrideMethod&&selectedMethod?`${selectedMethod} (manual)`:'Auto-select'},
                    {label:'Diesel',value:`${inputs.dieselLitersPerHrPerPump} L/hr/pump × ${inputs.operatingHrsPerDay} hrs/day`},
                  ].map(item=>(
                    <div key={item.label} style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 14px'}}>
                      <div style={{fontSize:'10px',color:'#999',fontWeight:'700',textTransform:'uppercase' as const,marginBottom:'3px'}}>{item.label}</div>
                      <div style={{fontSize:'13px',color:'#0d2137',fontWeight:'500'}}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
                    <CrossSection inputs={inputs}/>
                  </div>
                  <div style={{padding:'12px 14px',background:dbPrices.length>0?'#E8F5E9':'#FFF3E0',borderRadius:'8px',fontSize:'12px'}}>
                    {dbPrices.length>0
                      ?<span style={{color:'#2E7D32'}}>✅ {dbPrices.length} prices loaded · {dbPrices.filter(p=>Array.isArray(p.method_tags)&&p.method_tags.length>0).length} tagged</span>
                      :<span style={{color:'#E65100'}}>⚠️ No prices loaded — will use default fallback prices</span>
                    }
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={()=>setStep(1)} style={{padding:'14px 24px',background:'#f0f0f0',color:'#333',border:'none',borderRadius:'10px',fontSize:'14px',cursor:'pointer'}}>← Edit</button>
              <button onClick={calculate} disabled={calculating} style={{flex:1,padding:'14px',background:calculating?'#90CAF9':'linear-gradient(135deg, #1565C0, #0288D1)',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}>
                {calculating?'⏳ Calculating...':'⚡ Run Calculations →'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════ STEP 3 ════════════════════════ */}
        {step===3&&results&&(
          <div>
            {/* Method Banner */}
            <div style={{...sectionStyle,borderTop:`4px solid ${methodColor}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap' as const,gap:'12px'}}>
                <div>
                  <div style={{fontSize:'11px',color:'#999',fontWeight:'700',textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:'6px'}}>Recommended Method</div>
                  <div style={{fontSize:'26px',fontWeight:'bold',color:methodColor,marginBottom:'8px'}}>{results.method}</div>
                  <div style={{fontSize:'13px',color:'#555',lineHeight:'1.6',maxWidth:'600px'}}>{results.methodReason}</div>
                  {results.alternativeMethod&&<div style={{marginTop:'8px',fontSize:'12px',color:'#999'}}>Alternative: {results.alternativeMethod}</div>}
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap' as const,alignItems:'center'}}>
                  {/* Currency Selector */}
                  <div style={{display:'flex',gap:'4px',background:'#f0f4f8',borderRadius:'8px',padding:'4px'}}>
                    {CURRENCIES.map(c=>(
                      <button key={c.code} onClick={()=>setCurrency(c)} style={{padding:'6px 10px',background:currency.code===c.code?'white':'transparent',color:currency.code===c.code?'#0d2137':'#666',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:currency.code===c.code?'700':'400',cursor:'pointer',boxShadow:currency.code===c.code?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
                        {c.flag} {c.code}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>{setStep(1);setOverrideMethod(true)}} style={{padding:'8px 16px',background:'white',color:methodColor,border:`1.5px solid ${methodColor}`,borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>🔧 Change</button>
                  <button onClick={handleSave} disabled={saving} style={{padding:'8px 16px',background:methodColor,color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>{saving?'⏳':'💾 Save'}</button>
                  <button onClick={handleDownloadBOQ} disabled={generatingBoq} style={{padding:'8px 16px',background:'#2E7D32',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                    {generatingBoq?'⏳ Generating...':'📥 Download BOQ'}
                  </button>
                </div>
              </div>
            </div>

            {/* Diagrams */}
            <div style={sectionStyle}>
              <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>📐 System Diagrams</h2>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'12px'}}><PlanView results={results} inputs={inputs}/></div>
                <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'12px'}}><CrossSection inputs={inputs}/></div>
              </div>
            </div>

            {/* Hydraulic Results */}
            <div style={sectionStyle}>
              <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 16px 0'}}>🔢 Hydraulic Calculations</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'10px'}}>
                {[
                  {label:'Drawdown',value:`${results.drawdown.toFixed(2)} m`},
                  {label:'Radius of Influence',value:`${results.radiusOfInfluence.toFixed(1)} m`},
                  {label:'Total Inflow Q',value:`${results.totalInflow.toFixed(1)} m³/hr`},
                  {label:'Design Flow',value:`${results.designFlow.toFixed(1)} m³/hr`},
                  {label:'TDH',value:`${results.pumpTDH.toFixed(1)} m`},
                  {label:'Required Power',value:`${results.pumpPower.toFixed(1)} kW`},
                  {label:'Diesel Total',value:`${results.dieselLiters.toFixed(0)} L`},
                ].map(item=>(
                  <div key={item.label} style={{background:'#f8f9fa',borderRadius:'8px',padding:'12px',textAlign:'center' as const}}>
                    <div style={{fontSize:'10px',color:'#999',fontWeight:'700',textTransform:'uppercase' as const,marginBottom:'4px'}}>{item.label}</div>
                    <div style={{fontSize:'17px',fontWeight:'bold',color:methodColor}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment Schedule — Sectioned */}
            <div style={sectionStyle}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap' as const,gap:'10px'}}>
                <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:0}}>📦 Equipment Schedule & Cost Estimate</h2>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{fontSize:'12px',color:'#999'}}>Currency: {currency.flag} {currency.code}</div>
                  <button onClick={handleDownloadBOQ} disabled={generatingBoq} style={{padding:'8px 16px',background:'#2E7D32',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                    {generatingBoq?'⏳':'📥 Download BOQ'}
                  </button>
                </div>
              </div>

              {/* Section-by-section table */}
              {groupedEquipment.map(([sectionId, items])=>{
                const secColor = SECTION_COLORS[sectionId]||'#555'
                const secLabel = SECTION_LABELS[sectionId]||sectionId
                const secCost = items.reduce((s,i)=>s+i.totalCost,0)
                const secSell = items.reduce((s,i)=>s+i.sellingPrice,0)
                const secMargin = secSell>0?(secSell-secCost)/secSell:0
                return(
                  <div key={sectionId} style={{marginBottom:'20px'}}>
                    {/* Section header */}
                    <div style={{background:secColor,color:'white',padding:'8px 14px',borderRadius:'8px 8px 0 0',fontSize:'12px',fontWeight:'700',textTransform:'uppercase' as const,letterSpacing:'0.5px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>{secLabel}</span>
                      <span style={{fontSize:'11px',opacity:0.85}}>Subtotal: {fmt(secSell)} · Margin: {(secMargin*100).toFixed(1)}%</span>
                    </div>
                    <div style={{overflowX:'auto' as const}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                        <thead>
                          <tr style={{background:'#f8f9fa',borderBottom:'1.5px solid #e0e0e0'}}>
                            {['Description','Unit','Qty','Unit Cost','Total Cost','Markup%','Selling Price','Margin'].map(h=>(
                              <th key={h} style={{padding:'8px 10px',textAlign:'left' as const,fontWeight:'700',color:'#555',fontSize:'10px',textTransform:'uppercase' as const,whiteSpace:'nowrap' as const}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item,i)=>(
                            <tr key={item.id} style={{borderBottom:'1px solid #f0f0f0',background:i%2===0?'white':'#fafafa'}}>
                              <td style={{padding:'8px 10px',color:'#0d2137',fontWeight:'500',maxWidth:'280px'}}>{item.description}</td>
                              <td style={{padding:'8px 10px',color:'#666'}}>{item.unit}</td>
                              <td style={{padding:'8px 10px',color:'#666'}}>{item.quantity.toLocaleString(undefined,{maximumFractionDigits:1})}</td>
                              <td style={{padding:'8px 10px',color:'#555'}}>{fmt(item.unitCost)}</td>
                              <td style={{padding:'8px 10px',color:'#333',fontWeight:'500'}}>{fmt(item.totalCost)}</td>
                              <td style={{padding:'8px 10px',color:secColor,fontWeight:'600'}}>{item.markupPct}%</td>
                              <td style={{padding:'8px 10px',fontWeight:'700',color:secColor}}>{fmt(item.sellingPrice)}</td>
                              <td style={{padding:'8px 10px',color:item.margin>0.25?'#2E7D32':'#E65100',fontWeight:'600'}}>{(item.margin*100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background:`${secColor}11`,borderTop:`2px solid ${secColor}44`}}>
                            <td colSpan={4} style={{padding:'8px 10px',fontWeight:'700',color:secColor,fontSize:'11px',textTransform:'uppercase' as const}}>Subtotal</td>
                            <td style={{padding:'8px 10px',fontWeight:'700',color:secColor}}>{fmt(secCost)}</td>
                            <td/>
                            <td style={{padding:'8px 10px',fontWeight:'700',color:secColor}}>{fmt(secSell)}</td>
                            <td style={{padding:'8px 10px',fontWeight:'700',color:secColor}}>{(secMargin*100).toFixed(1)}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })}

              {/* Grand Totals */}
              <div style={{marginTop:'16px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px'}}>
                <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'16px 20px'}}>
                  <div style={{fontSize:'11px',color:'#999',fontWeight:'700',textTransform:'uppercase' as const,marginBottom:'6px'}}>Total Cost Price</div>
                  <div style={{fontSize:'24px',fontWeight:'bold',color:'#0d2137'}}>{fmt(results.totalCostPrice)}</div>
                  <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>Before markup</div>
                </div>
                <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'16px 20px'}}>
                  <div style={{fontSize:'11px',color:'#999',fontWeight:'700',textTransform:'uppercase' as const,marginBottom:'6px'}}>Gross Profit</div>
                  <div style={{fontSize:'24px',fontWeight:'bold',color:'#E65100'}}>{fmt(results.totalSellingPrice-results.totalCostPrice)}</div>
                  <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>Margin: {(results.grossMargin*100).toFixed(1)}%</div>
                </div>
                <div style={{background:`${methodColor}11`,border:`2px solid ${methodColor}`,borderRadius:'10px',padding:'16px 20px'}}>
                  <div style={{fontSize:'11px',color:methodColor,fontWeight:'700',textTransform:'uppercase' as const,marginBottom:'6px'}}>Total Selling Price ({currency.code})</div>
                  <div style={{fontSize:'28px',fontWeight:'bold',color:methodColor}}>{fmt(results.totalSellingPrice)}</div>
                  <div style={{fontSize:'12px',color:methodColor,opacity:0.7,marginTop:'2px'}}>Client price incl. markup</div>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div style={sectionStyle}>
              <h2 style={{fontSize:'15px',fontWeight:'600',color:'#0d2137',margin:'0 0 12px 0'}}>⚠️ Assumptions & Notes</h2>
              <div style={{fontSize:'13px',color:'#555',lineHeight:'1.9'}}>
                <div>• Hydraulic calculations: Dupuit-Thiem equation for {inputs.aquiferType.toLowerCase()} aquifer</div>
                <div>• Permeability: {inputs.useCustomK?`${inputs.permeabilityK} m/s (soil report)`:`${SOIL_K[inputs.soilType]?.toExponential(0)} m/s (estimated from ${inputs.soilType})`}</div>
                <div>• Radius of influence: Sichardt formula (R = 3000 × s × √k)</div>
                <div>• Design flow includes {inputs.riskLevel==='High'?'2.0×':inputs.riskLevel==='Medium'?'1.5×':'1.25×'} safety factor</div>
                <div>• Diesel formula: {results.equipment.filter(e=>e.sectionId==='5').length>0?results.equipment.find(e=>e.sectionId==='5')?.description:'-'}</div>
                <div>• Equipment prices pulled from DewaPrice database with method tag lookup</div>
                <div>• Currency conversion applied: 1 PHP = {CURRENCIES.find(c=>c.code!=='PHP'&&c.code===currency.code)?.rate||1} {currency.code} (indicative)</div>
                <div>• <strong>For budgeting purposes only</strong> — detailed design required before construction</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap' as const}}>
              <button onClick={()=>{setStep(1);setResults(null)}} style={{padding:'12px 20px',background:'#f0f0f0',color:'#333',border:'none',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>← New Estimate</button>
              <button onClick={handleSave} disabled={saving} style={{padding:'12px 20px',background:methodColor,color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>{saving?'⏳ Saving...':'💾 Save Estimate'}</button>
              <button onClick={handleDownloadBOQ} disabled={generatingBoq} style={{padding:'12px 20px',background:'#2E7D32',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                {generatingBoq?'⏳ Generating...':'📥 Download BOQ (.xlsx)'}
              </button>
              <button onClick={()=>window.print()} style={{padding:'12px 20px',background:'white',color:'#333',border:'1.5px solid #e0e0e0',borderRadius:'8px',fontSize:'13px',cursor:'pointer'}}>🖨️ Print</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

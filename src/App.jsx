import { useState, useEffect, useRef, useMemo } from "react";

const R = 0.0821, NA = 6.022e23, KB = 1.38e-23;

const GAS_PRESETS = [
  { label:"He",  color:"#ef4444", molar:4  },
  { label:"H₂",  color:"#f97316", molar:2  },
  { label:"N₂",  color:"#eab308", molar:28 },
  { label:"O₂",  color:"#22c55e", molar:32 },
  { label:"CH₄", color:"#3b82f6", molar:16 },
  { label:"Ne",  color:"#a855f7", molar:20 },
  { label:"CO₂", color:"#ec4899", molar:44 },
];

const CHAMBER_COLORS = [
  { fill:"#dbeafe", stroke:"#93c5fd", particle:"#1d4ed8" },
  { fill:"#dcfce7", stroke:"#86efac", particle:"#15803d" },
  { fill:"#fef9c3", stroke:"#fde047", particle:"#a16207" },
  { fill:"#fce7f3", stroke:"#f9a8d4", particle:"#be185d" },
];

const TABS = [
  { id:"d1", icon:"🧪", label:"Düzenek 1" },
  { id:"d2", icon:"🔗", label:"Düzenek 2" },
  { id:"d3", icon:"🚧", label:"Düzenek 3" },
  { id:"edu", icon:"🎓", label:"Eğitim" },
];

const idealP = (n,T,V) => V>0&&n>0 ? (n*R*T)/V : 0;
const gasObj = l => GAS_PRESETS.find(g=>g.label===l)||GAS_PRESETS[0];
const tempClr = T => { const t=Math.max(0,Math.min(1,(T-50)/950)); return `hsl(${Math.round(240-t*240)},80%,45%)`; };
const pClr = P => { const t=Math.max(0,Math.min(1,P/5)); return `hsl(${Math.round(120-t*120)},70%,40%)`; };

function equilibrateD1(chambers, totalV) {
  const weights = chambers.map(c => c.mol * c.T);
  const tw = weights.reduce((s,w) => s+w, 0);
  if(tw <= 0) return chambers;
  return chambers.map((c,i) => ({...c, V: Math.max(0.05, (weights[i]/tw)*totalV)}));
}

function calcP(chambers) {
  const eq = equilibrateD1(chambers, chambers.reduce((s,c)=>s+c.V,0));
  if(!eq[0] || eq[0].V <= 0) return 0;
  return (eq[0].mol * R * eq[0].T) / eq[0].V;
}

// ── Slider with number input ──────────────────────
function Slider({ label, value, min, max, step, unit, color, onChange }) {
  const [local, setLocal] = useState(String(value));
  const ref = useRef(false);

  useEffect(() => {
    if (!ref.current) setLocal(String(value));
  }, [value]);

  const acc = color || "#6366f1";

  function commit(raw) {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const c = Math.max(min, Math.min(max, n));
      onChange(c);
      setLocal(String(c));
    } else {
      setLocal(String(value));
    }
  }

  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
        <span style={{fontSize:11,color:"#64748b"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input
            type="number" min={min} max={max} step={step}
            value={local}
            onFocus={() => { ref.current = true; }}
            onChange={e => setLocal(e.target.value)}
            onBlur={e => { ref.current = false; commit(e.target.value); }}
            onKeyDown={e => { if(e.key === "Enter") { ref.current = false; commit(local); e.target.blur(); }}}
            style={{width:65,padding:"3px 6px",borderRadius:6,border:`1px solid ${acc}`,
              background:"#f8fafc",color:acc,fontSize:11,fontWeight:700,textAlign:"right",outline:"none"}}
          />
          <span style={{fontSize:10,color:"#94a3b8",minWidth:24}}>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => { const v=parseFloat(e.target.value); onChange(v); setLocal(String(v)); }}
        style={{width:"100%",accentColor:acc}}
      />
      <div style={{display:"flex",justifyContent:"space-between",marginTop:1}}>
        <span style={{fontSize:9,color:"#cbd5e1"}}>{min}</span>
        <span style={{fontSize:9,color:"#cbd5e1"}}>{max}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{background:"#f8fafc",borderRadius:8,padding:"6px 10px",textAlign:"center",flex:1,border:"1px solid #e2e8f0"}}>
      <div style={{fontSize:9,color:"#94a3b8"}}>{label}</div>
      <div style={{fontSize:14,fontWeight:800,color:color||"#1e293b"}}>{value}</div>
      <div style={{fontSize:9,color:"#cbd5e1"}}>{unit}</div>
    </div>
  );
}

// ── VALVE SVG ──────────────────────────────────────
function ValveSVG({ x, y, open, onClick, label }) {
  const bc = open ? "#15803d" : "#b91c1c";
  const hc = open ? "#22c55e" : "#ef4444";
  return (
    <g onClick={onClick} style={{cursor:"pointer"}}>
      <rect x={x-7} y={y-16} width={14} height={32} rx={3} fill="#94a3b8" stroke="#64748b" strokeWidth={1}/>
      <ellipse cx={x} cy={y} rx={13} ry={13} fill="#d97706" stroke="#92400e" strokeWidth={1.5}/>
      <ellipse cx={x} cy={y} rx={10} ry={10} fill="#f59e0b"/>
      <ellipse cx={x-3} cy={y-3} rx={3} ry={2} fill="white" opacity={0.35}/>
      <circle cx={x} cy={y} r={4} fill={bc}/>
      {open
        ? <rect x={x-10} y={y-3} width={20} height={6} rx={3} fill={hc}/>
        : <rect x={x-3} y={y-10} width={6} height={20} rx={3} fill={hc}/>
      }
      <text x={x} y={y-22} textAnchor="middle" fill={bc} fontSize={10} fontWeight="800">{label}</text>
      <text x={x} y={y+28} textAnchor="middle" fill={bc} fontSize={8} fontWeight="700">
        {open ? "Gaz Girişi" : "Kapalı"}
      </text>
    </g>
  );
}

// ── PISTON SVG ─────────────────────────────────────
function PistonSVG({ cx, y, h }) {
  return (
    <g>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#334155"/>
          <stop offset="40%" stopColor="#94a3b8"/>
          <stop offset="65%" stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#475569"/>
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={y+h/2} rx={13} ry={h/2} fill="url(#pg)" stroke="#334155" strokeWidth={1.5}/>
      <ellipse cx={cx-4} cy={y+h/2} rx={4} ry={h/2-10} fill="white" opacity={0.15}/>
      <text x={cx} y={y-8} textAnchor="middle" fill="#94a3b8" fontSize={8}>İdeal</text>
      <text x={cx} y={y-1} textAnchor="middle" fill="#94a3b8" fontSize={8}>Piston</text>
    </g>
  );
}

// ── DÜZENEK 1 ──────────────────────────────────────
function Duzenek1() {
  const [numChambers, setNumChambers] = useState(3);
  const [totalV, setTotalV] = useState(10);
  const [selected, setSelected] = useState(0);
  const [animTick, setAnimTick] = useState(0);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [molAddL, setMolAddL] = useState(0.1);
  const [molAddR, setMolAddR] = useState(0.1);
  const [showPanel, setShowPanel] = useState("edit");
  const [chambers, setChambers] = useState(() => makeDefault(3, 10));

  function makeDefault(n, tv) {
    const base = [
      {gas:"X",T:300},{gas:"Y",T:300},{gas:"Z",T:300},{gas:"W",T:300}
    ].slice(0,n);
    const vEach = tv/n;
    const chs = base.map(c => ({...c, mol:0.4, V:vEach}));
    return equilibrateD1(chs, tv);
  }

  useEffect(() => {
    setChambers(makeDefault(numChambers, totalV));
    setSelected(0);
  }, [numChambers]);

  useEffect(() => {
    const t = setInterval(() => setAnimTick(x => x+1), 70);
    return () => clearInterval(t);
  }, []);

  const eq = equilibrateD1(chambers, totalV);
  const P = calcP(chambers);
  const totalMol = chambers.reduce((s,c) => s+c.mol, 0);

  function updateChamber(key, val) {
    setChambers(prev => {
      const newChs = prev.map((c,i) => i===selected ? {...c,[key]:Math.max(key==="mol"?0.01:50,val)} : c);
      return equilibrateD1(newChs, totalV);
    });
  }

  function updateTotalV(v) {
    const tv = Math.max(2, Math.min(30, v));
    setTotalV(tv);
    setChambers(prev => equilibrateD1(prev, tv));
  }

  function addMol(side, delta) {
    const n = side === "left" ? 0 : chambers.length-1;
    setChambers(prev => {
      const newChs = prev.map((c,i) => i===n ? {...c, mol:Math.max(0.01, c.mol+delta)} : c);
      return equilibrateD1(newChs, totalV);
    });
  }

  const ch = eq[selected] || eq[0];
  const cc = CHAMBER_COLORS[selected%4];

  // SVG layout
  const SW=960, SH=340, CY=55, CH=210, WALL=90, ATMO=90, ER=28;
  const containerW = SW-WALL-ATMO;
  const weights = eq.map(c => c.mol*c.T);
  const tw = weights.reduce((s,w)=>s+w,0);
  const widths = eq.map((_,i) => tw>0 ? (weights[i]/tw)*containerW : containerW/eq.length);
  let xc = WALL;
  const rects = widths.map(w => { const x=xc; xc+=w; return{x,w,cx:x+w/2}; });
  const pistonXs = []; let acc = WALL;
  for(let i=0;i<eq.length-1;i++){acc+=widths[i];pistonXs.push(acc);}
  const rightEdge = WALL+containerW;

  function getParticles(rect, T, color, idx) {
    const count = Math.max(5,Math.min(22,Math.round(eq[idx].mol*14)));
    return Array.from({length:count},(_,i) => {
      const sp = 0.15+(T/300)*0.38;
      const seed = i*173.1+idx*700+animTick*sp;
      const px = rect.x+22+((Math.sin(seed*0.61+i)*0.5+0.5)*(rect.w-44));
      const py = CY+18+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(CH-36));
      return <circle key={i} cx={px} cy={py} r={5} fill={color} opacity={0.65}/>;
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{background:"white",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:2}}>🧪 Düzenek 1 — Yatay Silindir</div>
        <div style={{fontSize:11,color:"#94a3b8"}}>Toplam hacim sabittir · Tüm bölmelerde basınç eşittir · Pistonlar otomatik denge kurar</div>
      </div>

      {/* Controls */}
      <div style={{background:"white",borderRadius:10,padding:"8px 12px",marginBottom:8,border:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {/* Bölme */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>BÖLME</span>
          {[2,3,4].map(n => (
            <button key={n} onClick={()=>setNumChambers(n)} style={{width:26,height:26,borderRadius:13,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:numChambers===n?"#6366f1":"#f1f5f9",color:numChambers===n?"white":"#94a3b8"}}>{n}</button>
          ))}
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        {/* Total V */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8"}}>Toplam V</span>
          <Slider label="" value={totalV} min={2} max={30} step={0.5} unit="L" color="#0ea5e9" onChange={updateTotalV}/>
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        {/* Badges */}
        <div style={{background:"#f8fafc",borderRadius:8,padding:"4px 10px",border:"1px solid #e2e8f0",display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:9,color:"#94a3b8"}}>P =</span>
          <span style={{fontSize:13,fontWeight:800,color:"#6366f1"}}>{P.toFixed(3)} atm</span>
        </div>
        <div style={{background:"#f8fafc",borderRadius:8,padding:"4px 10px",border:"1px solid #e2e8f0",display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:9,color:"#94a3b8"}}>n =</span>
          <span style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>{totalMol.toFixed(2)} mol</span>
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        {/* M1 */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>M₁</span>
          <button onClick={()=>setLeftOpen(o=>!o)} style={{padding:"3px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:leftOpen?"#dcfce7":"#f1f5f9",color:leftOpen?"#15803d":"#94a3b8",outline:leftOpen?"1.5px solid #22c55e":"none"}}>{leftOpen?"Açık":"Kapalı"}</button>
          {leftOpen && <>
            <button onClick={()=>addMol("left",-molAddL)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:13}}>−</button>
            <Slider label="" value={molAddL} min={0.05} max={1} step={0.05} unit="mol" color="#22c55e" onChange={setMolAddL}/>
            <button onClick={()=>addMol("left",molAddL)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:13}}>+</button>
          </>}
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        {/* M2 */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>M₂</span>
          <button onClick={()=>setRightOpen(o=>!o)} style={{padding:"3px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:rightOpen?"#dcfce7":"#f1f5f9",color:rightOpen?"#15803d":"#94a3b8",outline:rightOpen?"1.5px solid #22c55e":"none"}}>{rightOpen?"Açık":"Kapalı"}</button>
          {rightOpen && <>
            <button onClick={()=>addMol("right",-molAddR)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:13}}>−</button>
            <Slider label="" value={molAddR} min={0.05} max={1} step={0.05} unit="mol" color="#22c55e" onChange={setMolAddR}/>
            <button onClick={()=>addMol("right",molAddR)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:13}}>+</button>
          </>}
        </div>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" style={{display:"block",borderRadius:16,background:"white",border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:8}}>
        <defs>
          <linearGradient id="ts1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.6}/>
            <stop offset="25%" stopColor="white" stopOpacity={0.08}/>
            <stop offset="100%" stopColor="black" stopOpacity={0.06}/>
          </linearGradient>
          <marker id="a1" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5z" fill="#22c55e"/>
          </marker>
          <marker id="a1l" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <path d="M7,0 L7,7 L0,3.5z" fill="#22c55e"/>
          </marker>
        </defs>

        <rect x={WALL-ER+4} y={CY+6} width={containerW+ER*2-8} height={CH-6} rx={6} fill="rgba(0,0,0,0.06)"/>
        <ellipse cx={WALL} cy={CY+CH/2} rx={ER} ry={CH/2} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5}/>

        {eq.map((c,idx) => {
          const r = rects[idx];
          const col = CHAMBER_COLORS[idx%4];
          const isSel = selected===idx;
          return (
            <g key={idx} onClick={()=>setSelected(idx)} style={{cursor:"pointer"}}>
              <rect x={r.x} y={CY} width={r.w} height={CH} fill={col.fill}/>
              {isSel && <rect x={r.x} y={CY} width={r.w} height={CH} fill={col.stroke} opacity={0.1}/>}
              {getParticles(r, c.T, col.particle, idx)}
              <text x={r.cx} y={CY+30} textAnchor="middle" fill={col.particle} fontSize={20} fontWeight="900">{c.gas}</text>
              <text x={r.cx} y={CY+52} textAnchor="middle" fill="#475569" fontSize={12}>{c.mol.toFixed(2)} mol</text>
              <text x={r.cx} y={CY+70} textAnchor="middle" fill="#0ea5e9" fontSize={12}>{c.V.toFixed(2)} L</text>
              <text x={r.cx} y={CY+92} textAnchor="middle" fill="#6366f1" fontSize={16} fontWeight="800">{P.toFixed(3)} atm</text>
              <text x={r.cx} y={CY+110} textAnchor="middle" fill={tempClr(c.T)} fontSize={11}>{c.T} K</text>
              <rect x={r.x+6} y={CY+CH-12} width={r.w-12} height={7} rx={3.5} fill={tempClr(c.T)} opacity={0.55}/>
              {isSel && <rect x={r.x} y={CY} width={r.w} height={CH} fill="none" stroke={col.stroke} strokeWidth={3} strokeDasharray="10,5"/>}
              <text x={r.cx} y={CY+CH+22} textAnchor="middle" fill="#94a3b8" fontSize={10}>V = {c.V.toFixed(2)} L</text>
            </g>
          );
        })}

        <line x1={WALL} y1={CY} x2={rightEdge} y2={CY} stroke="#94a3b8" strokeWidth={2.5}/>
        <line x1={WALL} y1={CY+CH} x2={rightEdge} y2={CY+CH} stroke="#94a3b8" strokeWidth={2.5}/>
        <rect x={WALL} y={CY} width={containerW} height={CH} fill="url(#ts1)"/>

        <ellipse cx={rightEdge} cy={CY+CH/2} rx={ER} ry={CH/2} fill="#d1d5db" stroke="#9ca3af" strokeWidth={1.5}/>
        <ellipse cx={WALL} cy={CY+CH/2} rx={ER} ry={CH/2} fill={leftOpen?"#bbf7d0":"#e5e7eb"} stroke={leftOpen?"#86efac":"#9ca3af"} strokeWidth={2}/>

        <text x={WALL/2} y={CY+CH/2-14} textAnchor="middle" fill={leftOpen?"#15803d":"#94a3b8"} fontSize={13} fontWeight="900">M₁</text>
        <text x={WALL/2} y={CY+CH/2+4} textAnchor="middle" fill={leftOpen?"#22c55e":"#94a3b8"} fontSize={9}>{leftOpen?"Gaz Girişi":"Kapalı"}</text>
        {leftOpen && <>
          <line x1={4} y1={CY+CH/2} x2={WALL-ER-2} y2={CY+CH/2} stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#a1)"/>
          <line x1={4} y1={CY+CH/2-26} x2={WALL-ER-2} y2={CY+CH/2-26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1)" opacity={0.4}/>
          <line x1={4} y1={CY+CH/2+26} x2={WALL-ER-2} y2={CY+CH/2+26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1)" opacity={0.4}/>
        </>}

        <ellipse cx={rightEdge} cy={CY+CH/2} rx={ER} ry={CH/2} fill={rightOpen?"#bbf7d0":"#e5e7eb"} stroke={rightOpen?"#86efac":"#9ca3af"} strokeWidth={2}/>
        <text x={rightEdge+ATMO/2} y={CY+CH/2-14} textAnchor="middle" fill={rightOpen?"#15803d":"#94a3b8"} fontSize={13} fontWeight="900">M₂</text>
        <text x={rightEdge+ATMO/2} y={CY+CH/2+4} textAnchor="middle" fill={rightOpen?"#22c55e":"#94a3b8"} fontSize={9}>{rightOpen?"Gaz Girişi":"Kapalı"}</text>
        {rightOpen && <>
          <line x1={rightEdge+ER+2} y1={CY+CH/2} x2={SW-4} y2={CY+CH/2} stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#a1l)"/>
          <line x1={rightEdge+ER+2} y1={CY+CH/2-26} x2={SW-4} y2={CY+CH/2-26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1l)" opacity={0.4}/>
          <line x1={rightEdge+ER+2} y1={CY+CH/2+26} x2={SW-4} y2={CY+CH/2+26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1l)" opacity={0.4}/>
        </>}

        {pistonXs.map((px,i) => <PistonSVG key={i} cx={px} y={CY} h={CH}/>)}
        <ValveSVG x={WALL-ER} y={CY+CH/2} open={leftOpen} onClick={()=>setLeftOpen(o=>!o)} label="M₁"/>
        <ValveSVG x={rightEdge+ER} y={CY+CH/2} open={rightOpen} onClick={()=>setRightOpen(o=>!o)} label="M₂"/>

        <text x={SW/2} y={SH-6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
          P₁=P₂=…={P.toFixed(3)} atm · Toplam V={totalV.toFixed(1)} L (sabit) · Bölmeye tıkla → seç
        </text>
      </svg>

      {/* Panel tabs */}
      <div style={{display:"flex",gap:4,marginBottom:6}}>
        {[["edit","✏️ Düzenle"],["pvnrt","🔬 PV=nRT"],["table","📋 Tablo"]].map(([id,lbl]) => (
          <button key={id} onClick={()=>setShowPanel(id)} style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:showPanel===id?"#e0e7ff":"#f1f5f9",color:showPanel===id?"#4338ca":"#94a3b8"}}>{lbl}</button>
        ))}
      </div>

      {showPanel==="edit" && (
        <div style={{background:"white",borderRadius:10,padding:14,border:`1.5px solid ${cc.stroke}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"#475569"}}>Bölme {selected+1} — Gaz:</span>
            <input value={ch.gas} onChange={e => {
              const v = e.target.value;
              setChambers(prev => prev.map((c,i) => i===selected?{...c,gas:v}:c));
            }} style={{width:60,padding:"3px 7px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:12,fontWeight:700,color:cc.particle,background:"#f8fafc",outline:"none"}}/>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:160}}>
              <Slider label="n (mol)" value={ch.mol} min={0.05} max={5} step={0.05} unit="mol" color="#6366f1" onChange={v=>updateChamber("mol",v)}/>
            </div>
            <div style={{flex:1,minWidth:160}}>
              <Slider label="T (K)" value={ch.T} min={50} max={1000} step={5} unit="K" color={tempClr(ch.T)} onChange={v=>updateChamber("T",v)}/>
            </div>
          </div>
          <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#64748b",marginTop:6}}>
            ⚠️ Hacim otomatik hesaplanır — basınç eşitliği korunur
          </div>
        </div>
      )}

      {showPanel==="pvnrt" && (
        <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8}}>PV=nRT · P={P.toFixed(4)} atm</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr>{["#","Gaz","n","V(L)","T(K)","P","nRT","✓"].map(h=><th key={h} style={{padding:"3px 7px",color:"#94a3b8",textAlign:"left",fontWeight:600,borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
              <tbody>
                {eq.map((c,i) => {
                  const cP=(c.mol*R*c.T)/c.V;
                  const ok=Math.abs(cP-P)<0.01;
                  return (
                    <tr key={i} onClick={()=>setSelected(i)} style={{cursor:"pointer",background:i===selected?"#eff6ff":"transparent"}}>
                      <td style={{padding:"3px 7px",color:"#94a3b8"}}>{i+1}</td>
                      <td style={{padding:"3px 7px",color:CHAMBER_COLORS[i%4].particle,fontWeight:700}}>{c.gas}</td>
                      <td style={{padding:"3px 7px"}}>{c.mol.toFixed(3)}</td>
                      <td style={{padding:"3px 7px",color:"#0ea5e9"}}>{c.V.toFixed(3)}</td>
                      <td style={{padding:"3px 7px",color:tempClr(c.T)}}>{c.T}</td>
                      <td style={{padding:"3px 7px",color:"#6366f1",fontWeight:700}}>{cP.toFixed(4)}</td>
                      <td style={{padding:"3px 7px"}}>{(c.mol*R*c.T).toFixed(3)}</td>
                      <td style={{padding:"3px 7px"}}><span style={{background:ok?"#dcfce7":"#fee2e2",color:ok?"#16a34a":"#dc2626",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>{ok?"✓":"✗"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPanel==="table" && (
        <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {eq.map((c,i) => {
              const col=CHAMBER_COLORS[i%4];
              return (
                <div key={i} onClick={()=>setSelected(i)} style={{flex:"1 1 130px",background:i===selected?col.fill+"aa":col.fill+"55",borderRadius:10,padding:10,border:`1.5px solid ${i===selected?col.stroke:"transparent"}`,cursor:"pointer"}}>
                  <div style={{fontSize:13,fontWeight:800,color:col.particle,marginBottom:4}}>{c.gas} — {i+1}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>n = {c.mol.toFixed(3)} mol</div>
                  <div style={{fontSize:11,color:"#0ea5e9"}}>V = {c.V.toFixed(3)} L</div>
                  <div style={{fontSize:11,color:tempClr(c.T)}}>T = {c.T} K</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#6366f1",marginTop:4}}>P = {P.toFixed(3)} atm</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DÜZENEK 2 ──────────────────────────────────────
function Duzenek2() {
  const [boxes, setBoxes] = useState([
    {gas:"CH₄",mol:0,P:1.2,V:5,T:300},
    {gas:"He", mol:0,P:0.6,V:2,T:300},
    {gas:"H₂", mol:0,P:1.6,V:3,T:300},
    {gas:"Ne", mol:0,P:1.0,V:4,T:300,hasPiston:true},
  ].map(b => ({...b, mol:b.P*b.V/(R*b.T)})));
  const [valves, setValves] = useState([false,false,false]);
  const [P0, setP0] = useState(1.0);
  const [animTick, setAnimTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnimTick(x=>x+1), 80);
    return () => clearInterval(t);
  }, []);

  function calcBoxes() {
    let groups = boxes.map((_,i) => [i]);
    for(let v=0;v<valves.length;v++) {
      if(valves[v]) {
        const g1 = groups.find(g=>g.includes(v));
        const g2 = groups.find(g=>g.includes(v+1));
        if(g1 && g2 && g1!==g2) {
          const merged = [...g1,...g2];
          groups = groups.filter(g=>g!==g1&&g!==g2);
          groups.push(merged);
        }
      }
    }
    const result = boxes.map(b=>({...b}));
    groups.forEach(grp => {
      const totalMol = grp.reduce((s,i)=>s+boxes[i].mol,0);
      let totalV = grp.reduce((s,i)=>s+boxes[i].V,0);
      const avgT = grp.reduce((s,i)=>s+boxes[i].T*boxes[i].mol,0)/totalMol;
      const hasP = grp.some(i=>boxes[i].hasPiston);
      let P;
      if(hasP) { P=P0; totalV=totalMol*R*avgT/P; }
      else { P=totalMol*R*avgT/totalV; }
      const weights = grp.map(i=>boxes[i].mol*boxes[i].T);
      const tw = weights.reduce((s,w)=>s+w,0);
      grp.forEach((i,j) => {
        result[i].P = P;
        result[i].V = tw>0?(weights[j]/tw)*totalV:totalV/grp.length;
      });
    });
    return result;
  }

  const computed = calcBoxes();
  const COLORS = [
    {fill:"#dbeafe",stroke:"#93c5fd",particle:"#1d4ed8"},
    {fill:"#dcfce7",stroke:"#86efac",particle:"#15803d"},
    {fill:"#fef9c3",stroke:"#fde047",particle:"#a16207"},
    {fill:"#fce7f3",stroke:"#f9a8d4",particle:"#be185d"},
  ];

  return (
    <div>
      <div style={{background:"white",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:2}}>🔗 Düzenek 2 — Ayrı Kutular</div>
        <div style={{fontSize:11,color:"#94a3b8"}}>Musluk açılınca kutular birleşir · Son kap pistonlu (P₀ ile denge)</div>
      </div>
      <div style={{background:"white",borderRadius:10,padding:"8px 12px",marginBottom:8,border:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,color:"#94a3b8"}}>P₀</span>
        <Slider label="" value={P0} min={0.5} max={3} step={0.1} unit="atm" color="#3b82f6" onChange={setP0}/>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        {[0,1,2].map(v => (
          <button key={v} onClick={()=>setValves(prev=>prev.map((x,i)=>i===v?!x:x))} style={{padding:"4px 10px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:valves[v]?"#dcfce7":"#fee2e2",color:valves[v]?"#16a34a":"#dc2626",outline:valves[v]?"1.5px solid #22c55e":"1.5px solid #ef4444"}}>M{v+1}: {valves[v]?"Açık":"Kapalı"}</button>
        ))}
      </div>

      {/* SVG Visualization */}
      {(() => {
        const SW=960, SH=340;
        const BOX_W=190, BOX_H=210, BOX_Y=40;
        const PIPE_W=50;
        const totalW = computed.length*BOX_W + (computed.length-1)*PIPE_W;
        const startX = (SW-totalW)/2;

        function getBoxX(i) { return startX + i*(BOX_W+PIPE_W); }
        function getPipeX(i) { return getBoxX(i) + BOX_W; }
        const CY = BOX_Y + BOX_H/2;

        function boxParticles(bx, col, mol, T, idx) {
          const count = Math.max(5, Math.min(20, Math.round(mol*14)));
          return Array.from({length:count},(_,i)=>{
            const sp=0.15+(T/300)*0.35;
            const seed=i*173.1+idx*700+animTick*sp;
            const px=bx+20+((Math.sin(seed*0.61+i)*0.5+0.5)*(BOX_W-40));
            const py=BOX_Y+20+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(BOX_H-40));
            return <circle key={i} cx={px} cy={py} r={5.5} fill={col.particle} opacity={0.65}/>;
          });
        }

        return (
          <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" style={{display:"block",borderRadius:16,background:"#f8fafc",border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:8}}>
            <defs>
              <linearGradient id="ts2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity={0.45}/>
                <stop offset="100%" stopColor="black" stopOpacity={0.05}/>
              </linearGradient>
            </defs>

            {/* Pipes */}
            {computed.map((_,i) => {
              if(i>=computed.length-1) return null;
              const px = getPipeX(i);
              const open = valves[i];
              return (
                <g key={i}>
                  {/* Pipe tube top */}
                  <rect x={px} y={CY-6} width={PIPE_W} height={12} rx={6}
                    fill={open?"#bbf7d0":"#e2e8f0"} stroke={open?"#22c55e":"#94a3b8"} strokeWidth={1.5}/>
                  {/* Flow indicator */}
                  {open && <>
                    <circle cx={px+PIPE_W*0.35} cy={CY} r={3} fill="#22c55e" opacity={0.8}/>
                    <circle cx={px+PIPE_W*0.65} cy={CY} r={3} fill="#22c55e" opacity={0.8}/>
                  </>}
                </g>
              );
            })}

            {/* Boxes */}
            {computed.map((b,idx) => {
              const bx = getBoxX(idx);
              const col = COLORS[idx%4];
              const isPiston = !!b.hasPiston;
              const pistonX = isPiston ? bx + Math.min(BOX_W*0.82, (b.V/6)*BOX_W*0.82) : BOX_W;

              return (
                <g key={idx}>
                  {/* Shadow */}
                  <rect x={bx+3} y={BOX_Y+4} width={BOX_W} height={BOX_H} rx={12} fill="rgba(0,0,0,0.07)"/>
                  {/* Box fill */}
                  <rect x={bx} y={BOX_Y} width={BOX_W} height={BOX_H} fill={col.fill} rx={12}/>
                  {/* Piston area */}
                  {isPiston && <>
                    <rect x={bx} y={BOX_Y} width={pistonX-bx} height={BOX_H} fill={col.fill} rx={12}/>
                    <rect x={pistonX-bx+bx} y={BOX_Y} width={BOX_W-(pistonX-bx)} height={BOX_H} fill="#f1f5f9" rx={12}/>
                    {/* Piston bar */}
                    <rect x={pistonX-5} y={BOX_Y+4} width={10} height={BOX_H-8} fill="#94a3b8" stroke="#64748b" strokeWidth={1.5} rx={4}/>
                    <text x={bx+BOX_W*0.88} y={BOX_Y+BOX_H/2} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight="600">P₀</text>
                    <text x={bx+BOX_W*0.88} y={BOX_Y+BOX_H/2+12} textAnchor="middle" fill="#94a3b8" fontSize={9}>{P0}atm</text>
                  </>}
                  {/* Particles */}
                  {boxParticles(bx, col, b.mol, b.T, idx)}
                  {/* Shine */}
                  <rect x={bx} y={BOX_Y} width={BOX_W} height={BOX_H} fill="url(#ts2)" rx={12}/>
                  {/* Border */}
                  <rect x={bx} y={BOX_Y} width={BOX_W} height={BOX_H} fill="none" stroke={col.stroke} strokeWidth={2.5} rx={12}/>
                  {/* Gas name */}
                  <text x={bx+BOX_W/2} y={BOX_Y+32} textAnchor="middle" fill={col.particle} fontSize={20} fontWeight="900">{b.gas}</text>
                  {/* Stats */}
                  <text x={bx+BOX_W/2} y={BOX_Y+58} textAnchor="middle" fill="#475569" fontSize={12}>{b.mol.toFixed(2)} mol</text>
                  <text x={bx+BOX_W/2} y={BOX_Y+76} textAnchor="middle" fill="#0ea5e9" fontSize={12}>{b.V.toFixed(2)} L</text>
                  <text x={bx+BOX_W/2} y={BOX_Y+100} textAnchor="middle" fill={pClr(b.P)} fontSize={17} fontWeight="800">{b.P.toFixed(3)} atm</text>
                  <text x={bx+BOX_W/2} y={BOX_Y+120} textAnchor="middle" fill={tempClr(b.T)} fontSize={12}>{b.T} K</text>
                  {/* Temp bar */}
                  <rect x={bx+10} y={BOX_Y+BOX_H-14} width={BOX_W-20} height={7} rx={3.5} fill={tempClr(b.T)} opacity={0.55}/>
                  {/* Kap label */}
                  <text x={bx+BOX_W/2} y={BOX_Y+BOX_H+20} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight="600">Kap {idx+1}</text>
                  {/* Valve between boxes - positioned on pipe */}
                  {idx < computed.length-1 && (
                    <ValveSVG
                      x={getPipeX(idx)+PIPE_W/2}
                      y={CY}
                      open={valves[idx]}
                      onClick={()=>setValves(prev=>prev.map((x,i)=>i===idx?!x:x))}
                      label={`M${idx+1}`}
                    />
                  )}
                </g>
              );
            })}

            <text x={SW/2} y={SH-6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
              Musluğa tıkla → aç/kapat · Musluk açılınca gazlar birleşir · Son kap pistonlu (P₀ ile denge)
            </text>
          </svg>
        );
      })()}

      {/* Box editors */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:8}}>
        {computed.map((b,idx) => {
          const col = COLORS[idx%4];
          return (
            <div key={idx} style={{flex:"1 1 160px",background:col.fill,borderRadius:12,padding:12,border:`2px solid ${col.stroke}`}}>
              <div style={{fontSize:14,fontWeight:800,color:col.particle,marginBottom:4}}>{b.gas} — Kap {idx+1}</div>
              <div style={{fontSize:11,color:pClr(b.P),fontWeight:700,marginBottom:6}}>P = {b.P.toFixed(3)} atm</div>
              {b.hasPiston && <div style={{fontSize:10,color:"#94a3b8",marginBottom:6}}>🔧 Pistonlu kap · P₀={P0} atm</div>}
              <Slider label="n (mol)" value={b.mol} min={0.05} max={5} step={0.05} unit="mol" color={col.particle} onChange={v=>setBoxes(prev=>prev.map((x,i)=>i===idx?{...x,mol:v}:x))}/>
              <Slider label="T (K)" value={b.T} min={50} max={1000} step={5} unit="K" color={tempClr(b.T)} onChange={v=>setBoxes(prev=>prev.map((x,i)=>i===idx?{...x,T:v}:x))}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DÜZENEK 3 ──────────────────────────────────────
function Duzenek3() {
  const [mol, setMol] = useState(0.5);
  const [T, setT] = useState(300);
  const [P0, setP0] = useState(1.0);
  const [engel, setEngel] = useState(6);
  const [valveOpen, setValveOpen] = useState(false);
  const [addMol, setAddMol] = useState(0.1);
  const [animTick, setAnimTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnimTick(x=>x+1), 80);
    return () => clearInterval(t);
  }, []);

  const V = mol*R*T/P0;
  const engelHit = V >= engel;
  const pistonV = engelHit ? engel : V;
  const finalP = engelHit ? (mol*R*T)/engel : P0;

  const SW=900,SH=280,CY=60,CH=160,LEFT=80,CW=720;
  const scale = CW/12;
  const pistonX = LEFT + pistonV*scale;
  const engelX = LEFT + engel*scale;

  const particleCount = Math.max(5, Math.min(20, Math.round(mol*12)));
  const particles = Array.from({length:particleCount},(_,i) => {
    const sp = 0.15+(T/300)*0.38;
    const seed = i*173.1+animTick*sp;
    const px = LEFT+16+((Math.sin(seed*0.61+i)*0.5+0.5)*(Math.min(pistonX-LEFT,CW)-32));
    const py = CY+16+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(CH-32));
    return <circle key={i} cx={px} cy={py} r={5} fill="#1d4ed8" opacity={0.65}/>;
  });

  return (
    <div>
      <div style={{background:"white",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:2}}>🚧 Düzenek 3 — Pistonlu + Engelli Silindir</div>
        <div style={{fontSize:11,color:"#94a3b8"}}>Musluktan gaz ekle → Engele kadar İzobar (P sabit, V artar) → Engelten sonra İzokor (V sabit, P artar)</div>
      </div>

      <div style={{background:"white",borderRadius:10,padding:"8px 12px",marginBottom:8,border:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setValveOpen(o=>!o)} style={{padding:"4px 10px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:valveOpen?"#dcfce7":"#fee2e2",color:valveOpen?"#16a34a":"#dc2626",outline:valveOpen?"1.5px solid #22c55e":"1.5px solid #ef4444"}}>Musluk M: {valveOpen?"Açık":"Kapalı"}</button>
        {valveOpen && <>
          <button onClick={()=>setMol(m=>Math.max(0.05,m-addMol))} style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700}}>−</button>
          <Slider label="" value={addMol} min={0.05} max={0.5} step={0.05} unit="mol" color="#22c55e" onChange={setAddMol}/>
          <button onClick={()=>setMol(m=>m+addMol)} style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700}}>+</button>
        </>}
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        <div style={{background:engelHit?"#fee2e2":"#dcfce7",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:engelHit?"#dc2626":"#16a34a"}}>
          {engelHit?"🔴 İzokor — V sabit":"🟢 İzobar — P sabit"}
        </div>
        <button onClick={()=>{setMol(0.5);setValveOpen(false);}} style={{padding:"4px 10px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",color:"#94a3b8",cursor:"pointer",fontSize:10}}>↺ Sıfırla</button>
      </div>

      <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" style={{display:"block",borderRadius:16,background:"white",border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:8}}>
        <defs>
          <marker id="a3" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <path d="M7,0 L7,7 L0,3.5z" fill="#94a3b8"/>
          </marker>
        </defs>
        <rect x={LEFT} y={CY} width={CW} height={CH} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} rx={4}/>
        <rect x={LEFT} y={CY} width={Math.min(pistonX-LEFT,CW)} height={CH} fill="#bfdbfe" opacity={0.7}/>
        {particles}
        <line x1={LEFT} y1={CY} x2={LEFT+CW} y2={CY} stroke="#94a3b8" strokeWidth={2.5}/>
        <line x1={LEFT} y1={CY+CH} x2={LEFT+CW} y2={CY+CH} stroke="#94a3b8" strokeWidth={2.5}/>
        <rect x={engelX-4} y={CY-10} width={8} height={CH+20} fill="#334155" rx={2}/>
        <text x={engelX} y={CY-15} textAnchor="middle" fill="#334155" fontSize={10} fontWeight="700">Engel</text>
        <PistonSVG cx={pistonX} y={CY} h={CH}/>
        <text x={pistonX} y={CY-15} textAnchor="middle" fill="#1d4ed8" fontSize={10} fontWeight="700">İdeal Piston</text>
        <line x1={LEFT+CW-10} y1={CY+CH/2} x2={pistonX+20} y2={CY+CH/2} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#a3)"/>
        <text x={LEFT+CW} y={CY+CH/2-6} textAnchor="end" fill="#94a3b8" fontSize={10}>P₀={P0}atm</text>
        <text x={LEFT+Math.min(pistonX-LEFT,CW)/2} y={CY+CH/2-8} textAnchor="middle" fill="#1e40af" fontSize={14} fontWeight="800">{mol.toFixed(3)} mol</text>
        <text x={LEFT+Math.min(pistonX-LEFT,CW)/2} y={CY+CH/2+12} textAnchor="middle" fill={pClr(finalP)} fontSize={15} fontWeight="800">{finalP.toFixed(3)} atm</text>
        <text x={LEFT+Math.min(pistonX-LEFT,CW)/2} y={CY+CH/2+30} textAnchor="middle" fill="#0ea5e9" fontSize={12}>{pistonV.toFixed(3)} L</text>
        <rect x={LEFT-12} y={CY} width={12} height={CH} fill="#d1d5db" stroke="#94a3b8" strokeWidth={2}/>
        <ValveSVG x={LEFT-24} y={CY+CH/2} open={valveOpen} onClick={()=>setValveOpen(o=>!o)} label="M"/>
        {["O","R","B","İ","T","A","L"].map((m,i) => {
          const mx = LEFT+(i+0.5)*(CW/7);
          return <g key={m}>
            <line x1={mx} y1={CY+CH} x2={mx} y2={CY+CH+8} stroke="#94a3b8" strokeWidth={1.5}/>
            <text x={mx} y={CY+CH+18} textAnchor="middle" fill="#64748b" fontSize={10}>{m}</text>
          </g>;
        })}
      </svg>

      <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #e2e8f0",display:"flex",gap:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}><Slider label="T (K)" value={T} min={50} max={1000} step={5} unit="K" color={tempClr(T)} onChange={setT}/></div>
        <div style={{flex:1,minWidth:160}}><Slider label="P₀ (atm)" value={P0} min={0.5} max={3} step={0.1} unit="atm" color="#3b82f6" onChange={setP0}/></div>
        <div style={{flex:1,minWidth:160}}><Slider label="Engel (L)" value={engel} min={2} max={10} step={0.5} unit="L" color="#334155" onChange={setEngel}/></div>
      </div>
    </div>
  );
}

// ── EĞİTİM ─────────────────────────────────────────
function Egitim() {
  const laws = [
    {title:"Boyle Yasası",formula:"P₁V₁ = P₂V₂",note:"T sabit",color:"#f97316",
     steps:[{l:"V=2L",n:0.5,V:2,T:300},{l:"V=4L",n:0.5,V:4,T:300},{l:"V=6L",n:0.5,V:6,T:300},{l:"V=8L",n:0.5,V:8,T:300}]},
    {title:"Charles Yasası",formula:"V₁/T₁ = V₂/T₂",note:"P sabit",color:"#3b82f6",
     steps:[{l:"T=150K",n:0.5,V:4,T:150},{l:"T=300K",n:0.5,V:8,T:300},{l:"T=450K",n:0.5,V:12,T:450},{l:"T=600K",n:0.5,V:16,T:600}]},
    {title:"Gay-Lussac",formula:"P₁/T₁ = P₂/T₂",note:"V sabit",color:"#22c55e",
     steps:[{l:"T=200K",n:0.5,V:5,T:200},{l:"T=400K",n:0.5,V:5,T:400},{l:"T=600K",n:0.5,V:5,T:600},{l:"T=800K",n:0.5,V:5,T:800}]},
  ];
  return (
    <div>
      {laws.map(law => (
        <div key={law.title} style={{background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:800,color:law.color}}>{law.title}</span>
            <span style={{fontSize:11,fontFamily:"monospace",background:"#f8fafc",padding:"2px 8px",borderRadius:5}}>{law.formula}</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>{law.note}</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr>{["Adım","n(mol)","V(L)","T(K)","P(atm)","PV"].map(h=><th key={h} style={{padding:"3px 7px",color:"#94a3b8",textAlign:"left",fontWeight:600,borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
              <tbody>{law.steps.map(s => {
                const P=(s.n*R*s.T)/s.V;
                return <tr key={s.l}>
                  <td style={{padding:"3px 7px",color:law.color,fontWeight:700}}>{s.l}</td>
                  <td style={{padding:"3px 7px"}}>{s.n}</td>
                  <td style={{padding:"3px 7px",color:"#0ea5e9"}}>{s.V}</td>
                  <td style={{padding:"3px 7px",color:tempClr(s.T)}}>{s.T}</td>
                  <td style={{padding:"3px 7px",color:pClr(P),fontWeight:700}}>{P.toFixed(3)}</td>
                  <td style={{padding:"3px 7px"}}>{(P*s.V).toFixed(3)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ROOT APP ────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("d1");
  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Inter',system-ui,sans-serif",color:"#1e293b"}}>
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"8px 14px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>⚗️ Gaz Laboratuvarı</div>
            <div style={{fontSize:9,color:"#94a3b8"}}>PV=nRT · İdeal Pistonlar · Gaz Yasaları</div>
          </div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap",marginLeft:"auto",background:"#f8fafc",borderRadius:10,padding:3,border:"1px solid #e2e8f0"}}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:tab===t.id?"white":"transparent",color:tab===t.id?"#6366f1":"#94a3b8",boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:1000,margin:"0 auto",padding:"12px"}}>
        {tab==="d1" && <Duzenek1/>}
        {tab==="d2" && <Duzenek2/>}
        {tab==="d3" && <Duzenek3/>}
        {tab==="edu" && <Egitim/>}
      </div>
    </div>
  );
}

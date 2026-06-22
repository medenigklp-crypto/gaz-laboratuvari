import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS (ortak)
// ══════════════════════════════════════════════════════════════
const R = 0.0821;

const GAS_PRESETS = [
  { label:"He",  color:"#ef4444", molar:4  },
  { label:"H₂",  color:"#f97316", molar:2  },
  { label:"N₂",  color:"#eab308", molar:28 },
  { label:"O₂",  color:"#22c55e", molar:32 },
  { label:"CH₄", color:"#3b82f6", molar:16 },
  { label:"Ne",  color:"#a855f7", molar:20 },
  { label:"CO₂", color:"#ec4899", molar:44 },
];

const GAS_LIST_D24 = [
  { label:"He",  color:"#a78bfa", bg:"#ede9fe" },
  { label:"H₂",  color:"#eab308", bg:"#fefce8" },
  { label:"N₂",  color:"#34d399", bg:"#d1fae5" },
  { label:"O₂",  color:"#fb923c", bg:"#ffedd5" },
  { label:"CH₄", color:"#6366f1", bg:"#eef2ff" },
  { label:"Ne",  color:"#f472b6", bg:"#fce7f3" },
  { label:"SO₃", color:"#f87171", bg:"#fee2e2" },
  { label:"CO₂", color:"#94a3b8", bg:"#f1f5f9" },
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
  { id:"d4", icon:"🫧", label:"Düzenek 4" },
  { id:"edu", icon:"🎓", label:"Eğitim" },
];

const idealP  = (n,T,V) => V>0&&n>0 ? (n*R*T)/V : 0;
const gasObj  = l => GAS_PRESETS.find(g=>g.label===l)||GAS_PRESETS[0];
const gasInfoD24 = l => GAS_LIST_D24.find(g=>g.label===l)||GAS_LIST_D24[0];
const tempClr = T => { const t=Math.max(0,Math.min(1,(T-50)/950)); return `hsl(${Math.round(240-t*240)},80%,45%)`; };
const pClr    = P => { const t=Math.max(0,Math.min(1,P/5)); return `hsl(${Math.round(120-t*120)},70%,40%)`; };

function equilibrateD1(chambers, totalV) {
  const weights = chambers.map(c => c.mol * c.T);
  const tw = weights.reduce((s,w) => s+w, 0);
  if(tw <= 0) return chambers;
  return chambers.map((c,i) => ({...c, V: Math.max(0.05, (weights[i]/tw)*totalV)}));
}

function calcPD1(chambers) {
  const eq = equilibrateD1(chambers, chambers.reduce((s,c)=>s+c.V,0));
  if(!eq[0] || eq[0].V <= 0) return 0;
  return (eq[0].mol * R * eq[0].T) / eq[0].V;
}

// ── Slider ──────────────────────────────────────────────────
function Slider({ label, value, min, max, step, unit, color, onChange }) {
  const [local, setLocal] = useState(String(value));
  const ref = useRef(false);
  useEffect(() => { if (!ref.current) setLocal(String(value)); }, [value]);
  const acc = color || "#6366f1";
  function commit(raw) {
    const n = parseFloat(raw);
    if (!isNaN(n)) { const c=Math.max(min,Math.min(max,n)); onChange(c); setLocal(String(c)); }
    else setLocal(String(value));
  }
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
        <span style={{fontSize:11,color:"#64748b"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input type="number" min={min} max={max} step={step} value={local}
            onFocus={()=>{ref.current=true;}}
            onChange={e=>setLocal(e.target.value)}
            onBlur={e=>{ref.current=false;commit(e.target.value);}}
            onKeyDown={e=>{if(e.key==="Enter"){ref.current=false;commit(local);e.target.blur();}}}
            style={{width:65,padding:"3px 6px",borderRadius:6,border:`1px solid ${acc}`,background:"#f8fafc",color:acc,fontSize:11,fontWeight:700,textAlign:"right",outline:"none"}}/>
          <span style={{fontSize:10,color:"#94a3b8",minWidth:24}}>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>{const v=parseFloat(e.target.value);onChange(v);setLocal(String(v));}}
        style={{width:"100%",accentColor:acc}}/>
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

// ── Valve SVG ────────────────────────────────────────────────
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
        : <rect x={x-3} y={y-10} width={6} height={20} rx={3} fill={hc}/>}
      <text x={x} y={y-22} textAnchor="middle" fill={bc} fontSize={10} fontWeight="800">{label}</text>
      <text x={x} y={y+28} textAnchor="middle" fill={bc} fontSize={8} fontWeight="700">{open?"Gaz Girişi":"Kapalı"}</text>
    </g>
  );
}

// ── Piston SVG ───────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
// DÜZENEK 1
// ══════════════════════════════════════════════════════════════
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
    const base = [{gas:"X",T:300},{gas:"Y",T:300},{gas:"Z",T:300},{gas:"W",T:300}].slice(0,n);
    return equilibrateD1(base.map(c=>({...c,mol:0.4,V:tv/n})), tv);
  }

  useEffect(()=>{setChambers(makeDefault(numChambers,totalV));setSelected(0);},[numChambers]);
  useEffect(()=>{const t=setInterval(()=>setAnimTick(x=>x+1),70);return()=>clearInterval(t);},[]);

  const eq = equilibrateD1(chambers, totalV);
  const P = calcPD1(chambers);
  const totalMol = chambers.reduce((s,c)=>s+c.mol,0);

  function updateChamber(key, val) {
    setChambers(prev=>{
      const newChs=prev.map((c,i)=>i===selected?{...c,[key]:Math.max(key==="mol"?0.01:50,val)}:c);
      return equilibrateD1(newChs,totalV);
    });
  }
  function updateTotalV(v) {
    const tv=Math.max(2,Math.min(30,v)); setTotalV(tv);
    setChambers(prev=>equilibrateD1(prev,tv));
  }
  function addMol(side, delta) {
    const n=side==="left"?0:chambers.length-1;
    setChambers(prev=>{
      const newChs=prev.map((c,i)=>i===n?{...c,mol:Math.max(0.01,c.mol+delta)}:c);
      return equilibrateD1(newChs,totalV);
    });
  }

  const ch = eq[selected]||eq[0];
  const cc = CHAMBER_COLORS[selected%4];
  const SW=960,SH=340,CY=55,CH=210,WALL=90,ATMO=90,ER=28;
  const containerW=SW-WALL-ATMO;
  const weights=eq.map(c=>c.mol*c.T);
  const tw=weights.reduce((s,w)=>s+w,0);
  const widths=eq.map((_,i)=>tw>0?(weights[i]/tw)*containerW:containerW/eq.length);
  let xc=WALL;
  const rects=widths.map(w=>{const x=xc;xc+=w;return{x,w,cx:x+w/2};});
  const pistonXs=[];let acc=WALL;
  for(let i=0;i<eq.length-1;i++){acc+=widths[i];pistonXs.push(acc);}
  const rightEdge=WALL+containerW;

  function getParticles(rect,T,color,idx){
    const count=Math.max(5,Math.min(22,Math.round(eq[idx].mol*14)));
    return Array.from({length:count},(_,i)=>{
      const sp=0.15+(T/300)*0.38;
      const seed=i*173.1+idx*700+animTick*sp;
      const px=rect.x+22+((Math.sin(seed*0.61+i)*0.5+0.5)*(rect.w-44));
      const py=CY+18+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(CH-36));
      return <circle key={i} cx={px} cy={py} r={5} fill={color} opacity={0.65}/>;
    });
  }

  return (
    <div>
      <div style={{background:"white",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:2}}>🧪 Düzenek 1 — Yatay Silindir</div>
        <div style={{fontSize:11,color:"#94a3b8"}}>Toplam hacim sabittir · Tüm bölmelerde basınç eşittir · Pistonlar otomatik denge kurar</div>
      </div>
      <div style={{background:"white",borderRadius:10,padding:"8px 12px",marginBottom:8,border:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>BÖLME</span>
          {[2,3,4].map(n=>(
            <button key={n} onClick={()=>setNumChambers(n)} style={{width:26,height:26,borderRadius:13,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:numChambers===n?"#6366f1":"#f1f5f9",color:numChambers===n?"white":"#94a3b8"}}>{n}</button>
          ))}
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        <div style={{display:"flex",gap:4,alignItems:"center",minWidth:200}}>
          <span style={{fontSize:10,color:"#94a3b8"}}>Toplam V</span>
          <Slider label="" value={totalV} min={2} max={30} step={0.5} unit="L" color="#0ea5e9" onChange={updateTotalV}/>
        </div>
        <div style={{background:"#f8fafc",borderRadius:8,padding:"4px 10px",border:"1px solid #e2e8f0"}}>
          <span style={{fontSize:9,color:"#94a3b8"}}>P = </span>
          <span style={{fontSize:13,fontWeight:800,color:"#6366f1"}}>{P.toFixed(3)} atm</span>
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>M₁</span>
          <button onClick={()=>setLeftOpen(o=>!o)} style={{padding:"3px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:leftOpen?"#dcfce7":"#f1f5f9",color:leftOpen?"#15803d":"#94a3b8",outline:leftOpen?"1.5px solid #22c55e":"none"}}>{leftOpen?"Açık":"Kapalı"}</button>
          {leftOpen&&<><button onClick={()=>addMol("left",-molAddL)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:13}}>−</button>
          <Slider label="" value={molAddL} min={0.05} max={1} step={0.05} unit="mol" color="#22c55e" onChange={setMolAddL}/>
          <button onClick={()=>addMol("left",molAddL)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:13}}>+</button></>}
        </div>
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>M₂</span>
          <button onClick={()=>setRightOpen(o=>!o)} style={{padding:"3px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:rightOpen?"#dcfce7":"#f1f5f9",color:rightOpen?"#15803d":"#94a3b8",outline:rightOpen?"1.5px solid #22c55e":"none"}}>{rightOpen?"Açık":"Kapalı"}</button>
          {rightOpen&&<><button onClick={()=>addMol("right",-molAddR)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:13}}>−</button>
          <Slider label="" value={molAddR} min={0.05} max={1} step={0.05} unit="mol" color="#22c55e" onChange={setMolAddR}/>
          <button onClick={()=>addMol("right",molAddR)} style={{width:22,height:22,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:13}}>+</button></>}
        </div>
      </div>

      <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" style={{display:"block",borderRadius:16,background:"white",border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:8}}>
        <defs>
          <linearGradient id="ts1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.6}/><stop offset="25%" stopColor="white" stopOpacity={0.08}/><stop offset="100%" stopColor="black" stopOpacity={0.06}/>
          </linearGradient>
          <marker id="a1" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5z" fill="#22c55e"/></marker>
          <marker id="a1l" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto"><path d="M7,0 L7,7 L0,3.5z" fill="#22c55e"/></marker>
        </defs>
        <rect x={WALL-ER+4} y={CY+6} width={containerW+ER*2-8} height={CH-6} rx={6} fill="rgba(0,0,0,0.06)"/>
        <ellipse cx={WALL} cy={CY+CH/2} rx={ER} ry={CH/2} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5}/>
        {eq.map((c,idx)=>{
          const r=rects[idx];const col=CHAMBER_COLORS[idx%4];const isSel=selected===idx;
          return(
            <g key={idx} onClick={()=>setSelected(idx)} style={{cursor:"pointer"}}>
              <rect x={r.x} y={CY} width={r.w} height={CH} fill={col.fill}/>
              {isSel&&<rect x={r.x} y={CY} width={r.w} height={CH} fill={col.stroke} opacity={0.1}/>}
              {getParticles(r,c.T,col.particle,idx)}
              <text x={r.cx} y={CY+30} textAnchor="middle" fill={col.particle} fontSize={20} fontWeight="900">{c.gas}</text>
              <text x={r.cx} y={CY+52} textAnchor="middle" fill="#475569" fontSize={12}>{c.mol.toFixed(2)} mol</text>
              <text x={r.cx} y={CY+70} textAnchor="middle" fill="#0ea5e9" fontSize={12}>{c.V.toFixed(2)} L</text>
              <text x={r.cx} y={CY+92} textAnchor="middle" fill="#6366f1" fontSize={16} fontWeight="800">{P.toFixed(3)} atm</text>
              <text x={r.cx} y={CY+110} textAnchor="middle" fill={tempClr(c.T)} fontSize={11}>{c.T} K</text>
              <rect x={r.x+6} y={CY+CH-12} width={r.w-12} height={7} rx={3.5} fill={tempClr(c.T)} opacity={0.55}/>
              {isSel&&<rect x={r.x} y={CY} width={r.w} height={CH} fill="none" stroke={col.stroke} strokeWidth={3} strokeDasharray="10,5"/>}
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
        {leftOpen&&<><line x1={4} y1={CY+CH/2} x2={WALL-ER-2} y2={CY+CH/2} stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#a1)"/><line x1={4} y1={CY+CH/2-26} x2={WALL-ER-2} y2={CY+CH/2-26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1)" opacity={0.4}/><line x1={4} y1={CY+CH/2+26} x2={WALL-ER-2} y2={CY+CH/2+26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1)" opacity={0.4}/></>}
        <ellipse cx={rightEdge} cy={CY+CH/2} rx={ER} ry={CH/2} fill={rightOpen?"#bbf7d0":"#e5e7eb"} stroke={rightOpen?"#86efac":"#9ca3af"} strokeWidth={2}/>
        <text x={rightEdge+ATMO/2} y={CY+CH/2-14} textAnchor="middle" fill={rightOpen?"#15803d":"#94a3b8"} fontSize={13} fontWeight="900">M₂</text>
        <text x={rightEdge+ATMO/2} y={CY+CH/2+4} textAnchor="middle" fill={rightOpen?"#22c55e":"#94a3b8"} fontSize={9}>{rightOpen?"Gaz Girişi":"Kapalı"}</text>
        {rightOpen&&<><line x1={rightEdge+ER+2} y1={CY+CH/2} x2={SW-4} y2={CY+CH/2} stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#a1l)"/><line x1={rightEdge+ER+2} y1={CY+CH/2-26} x2={SW-4} y2={CY+CH/2-26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1l)" opacity={0.4}/><line x1={rightEdge+ER+2} y1={CY+CH/2+26} x2={SW-4} y2={CY+CH/2+26} stroke="#22c55e" strokeWidth={1} markerEnd="url(#a1l)" opacity={0.4}/></>}
        {pistonXs.map((px,i)=><PistonSVG key={i} cx={px} y={CY} h={CH}/>)}
        <ValveSVG x={WALL-ER} y={CY+CH/2} open={leftOpen} onClick={()=>setLeftOpen(o=>!o)} label="M₁"/>
        <ValveSVG x={rightEdge+ER} y={CY+CH/2} open={rightOpen} onClick={()=>setRightOpen(o=>!o)} label="M₂"/>
        <text x={SW/2} y={SH-6} textAnchor="middle" fill="#94a3b8" fontSize={9}>P₁=P₂=…={P.toFixed(3)} atm · Toplam V={totalV.toFixed(1)} L (sabit) · Bölmeye tıkla → seç</text>
      </svg>

      <div style={{display:"flex",gap:4,marginBottom:6}}>
        {[["edit","✏️ Düzenle"],["pvnrt","🔬 PV=nRT"],["table","📋 Tablo"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setShowPanel(id)} style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:600,background:showPanel===id?"#e0e7ff":"#f1f5f9",color:showPanel===id?"#4338ca":"#94a3b8"}}>{lbl}</button>
        ))}
      </div>
      {showPanel==="edit"&&(
        <div style={{background:"white",borderRadius:10,padding:14,border:`1.5px solid ${cc.stroke}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"#475569"}}>Bölme {selected+1} — Gaz:</span>
            <input value={ch.gas} onChange={e=>setChambers(prev=>prev.map((c,i)=>i===selected?{...c,gas:e.target.value}:c))} style={{width:60,padding:"3px 7px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:12,fontWeight:700,color:cc.particle,background:"#f8fafc",outline:"none"}}/>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:160}}><Slider label="n (mol)" value={ch.mol} min={0.05} max={5} step={0.05} unit="mol" color="#6366f1" onChange={v=>updateChamber("mol",v)}/></div>
            <div style={{flex:1,minWidth:160}}><Slider label="T (K)" value={ch.T} min={50} max={1000} step={5} unit="K" color={tempClr(ch.T)} onChange={v=>updateChamber("T",v)}/></div>
          </div>
        </div>
      )}
      {showPanel==="pvnrt"&&(
        <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8}}>PV=nRT · P={P.toFixed(4)} atm</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["#","Gaz","n","V(L)","T(K)","P","nRT","✓"].map(h=><th key={h} style={{padding:"3px 7px",color:"#94a3b8",textAlign:"left",fontWeight:600,borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
            <tbody>{eq.map((c,i)=>{const cP=(c.mol*R*c.T)/c.V;const ok=Math.abs(cP-P)<0.01;return(<tr key={i} onClick={()=>setSelected(i)} style={{cursor:"pointer",background:i===selected?"#eff6ff":"transparent"}}><td style={{padding:"3px 7px",color:"#94a3b8"}}>{i+1}</td><td style={{padding:"3px 7px",color:CHAMBER_COLORS[i%4].particle,fontWeight:700}}>{c.gas}</td><td style={{padding:"3px 7px"}}>{c.mol.toFixed(3)}</td><td style={{padding:"3px 7px",color:"#0ea5e9"}}>{c.V.toFixed(3)}</td><td style={{padding:"3px 7px",color:tempClr(c.T)}}>{c.T}</td><td style={{padding:"3px 7px",color:"#6366f1",fontWeight:700}}>{cP.toFixed(4)}</td><td style={{padding:"3px 7px"}}>{(c.mol*R*c.T).toFixed(3)}</td><td style={{padding:"3px 7px"}}><span style={{background:ok?"#dcfce7":"#fee2e2",color:ok?"#16a34a":"#dc2626",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>{ok?"✓":"✗"}</span></td></tr>);})}</tbody>
          </table>
        </div>
      )}
      {showPanel==="table"&&(
        <div style={{background:"white",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {eq.map((c,i)=>{const col=CHAMBER_COLORS[i%4];return(<div key={i} onClick={()=>setSelected(i)} style={{flex:"1 1 130px",background:i===selected?col.fill+"aa":col.fill+"55",borderRadius:10,padding:10,border:`1.5px solid ${i===selected?col.stroke:"transparent"}`,cursor:"pointer"}}><div style={{fontSize:13,fontWeight:800,color:col.particle,marginBottom:4}}>{c.gas} — {i+1}</div><div style={{fontSize:11,color:"#64748b"}}>n = {c.mol.toFixed(3)} mol</div><div style={{fontSize:11,color:"#0ea5e9"}}>V = {c.V.toFixed(3)} L</div><div style={{fontSize:11,color:tempClr(c.T)}}>T = {c.T} K</div><div style={{fontSize:13,fontWeight:700,color:"#6366f1",marginTop:4}}>P = {P.toFixed(3)} atm</div></div>);})}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DÜZENEK 2 (4 kap, pistonlu, M1-M4)
// ══════════════════════════════════════════════════════════════
function doEqD2(caps, valves, P0) {
  const par=[0,1,2,3];
  const find=(x)=>par[x]===x?x:(par[x]=find(par[x]));
  const union=(a,b)=>{par[find(a)]=find(b);};
  if(valves.m1)union(0,2);if(valves.m2)union(1,2);if(valves.m3)union(0,1);if(valves.m4)union(2,3);
  const groups={};
  for(let i=0;i<4;i++){const root=find(i);if(!groups[root])groups[root]={totalMol:0,sumVT:0,idx:[],hasPiston:false};groups[root].totalMol+=caps[i].mol;if(i<3)groups[root].sumVT+=caps[i].V/caps[i].T;if(i===3)groups[root].hasPiston=true;groups[root].idx.push(i);}
  const next=caps.map(c=>({...c}));
  for(const g of Object.values(groups)){
    if(g.idx.length<2)continue;
    const gasNames=g.idx.map(i=>caps[i].gas).filter(n=>n!=="Boş");
    const sharedGas=gasNames.length===0?"Boş":gasNames.every(n=>n===gasNames[0])?gasNames[0]:"Karışım";
    if(g.hasPiston){
      let molFixed=0;
      for(const i of g.idx){if(i===3)continue;const nm=(P0*caps[i].V)/(R*caps[i].T);next[i]={...next[i],mol:nm<0.0001?0:nm,gas:nm<0.005?"Boş":sharedGas};molFixed+=nm;}
      const molP=Math.max(0,g.totalMol-molFixed);const Vp=molP>0?(molP*R*caps[3].T)/P0:0.1;
      next[3]={...next[3],mol:molP,V:Math.max(0.1,Vp),gas:molP<0.005?"Boş":sharedGas};
    } else {
      const Peq=(g.totalMol*R)/g.sumVT;
      for(const i of g.idx){const nm=(Peq*caps[i].V)/(R*caps[i].T);next[i]={...next[i],mol:nm<0.0001?0:nm,gas:nm<0.005?"Boş":sharedGas};}
    }
  }
  return next;
}

const D2_INIT=[
  {gas:"CH₄",mol:0.24,V:5.00,T:300},{gas:"He",mol:0.05,V:2.00,T:300},
  {gas:"H₂", mol:0.19,V:3.00,T:300},{gas:"Ne",mol:0.16,V:4.00,T:300},
];
const CYL={x:310,y:140,h:100,maxW:220,minV:0.1,maxV:12};
function pistonXD2(V){return CYL.x+Math.min(1,Math.max(0,(V-CYL.minV)/(CYL.maxV-CYL.minV)))*CYL.maxW;}
function balloonRD2(V){return Math.max(36,Math.min(72,36+((V-0.5)/9.5)*36));}
const D2_CARD_BORDERS=["#6366f1","#34d399","#eab308","#f472b6"];
const D2_CARD_BGS=["#eef2ff","#d1fae5","#fefce8","#fce7f3"];
const D2_CAP_LABELS=["1. Kap","2. Kap","3. Kap","4. Kap (Pistonlu)"];

function Duzenek2() {
  const [caps,setCaps]=useState(D2_INIT.map(c=>({...c})));
  const [valves,setValves]=useState({m1:false,m2:false,m3:false,m4:false});
  const [P0,setP0]=useState(1.0);
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>(x+1)%60),80);return()=>clearInterval(t);},[]);

  function toggleValve(key){const next={...valves,[key]:!valves[key]};setCaps(prev=>doEqD2(prev,next,P0));setValves(next);}
  function toggleAll(){const a=Object.values(valves).every(Boolean);const next={m1:!a,m2:!a,m3:!a,m4:!a};setCaps(prev=>doEqD2(prev,next,P0));setValves(next);}
  function reset(){setCaps(D2_INIT.map(c=>({...c})));setValves({m1:false,m2:false,m3:false,m4:false});setP0(1.0);}
  function updateCap(i,field,val){setCaps(prev=>{const next=prev.map((c,idx)=>idx===i?{...c,[field]:val}:c);return Object.values(valves).some(Boolean)?doEqD2(next,valves,P0):next;});}
  function changeGas(i,newGas){setCaps(prev=>{const next=prev.map((c,idx)=>{if(idx!==i)return c;return newGas==="Boş"?{...c,gas:"Boş",mol:0}:{...c,gas:newGas};});return Object.values(valves).some(Boolean)?doEqD2(next,valves,P0):next;});}
  function handleP0(val){setP0(val);if(Object.values(valves).some(Boolean))setCaps(prev=>doEqD2(prev,valves,val));}

  const pressures=caps.map(c=>(c.V>0&&c.mol>=0)?(c.mol*R*c.T)/c.V:0);
  const allOpen=Object.values(valves).every(Boolean);
  const anyOpen=Object.values(valves).some(Boolean);
  const W=560,H=400;
  const BALL_POS=[{cx:80,cy:115},{cx:80,cy:270},{cx:210,cy:193}];

  function pipeEdge(a,b){
    const r1=balloonRD2(caps[a].V);
    const tx=b===3?CYL.x:BALL_POS[b].cx,ty=b===3?CYL.y+CYL.h/2:BALL_POS[b].cy;
    const r2=b===3?0:balloonRD2(caps[b].V);
    const sx=BALL_POS[a].cx,sy=BALL_POS[a].cy;
    const dx=tx-sx,dy=ty-sy,dist=Math.sqrt(dx*dx+dy*dy),nx=dx/dist,ny=dy/dist;
    return{x1:sx+nx*(r1+5),y1:sy+ny*(r1+5),x2:tx-nx*(r2+5),y2:ty-ny*(r2+5),mx:(sx+tx)/2,my:(sy+ty)/2};
  }
  function pipeEdge01(){
    const r1=balloonRD2(caps[0].V),r2=balloonRD2(caps[1].V);
    const sx=BALL_POS[0].cx,sy=BALL_POS[0].cy,tx=BALL_POS[1].cx,ty=BALL_POS[1].cy;
    const dx=tx-sx,dy=ty-sy,dist=Math.sqrt(dx*dx+dy*dy),nx=dx/dist,ny=dy/dist;
    return{x1:sx+nx*(r1+5),y1:sy+ny*(r1+5),x2:tx-nx*(r2+5),y2:ty-ny*(r2+5),mx:(sx+tx)/2,my:(sy+ty)/2};
  }
  function pipeEdge24(){
    const r1=balloonRD2(caps[2].V);
    const sx=BALL_POS[2].cx,sy=BALL_POS[2].cy,tx=CYL.x,ty=CYL.y+CYL.h/2;
    const dx=tx-sx,dy=ty-sy,dist=Math.sqrt(dx*dx+dy*dy),nx=dx/dist,ny=dy/dist;
    return{x1:sx+nx*(r1+5),y1:sy+ny*(r1+5),x2:tx-4,y2:ty,mx:(sx+tx)/2,my:(sy+ty)/2};
  }
  const PIPES=[
    {...pipeEdge(0,2),key:"m1",label:"M1"},
    {...pipeEdge(1,2),key:"m2",label:"M2"},
    {...pipeEdge01(),key:"m3",label:"M3"},
    {...pipeEdge24(),key:"m4",label:"M4"},
  ];
  const pc=caps[3];
  const px=pistonXD2(pc.V);
  const pcGobj=pc.gas==="Boş"||pc.mol<0.005?{color:"#94a3b8",bg:"#f1f5f9"}:gasInfoD24(pc.gas);
  const gasW=px-CYL.x;
  const MARKS=["A","B","C","D","E"];
  const markSpacing=CYL.maxW/(MARKS.length+1);

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f8fafc",padding:"16px 12px"}}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>🔗 Düzenek 2 — Ayrı Kutular</div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Musluk açılınca kutular birleşir · Son kap pistonlu (P₀ ile denge) · M1:1↔3 · M2:2↔3 · M3:1↔2 · M4:3↔4</div>
      </div>
      <div style={{background:"white",borderRadius:12,padding:"10px 14px",border:"1.5px solid #6366f133",marginBottom:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:800,color:"#6366f1",minWidth:28}}>P₀</span>
        <input type="range" min={0.5} max={3} step={0.05} value={P0} onChange={e=>handleP0(parseFloat(e.target.value))} style={{flex:1,minWidth:80,accentColor:"#6366f1"}}/>
        <input type="number" min={0.5} max={3} step={0.05} value={P0.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0.5&&v<=3)handleP0(v);}} style={{width:58,padding:"3px 6px",borderRadius:8,border:"1.5px solid #6366f155",color:"#6366f1",fontWeight:700,fontSize:12,textAlign:"center",background:"white"}}/>
        <span style={{fontSize:11,color:"#94a3b8"}}>atm</span>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        {[{key:"m1",label:"M1: 1↔3"},{key:"m2",label:"M2: 2↔3"},{key:"m3",label:"M3: 1↔2"},{key:"m4",label:"M4: 3↔4"}].map(({key,label})=>{
          const open=valves[key];
          return(<button key={key} onClick={()=>toggleValve(key)} style={{padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:open?"#dcfce7":"#fee2e2",color:open?"#15803d":"#dc2626",outline:`2px solid ${open?"#22c55e":"#ef4444"}`}}>{label}: {open?"Açık":"Kapalı"}</button>);
        })}
        <button onClick={toggleAll} style={{padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:allOpen?"#fef3c7":"#dcfce7",color:allOpen?"#d97706":"#15803d",outline:`2px solid ${allOpen?"#f59e0b":"#22c55e"}`}}>{allOpen?"Tümünü Kapat":"Tümünü Aç"}</button>
        <button onClick={reset} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:12,fontWeight:600}}>↺ Sıfırla</button>
      </div>

      <div style={{background:"white",borderRadius:16,border:"1px solid #e2e8f0",boxShadow:"0 2px 16px rgba(0,0,0,0.07)",marginBottom:14,overflow:"hidden"}}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
          {PIPES.map(p=>{const open=valves[p.key];return(<g key={p.key}><line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={open?"#22c55e":"#cbd5e1"} strokeWidth={open?4:3} strokeDasharray={open?"none":"8,5"}/><g onClick={()=>toggleValve(p.key)} style={{cursor:"pointer"}}><circle cx={p.mx} cy={p.my} r={13} fill={open?"#dcfce7":"#fee2e2"} stroke={open?"#22c55e":"#ef4444"} strokeWidth={2}/>{open?<rect x={p.mx-6.5} y={p.my-2.5} width={13} height={5} rx={2.5} fill="#22c55e"/>:<rect x={p.mx-2.5} y={p.my-6.5} width={5} height={13} rx={2.5} fill="#ef4444"/>}<text x={p.mx} y={p.my+24} textAnchor="middle" fill={open?"#15803d":"#dc2626"} fontSize={8} fontWeight={700}>{p.label}</text><text x={p.mx} y={p.my+33} textAnchor="middle" fill={open?"#15803d":"#dc2626"} fontSize={7}>{open?"Gaz Girişi":"Kapalı"}</text></g></g>);})}
          {PIPES.map((p,pi)=>{if(!valves[p.key])return null;const t1=((tick+pi*15)%60)/60,t2=((tick+pi*15+30)%60)/60;return(<g key={"fp"+pi}><circle cx={p.x1+(p.x2-p.x1)*t1} cy={p.y1+(p.y2-p.y1)*t1} r={3} fill="#22c55e" opacity={0.85}/><circle cx={p.x1+(p.x2-p.x1)*t2} cy={p.y1+(p.y2-p.y1)*t2} r={2} fill="#4ade80" opacity={0.6}/></g>);})}
          {[0,1,2].map(i=>{const c=caps[i];const isEmpty=c.gas==="Boş"||c.mol<0.005;const gObj=isEmpty?{color:"#94a3b8",bg:"#f1f5f9"}:gasInfoD24(c.gas);const r=balloonRD2(c.V);const P=pressures[i];const pColor=P<0.01?"#94a3b8":P>4?"#ef4444":"#16a34a";const pos=BALL_POS[i];return(<g key={i}><ellipse cx={pos.cx+4} cy={pos.cy+6} rx={r*0.85} ry={r*0.5} fill="rgba(0,0,0,0.05)"/><circle cx={pos.cx} cy={pos.cy} r={r} fill={gObj.bg} stroke={gObj.color} strokeWidth={2.5}/><ellipse cx={pos.cx-r*0.28} cy={pos.cy-r*0.28} rx={r*0.2} ry={r*0.14} fill="white" opacity={0.5}/>{isEmpty?<text x={pos.cx} y={pos.cy+4} textAnchor="middle" fill="#94a3b8" fontSize={12} fontWeight={700}>Boş</text>:<text x={pos.cx} y={pos.cy-11} textAnchor="middle" fill={gObj.color} fontSize={13} fontWeight={900}>{c.gas}</text>}<text x={pos.cx} y={pos.cy+(isEmpty?18:3)} textAnchor="middle" fill="#64748b" fontSize={10}>{c.mol.toFixed(2)} mol</text><text x={pos.cx} y={pos.cy+(isEmpty?30:15)} textAnchor="middle" fill="#0ea5e9" fontSize={10} fontWeight={700}>{c.V.toFixed(2)} L</text><text x={pos.cx} y={pos.cy+(isEmpty?42:27)} textAnchor="middle" fill={pColor} fontSize={11} fontWeight={900}>{P.toFixed(3)} atm</text><circle cx={pos.cx} cy={pos.cy+r} r={4} fill={gObj.color} opacity={0.5}/><text x={pos.cx} y={pos.cy-r-8} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight={700}>{D2_CAP_LABELS[i]}</text></g>);})}
          <rect x={CYL.x} y={CYL.y} width={CYL.maxW} height={CYL.h} rx={8} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2}/>
          <ellipse cx={CYL.x+CYL.maxW} cy={CYL.y+CYL.h/2} rx={10} ry={CYL.h/2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2}/>
          {gasW>2&&<rect x={CYL.x+1} y={CYL.y+2} width={Math.max(0,gasW-1)} height={CYL.h-4} rx={6} fill={pcGobj.bg} opacity={0.85}/>}
          <rect x={px-8} y={CYL.y+4} width={16} height={CYL.h-8} rx={4} fill={pcGobj.color} opacity={0.8}/>
          <text x={px+(CYL.x+CYL.maxW-px)/2} y={CYL.y+CYL.h/2+5} textAnchor="middle" fill="#6366f1" fontSize={11} fontWeight={700}>P₀={P0.toFixed(2)}</text>
          {gasW>30&&pc.mol>=0.005&&<g>{pc.gas!=="Boş"&&<text x={CYL.x+gasW/2} y={CYL.y+CYL.h/2-18} textAnchor="middle" fill={pcGobj.color} fontSize={12} fontWeight={900}>{pc.gas}</text>}<text x={CYL.x+gasW/2} y={CYL.y+CYL.h/2-4} textAnchor="middle" fill="#64748b" fontSize={9}>{pc.mol.toFixed(2)} mol</text><text x={CYL.x+gasW/2} y={CYL.y+CYL.h/2+8} textAnchor="middle" fill="#0ea5e9" fontSize={9} fontWeight={700}>{pc.V.toFixed(2)} L</text><text x={CYL.x+gasW/2} y={CYL.y+CYL.h/2+20} textAnchor="middle" fill="#16a34a" fontSize={11} fontWeight={900}>{pressures[3].toFixed(3)} atm</text></g>}
          <text x={CYL.x+CYL.maxW/2} y={CYL.y-10} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight={700}>{D2_CAP_LABELS[3]}</text>
          {MARKS.map((m,mi)=>{const mx=CYL.x+markSpacing*(mi+1);const near=Math.abs(mx-px)<markSpacing/2;return(<g key={m}><line x1={mx} y1={CYL.y+CYL.h} x2={mx} y2={CYL.y+CYL.h+8} stroke={near?"#6366f1":"#94a3b8"} strokeWidth={near?2:1.5}/><text x={mx} y={CYL.y+CYL.h+18} textAnchor="middle" fill={near?"#6366f1":"#94a3b8"} fontSize={10} fontWeight={near?900:600}>{m}</text></g>);})}
          <text x={W/2} y={H-8} textAnchor="middle" fill="#cbd5e1" fontSize={9}>M1:1↔3 · M2:2↔3 · M3:1↔2 · M4:3↔4(pistonlu) · Musluğa tıkla → aç/kapat</text>
        </svg>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        {caps.map((c,i)=>{
          const P=pressures[i];const borderC=D2_CARD_BORDERS[i];const bgC=D2_CARD_BGS[i];const isPiston=i===3;
          return(<div key={i} style={{flex:"1 1 175px",background:bgC,borderRadius:14,padding:"12px 14px",border:`1.5px solid ${borderC}44`,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <span style={{fontSize:13,fontWeight:800,color:borderC}}>{D2_CAP_LABELS[i]}</span>
              <span style={{fontSize:13,fontWeight:900,color:P<0.01?"#94a3b8":"#16a34a"}}>{P.toFixed(3)} atm</span>
            </div>
            {isPiston&&<div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,background:"#eef2ff",borderRadius:6,padding:"3px 8px"}}>🔩 Pistonlu — V otomatik, P = P₀</div>}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4,fontWeight:600}}>GAZ CİNSİ</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                {[...GAS_LIST_D24.map(g=>g.label),"Boş"].map(g=>{const active=c.gas===g;const gObj=g==="Boş"?{color:"#94a3b8",bg:"#f1f5f9"}:gasInfoD24(g);return(<button key={g} onClick={()=>changeGas(i,g)} style={{padding:"2px 7px",borderRadius:10,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:active?gObj.bg:"white",color:active?gObj.color:"#cbd5e1",outline:active?`1.5px solid ${gObj.color}`:"1px solid #e2e8f0"}}>{g}</button>);})}
              </div>
            </div>
            {[{label:"n (mol)",field:"mol",min:0,max:2,step:0.01,color:"#7c3aed",fmt:2},{label:"V (L)",field:"V",min:0.5,max:12,step:0.1,color:"#0ea5e9",fmt:2,readOnly:isPiston},{label:"T (K)",field:"T",min:100,max:800,step:5,color:"#f59e0b",fmt:0}].map(({label,field,min,max,step,color,fmt,readOnly})=>(
              <div key={field} style={{marginBottom:8}}>
                <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>{label}{readOnly?" (otomatik)":""}</span>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                  <input type="range" min={min} max={max} step={step} value={c[field]} disabled={readOnly} onChange={e=>!readOnly&&updateCap(i,field,parseFloat(e.target.value))} style={{flex:1,accentColor:color,opacity:readOnly?0.35:1}}/>
                  <input type="number" min={min} max={max} step={step} value={Number(c[field]).toFixed(fmt)} readOnly={readOnly} onChange={e=>{if(readOnly)return;const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=min&&v<=max)updateCap(i,field,v);}} style={{width:52,padding:"2px 5px",borderRadius:7,border:`1.5px solid ${color}${readOnly?"22":"66"}`,color:readOnly?"#94a3b8":color,fontWeight:700,fontSize:11,textAlign:"center",background:readOnly?"#f8fafc":"white"}}/>
                </div>
              </div>
            ))}
          </div>);
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DÜZENEK 3
// ══════════════════════════════════════════════════════════════
function Duzenek3() {
  const [mol,setMol]=useState(0.5);
  const [T,setT]=useState(300);
  const [P0,setP0]=useState(1.0);
  const [engel,setEngel]=useState(6);
  const [valveOpen,setValveOpen]=useState(false);
  const [addMol,setAddMol]=useState(0.1);
  const [animTick,setAnimTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setAnimTick(x=>x+1),80);return()=>clearInterval(t);},[]);

  const V=mol*R*T/P0;
  const engelHit=V>=engel;
  const pistonV=engelHit?engel:V;
  const finalP=engelHit?(mol*R*T)/engel:P0;
  const SW=900,SH=280,CY=60,CH=160,LEFT=80,CW=720;
  const scale=CW/12;
  const pistonX=LEFT+pistonV*scale;
  const engelX=LEFT+engel*scale;
  const particleCount=Math.max(5,Math.min(20,Math.round(mol*12)));
  const particles=Array.from({length:particleCount},(_,i)=>{
    const sp=0.15+(T/300)*0.38;
    const seed=i*173.1+animTick*sp;
    const px=LEFT+16+((Math.sin(seed*0.61+i)*0.5+0.5)*(Math.min(pistonX-LEFT,CW)-32));
    const py=CY+16+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(CH-32));
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
        {valveOpen&&<><button onClick={()=>setMol(m=>Math.max(0.05,m-addMol))} style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626",fontWeight:700}}>−</button><Slider label="" value={addMol} min={0.05} max={0.5} step={0.05} unit="mol" color="#22c55e" onChange={setAddMol}/><button onClick={()=>setMol(m=>m+addMol)} style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"#dcfce7",color:"#16a34a",fontWeight:700}}>+</button></>}
        <div style={{width:1,height:22,background:"#e2e8f0"}}/>
        <div style={{background:engelHit?"#fee2e2":"#dcfce7",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:engelHit?"#dc2626":"#16a34a"}}>{engelHit?"🔴 İzokor — V sabit":"🟢 İzobar — P sabit"}</div>
        <button onClick={()=>{setMol(0.5);setValveOpen(false);}} style={{padding:"4px 10px",borderRadius:7,border:"1px solid #e2e8f0",background:"white",color:"#94a3b8",cursor:"pointer",fontSize:10}}>↺ Sıfırla</button>
      </div>

      <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" style={{display:"block",borderRadius:16,background:"white",border:"1px solid #e2e8f0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",marginBottom:8}}>
        <defs><marker id="a3" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto"><path d="M7,0 L7,7 L0,3.5z" fill="#94a3b8"/></marker></defs>
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
        {["A","B","C","D","E","F","G","H"].map((m,i)=>{
          const mx=LEFT+(i+0.5)*(CW/8);
          return <g key={m}><line x1={mx} y1={CY+CH} x2={mx} y2={CY+CH+8} stroke="#94a3b8" strokeWidth={1.5}/><text x={mx} y={CY+CH+18} textAnchor="middle" fill="#64748b" fontSize={10}>{m}</text></g>;
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

// ══════════════════════════════════════════════════════════════
// DÜZENEK 4 (Balon Sistemi)
// ══════════════════════════════════════════════════════════════
function doEqD4(caps, valves) {
  const par=[0,1,2];
  const find=(x)=>par[x]===x?x:(par[x]=find(par[x]));
  const union=(a,b)=>{par[find(a)]=find(b);};
  if(valves.m1)union(0,1);if(valves.m2)union(1,2);if(valves.m3)union(0,2);
  const groups={};
  for(let i=0;i<3;i++){const root=find(i);if(!groups[root])groups[root]={totalMol:0,sumVT:0,idx:[]};groups[root].totalMol+=caps[i].mol;groups[root].sumVT+=caps[i].V/caps[i].T;groups[root].idx.push(i);}
  const next=caps.map(c=>({...c}));
  for(const g of Object.values(groups)){
    if(g.idx.length<2)continue;
    const Peq=(g.totalMol*R)/g.sumVT;
    const gasNames=g.idx.map(i=>caps[i].gas).filter(n=>n!=="Boş");
    const sharedGas=gasNames.length===0?"Boş":gasNames.every(n=>n===gasNames[0])?gasNames[0]:"Karışım";
    for(const i of g.idx){const nm=(Peq*caps[i].V)/(R*caps[i].T);next[i]={...next[i],mol:nm,gas:nm<0.005?"Boş":sharedGas};}
  }
  return next;
}
const D4_INIT=[{gas:"Ne",mol:0.16,V:2.00,T:300},{gas:"Boş",mol:0.00,V:2.00,T:300},{gas:"SO₃",mol:0.24,V:1.00,T:300}];
function balloonRD4(V){return Math.max(42,Math.min(80,42+((V-0.5)/9.5)*38));}

function Duzenek4() {
  const [caps,setCaps]=useState(D4_INIT.map(c=>({...c})));
  const [valves,setValves]=useState({m1:false,m2:false,m3:false});
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>(x+1)%60),80);return()=>clearInterval(t);},[]);

  function toggleValve(key){const next={...valves,[key]:!valves[key]};setCaps(prev=>doEqD4(prev,next));setValves(next);}
  function toggleAll(){const a=Object.values(valves).every(Boolean);const next={m1:!a,m2:!a,m3:!a};setCaps(prev=>doEqD4(prev,next));setValves(next);}
  function reset(){setCaps(D4_INIT.map(c=>({...c})));setValves({m1:false,m2:false,m3:false});}
  function updateCap(i,field,val){setCaps(prev=>{const next=prev.map((c,idx)=>idx===i?{...c,[field]:val}:c);return Object.values(valves).some(Boolean)?doEqD4(next,valves):next;});}
  function changeGas(i,newGas){setCaps(prev=>{const next=prev.map((c,idx)=>{if(idx!==i)return c;return newGas==="Boş"?{...c,gas:"Boş",mol:0}:{...c,gas:newGas};});return Object.values(valves).some(Boolean)?doEqD4(next,valves):next;});}

  const pressures=caps.map(c=>(c.V>0&&c.mol>=0)?(c.mol*R*c.T)/c.V:0);
  const allOpen=Object.values(valves).every(Boolean);
  const anyOpen=Object.values(valves).some(Boolean);
  const W=520,H=380;
  const BASE_POS=[{cx:120,cy:135},{cx:400,cy:135},{cx:260,cy:285}];

  function pipeEdge(a,b){
    const r1=balloonRD4(caps[a].V),r2=balloonRD4(caps[b].V);
    const dx=BASE_POS[b].cx-BASE_POS[a].cx,dy=BASE_POS[b].cy-BASE_POS[a].cy;
    const dist=Math.sqrt(dx*dx+dy*dy),nx=dx/dist,ny=dy/dist;
    return{x1:BASE_POS[a].cx+nx*(r1+5),y1:BASE_POS[a].cy+ny*(r1+5),x2:BASE_POS[b].cx-nx*(r2+5),y2:BASE_POS[b].cy-ny*(r2+5),mx:(BASE_POS[a].cx+BASE_POS[b].cx)/2,my:(BASE_POS[a].cy+BASE_POS[b].cy)/2};
  }
  const PIPES=[{...pipeEdge(0,1),key:"m1",label:"M1"},{...pipeEdge(1,2),key:"m2",label:"M2"},{...pipeEdge(0,2),key:"m3",label:"M3"}];

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f8fafc",padding:"16px 12px"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>🫧 Düzenek 4 — Balon Sistemi</div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Her balona direkt boru · M1: 1↔2 · M2: 2↔3 · M3: 1↔3 · Musluk açılınca basınç eşitleniyor</div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        {[{key:"m1",label:"M1: 1↔2"},{key:"m2",label:"M2: 2↔3"},{key:"m3",label:"M3: 1↔3"}].map(({key,label})=>{const open=valves[key];return(<button key={key} onClick={()=>toggleValve(key)} style={{padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:open?"#dcfce7":"#fee2e2",color:open?"#15803d":"#dc2626",outline:`2px solid ${open?"#22c55e":"#ef4444"}`}}>{label}: {open?"Açık":"Kapalı"}</button>);})}
        <button onClick={toggleAll} style={{padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:allOpen?"#fef3c7":"#dcfce7",color:allOpen?"#d97706":"#15803d",outline:`2px solid ${allOpen?"#f59e0b":"#22c55e"}`}}>{allOpen?"Tümünü Kapat":"Tümünü Aç"}</button>
        <button onClick={reset} style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>↺ Sıfırla</button>
      </div>
      <div style={{background:"white",borderRadius:16,border:"1px solid #e2e8f0",boxShadow:"0 2px 16px rgba(0,0,0,0.07)",marginBottom:14,overflow:"hidden"}}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
          {PIPES.map(p=>{const open=valves[p.key];return(<g key={p.key}><line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={open?"#22c55e":"#cbd5e1"} strokeWidth={open?4:3} strokeDasharray={open?"none":"8,5"}/><g onClick={()=>toggleValve(p.key)} style={{cursor:"pointer"}}><circle cx={p.mx} cy={p.my} r={15} fill={open?"#dcfce7":"#fee2e2"} stroke={open?"#22c55e":"#ef4444"} strokeWidth={2}/>{open?<rect x={p.mx-8} y={p.my-3} width={16} height={6} rx={3} fill="#22c55e"/>:<rect x={p.mx-3} y={p.my-8} width={6} height={16} rx={3} fill="#ef4444"/>}<text x={p.mx} y={p.my+29} textAnchor="middle" fill={open?"#15803d":"#dc2626"} fontSize={9} fontWeight={700}>{p.label}</text><text x={p.mx} y={p.my+39} textAnchor="middle" fill={open?"#15803d":"#dc2626"} fontSize={8}>{open?"Gaz Girişi":"Kapalı"}</text></g></g>);})}
          {PIPES.map((p,pi)=>{if(!valves[p.key])return null;const t1=((tick+pi*20)%60)/60,t2=((tick+pi*20+30)%60)/60;return(<g key={"fp"+pi}><circle cx={p.x1+(p.x2-p.x1)*t1} cy={p.y1+(p.y2-p.y1)*t1} r={3.5} fill="#22c55e" opacity={0.85}/><circle cx={p.x1+(p.x2-p.x1)*t2} cy={p.y1+(p.y2-p.y1)*t2} r={2.5} fill="#4ade80" opacity={0.6}/></g>);})}
          {BASE_POS.map((pos,i)=>{const c=caps[i];const isEmpty=c.gas==="Boş"||c.mol<0.005;const gObj=isEmpty?{color:"#94a3b8",bg:"#f1f5f9"}:gasInfoD24(c.gas);const r=balloonRD4(c.V);const P=pressures[i];const pColor=P<0.01?"#94a3b8":P>4?"#ef4444":"#16a34a";return(<g key={i}><ellipse cx={pos.cx+5} cy={pos.cy+8} rx={r*0.85} ry={r*0.5} fill="rgba(0,0,0,0.06)"/><circle cx={pos.cx} cy={pos.cy} r={r} fill={gObj.bg} stroke={gObj.color} strokeWidth={2.5}/><ellipse cx={pos.cx-r*0.28} cy={pos.cy-r*0.28} rx={r*0.2} ry={r*0.14} fill="white" opacity={0.55}/>{isEmpty?<text x={pos.cx} y={pos.cy+4} textAnchor="middle" fill="#94a3b8" fontSize={14} fontWeight={700}>Boş</text>:<text x={pos.cx} y={pos.cy-12} textAnchor="middle" fill={gObj.color} fontSize={15} fontWeight={900}>{c.gas}</text>}<text x={pos.cx} y={pos.cy+(isEmpty?20:5)} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>{c.mol.toFixed(2)} mol</text><text x={pos.cx} y={pos.cy+(isEmpty?34:19)} textAnchor="middle" fill="#0ea5e9" fontSize={11} fontWeight={700}>{c.V.toFixed(2)} L</text><text x={pos.cx} y={pos.cy+(isEmpty?48:33)} textAnchor="middle" fill={pColor} fontSize={13} fontWeight={900}>{P.toFixed(3)} atm</text><circle cx={pos.cx} cy={pos.cy+r} r={5} fill={gObj.color} opacity={0.5}/><text x={pos.cx} y={pos.cy-r-12} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={700}>{i+1}. Kap</text></g>);})}
          <text x={W/2} y={H-8} textAnchor="middle" fill="#cbd5e1" fontSize={9}>Musluğa tıkla → aç/kapat · Açık muslukların bağlı kapları basınç eşitler</text>
        </svg>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        {caps.map((c,i)=>{const P=pressures[i];const borderC=["#7c3aed","#0284c7","#be185d"][i];const bgC=["#faf5ff","#f0f9ff","#fff1f2"][i];return(<div key={i} style={{flex:"1 1 190px",background:bgC,borderRadius:14,padding:"12px 14px",border:`1.5px solid ${borderC}44`,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:14,fontWeight:800,color:borderC}}>{i+1}. Kap</span><span style={{fontSize:14,fontWeight:900,color:P<0.01?"#94a3b8":"#16a34a"}}>{P.toFixed(3)} atm</span></div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:5,fontWeight:600}}>GAZ CİNSİ</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{[...GAS_LIST_D24.map(g=>g.label),"Boş"].map(g=>{const active=c.gas===g;const gObj=g==="Boş"?{color:"#94a3b8",bg:"#f1f5f9"}:gasInfoD24(g);return(<button key={g} onClick={()=>changeGas(i,g)} style={{padding:"3px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:active?gObj.bg:"white",color:active?gObj.color:"#cbd5e1",outline:active?`1.5px solid ${gObj.color}`:"1px solid #e2e8f0"}}>{g}</button>);})}</div></div>
          {[{label:"n (mol)",field:"mol",min:0,max:2,step:0.01,color:"#7c3aed",fmt:2},{label:"V (L)",field:"V",min:0.5,max:10,step:0.1,color:"#0ea5e9",fmt:2},{label:"T (K)",field:"T",min:100,max:800,step:5,color:"#f59e0b",fmt:0}].map(({label,field,min,max,step,color,fmt})=>(<div key={field} style={{marginBottom:10}}><span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{label}</span><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><input type="range" min={min} max={max} step={step} value={c[field]} onChange={e=>updateCap(i,field,parseFloat(e.target.value))} style={{flex:1,accentColor:color}}/><input type="number" min={min} max={max} step={step} value={Number(c[field]).toFixed(fmt)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=min&&v<=max)updateCap(i,field,v);}} style={{width:58,padding:"3px 6px",borderRadius:8,border:`1.5px solid ${color}66`,color,fontWeight:700,fontSize:12,textAlign:"center",outline:"none",background:"white"}}/></div></div>))}
        </div>);})}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EĞİTİM
// ══════════════════════════════════════════════════════════════
function Egitim() {
  const laws=[
    {title:"Boyle Yasası",formula:"P₁V₁ = P₂V₂",note:"T sabit",color:"#f97316",steps:[{l:"V=2L",n:0.5,V:2,T:300},{l:"V=4L",n:0.5,V:4,T:300},{l:"V=6L",n:0.5,V:6,T:300},{l:"V=8L",n:0.5,V:8,T:300}]},
    {title:"Charles Yasası",formula:"V₁/T₁ = V₂/T₂",note:"P sabit",color:"#3b82f6",steps:[{l:"T=150K",n:0.5,V:4,T:150},{l:"T=300K",n:0.5,V:8,T:300},{l:"T=450K",n:0.5,V:12,T:450},{l:"T=600K",n:0.5,V:16,T:600}]},
    {title:"Gay-Lussac",formula:"P₁/T₁ = P₂/T₂",note:"V sabit",color:"#22c55e",steps:[{l:"T=200K",n:0.5,V:5,T:200},{l:"T=400K",n:0.5,V:5,T:400},{l:"T=600K",n:0.5,V:5,T:600},{l:"T=800K",n:0.5,V:5,T:800}]},
  ];
  return(
    <div>
      {laws.map(law=>(
        <div key={law.title} style={{background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:800,color:law.color}}>{law.title}</span>
            <span style={{fontSize:11,fontFamily:"monospace",background:"#f8fafc",padding:"2px 8px",borderRadius:5}}>{law.formula}</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>{law.note}</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["Adım","n(mol)","V(L)","T(K)","P(atm)","PV"].map(h=><th key={h} style={{padding:"3px 7px",color:"#94a3b8",textAlign:"left",fontWeight:600,borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
            <tbody>{law.steps.map(s=>{const P=(s.n*R*s.T)/s.V;return(<tr key={s.l}><td style={{padding:"3px 7px",color:law.color,fontWeight:700}}>{s.l}</td><td style={{padding:"3px 7px"}}>{s.n}</td><td style={{padding:"3px 7px",color:"#0ea5e9"}}>{s.V}</td><td style={{padding:"3px 7px",color:tempClr(s.T)}}>{s.T}</td><td style={{padding:"3px 7px",color:pClr(P),fontWeight:700}}>{P.toFixed(3)}</td><td style={{padding:"3px 7px"}}>{(P*s.V).toFixed(3)}</td></tr>);})}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]=useState("d1");
  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Inter',system-ui,sans-serif",color:"#1e293b"}}>
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"8px 14px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>⚗️ Gaz Laboratuvarı</div>
            <div style={{fontSize:9,color:"#94a3b8"}}>PV=nRT · İdeal Pistonlar · Gaz Yasaları</div>
          </div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap",marginLeft:"auto",background:"#f8fafc",borderRadius:10,padding:3,border:"1px solid #e2e8f0"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:tab===t.id?"white":"transparent",color:tab===t.id?"#6366f1":"#94a3b8",boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:1000,margin:"0 auto",padding:"12px"}}>
        {tab==="d1"&&<Duzenek1/>}
        {tab==="d2"&&<Duzenek2/>}
        {tab==="d3"&&<Duzenek3/>}
        {tab==="d4"&&<Duzenek4/>}
        {tab==="edu"&&<Egitim/>}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter,
  PieChart, Pie, Cell
} from "recharts";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const R = 0.0821;
const NA = 6.022e23;
const KB = 1.38e-23;

const GAS_PRESETS = [
  { label:"He",  color:"#f87171", molar:4,  a:0.034, b:0.0237 },
  { label:"H₂",  color:"#fb923c", molar:2,  a:0.244, b:0.0266 },
  { label:"N₂",  color:"#facc15", molar:28, a:1.39,  b:0.0391 },
  { label:"O₂",  color:"#4ade80", molar:32, a:1.36,  b:0.0318 },
  { label:"CH₄", color:"#60a5fa", molar:16, a:2.25,  b:0.0428 },
  { label:"Ne",  color:"#c084fc", molar:20, a:0.211, b:0.0171 },
  { label:"CO₂", color:"#f472b6", molar:44, a:3.59,  b:0.0427 },
];

// Soft pastel fills for chambers (like textbook)
const CHAMBER_FILLS = [
  { bg:"#fff0f0", border:"#f87171", particle:"#ef4444" },
  { bg:"#fffbeb", border:"#f59e0b", particle:"#d97706" },
  { bg:"#f0fdf4", border:"#4ade80", particle:"#16a34a" },
  { bg:"#eff6ff", border:"#60a5fa", particle:"#2563eb" },
];

const TABS = [
  { id:"sim",     icon:"🔬", label:"Simülasyon"        },
  { id:"graphs",  icon:"📊", label:"Grafikler"         },
  { id:"maxwell", icon:"⚡", label:"Maxwell-Boltzmann"  },
  { id:"edu",     icon:"🎓", label:"Eğitim Modu"       },
  { id:"realgas", icon:"⚗️", label:"Gerçek Gaz"        },
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const idealP  = (n,T,V) => V>0&&n>0 ? (n*R*T)/V : 0;
const vdwP    = (n,T,V,a,b) => { const Vm=V/n; if(Vm<=b||n<=0)return 0; return (R*T)/(Vm-b)-a/(Vm*Vm); };
const gasObj  = (label) => GAS_PRESETS.find(g=>g.label===label)||GAS_PRESETS[0];
const tempClr = (T) => { const t=Math.max(0,Math.min(1,(T-50)/950)); return `hsl(${Math.round(240-t*240)},80%,50%)`; };
const pClr    = (P) => { const t=Math.max(0,Math.min(1,P/5)); return `hsl(${Math.round(120-t*120)},70%,45%)`; };

function defaultChambers(n) {
  return [
    { gas:"CH₄", mol:0.6, V:5, T:300 },
    { gas:"He",  mol:0.3, V:2, T:300 },
    { gas:"H₂",  mol:0.4, V:3, T:300 },
    { gas:"Ne",  mol:0.5, V:4, T:300 },
  ].slice(0,n);
}

// ═══════════════════════════════════════════
// MINI UI COMPONENTS
// ═══════════════════════════════════════════
function Pill({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer",
      fontSize:11, fontWeight:600, transition:"all .15s",
      background: active?(color?color+"22":"#e2e8f0"):"transparent",
      color: active?(color||"#1e293b"):"#94a3b8",
      outline: active?`1.5px solid ${color||"#94a3b8"}`:"none",
    }}>{children}</button>
  );
}

function Slider({ label, value, min, max, step, unit, color, onChange }) {
  const [inputVal, setInputVal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(()=>{ if(!focused) setInputVal(String(value)); },[value,focused]);
  function commit(raw) {
    const n=parseFloat(raw);
    if(!isNaN(n)){ const c=Math.max(min,Math.min(max,n)); onChange(c); setInputVal(String(c)); }
    else setInputVal(String(value));
  }
  const acc=color||"#6366f1";
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
        <span style={{fontSize:11,color:"#64748b"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <input type="number" min={min} max={max} step={step} value={inputVal}
            onFocus={()=>setFocused(true)}
            onChange={e=>setInputVal(e.target.value)}
            onBlur={e=>{setFocused(false);commit(e.target.value);}}
            onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}
            style={{width:60,padding:"2px 5px",borderRadius:5,border:`1px solid ${focused?acc:"#e2e8f0"}`,
              background:"#f8fafc",color:acc,fontSize:11,fontWeight:700,textAlign:"right",outline:"none"}}/>
          <span style={{fontSize:10,color:"#94a3b8",minWidth:22}}>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>{const v=parseFloat(e.target.value);onChange(v);setInputVal(String(v));}}
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
      <div style={{fontSize:9,color:"#94a3b8",marginBottom:1}}>{label}</div>
      <div style={{fontSize:14,fontWeight:800,color:color||"#1e293b"}}>{value}</div>
      <div style={{fontSize:9,color:"#cbd5e1"}}>{unit}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8,marginTop:2}}>{children}</div>;
}

// ═══════════════════════════════════════════
// 3D VALVE SVG (turuncu, gerçekçi)
// ═══════════════════════════════════════════
function Valve3D({ cx, cy, open, onClick, label, size=1 }) {
  const s = size;
  const bodyColor  = open ? "#15803d" : "#dc2626";
  const handleColor= open ? "#16a34a" : "#ef4444";
  const pipeColor  = "#94a3b8";
  return (
    <g onClick={onClick} style={{cursor:"pointer"}} transform={`translate(${cx},${cy})`}>
      {/* Pipe left */}
      <rect x={-20*s} y={-5*s} width={12*s} height={10*s} rx={2*s} fill={pipeColor}/>
      <rect x={-20*s} y={-3*s} width={12*s} height={2*s} fill="#cbd5e1"/>
      {/* Pipe right */}
      <rect x={8*s} y={-5*s} width={12*s} height={10*s} rx={2*s} fill={pipeColor}/>
      <rect x={8*s} y={-3*s} width={12*s} height={2*s} fill="#cbd5e1"/>
      {/* Valve body */}
      <ellipse cx={0} cy={0} rx={10*s} ry={10*s} fill="#d97706"/>
      <ellipse cx={0} cy={0} rx={8*s} ry={8*s} fill="#f59e0b"/>
      <ellipse cx={-2*s} cy={-2*s} rx={3*s} ry={3*s} fill="#fde68a" opacity={0.6}/>
      {/* Inner circle (open/close indicator) */}
      <circle cx={0} cy={0} r={4*s} fill={bodyColor}/>
      {/* Handle */}
      {open
        ? <rect x={-8*s} y={-3*s} width={16*s} height={5*s} rx={2*s} fill={handleColor}/>
        : <rect x={-2.5*s} y={-10*s} width={5*s} height={16*s} rx={2*s} fill={handleColor}/>
      }
      {/* Label */}
      <text y={-16*s} textAnchor="middle" fill={bodyColor} fontSize={9*s} fontWeight={700}>{label}</text>
      <text y={20*s} textAnchor="middle" fill={bodyColor} fontSize={7*s} fontWeight={600}>
        {open?"AÇIK":"KAPALI"}
      </text>
    </g>
  );
}

// ═══════════════════════════════════════════
// 3D CYLINDER (cam efektli)
// ═══════════════════════════════════════════
function Cylinder3D({ x, y, w, h, fillColor, borderColor, label, children }) {
  const rx = 14; // ellipse x radius for 3D effect
  const ry = 8;
  return (
    <g>
      <defs>
        <linearGradient id={`cyl-${label}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={borderColor} stopOpacity={0.3}/>
          <stop offset="30%" stopColor={fillColor} stopOpacity={0.95}/>
          <stop offset="70%" stopColor={fillColor} stopOpacity={0.9}/>
          <stop offset="100%" stopColor={borderColor} stopOpacity={0.4}/>
        </linearGradient>
        <linearGradient id={`shine-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity={0.5}/>
          <stop offset="40%" stopColor="white" stopOpacity={0.05}/>
          <stop offset="100%" stopColor="black" stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      {/* Main body */}
      <rect x={x} y={y+ry} width={w} height={h-ry*2} fill={`url(#cyl-${label})`} stroke={borderColor} strokeWidth={1.5}/>
      {/* Left cap */}
      <ellipse cx={x} cy={y+h/2} rx={rx} ry={h/2} fill={fillColor} stroke={borderColor} strokeWidth={1.5} opacity={0.7}/>
      <ellipse cx={x} cy={y+h/2} rx={rx*0.5} ry={h/2*0.5} fill="white" opacity={0.15}/>
      {/* Right cap */}
      <ellipse cx={x+w} cy={y+h/2} rx={rx} ry={h/2} fill={fillColor} stroke={borderColor} strokeWidth={1.5} opacity={0.8}/>
      {/* Shine overlay */}
      <rect x={x} y={y+ry} width={w} height={h-ry*2} fill={`url(#shine-${label})`}/>
      {/* Top shine line */}
      <line x1={x+rx} y1={y+ry+4} x2={x+w-rx} y2={y+ry+4} stroke="white" strokeWidth={1.5} opacity={0.4} strokeLinecap="round"/>
      {children}
    </g>
  );
}

// ═══════════════════════════════════════════
// 3D PISTON
// ═══════════════════════════════════════════
function Piston3D({ x, y, h, onMouseDown }) {
  const pw = 16;
  return (
    <g style={{cursor:"ew-resize"}} onMouseDown={onMouseDown}>
      <defs>
        <linearGradient id="piston-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#475569"/>
          <stop offset="40%" stopColor="#94a3b8"/>
          <stop offset="60%" stopColor="#cbd5e1"/>
          <stop offset="100%" stopColor="#64748b"/>
        </linearGradient>
      </defs>
      <rect x={x-pw/2} y={y} width={pw} height={h} fill="url(#piston-grad)" rx={3} stroke="#475569" strokeWidth={1.5}/>
      {/* Rings */}
      {[0.25,0.5,0.75].map((f,i)=>(
        <rect key={i} x={x-pw/2} y={y+h*f-2} width={pw} height={4} fill="#94a3b8" opacity={0.6}/>
      ))}
      {/* Shine */}
      <rect x={x-pw/2+2} y={y+4} width={3} height={h-8} fill="white" opacity={0.2} rx={1}/>
      {/* Arrow hints */}
      <text x={x} y={y-6} textAnchor="middle" fill="#94a3b8" fontSize={9}>↔</text>
    </g>
  );
}

// ═══════════════════════════════════════════
// TAB 1 — SIMULATION
// ═══════════════════════════════════════════
function SimTab({ chambers, setChambers, numChambers, setNumChambers,
                  leftOpen, setLeftOpen, rightOpen, setRightOpen,
                  leftP, setLeftP, rightP, setRightP }) {
  const [selected, setSelected] = useState(0);
  const [animTick, setAnimTick] = useState(0);
  const [dragPiston, setDragPiston] = useState(null);
  const svgRef = useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setAnimTick(x=>x+1),70); return()=>clearInterval(t); },[]);
  useEffect(()=>{ setChambers(defaultChambers(numChambers)); setSelected(0); },[numChambers]);

  function equilibrate() {
    setChambers(prev=>{
      let chs=prev.map(c=>({...c}));
      const totalV=chs.reduce((s,c)=>s+c.V,0);
      for(let iter=0;iter<400;iter++){
        const ps=chs.map(c=>idealP(c.mol,c.T,c.V));
        for(let i=0;i<chs.length-1;i++){
          const diff=ps[i]-ps[i+1]; const dV=diff*0.008;
          chs[i]={...chs[i],V:Math.max(0.1,chs[i].V-dV)};
          chs[i+1]={...chs[i+1],V:Math.max(0.1,chs[i+1].V+dV)};
        }
        if(leftOpen){ const diff=ps[0]-leftP; chs[0]={...chs[0],V:Math.max(0.1,chs[0].V-diff*0.008)}; }
        if(rightOpen){ const n=chs.length-1; const diff=ps[n]-rightP; chs[n]={...chs[n],V:Math.max(0.1,chs[n].V-diff*0.008)}; }
        if(!leftOpen&&!rightOpen){ const cur=chs.reduce((s,c)=>s+c.V,0); chs=chs.map(c=>({...c,V:c.V*totalV/cur})); }
      }
      return chs;
    });
  }

  // SVG layout
  const SVG_W=900, SVG_H=320;
  const CY=50, CH=160;
  const WALL_W=80, ATMO_W=80;
  const containerW=SVG_W-WALL_W-ATMO_W;
  const totalV=chambers.reduce((s,c)=>s+c.V,0);
  const widths=chambers.map(c=>(c.V/totalV)*containerW);
  let xc=WALL_W;
  const rects=widths.map(w=>{ const x=xc; xc+=w; return{x,w,cx:x+w/2}; });
  const pistonXs=[]; let acc=WALL_W;
  for(let i=0;i<chambers.length-1;i++){ acc+=widths[i]; pistonXs.push(acc); }
  const rightEdge=WALL_W+containerW;
  const VALVE_Y=CY+CH+40;

  function onMouseMove(e){
    if(dragPiston===null)return;
    const r=svgRef.current.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(SVG_W/r.width);
    setChambers(prev=>{
      const chs=[...prev]; const i=dragPiston;
      const lb=rects[i].x+20; const rb=rects[i].x+widths[i]+(rects[i+1]?widths[i+1]:0)-20;
      const cx=Math.max(lb,Math.min(rb,mx));
      const delta=cx-(rects[i].x+widths[i]);
      chs[i]={...chs[i],V:Math.max(0.1,chs[i].V+delta/containerW*totalV)};
      chs[i+1]={...chs[i+1],V:Math.max(0.1,chs[i+1].V-delta/containerW*totalV)};
      return chs;
    });
  }

  function getParticles(rect,T,color,idx){
    const count=Math.max(4,Math.min(20,Math.round(chambers[idx].mol*12)));
    return Array.from({length:count},(_,i)=>{
      const speed=0.2+(T/300)*0.4;
      const seed=i*173.1+idx*700+animTick*speed;
      const px=rect.x+20+((Math.sin(seed*0.61+i)*0.5+0.5)*(rect.w-40));
      const py=CY+16+((Math.cos(seed*0.43+i*1.3)*0.5+0.5)*(CH-32));
      return <circle key={i} cx={px} cy={py} r={4} fill={color} opacity={0.75}/>;
    });
  }

  const ch=chambers[selected]||chambers[0];
  const P=idealP(ch.mol,ch.T,ch.V);
  const cf=CHAMBER_FILLS[selected%CHAMBER_FILLS.length];

  return (
    <div>
      {/* Top controls — compact */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,alignItems:"center",
        background:"#f8fafc",borderRadius:10,padding:"8px 12px",border:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>BÖLME:</span>
          {[2,3,4].map(n=><Pill key={n} active={numChambers===n} onClick={()=>setNumChambers(n)}>{n}</Pill>)}
        </div>
        <div style={{width:1,height:20,background:"#e2e8f0"}}/>
        {/* M1 */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>M₁:</span>
          <button onClick={()=>setLeftOpen(o=>!o)} style={{
            padding:"3px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,
            background:leftOpen?"#dcfce7":"#fee2e2",color:leftOpen?"#16a34a":"#dc2626"
          }}>{leftOpen?"AÇIK":"KAPALI"}</button>
          {leftOpen&&<input type="range" min={0.1} max={5} step={0.1} value={leftP}
            onChange={e=>setLeftP(parseFloat(e.target.value))}
            style={{width:60,accentColor:"#16a34a"}}/>}
          {leftOpen&&<span style={{fontSize:10,color:"#16a34a",fontWeight:700,minWidth:40}}>{leftP.toFixed(1)}atm</span>}
        </div>
        <div style={{width:1,height:20,background:"#e2e8f0"}}/>
        {/* M2 */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>M₂:</span>
          <button onClick={()=>setRightOpen(o=>!o)} style={{
            padding:"3px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,
            background:rightOpen?"#dcfce7":"#fee2e2",color:rightOpen?"#16a34a":"#dc2626"
          }}>{rightOpen?"AÇIK":"KAPALI"}</button>
          {rightOpen&&<input type="range" min={0.1} max={5} step={0.1} value={rightP}
            onChange={e=>setRightP(parseFloat(e.target.value))}
            style={{width:60,accentColor:"#16a34a"}}/>}
          {rightOpen&&<span style={{fontSize:10,color:"#16a34a",fontWeight:700,minWidth:40}}>{rightP.toFixed(1)}atm</span>}
        </div>
        <div style={{marginLeft:"auto"}}>
          <button onClick={equilibrate} style={{
            padding:"5px 12px",borderRadius:8,border:"1px solid #16a34a",
            background:"#f0fdf4",color:"#16a34a",fontWeight:700,fontSize:11,cursor:"pointer"
          }}>⚖️ Denge</button>
        </div>
      </div>

      {/* MAIN SVG — big and prominent */}
      <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%"
        style={{display:"block",borderRadius:16,background:"#f0f4f8",
          border:"1px solid #e2e8f0",cursor:dragPiston!==null?"ew-resize":"default",
          boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}
        onMouseMove={onMouseMove} onMouseUp={()=>setDragPiston(null)} onMouseLeave={()=>setDragPiston(null)}>

        <defs>
          {/* Left wall gradient */}
          <linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={leftOpen?"#dcfce7":"#f1f5f9"}/>
            <stop offset="100%" stopColor={leftOpen?"#bbf7d0":"#e2e8f0"}/>
          </linearGradient>
          <linearGradient id="wall-r" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={rightOpen?"#bbf7d0":"#e2e8f0"}/>
            <stop offset="100%" stopColor={rightOpen?"#dcfce7":"#f1f5f9"}/>
          </linearGradient>
          <marker id="arrow-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3z" fill="#16a34a"/>
          </marker>
          <marker id="arrow-l" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L6,6 L0,3z" fill="#16a34a"/>
          </marker>
        </defs>

        {/* Left atmosphere wall */}
        <rect x={0} y={CY} width={WALL_W} height={CH} fill="url(#wall-l)"
          stroke={leftOpen?"#86efac":"#cbd5e1"} strokeWidth={2} rx={8}/>
        <text x={WALL_W/2} y={CY+CH/2-10} textAnchor="middle"
          fill={leftOpen?"#15803d":"#94a3b8"} fontSize={13} fontWeight={800}>M₁</text>
        <text x={WALL_W/2} y={CY+CH/2+8} textAnchor="middle"
          fill={leftOpen?"#16a34a":"#94a3b8"} fontSize={10}>
          {leftOpen?`${leftP.toFixed(1)} atm`:"KAPALI"}
        </text>
        {leftOpen&&<>
          <line x1={8} y1={CY+CH/2} x2={WALL_W-4} y2={CY+CH/2} stroke="#16a34a" strokeWidth={2} markerEnd="url(#arrow-r)"/>
          <line x1={8} y1={CY+CH/2-22} x2={WALL_W-4} y2={CY+CH/2-22} stroke="#16a34a" strokeWidth={1} markerEnd="url(#arrow-r)" opacity={0.4}/>
          <line x1={8} y1={CY+CH/2+22} x2={WALL_W-4} y2={CY+CH/2+22} stroke="#16a34a" strokeWidth={1} markerEnd="url(#arrow-r)" opacity={0.4}/>
        </>}

        {/* Chambers as 3D cylinders */}
        {chambers.map((c,idx)=>{
          const r=rects[idx];
          const gObj=gasObj(c.gas);
          const fill=CHAMBER_FILLS[idx%CHAMBER_FILLS.length];
          const cP=idealP(c.mol,c.T,c.V);
          const isSel=selected===idx;
          return(
            <g key={idx} onClick={()=>setSelected(idx)} style={{cursor:"pointer"}}>
              {/* 3D Cylinder body */}
              <Cylinder3D x={r.x} y={CY} w={r.w} h={CH} fillColor={fill.bg} borderColor={isSel?fill.border:"#cbd5e1"} label={`c${idx}`}>
                {/* Particles */}
                {getParticles(r,c.T,fill.particle,idx)}
              </Cylinder3D>
              {/* Selection ring */}
              {isSel&&<rect x={r.x-2} y={CY-2} width={r.w+4} height={CH+4} fill="none"
                stroke={fill.border} strokeWidth={2.5} strokeDasharray="6,3" rx={4}/>}
              {/* Gas label */}
              <text x={r.cx} y={CY+22} textAnchor="middle" fill={fill.border} fontSize={15} fontWeight={800}>{c.gas}</text>
              {/* Stats */}
              <text x={r.cx} y={CY+40} textAnchor="middle" fill="#64748b" fontSize={10}>{c.mol.toFixed(2)} mol</text>
              <text x={r.cx} y={CY+55} textAnchor="middle" fill="#64748b" fontSize={10}>{c.V.toFixed(1)} L</text>
              <text x={r.cx} y={CY+72} textAnchor="middle" fill={pClr(cP)} fontSize={13} fontWeight={800}>{cP.toFixed(3)} atm</text>
              <text x={r.cx} y={CY+88} textAnchor="middle" fill={tempClr(c.T)} fontSize={10}>{c.T} K</text>
              {/* Temp color bar at bottom of cylinder */}
              <rect x={r.x+6} y={CY+CH-10} width={r.w-12} height={5} rx={2.5} fill={tempClr(c.T)} opacity={0.7}/>
              {/* Volume label */}
              <text x={r.cx} y={CY+CH+16} textAnchor="middle" fill="#94a3b8" fontSize={9}>V={c.V.toFixed(1)}L</text>
            </g>
          );
        })}

        {/* 3D Pistons */}
        {pistonXs.map((px,i)=>(
          <Piston3D key={i} x={px} y={CY} h={CH} onMouseDown={e=>{e.stopPropagation();setDragPiston(i);}}/>
        ))}

        {/* Right atmosphere wall */}
        <rect x={rightEdge} y={CY} width={ATMO_W} height={CH} fill="url(#wall-r)"
          stroke={rightOpen?"#86efac":"#cbd5e1"} strokeWidth={2} rx={8}/>
        <text x={rightEdge+ATMO_W/2} y={CY+CH/2-10} textAnchor="middle"
          fill={rightOpen?"#15803d":"#94a3b8"} fontSize={13} fontWeight={800}>M₂</text>
        <text x={rightEdge+ATMO_W/2} y={CY+CH/2+8} textAnchor="middle"
          fill={rightOpen?"#16a34a":"#94a3b8"} fontSize={10}>
          {rightOpen?`${rightP.toFixed(1)} atm`:"KAPALI"}
        </text>
        {rightOpen&&<>
          <line x1={rightEdge+4} y1={CY+CH/2} x2={rightEdge+ATMO_W-8} y2={CY+CH/2} stroke="#16a34a" strokeWidth={2} markerEnd="url(#arrow-l)"/>
          <line x1={rightEdge+4} y1={CY+CH/2-22} x2={rightEdge+ATMO_W-8} y2={CY+CH/2-22} stroke="#16a34a" strokeWidth={1} markerEnd="url(#arrow-l)" opacity={0.4}/>
          <line x1={rightEdge+4} y1={CY+CH/2+22} x2={rightEdge+ATMO_W-8} y2={CY+CH/2+22} stroke="#16a34a" strokeWidth={1} markerEnd="url(#arrow-l)" opacity={0.4}/>
        </>}

        {/* Valves below */}
        <Valve3D cx={WALL_W/2} cy={VALVE_Y} open={leftOpen} onClick={()=>setLeftOpen(o=>!o)} label="M₁"/>
        {pistonXs.map((px,i)=>(
          <Valve3D key={i} cx={px} cy={VALVE_Y} open={true} onClick={()=>{}} label={`P${i+1}`} size={0.85}/>
        ))}
        <Valve3D cx={rightEdge+ATMO_W/2} cy={VALVE_Y} open={rightOpen} onClick={()=>setRightOpen(o=>!o)} label="M₂"/>

        {/* Legend */}
        <text x={SVG_W/2} y={SVG_H-6} textAnchor="middle" fill="#cbd5e1" fontSize={9}>
          🟢 Yeşil = AÇIK · 🔴 Kırmızı = KAPALI · Pistonu sürükle → hacim değiştir
        </text>
      </svg>

      {/* Bottom panels — compact */}
      <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
        {/* Chamber editor */}
        <div style={{flex:"1 1 220px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <SectionTitle>Bölme {selected+1} — {ch.gas}</SectionTitle>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {GAS_PRESETS.map(g=>(
              <Pill key={g.label} active={ch.gas===g.label} color={g.color}
                onClick={()=>setChambers(prev=>prev.map((c,i)=>i===selected?{...c,gas:g.label}:c))}>
                {g.label}
              </Pill>
            ))}
          </div>
          <Slider label="n (mol)" value={ch.mol} min={0.05} max={3} step={0.05} unit="mol" color="#6366f1"
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selected?{...c,mol:v}:c))}/>
          <Slider label="V (L)" value={ch.V} min={0.5} max={14} step={0.1} unit="L" color="#0ea5e9"
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selected?{...c,V:v}:c))}/>
          <Slider label="T (K)" value={ch.T} min={50} max={1000} step={5} unit="K" color={tempClr(ch.T)}
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selected?{...c,T:v}:c))}/>
        </div>

        {/* PV=nRT */}
        <div style={{flex:"1 1 200px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <SectionTitle>PV = nRT</SectionTitle>
          <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
            <StatCard label="P (atm)" value={P.toFixed(3)} unit="atm" color={pClr(P)}/>
            <StatCard label="V (L)" value={ch.V.toFixed(2)} unit="L" color="#0ea5e9"/>
            <StatCard label="T (K)" value={ch.T} unit="K" color={tempClr(ch.T)}/>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <StatCard label="PV" value={(P*ch.V).toFixed(3)} unit="atm·L" color="#1e293b"/>
            <StatCard label="nRT" value={(ch.mol*R*ch.T).toFixed(3)} unit="atm·L" color="#16a34a"/>
          </div>
          <div style={{marginTop:8,fontSize:10,color:"#94a3b8",lineHeight:1.7}}>
            🌡️ T↑ → P↑ &nbsp; 📦 V↓ → P↑ &nbsp; 🧪 n↑ → P↑
          </div>
        </div>

        {/* Summary table */}
        <div style={{flex:"2 1 300px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",overflowX:"auto"}}>
          <SectionTitle>Özet Tablosu</SectionTitle>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                {["#","Gaz","n","V","T","P (atm)","PV","✓"].map(h=>(
                  <th key={h} style={{padding:"3px 6px",color:"#94a3b8",textAlign:"left",fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chambers.map((c,i)=>{
                const cP=idealP(c.mol,c.T,c.V);
                const gO=gasObj(c.gas);
                const nP=chambers[i+1]?idealP(chambers[i+1].mol,chambers[i+1].T,chambers[i+1].V):(rightOpen?rightP:cP);
                const ok=Math.abs(cP-nP)<0.08;
                const fill=CHAMBER_FILLS[i%CHAMBER_FILLS.length];
                return(
                  <tr key={i} onClick={()=>setSelected(i)} style={{cursor:"pointer",background:i===selected?fill.bg+"88":"transparent"}}>
                    <td style={{padding:"3px 6px",color:"#94a3b8"}}>{i+1}</td>
                    <td style={{padding:"3px 6px",color:gO.color,fontWeight:700}}>{c.gas}</td>
                    <td style={{padding:"3px 6px"}}>{c.mol.toFixed(2)}</td>
                    <td style={{padding:"3px 6px",color:"#0ea5e9"}}>{c.V.toFixed(2)}</td>
                    <td style={{padding:"3px 6px",color:tempClr(c.T)}}>{c.T}</td>
                    <td style={{padding:"3px 6px",color:pClr(cP),fontWeight:700}}>{cP.toFixed(3)}</td>
                    <td style={{padding:"3px 6px",color:"#64748b"}}>{(cP*c.V).toFixed(2)}</td>
                    <td style={{padding:"3px 6px"}}>
                      <span style={{background:ok?"#dcfce7":"#fee2e2",color:ok?"#16a34a":"#dc2626",
                        borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>
                        {ok?"✓":"✗"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 2 — GRAPHS
// ═══════════════════════════════════════════
function GraphsTab({ chambers }) {
  const [history,setHistory]=useState([]);
  const [recording,setRecording]=useState(false);
  const [chart,setChart]=useState("PT");
  const tickRef=useRef(0);
  const COLORS=["#f87171","#fb923c","#4ade80","#60a5fa"];

  useEffect(()=>{
    if(!recording)return;
    const t=setInterval(()=>{
      tickRef.current+=1;
      const pt={t:tickRef.current};
      chambers.forEach((c,i)=>{ pt[`P${i+1}`]=parseFloat(idealP(c.mol,c.T,c.V).toFixed(3)); pt[`V${i+1}`]=parseFloat(c.V.toFixed(2)); });
      setHistory(prev=>[...prev.slice(-80),pt]);
    },300);
    return()=>clearInterval(t);
  },[recording,chambers]);

  const pvData=chambers.map((c,i)=>({
    color:COLORS[i],
    points:Array.from({length:30},(_,k)=>{ const V=0.5+k*0.5; return{x:parseFloat(V.toFixed(2)),y:parseFloat(idealP(c.mol,c.T,V).toFixed(3))}; })
  }));

  const pressures=chambers.map((c,i)=>({name:`${c.gas}(${i+1})`,value:parseFloat(idealP(c.mol,c.T,c.V).toFixed(3)),color:COLORS[i]}));
  const totalP=pressures.reduce((s,p)=>s+p.value,0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:"white",borderRadius:10,padding:"8px 12px",border:"1px solid #e2e8f0"}}>
        {[["PT","P-T Zaman"],["PV_time","V-T Zaman"],["PV_curve","P-V Eğrisi"],["Dalton","Dalton"]].map(([id,lbl])=>(
          <Pill key={id} active={chart===id} onClick={()=>setChart(id)}>{lbl}</Pill>
        ))}
        <button onClick={()=>setRecording(r=>!r)} style={{
          marginLeft:"auto",padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
          background:recording?"#fee2e2":"#dcfce7",color:recording?"#dc2626":"#16a34a"
        }}>{recording?"⏹ Durdur":"▶ Kaydet"}</button>
        {history.length>0&&<button onClick={()=>{setHistory([]);tickRef.current=0;}} style={{padding:"5px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:"#94a3b8",cursor:"pointer",fontSize:10}}>Temizle</button>}
      </div>

      <div style={{background:"white",borderRadius:12,padding:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        {chart==="PT"&&<>
          <SectionTitle>Basınç — Zaman</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="t" stroke="#94a3b8" fontSize={10}/>
              <YAxis stroke="#94a3b8" fontSize={10}/>
              <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              {chambers.map((_,i)=><Line key={i} type="monotone" dataKey={`P${i+1}`} stroke={COLORS[i]} dot={false} strokeWidth={2} name={`Bölme ${i+1}`}/>)}
            </LineChart>
          </ResponsiveContainer>
        </>}
        {chart==="PV_time"&&<>
          <SectionTitle>Hacim — Zaman</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="t" stroke="#94a3b8" fontSize={10}/>
              <YAxis stroke="#94a3b8" fontSize={10}/>
              <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              {chambers.map((_,i)=><Area key={i} type="monotone" dataKey={`V${i+1}`} stroke={COLORS[i]} fill={COLORS[i]+"33"} strokeWidth={2} dot={false} name={`Bölme ${i+1}`}/>)}
            </AreaChart>
          </ResponsiveContainer>
        </>}
        {chart==="PV_curve"&&<>
          <SectionTitle>P-V İzoterm Eğrisi (Boyle)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="x" stroke="#94a3b8" fontSize={10} name="V (L)"/>
              <YAxis dataKey="y" stroke="#94a3b8" fontSize={10} name="P (atm)"/>
              <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              {pvData.map((d,i)=><Scatter key={i} name={`Bölme ${i+1}`} data={d.points} fill={d.color}/>)}
            </ScatterChart>
          </ResponsiveContainer>
        </>}
        {chart==="Dalton"&&<>
          <SectionTitle>Dalton Kısmi Basınçlar — Toplam: {totalP.toFixed(3)} atm</SectionTitle>
          <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
            <PieChart width={200} height={200}>
              <Pie data={pressures} dataKey="value" cx={95} cy={95} outerRadius={80} labelLine={false}
                label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                {pressures.map((p,i)=><Cell key={i} fill={p.color}/>)}
              </Pie>
              <Tooltip formatter={v=>`${v} atm`} contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
            </PieChart>
            <div style={{flex:1}}>
              {pressures.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:12,height:12,borderRadius:3,background:p.color}}/>
                  <div style={{fontSize:12,flex:1}}>{p.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:p.color}}>{p.value.toFixed(3)} atm</div>
                </div>
              ))}
            </div>
          </div>
        </>}
        {history.length===0&&chart!=="PV_curve"&&chart!=="Dalton"&&(
          <div style={{textAlign:"center",color:"#cbd5e1",padding:"40px 0",fontSize:13}}>▶ Kaydet butonuna basarak başlayın</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 3 — MAXWELL-BOLTZMANN
// ═══════════════════════════════════════════
function MaxwellTab() {
  const [gasA,setGasA]=useState("He");
  const [gasB,setGasB]=useState("N₂");
  const [tempA,setTempA]=useState(300);
  const [tempB,setTempB]=useState(600);
  const [showB,setShowB]=useState(true);

  function mb(v,T,M){ const m=M/1000/NA; const a=Math.sqrt(KB*T/m); return 4*Math.PI*v*v*Math.pow(1/(Math.sqrt(2*Math.PI)*a),3)*Math.exp(-v*v/(2*a*a)); }
  function curve(gas,T){ const M=gasObj(gas).molar; const vMax=Math.sqrt(2*KB*T/(M/1000/NA))*4; return Array.from({length:120},(_,i)=>{ const v=(i/119)*vMax; return{v:Math.round(v),f:parseFloat((mb(v,T,M)*1e-3).toFixed(6))}; }); }

  const dA=useMemo(()=>curve(gasA,tempA),[gasA,tempA]);
  const dB=useMemo(()=>curve(gasB,tempB),[gasB,tempB]);
  const merged=dA.map((d,i)=>({v:d.v,A:d.f,B:dB[i]?.f??0}));

  const vp=(T,M)=>Math.sqrt(2*KB*T/(M/1000/NA));
  const va=(T,M)=>Math.sqrt(8*KB*T/(Math.PI*M/1000/NA));
  const vr=(T,M)=>Math.sqrt(3*KB*T/(M/1000/NA));

  const gA=gasObj(gasA),gB=gasObj(gasB);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[[gasA,setGasA,tempA,setTempA,gA,"A"],[gasB,setGasB,tempB,setTempB,gB,"B"]].map(([gas,setGas,temp,setTemp,gObj,lbl])=>(
          <div key={lbl} style={{flex:"1 1 220px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <SectionTitle>Gaz {lbl} — <span style={{color:gObj.color}}>{gas}</span></SectionTitle>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {GAS_PRESETS.map(g=><Pill key={g.label} active={gas===g.label} color={g.color} onClick={()=>setGas(g.label)}>{g.label}</Pill>)}
            </div>
            <Slider label="Sıcaklık" value={temp} min={50} max={1200} step={10} unit="K" color={gObj.color} onChange={setTemp}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
              <StatCard label="v_mp" value={Math.round(vp(temp,gObj.molar))} unit="m/s" color={gObj.color}/>
              <StatCard label="v_avg" value={Math.round(va(temp,gObj.molar))} unit="m/s" color={gObj.color}/>
              <StatCard label="v_rms" value={Math.round(vr(temp,gObj.molar))} unit="m/s" color={gObj.color}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"white",borderRadius:12,padding:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <SectionTitle>Hız Dağılımı</SectionTitle>
          <Pill active={showB} onClick={()=>setShowB(b=>!b)}>Karşılaştır</Pill>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={merged}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="v" stroke="#94a3b8" fontSize={10} label={{value:"v (m/s)",position:"insideBottomRight",offset:-5,fill:"#94a3b8",fontSize:10}}/>
            <YAxis stroke="#94a3b8" fontSize={10}/>
            <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Area type="monotone" dataKey="A" stroke={gA.color} fill={gA.color+"33"} strokeWidth={2} dot={false} name={`${gasA}@${tempA}K`}/>
            {showB&&<Area type="monotone" dataKey="B" stroke={gB.color} fill={gB.color+"22"} strokeWidth={2} dot={false} name={`${gasB}@${tempB}K`}/>}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 4 — EĞİTİM MODU
// ═══════════════════════════════════════════
const EXPERIMENTS=[
  {id:"boyle",title:"Boyle Yasası",formula:"P₁V₁ = P₂V₂",color:"#f87171",
    steps:[{label:"V=2L",mol:0.5,V:2,T:300},{label:"V=4L",mol:0.5,V:4,T:300},{label:"V=6L",mol:0.5,V:6,T:300},{label:"V=8L",mol:0.5,V:8,T:300}]},
  {id:"charles",title:"Charles Yasası",formula:"V₁/T₁ = V₂/T₂",color:"#60a5fa",
    steps:[{label:"T=150K",mol:0.5,V:4,T:150},{label:"T=300K",mol:0.5,V:8,T:300},{label:"T=450K",mol:0.5,V:12,T:450},{label:"T=600K",mol:0.5,V:16,T:600}]},
  {id:"gay",title:"Gay-Lussac",formula:"P₁/T₁ = P₂/T₂",color:"#4ade80",
    steps:[{label:"T=200K",mol:0.5,V:5,T:200},{label:"T=400K",mol:0.5,V:5,T:400},{label:"T=600K",mol:0.5,V:5,T:600},{label:"T=800K",mol:0.5,V:5,T:800}]},
];

const QUIZ=[
  {q:"Sıcaklık 300K→600K, hacim sabit. Basınç ne olur?",opts:["2 katına çıkar","Yarıya düşer","Değişmez","4 katına çıkar"],ans:0,law:"Gay-Lussac"},
  {q:"Hacim 4L→2L, sıcaklık sabit. Basınç ne olur?",opts:["Yarıya düşer","Değişmez","2 katına çıkar","4 katına çıkar"],ans:2,law:"Boyle"},
  {q:"PV=nRT'de R nedir?",opts:["Sıcaklık sabiti","İdeal gaz sabiti","Mol sayısı","Basınç birimi"],ans:1,law:"İdeal Gaz"},
  {q:"Maxwell-Boltzmann'da T artınca dağılım ne olur?",opts:["Sola kayar","Değişmez","Sağa kayar ve düzleşir","Daralır"],ans:2,law:"Kinetik"},
  {q:"Van der Waals idealden ne zaman ayrışır?",opts:["Düşük P","Yüksek T","Yüksek P/düşük T","Düşük n"],ans:2,law:"Gerçek Gaz"},
];

function EduTab() {
  const [exp,setExp]=useState(null);
  const [step,setStep]=useState(0);
  const [mode,setMode]=useState("exp");
  const [qIdx,setQIdx]=useState(0);
  const [sel,setSel]=useState(null);
  const [score,setScore]=useState(0);
  const [done,setDone]=useState(false);

  const curExp=exp?EXPERIMENTS.find(e=>e.id===exp):null;
  const curStep=curExp?.steps[step]||null;
  const P=curStep?idealP(curStep.mol,curStep.T,curStep.V):0;
  const chartData=curExp?curExp.steps.map(s=>({label:s.label,P:parseFloat(idealP(s.mol,s.T,s.V).toFixed(3)),V:s.V,T:s.T})):[];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6}}>
        <Pill active={mode==="exp"} onClick={()=>setMode("exp")} color="#6366f1">🧪 Deney</Pill>
        <Pill active={mode==="quiz"} onClick={()=>setMode("quiz")} color="#f59e0b">❓ Quiz</Pill>
      </div>

      {mode==="exp"&&<>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EXPERIMENTS.map(e=>(
            <button key={e.id} onClick={()=>{setExp(e.id);setStep(0);}} style={{
              flex:"1 1 180px",padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",
              background:exp===e.id?e.color+"22":"white",outline:exp===e.id?`1.5px solid ${e.color}`:"1px solid #e2e8f0",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)"
            }}>
              <div style={{fontSize:13,fontWeight:700,color:e.color}}>{e.title}</div>
              <div style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace",marginTop:2}}>{e.formula}</div>
            </button>
          ))}
        </div>
        {curExp&&<div style={{background:"white",borderRadius:12,padding:14,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:curExp.color}}>{curExp.title}</div>
              <div style={{fontSize:12,fontFamily:"monospace",background:"#f8fafc",padding:"3px 8px",borderRadius:5,marginTop:4,color:"#1e293b"}}>{curExp.formula}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>step>0&&setStep(s=>s-1)} disabled={step===0} style={{padding:"5px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:"white",color:step===0?"#cbd5e1":"#64748b",cursor:step===0?"not-allowed":"pointer",fontSize:12}}>←</button>
              <button onClick={()=>step<curExp.steps.length-1&&setStep(s=>s+1)} disabled={step===curExp.steps.length-1} style={{padding:"5px 12px",borderRadius:8,border:"none",background:curExp.color+"22",color:curExp.color,cursor:"pointer",fontWeight:700,fontSize:12}}>→</button>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {curExp.steps.map((s,i)=>(
              <button key={i} onClick={()=>setStep(i)} style={{
                padding:"5px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
                background:i===step?curExp.color+"22":"#f8fafc",color:i===step?curExp.color:"#94a3b8",
                outline:i===step?`1.5px solid ${curExp.color}`:"none"
              }}>{s.label}</button>
            ))}
          </div>
          {curStep&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <StatCard label="n (mol)" value={curStep.mol.toFixed(2)} unit="mol" color="#6366f1"/>
            <StatCard label="V (L)" value={curStep.V.toFixed(1)} unit="L" color="#0ea5e9"/>
            <StatCard label="T (K)" value={curStep.T} unit="K" color={tempClr(curStep.T)}/>
            <StatCard label="P (atm)" value={P.toFixed(3)} unit="atm" color={curExp.color}/>
            <StatCard label="PV" value={(P*curStep.V).toFixed(3)} unit="atm·L" color="#16a34a"/>
          </div>}
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10}/>
              <YAxis stroke="#94a3b8" fontSize={10}/>
              <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="P" stroke={curExp.color} strokeWidth={2} dot={{r:4}} name="P (atm)"/>
              <Line type="monotone" dataKey="V" stroke="#0ea5e9" strokeWidth={2} dot={{r:4}} name="V (L)" strokeDasharray="5 3"/>
            </LineChart>
          </ResponsiveContainer>
        </div>}
      </>}

      {mode==="quiz"&&<div style={{background:"white",borderRadius:12,padding:16,border:"1px solid #e2e8f0",maxWidth:560,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        {done?<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:36,marginBottom:8}}>{score>=4?"🏆":score>=3?"🎯":"📚"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1e293b",marginBottom:4}}>{score}/{QUIZ.length} Doğru</div>
          <button onClick={()=>{setQIdx(0);setSel(null);setScore(0);setDone(false);}} style={{
            marginTop:12,padding:"8px 20px",borderRadius:9,border:"none",background:"#6366f1",color:"white",fontWeight:700,cursor:"pointer"
          }}>Tekrar</button>
        </div>:<>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:10,color:"#94a3b8"}}>Soru {qIdx+1}/{QUIZ.length}</span>
            <span style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>Puan: {score}</span>
          </div>
          <div style={{fontSize:11,color:"#94a3b8",background:"#f8fafc",borderRadius:6,padding:"4px 8px",marginBottom:10}}>{QUIZ[qIdx].law}</div>
          <div style={{fontSize:14,fontWeight:600,color:"#1e293b",marginBottom:14,lineHeight:1.5}}>{QUIZ[qIdx].q}</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {QUIZ[qIdx].opts.map((o,i)=>{
              const isRight=i===QUIZ[qIdx].ans,isSel=i===sel;
              return(
                <button key={i} onClick={()=>{ if(sel!==null)return; setSel(i); if(i===QUIZ[qIdx].ans)setScore(s=>s+1); }} style={{
                  padding:"9px 12px",borderRadius:9,border:"none",cursor:sel===null?"pointer":"default",textAlign:"left",fontSize:12,fontWeight:500,
                  background:sel===null?"#f8fafc":isRight?"#dcfce7":isSel?"#fee2e2":"#f8fafc",
                  color:sel===null?"#1e293b":isRight?"#16a34a":isSel?"#dc2626":"#94a3b8",
                  outline:isSel?(isRight?"1.5px solid #16a34a":"1.5px solid #dc2626"):"none"
                }}>{String.fromCharCode(65+i)}) {o}{sel!==null&&isRight?" ✓":""}{sel!==null&&isSel&&!isRight?" ✗":""}</button>
              );
            })}
          </div>
          {sel!==null&&<button onClick={()=>{ if(qIdx<QUIZ.length-1){setQIdx(q=>q+1);setSel(null);}else setDone(true); }} style={{
            marginTop:12,width:"100%",padding:"9px",borderRadius:9,border:"none",background:"#6366f1",color:"white",fontWeight:700,cursor:"pointer",fontSize:13
          }}>{qIdx<QUIZ.length-1?"Sonraki →":"Sonucu Gör"}</button>}
        </>}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 5 — GERÇEK GAZ
// ═══════════════════════════════════════════
function RealGasTab() {
  const [gas,setGas]=useState("CO₂");
  const [mol,setMol]=useState(1.0);
  const [V,setV]=useState(3);
  const [T,setT]=useState(300);
  const [mode,setMode]=useState("compare");
  const [mixGases,setMixGases]=useState([{gas:"N₂",mol:0.4},{gas:"O₂",mol:0.3},{gas:"CO₂",mol:0.2}]);
  const [mixV,setMixV]=useState(5);
  const [mixT,setMixT]=useState(300);
  const [chamH,setChamH]=useState([{gas:"He",mol:0.3,V:3,T:600},{gas:"N₂",mol:0.4,V:3,T:200}]);
  const [running,setRunning]=useState(false);

  useEffect(()=>{
    if(!running)return;
    const t=setInterval(()=>setChamH(prev=>{
      const [a,b]=prev; const d=(a.T-b.T)*0.04;
      return[{...a,T:Math.max(50,a.T-d)},{...b,T:Math.min(1000,b.T+d)}];
    }),100);
    return()=>clearInterval(t);
  },[running]);

  const gObj=gasObj(gas);
  const Pi=idealP(mol,T,V);
  const Pv=vdwP(mol,T,V,gObj.a,gObj.b);
  const diff=Pi>0?((Pv-Pi)/Pi*100).toFixed(2):"0";
  const curve=Array.from({length:60},(_,i)=>{ const Vi=0.3+i*0.25; return{V:parseFloat(Vi.toFixed(2)),ideal:parseFloat(idealP(mol,T,Vi).toFixed(3)),vdw:parseFloat(Math.max(0,vdwP(mol,T,Vi,gObj.a,gObj.b)).toFixed(3))}; });
  const totalMol=mixGases.reduce((s,g)=>s+g.mol,0);
  const partials=mixGases.map(g=>({...g,P:parseFloat(idealP(g.mol,mixT,mixV).toFixed(3)),frac:parseFloat((g.mol/totalMol).toFixed(3)),color:gasObj(g.gas).color}));
  const totalMixP=partials.reduce((s,g)=>s+g.P,0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <Pill active={mode==="compare"} onClick={()=>setMode("compare")} color="#6366f1">⚗️ İdeal vs VdW</Pill>
        <Pill active={mode==="mixture"} onClick={()=>setMode("mixture")} color="#0ea5e9">🧪 Karışım</Pill>
        <Pill active={mode==="heat"} onClick={()=>setMode("heat")} color="#f59e0b">🌡️ Isı Transferi</Pill>
      </div>

      {mode==="compare"&&<>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 200px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <SectionTitle>Gaz Seç</SectionTitle>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {GAS_PRESETS.map(g=><Pill key={g.label} active={gas===g.label} color={g.color} onClick={()=>setGas(g.label)}>{g.label}</Pill>)}
            </div>
            <Slider label="n (mol)" value={mol} min={0.1} max={4} step={0.1} unit="mol" color={gObj.color} onChange={setMol}/>
            <Slider label="V (L)" value={V} min={0.3} max={20} step={0.1} unit="L" color="#0ea5e9" onChange={setV}/>
            <Slider label="T (K)" value={T} min={50} max={1000} step={5} unit="K" color={tempClr(T)} onChange={setT}/>
            <div style={{marginTop:8,background:"#f8fafc",borderRadius:8,padding:8,fontSize:10,color:"#94a3b8"}}>
              a={gObj.a} L²atm/mol² · b={gObj.b} L/mol
            </div>
          </div>
          <div style={{flex:"1 1 200px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <SectionTitle>Sonuçlar</SectionTitle>
            <div style={{background:"#f8fafc",borderRadius:8,padding:10,marginBottom:8}}>
              <div style={{fontSize:10,color:"#94a3b8"}}>İdeal Gaz</div>
              <div style={{fontSize:22,fontWeight:800,color:"#0ea5e9"}}>{Pi.toFixed(4)} <span style={{fontSize:12}}>atm</span></div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:8,padding:10,marginBottom:8}}>
              <div style={{fontSize:10,color:"#94a3b8"}}>Van der Waals</div>
              <div style={{fontSize:22,fontWeight:800,color:gObj.color}}>{isNaN(Pv)?"-":Pv.toFixed(4)} <span style={{fontSize:12}}>atm</span></div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:8,padding:10}}>
              <div style={{fontSize:10,color:"#94a3b8"}}>Fark</div>
              <div style={{fontSize:18,fontWeight:800,color:Math.abs(parseFloat(diff))>5?"#dc2626":"#16a34a"}}>{diff}%</div>
            </div>
          </div>
        </div>
        <div style={{background:"white",borderRadius:12,padding:14,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <SectionTitle>P-V: İdeal vs Van der Waals</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="V" stroke="#94a3b8" fontSize={10}/>
              <YAxis stroke="#94a3b8" fontSize={10}/>
              <Tooltip contentStyle={{background:"white",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="ideal" stroke="#0ea5e9" strokeWidth={2} dot={false} name="İdeal"/>
              <Line type="monotone" dataKey="vdw" stroke={gObj.color} strokeWidth={2} dot={false} strokeDasharray="6 3" name={`${gas} VdW`}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>}

      {mode==="mixture"&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 200px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <SectionTitle>Karışım</SectionTitle>
          <Slider label="Toplam V" value={mixV} min={1} max={20} step={0.5} unit="L" color="#0ea5e9" onChange={setMixV}/>
          <Slider label="T" value={mixT} min={50} max={1000} step={5} unit="K" color={tempClr(mixT)} onChange={setMixT}/>
          {mixGases.map((g,i)=>(
            <div key={i} style={{marginBottom:8,background:"#f8fafc",borderRadius:8,padding:8}}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                {GAS_PRESETS.slice(0,5).map(pg=><Pill key={pg.label} active={g.gas===pg.label} color={pg.color} onClick={()=>setMixGases(prev=>prev.map((x,j)=>j===i?{...x,gas:pg.label}:x))}>{pg.label}</Pill>)}
              </div>
              <Slider label={`Mol ${i+1}`} value={g.mol} min={0.05} max={2} step={0.05} unit="mol" color={gasObj(g.gas).color} onChange={v=>setMixGases(prev=>prev.map((x,j)=>j===i?{...x,mol:v}:x))}/>
            </div>
          ))}
        </div>
        <div style={{flex:"1 1 200px",background:"white",borderRadius:10,padding:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <SectionTitle>Dalton — Toplam: {totalMixP.toFixed(3)} atm</SectionTitle>
          {partials.map((g,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,color:g.color,fontWeight:700}}>{g.gas}</span>
                <span style={{fontSize:12}}>{g.P.toFixed(3)} atm ({(g.frac*100).toFixed(0)}%)</span>
              </div>
              <div style={{height:8,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${g.frac*100}%`,background:g.color,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {mode==="heat"&&<div style={{background:"white",borderRadius:12,padding:14,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <SectionTitle>İki Bölme Arası Isı Transferi</SectionTitle>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
          {chamH.map((c,i)=>(
            <div key={i} style={{flex:"1 1 160px",background:"#f8fafc",borderRadius:10,padding:10,border:`1px solid ${tempClr(c.T)}55`}}>
              <div style={{fontSize:12,fontWeight:700,color:tempClr(c.T),marginBottom:8}}>Bölme {i+1} — {c.gas}</div>
              <div style={{display:"flex",gap:6}}>
                <StatCard label="T (K)" value={Math.round(c.T)} unit="K" color={tempClr(c.T)}/>
                <StatCard label="P (atm)" value={idealP(c.mol,c.T,c.V).toFixed(3)} unit="atm" color={pClr(idealP(c.mol,c.T,c.V))}/>
              </div>
              <div style={{marginTop:8,height:8,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((c.T-50)/950)*100}%`,background:tempClr(c.T),borderRadius:4,transition:"width .2s"}}/>
              </div>
              {!running&&<div style={{marginTop:8}}>
                <Slider label="Başlangıç T" value={c.T} min={50} max={1000} step={10} unit="K" color={tempClr(c.T)}
                  onChange={v=>setChamH(prev=>prev.map((x,j)=>j===i?{...x,T:v}:x))}/>
              </div>}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginBottom:12,fontSize:13}}>
          {Math.abs(chamH[0].T-chamH[1].T)<2
            ?<span style={{color:"#16a34a",fontWeight:700}}>⚖️ Termal Denge — T≈{Math.round(chamH[0].T)}K</span>
            :<span style={{color:"#f59e0b"}}>ΔT = {Math.round(Math.abs(chamH[0].T-chamH[1].T))} K</span>}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={()=>setRunning(r=>!r)} style={{
            padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,
            background:running?"#fee2e2":"#dcfce7",color:running?"#dc2626":"#16a34a"
          }}>{running?"⏹ Durdur":"▶ Başlat"}</button>
          <button onClick={()=>{setRunning(false);setChamH([{gas:"He",mol:0.3,V:3,T:600},{gas:"N₂",mol:0.4,V:3,T:200}]);}} style={{
            padding:"8px 16px",borderRadius:9,border:"1px solid #e2e8f0",background:"white",color:"#94a3b8",cursor:"pointer"
          }}>↺ Sıfırla</button>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════
export default function App() {
  const [tab,setTab]=useState("sim");
  const [chambers,setChambers]=useState(defaultChambers(3));
  const [numChambers,setNumChambers]=useState(3);
  const [leftOpen,setLeftOpen]=useState(true);
  const [rightOpen,setRightOpen]=useState(true);
  const [leftP,setLeftP]=useState(1.0);
  const [rightP,setRightP]=useState(1.0);

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Inter',system-ui,sans-serif",color:"#1e293b"}}>
      {/* Header */}
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"10px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#1e293b",letterSpacing:-0.3}}>⚗️ Gaz Laboratuvarı</div>
            <div style={{fontSize:9,color:"#94a3b8"}}>PV=nRT · Maxwell-Boltzmann · Van der Waals</div>
          </div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginLeft:"auto",background:"#f8fafc",borderRadius:10,padding:4,border:"1px solid #e2e8f0"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,transition:"all .15s",
                background:tab===t.id?"white":"transparent",
                color:tab===t.id?"#6366f1":"#94a3b8",
                boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"14px 12px"}}>
        {tab==="sim"&&<SimTab chambers={chambers} setChambers={setChambers} numChambers={numChambers} setNumChambers={setNumChambers} leftOpen={leftOpen} setLeftOpen={setLeftOpen} rightOpen={rightOpen} setRightOpen={setRightOpen} leftP={leftP} setLeftP={setLeftP} rightP={rightP} setRightP={setRightP}/>}
        {tab==="graphs"&&<GraphsTab chambers={chambers}/>}
        {tab==="maxwell"&&<MaxwellTab/>}
        {tab==="edu"&&<EduTab/>}
        {tab==="realgas"&&<RealGasTab/>}
      </div>

      <div style={{textAlign:"center",padding:10,fontSize:9,color:"#cbd5e1"}}>
        R=0.0821 L·atm/mol·K · Nₐ=6.022×10²³ · kB=1.38×10⁻²³ J/K
      </div>
    </div>
  );
}

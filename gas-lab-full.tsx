import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════
const R = 0.0821;
const P0 = 1.0;
const NA = 6.022e23;
const KB = 1.38e-23;

const GAS_PRESETS = [
  { label: "He",  color: "#a78bfa", molar: 4,   a: 0.034, b: 0.0237 },
  { label: "H₂",  color: "#38bdf8", molar: 2,   a: 0.244, b: 0.0266 },
  { label: "N₂",  color: "#34d399", molar: 28,  a: 1.39,  b: 0.0391 },
  { label: "O₂",  color: "#fb923c", molar: 32,  a: 1.36,  b: 0.0318 },
  { label: "CH₄", color: "#f472b6", molar: 16,  a: 2.25,  b: 0.0428 },
  { label: "Ne",  color: "#fde68a", molar: 20,  a: 0.211, b: 0.0171 },
  { label: "CO₂", color: "#94a3b8", molar: 44,  a: 3.59,  b: 0.0427 },
];

const TABS = [
  { id: "sim",      icon: "🔬", label: "Simülasyon"       },
  { id: "graphs",   icon: "📊", label: "Grafikler"        },
  { id: "maxwell",  icon: "⚡", label: "Maxwell-Boltzmann" },
  { id: "edu",      icon: "🎓", label: "Eğitim Modu"      },
  { id: "realgas",  icon: "⚗️", label: "Gerçek Gaz"       },
];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const idealP  = (n, T, V) => V > 0 && n > 0 ? (n * R * T) / V : 0;
const vdwP    = (n, T, V, a, b) => {
  const Vm = V / n;
  if (Vm <= b || n <= 0) return 0;
  return (R * T) / (Vm - b) - a / (Vm * Vm);
};
const gasObj  = (label) => GAS_PRESETS.find(g => g.label === label) || GAS_PRESETS[0];
const tempClr = (T) => {
  const t = Math.max(0, Math.min(1, (T - 50) / 950));
  return `hsl(${Math.round(240 - t * 240)},90%,60%)`;
};
const pClr    = (P) => {
  const t = Math.max(0, Math.min(1, P / 5));
  return `hsl(${Math.round(120 - t * 120)},80%,55%)`;
};

function defaultChambers(n) {
  const base = [
    { gas: "CH₄", mol: 0.6, V: 5, T: 300 },
    { gas: "He",  mol: 0.3, V: 2, T: 300 },
    { gas: "H₂",  mol: 0.4, V: 3, T: 300 },
    { gas: "Ne",  mol: 0.5, V: 4, T: 300 },
  ];
  return base.slice(0, n);
}

// ══════════════════════════════════════════════════════════════
// MINI COMPONENTS
// ══════════════════════════════════════════════════════════════
function Pill({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer",
      fontSize: 11, fontWeight: 600, transition: "all .15s",
      background: active ? (color ? color + "33" : "#3f3f46") : "#18181b",
      color:      active ? (color || "#f4f4f5")               : "#52525b",
      outline:    active ? `1.5px solid ${color || "#71717a"}` : "none",
    }}>{children}</button>
  );
}

function Slider({ label, value, min, max, step, unit, color, onChange }) {
  const [inputVal, setInputVal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setInputVal(String(value));
  }, [value, focused]);

  function commitInput(raw) {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(clamped);
      setInputVal(String(clamped));
    } else {
      setInputVal(String(value));
    }
  }

  const acc = color || "#a78bfa";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#71717a" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number"
            min={min} max={max} step={step}
            value={inputVal}
            onFocus={() => setFocused(true)}
            onChange={e => setInputVal(e.target.value)}
            onBlur={e => { setFocused(false); commitInput(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
            style={{
              width: 70, padding: "3px 6px", borderRadius: 6,
              border: `1px solid ${focused ? acc : "#3f3f46"}`,
              background: "#09090b", color: acc,
              fontSize: 12, fontWeight: 700, textAlign: "right",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <span style={{ fontSize: 11, color: "#52525b", minWidth: 26 }}>{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => { const v = parseFloat(e.target.value); onChange(v); setInputVal(String(v)); }}
        style={{ width: "100%", accentColor: acc }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 9, color: "#3f3f46" }}>{min}</span>
        <span style={{ fontSize: 9, color: "#3f3f46" }}>{max}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: "#09090b", borderRadius: 8, padding: "8px 12px",
      textAlign: "center", minWidth: 70, flex: 1
    }}>
      <div style={{ fontSize: 10, color: "#52525b", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || "#f4f4f5" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#3f3f46" }}>{unit}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: "#a1a1aa", marginBottom: 10, marginTop: 4 }}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════
// VALVE SVG COMPONENT
// cx,cy = center; open = bool; onClick; label
// ══════════════════════════════════════════════════════════════
function Valve({ cx, cy, open, onClick, label }) {
  const body   = open ? "#22c55e" : "#ef4444";
  const handle = open ? "#4ade80" : "#f87171";
  const glow   = open ? "#22c55e44" : "#ef444422";
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={14} fill={glow}/>
      {/* Pipe stubs left & right */}
      <rect x={cx-20} y={cy-4} width={10} height={8} rx={2} fill="#52525b"/>
      <rect x={cx+10} y={cy-4} width={10} height={8} rx={2} fill="#52525b"/>
      {/* Valve body hexagon */}
      <polygon
        points={`${cx},${cy-11} ${cx+9},${cy-5} ${cx+9},${cy+5} ${cx},${cy+11} ${cx-9},${cy+5} ${cx-9},${cy-5}`}
        fill="#27272a" stroke={body} strokeWidth={2}/>
      {/* Inner circle */}
      <circle cx={cx} cy={cy} r={5} fill={body} opacity={0.9}/>
      {/* Handle (lever) — horizontal=open, vertical=closed */}
      {open
        ? <rect x={cx-8} y={cy-3} width={16} height={6} rx={3} fill={handle}/>
        : <rect x={cx-3} y={cy-8} width={6} height={16} rx={3} fill={handle}/>
      }
      {/* Tooltip label above */}
      <text x={cx} y={cy-18} textAnchor="middle" fill={body} fontSize={9} fontWeight={700}>{label}</text>
      <text x={cx} y={cy+22} textAnchor="middle" fill={open?"#4ade80":"#f87171"} fontSize={8}>
        {open ? "AÇIK" : "KAPALI"}
      </text>
    </g>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — SIMULATION
// ══════════════════════════════════════════════════════════════
function SimTab({ chambers, setChambers, numChambers, setNumChambers,
                  leftOpen, setLeftOpen, rightOpen, setRightOpen,
                  leftP, setLeftP, rightP, setRightP }) {
  const [selectedChamber, setSelectedChamber] = useState(0);
  const [animTick, setAnimTick] = useState(0);
  const [dragPiston, setDragPiston] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setAnimTick(x => x + 1), 70);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setChambers(defaultChambers(numChambers));
    setSelectedChamber(0);
  }, [numChambers]);

  function equilibrate() {
    setChambers(prev => {
      let chs = prev.map(c => ({ ...c }));
      const totalV = chs.reduce((s, c) => s + c.V, 0);
      for (let iter = 0; iter < 400; iter++) {
        const ps = chs.map(c => idealP(c.mol, c.T, c.V));
        for (let i = 0; i < chs.length - 1; i++) {
          const diff = ps[i] - ps[i + 1];
          const dV = diff * 0.008;
          chs[i]   = { ...chs[i],   V: Math.max(0.1, chs[i].V   - dV) };
          chs[i+1] = { ...chs[i+1], V: Math.max(0.1, chs[i+1].V + dV) };
        }
        if (leftOpen) {
          const diff = ps[0] - leftP;
          chs[0] = { ...chs[0], V: Math.max(0.1, chs[0].V - diff * 0.008) };
        }
        if (rightOpen) {
          const n = chs.length - 1;
          const diff = ps[n] - rightP;
          chs[n] = { ...chs[n], V: Math.max(0.1, chs[n].V - diff * 0.008) };
        }
        if (!leftOpen && !rightOpen) {
          const cur = chs.reduce((s, c) => s + c.V, 0);
          chs = chs.map(c => ({ ...c, V: c.V * totalV / cur }));
        }
      }
      return chs;
    });
  }

  // SVG layout
  const SVG_W = 860, SVG_H = 300;
  const CY = 70, CH = 150, WALL = 72, ATMO_W = 72, PW = 14;
  // Valve positions (bottom center of wall areas)
  const VALVE_Y = CY + CH + 28;
  const totalV = chambers.reduce((s, c) => s + c.V, 0);
  const containerW = SVG_W - WALL - ATMO_W;
  const widths = chambers.map(c => (c.V / totalV) * containerW);
  let xc = WALL;
  const rects = widths.map(w => { const x = xc; xc += w; return { x, w, cx: x + w / 2 }; });
  const pistonXs = [];
  let acc = WALL;
  for (let i = 0; i < chambers.length - 1; i++) { acc += widths[i]; pistonXs.push(acc); }
  const rightEdge = WALL + containerW;

  function onSvgMouseMove(e) {
    if (dragPiston === null) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (SVG_W / rect.width);
    setChambers(prev => {
      const chs = [...prev];
      const i = dragPiston;
      const leftBound  = rects[i].x + 12;
      const rightBound = rects[i+1] ? rects[i].x + widths[i] + widths[i+1] - 12 : rightEdge - 12;
      const clampedX   = Math.max(leftBound, Math.min(rightBound, mx));
      const oldBoundary = rects[i].x + widths[i];
      const delta = clampedX - oldBoundary;
      chs[i]   = { ...chs[i],   V: Math.max(0.1, chs[i].V   + delta / containerW * totalV) };
      chs[i+1] = { ...chs[i+1], V: Math.max(0.1, chs[i+1].V - delta / containerW * totalV) };
      return chs;
    });
  }

  function getParticles(rect, T, color, idx) {
    const T0loc = 300;
    const count = Math.max(4, Math.min(24, Math.round(chambers[idx].mol * 14)));
    return Array.from({ length: count }, (_, i) => {
      const speed = 0.25 + (T / T0loc) * 0.35;
      const seed = i * 173.1 + idx * 700 + animTick * speed;
      const px = rect.x + 10 + ((Math.sin(seed * 0.61 + i) * 0.5 + 0.5) * (rect.w - 20));
      const py = CY + 10 + ((Math.cos(seed * 0.43 + i * 1.3) * 0.5 + 0.5) * (CH - 20));
      return <circle key={i} cx={px} cy={py} r={3.5} fill={color} opacity={0.82} />;
    });
  }

  const ch = chambers[selectedChamber] || chambers[0];
  const P  = idealP(ch.mol, ch.T, ch.V);

  // Valve positions between pistons (bottom of each piston)
  const internalValveXs = pistonXs;

  return (
    <div>
      {/* Top controls */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12, alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:10, color:"#52525b", fontWeight:600, marginBottom:4 }}>BÖLME SAYISI</div>
          <div style={{ display:"flex", gap:4 }}>
            {[2,3,4].map(n => <Pill key={n} active={numChambers===n} onClick={()=>setNumChambers(n)}>{n} Bölme</Pill>)}
          </div>
        </div>

        {/* M1 controls */}
        <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:9, padding:"8px 12px" }}>
          <div style={{ fontSize:10, color:"#52525b", fontWeight:600, marginBottom:6 }}>SOL PİSTON — M₁</div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={()=>setLeftOpen(o=>!o)} style={{
              padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
              background: leftOpen ? "#14532d33" : "#7f1d1d33",
              color: leftOpen ? "#4ade80" : "#f87171",
              outline: `1.5px solid ${leftOpen ? "#22c55e" : "#ef4444"}`
            }}>{leftOpen ? "🟢 AÇIK" : "🔴 KAPALI"}</button>
            {leftOpen && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:"#71717a" }}>P =</span>
                <input type="range" min={0.1} max={5} step={0.1} value={leftP}
                  onChange={e=>setLeftP(parseFloat(e.target.value))}
                  style={{ width:80, accentColor:"#22c55e" }}/>
                <span style={{ fontSize:12, color:"#4ade80", fontWeight:700, minWidth:40 }}>{leftP.toFixed(1)} atm</span>
              </div>
            )}
          </div>
        </div>

        {/* M2 controls */}
        <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:9, padding:"8px 12px" }}>
          <div style={{ fontSize:10, color:"#52525b", fontWeight:600, marginBottom:6 }}>SAĞ PİSTON — M₂</div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={()=>setRightOpen(o=>!o)} style={{
              padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
              background: rightOpen ? "#14532d33" : "#7f1d1d33",
              color: rightOpen ? "#4ade80" : "#f87171",
              outline: `1.5px solid ${rightOpen ? "#22c55e" : "#ef4444"}`
            }}>{rightOpen ? "🟢 AÇIK" : "🔴 KAPALI"}</button>
            {rightOpen && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:"#71717a" }}>P =</span>
                <input type="range" min={0.1} max={5} step={0.1} value={rightP}
                  onChange={e=>setRightP(parseFloat(e.target.value))}
                  style={{ width:80, accentColor:"#22c55e" }}/>
                <span style={{ fontSize:12, color:"#4ade80", fontWeight:700, minWidth:40 }}>{rightP.toFixed(1)} atm</span>
              </div>
            )}
          </div>
        </div>

        <button onClick={equilibrate} style={{
          padding:"8px 14px", borderRadius:8, border:"1px solid #16a34a",
          background:"#14532d33", color:"#4ade80", fontWeight:700, fontSize:12, cursor:"pointer"
        }}>⚖️ Dengeye Getir</button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%"
        style={{ display:"block", borderRadius:10, background:"#09090b", border:"1px solid #27272a",
                 cursor: dragPiston !== null ? "ew-resize" : "default" }}
        onMouseMove={onSvgMouseMove}
        onMouseUp={()=>setDragPiston(null)}
        onMouseLeave={()=>setDragPiston(null)}>

        <defs>
          <pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0L0 0 0 20" fill="none" stroke="#1c1c1e" strokeWidth="0.8"/>
          </pattern>
          <marker id="ag2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3z" fill="#22c55e"/>
          </marker>
          <marker id="ag2r" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L6,6 L0,3z" fill="#22c55e"/>
          </marker>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#g2)"/>

        {/* ── LEFT WALL / ATMO ── */}
        <rect x={0} y={CY} width={WALL} height={CH}
          fill={leftOpen ? "#0d1f12" : "#1c1c1e"}
          stroke={leftOpen ? "#14532d" : "#3f3f46"} strokeWidth={2}/>
        <text x={WALL/2} y={CY+CH/2-12} textAnchor="middle"
          fill={leftOpen?"#22c55e":"#52525b"} fontSize={12} fontWeight={800}>M₁</text>
        <text x={WALL/2} y={CY+CH/2+4} textAnchor="middle"
          fill={leftOpen?"#4ade80":"#3f3f46"} fontSize={9}>
          {leftOpen ? `${leftP.toFixed(1)} atm` : "KAPALI"}
        </text>
        {leftOpen && (
          <>
            {/* Flow arrows into chamber */}
            <line x1={4} y1={CY+CH/2} x2={WALL-4} y2={CY+CH/2}
              stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#ag2)" opacity={0.9}/>
            <line x1={4} y1={CY+CH/2-20} x2={WALL-4} y2={CY+CH/2-20}
              stroke="#22c55e" strokeWidth={1} markerEnd="url(#ag2)" opacity={0.4}/>
            <line x1={4} y1={CY+CH/2+20} x2={WALL-4} y2={CY+CH/2+20}
              stroke="#22c55e" strokeWidth={1} markerEnd="url(#ag2)" opacity={0.4}/>
          </>
        )}
        {/* M1 Valve symbol on bottom-left wall */}
        <Valve cx={WALL/2} cy={VALVE_Y} open={leftOpen} onClick={()=>setLeftOpen(o=>!o)} label="M₁"/>

        {/* ── CHAMBERS ── */}
        {chambers.map((c, idx) => {
          const r = rects[idx];
          const gObj = gasObj(c.gas);
          const cP = idealP(c.mol, c.T, c.V);
          const isSelected = selectedChamber === idx;
          const barH = Math.min(CH - 24, (cP / 6) * (CH - 24));
          return (
            <g key={idx} onClick={()=>setSelectedChamber(idx)} style={{ cursor:"pointer" }}>
              {/* Chamber fill */}
              <rect x={r.x} y={CY} width={r.w} height={CH}
                fill={gObj.color + "0d"}
                stroke={isSelected ? gObj.color : "#3f3f46"}
                strokeWidth={isSelected ? 2.5 : 1.2}/>
              {/* Temperature colour bar at bottom */}
              <rect x={r.x+2} y={CY+CH-8} width={r.w-4} height={6} rx={3} fill={tempClr(c.T)} opacity={0.85}/>
              {/* Pressure bar (left edge, vertical) */}
              <rect x={r.x+4} y={CY+CH-10-barH} width={6} height={barH} rx={3} fill={pClr(cP)} opacity={0.55}/>
              {/* Particles */}
              {getParticles(r, c.T, gObj.color, idx)}
              {/* Gas name */}
              <text x={r.cx} y={CY+22} textAnchor="middle" fill={gObj.color} fontSize={14} fontWeight={800}>{c.gas}</text>
              {/* Stats */}
              <text x={r.cx} y={CY+38} textAnchor="middle" fill="#71717a" fontSize={10}>{c.mol.toFixed(2)} mol · {c.V.toFixed(1)} L</text>
              <text x={r.cx} y={CY+54} textAnchor="middle" fill={pClr(cP)} fontSize={13} fontWeight={700}>{cP.toFixed(3)} atm</text>
              <text x={r.cx} y={CY+68} textAnchor="middle" fill={tempClr(c.T)} fontSize={10}>{c.T} K</text>
              {/* Selection outline */}
              {isSelected && <rect x={r.x} y={CY} width={r.w} height={CH} fill="none" stroke={gObj.color} strokeWidth={2.5} strokeDasharray="7,3"/>}
            </g>
          );
        })}

        {/* ── INTERNAL PISTONS with valves ── */}
        {pistonXs.map((px, i) => {
          // Each internal piston has its own open/closed state stored in chamber — 
          // We'll draw them always as solid movable pistons (inter-chamber valves would be a future feature)
          return (
            <g key={i} style={{ cursor:"ew-resize" }}
              onMouseDown={e=>{ e.stopPropagation(); setDragPiston(i); }}>
              {/* Piston body */}
              <rect x={px-PW/2} y={CY} width={PW} height={CH}
                fill="#2d2d30" stroke="#71717a" strokeWidth={2} rx={3}/>
              {/* Hatching */}
              {[0,1,2,3,4].map(j=>(
                <line key={j} x1={px-PW/2+1} y1={CY+16+j*24} x2={px+PW/2-1} y2={CY+26+j*24}
                  stroke="#52525b" strokeWidth={1.2}/>
              ))}
              {/* Drag hint */}
              <text x={px} y={CY-8} textAnchor="middle" fill="#52525b" fontSize={9}>↔</text>
              <text x={px} y={CY-1} textAnchor="middle" fill="#3f3f46" fontSize={8}>piston {i+1}</text>
              {/* Valve on bottom of each internal piston */}
              <Valve cx={px} cy={VALVE_Y} open={true} onClick={()=>{}} label={`P${i+1}`}/>
            </g>
          );
        })}

        {/* ── RIGHT WALL / ATMO ── */}
        <rect x={rightEdge} y={CY} width={ATMO_W} height={CH}
          fill={rightOpen ? "#0d1f12" : "#1c1c1e"}
          stroke={rightOpen ? "#14532d" : "#3f3f46"} strokeWidth={2}/>
        <text x={rightEdge+ATMO_W/2} y={CY+CH/2-12} textAnchor="middle"
          fill={rightOpen?"#22c55e":"#52525b"} fontSize={12} fontWeight={800}>M₂</text>
        <text x={rightEdge+ATMO_W/2} y={CY+CH/2+4} textAnchor="middle"
          fill={rightOpen?"#4ade80":"#3f3f46"} fontSize={9}>
          {rightOpen ? `${rightP.toFixed(1)} atm` : "KAPALI"}
        </text>
        {rightOpen && (
          <>
            <line x1={rightEdge+4} y1={CY+CH/2} x2={rightEdge+ATMO_W-4} y2={CY+CH/2}
              stroke="#22c55e" strokeWidth={2.5} markerEnd="url(#ag2r)" opacity={0.9}/>
            <line x1={rightEdge+4} y1={CY+CH/2-20} x2={rightEdge+ATMO_W-4} y2={CY+CH/2-20}
              stroke="#22c55e" strokeWidth={1} markerEnd="url(#ag2r)" opacity={0.4}/>
            <line x1={rightEdge+4} y1={CY+CH/2+20} x2={rightEdge+ATMO_W-4} y2={CY+CH/2+20}
              stroke="#22c55e" strokeWidth={1} markerEnd="url(#ag2r)" opacity={0.4}/>
          </>
        )}
        {/* M2 Valve symbol */}
        <Valve cx={rightEdge+ATMO_W/2} cy={VALVE_Y} open={rightOpen} onClick={()=>setRightOpen(o=>!o)} label="M₂"/>

        {/* Reference pressure dashed line for leftP */}
        {leftOpen && (() => {
          const pH = Math.min(CH-24, (leftP/6)*(CH-24));
          const ly = CY+CH-10-pH;
          return <line x1={WALL} y1={ly} x2={rightEdge} y2={ly}
            stroke="#22c55e" strokeWidth={1} strokeDasharray="5,4" opacity={0.3}/>;
        })()}

        {/* Bottom V labels */}
        {rects.map((r, i) => (
          <text key={i} x={r.cx} y={SVG_H-6} textAnchor="middle" fill="#27272a" fontSize={9}>
            V={chambers[i].V.toFixed(1)}L
          </text>
        ))}
      </svg>

      {/* Legend for valves */}
      <div style={{ display:"flex", gap:14, marginTop:8, fontSize:11, color:"#52525b", flexWrap:"wrap" }}>
        <span>🟢 Yeşil musuk = <b style={{color:"#4ade80"}}>AÇIK</b> (kol yatay)</span>
        <span>🔴 Kırmızı musluk = <b style={{color:"#f87171"}}>KAPALI</b> (kol dik)</span>
        <span>↔ Pistonları fare ile sürükleyerek hacmi değiştirin</span>
      </div>

      {/* Selected chamber editor */}
      <div style={{ marginTop:14, display:"flex", gap:12, flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 260px", background:"#18181b", borderRadius:10, padding:14, border:"1px solid #27272a" }}>
          <SectionTitle>Bölme {selectedChamber+1} — {ch.gas} Ayarları</SectionTitle>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
            {GAS_PRESETS.map(g => (
              <Pill key={g.label} active={ch.gas===g.label} color={g.color}
                onClick={()=>setChambers(prev=>prev.map((c,i)=>i===selectedChamber?{...c,gas:g.label}:c))}>
                {g.label}
              </Pill>
            ))}
          </div>
          <Slider label="Mol (n)" value={ch.mol} min={0.05} max={3} step={0.05} unit="mol" color="#a78bfa"
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selectedChamber?{...c,mol:v}:c))}/>
          <Slider label="Hacim (V)" value={ch.V} min={0.5} max={14} step={0.1} unit="L" color="#38bdf8"
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selectedChamber?{...c,V:v}:c))}/>
          <Slider label="Sıcaklık (T)" value={ch.T} min={50} max={1000} step={5} unit="K" color={tempClr(ch.T)}
            onChange={v=>setChambers(prev=>prev.map((c,i)=>i===selectedChamber?{...c,T:v}:c))}/>
        </div>

        {/* PV=nRT live */}
        <div style={{ flex:"1 1 260px", background:"#18181b", borderRadius:10, padding:14, border:"1px solid #27272a" }}>
          <SectionTitle>PV = nRT Doğrulama</SectionTitle>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <StatCard label="Basınç P" value={P.toFixed(3)} unit="atm" color={pClr(P)}/>
            <StatCard label="Hacim V" value={ch.V.toFixed(2)} unit="L" color="#38bdf8"/>
            <StatCard label="Sıcaklık T" value={ch.T} unit="K" color={tempClr(ch.T)}/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <StatCard label="P·V" value={(P*ch.V).toFixed(3)} unit="atm·L" color="#f4f4f5"/>
            <StatCard label="n·R·T" value={(ch.mol*R*ch.T).toFixed(3)} unit="atm·L" color="#4ade80"/>
            <StatCard label="Hata" value={Math.abs(P*ch.V-ch.mol*R*ch.T)<0.001?"≈0":(P*ch.V-ch.mol*R*ch.T).toFixed(4)} unit="atm·L" color="#fbbf24"/>
          </div>
          <div style={{ marginTop:10, background:"#09090b", borderRadius:8, padding:10, fontSize:12, color:"#52525b", lineHeight:1.8 }}>
            🌡️ Sıcaklık ↑ → Basınç ↑ (Gay-Lussac)<br/>
            📦 Hacim ↓ → Basınç ↑ (Boyle)<br/>
            🧪 Mol ↑ → Basınç ↑ (Avogadro)
          </div>
        </div>

        {/* Summary table */}
        <div style={{ flex:"2 1 400px", background:"#18181b", borderRadius:10, padding:14, border:"1px solid #27272a", overflowX:"auto" }}>
          <SectionTitle>Özet Tablosu</SectionTitle>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ color:"#52525b" }}>
                {["#","Gaz","n (mol)","V (L)","T (K)","P (atm)","PV","Denge"].map(h=>(
                  <th key={h} style={{ padding:"4px 7px", borderBottom:"1px solid #27272a", textAlign:"left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chambers.map((c, i) => {
                const cP = idealP(c.mol, c.T, c.V);
                const gObj = gasObj(c.gas);
                const nextP = chambers[i+1] ? idealP(chambers[i+1].mol,chambers[i+1].T,chambers[i+1].V) : (rightOpen?rightP:cP);
                const ok = Math.abs(cP - nextP) < 0.08;
                return (
                  <tr key={i} onClick={()=>setSelectedChamber(i)}
                    style={{ cursor:"pointer", background:i===selectedChamber?"#1f1f23":"transparent" }}>
                    <td style={{padding:"4px 7px",color:"#52525b"}}>{i+1}</td>
                    <td style={{padding:"4px 7px",color:gObj.color,fontWeight:700}}>{c.gas}</td>
                    <td style={{padding:"4px 7px",color:"#e4e4e7"}}>{c.mol.toFixed(2)}</td>
                    <td style={{padding:"4px 7px",color:"#38bdf8"}}>{c.V.toFixed(2)}</td>
                    <td style={{padding:"4px 7px",color:tempClr(c.T)}}>{c.T}</td>
                    <td style={{padding:"4px 7px",color:pClr(cP),fontWeight:700}}>{cP.toFixed(3)}</td>
                    <td style={{padding:"4px 7px",color:"#a1a1aa"}}>{(cP*c.V).toFixed(3)}</td>
                    <td style={{padding:"4px 7px"}}>
                      <span style={{background:ok?"#14532d":"#7f1d1d",color:ok?"#4ade80":"#f87171",borderRadius:4,padding:"1px 6px",fontSize:10}}>
                        {ok?"✓":"✗"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Atmosphere rows */}
              {leftOpen && (
                <tr style={{background:"#0a1a0a"}}>
                  <td style={{padding:"4px 7px",color:"#52525b"}}>M₁</td>
                  <td colSpan={4} style={{padding:"4px 7px",color:"#22c55e",fontSize:10}}>Açık — Dış Basınç</td>
                  <td style={{padding:"4px 7px",color:"#4ade80",fontWeight:700}}>{leftP.toFixed(2)}</td>
                  <td colSpan={2} style={{padding:"4px 7px",color:"#52525b"}}>—</td>
                </tr>
              )}
              {rightOpen && (
                <tr style={{background:"#0a1a0a"}}>
                  <td style={{padding:"4px 7px",color:"#52525b"}}>M₂</td>
                  <td colSpan={4} style={{padding:"4px 7px",color:"#22c55e",fontSize:10}}>Açık — Dış Basınç</td>
                  <td style={{padding:"4px 7px",color:"#4ade80",fontWeight:700}}>{rightP.toFixed(2)}</td>
                  <td colSpan={2} style={{padding:"4px 7px",color:"#52525b"}}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — GRAPHS
// ══════════════════════════════════════════════════════════════
function GraphsTab({ chambers }) {
  const [history, setHistory] = useState([]);
  const [recording, setRecording] = useState(false);
  const [activeChart, setActiveChart] = useState("PT");
  const tickRef = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      tickRef.current += 1;
      const point = { t: tickRef.current };
      chambers.forEach((c, i) => {
        point[`P${i+1}`] = parseFloat(idealP(c.mol, c.T, c.V).toFixed(3));
        point[`T${i+1}`] = c.T;
        point[`V${i+1}`] = parseFloat(c.V.toFixed(2));
      });
      setHistory(prev => [...prev.slice(-80), point]);
    }, 300);
    return () => clearInterval(t);
  }, [recording, chambers]);

  // PV scatter data
  const pvData = chambers.map((c, i) => {
    const gObj = gasObj(c.gas);
    return { name: `Bölme ${i+1}`, color: gObj.color,
      points: Array.from({length:30},(_,k)=>{
        const V = 0.5 + k * 0.5;
        const P = idealP(c.mol, c.T, V);
        return {x: parseFloat(V.toFixed(2)), y: parseFloat(P.toFixed(3))};
      })
    };
  });

  // Dalton pie
  const pressures = chambers.map((c,i)=>({ name: `${c.gas} (${i+1})`, value: parseFloat(idealP(c.mol,c.T,c.V).toFixed(3)), color: gasObj(c.gas).color }));
  const totalP = pressures.reduce((s,p)=>s+p.value,0);

  const COLORS_LINE = ["#a78bfa","#38bdf8","#34d399","#f472b6"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {["PT","PV_time","PV_curve","Dalton"].map(c=>(
          <Pill key={c} active={activeChart===c} onClick={()=>setActiveChart(c)}>
            {c==="PT"?"P-T Zaman":c==="PV_time"?"V-T Zaman":c==="PV_curve"?"P-V Eğrisi":"Dalton Tablo"}
          </Pill>
        ))}
        <button onClick={()=>setRecording(r=>!r)} style={{
          padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
          background:recording?"#7f1d1d33":"#14532d33",
          color:recording?"#f87171":"#4ade80",
          outline:`1.5px solid ${recording?"#ef4444":"#22c55e"}`
        }}>{recording?"⏹ Durdur":"▶ Kaydet"}</button>
        {history.length > 0 && <button onClick={()=>{setHistory([]);tickRef.current=0;}} style={{padding:"6px 10px",borderRadius:8,border:"1px solid #3f3f46",background:"#18181b",color:"#71717a",cursor:"pointer",fontSize:11}}>Temizle</button>}
      </div>

      <div style={{ background:"#18181b",borderRadius:10,padding:16,border:"1px solid #27272a" }}>
        {activeChart==="PT" && (
          <>
            <SectionTitle>Basınç — Zaman Grafiği (atm)</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="t" stroke="#52525b" fontSize={10} label={{value:"Zaman",position:"insideBottomRight",offset:-5,fill:"#52525b",fontSize:10}}/>
                <YAxis stroke="#52525b" fontSize={10}/>
                <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}} labelStyle={{color:"#a1a1aa"}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                {chambers.map((_,i)=>(
                  <Line key={i} type="monotone" dataKey={`P${i+1}`} stroke={COLORS_LINE[i]} dot={false} strokeWidth={2} name={`Bölme ${i+1} P`}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
        {activeChart==="PV_time" && (
          <>
            <SectionTitle>Hacim — Zaman Grafiği (L)</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="t" stroke="#52525b" fontSize={10}/>
                <YAxis stroke="#52525b" fontSize={10}/>
                <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                {chambers.map((_,i)=>(
                  <Area key={i} type="monotone" dataKey={`V${i+1}`} stroke={COLORS_LINE[i]} fill={COLORS_LINE[i]+"22"} strokeWidth={2} dot={false} name={`Bölme ${i+1} V`}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
        {activeChart==="PV_curve" && (
          <>
            <SectionTitle>P-V İzoterm Eğrisi (Boyle Yasası)</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="x" stroke="#52525b" fontSize={10} name="V (L)" label={{value:"V (L)",position:"insideBottomRight",offset:-5,fill:"#52525b",fontSize:10}}/>
                <YAxis dataKey="y" stroke="#52525b" fontSize={10} name="P (atm)"/>
                <Tooltip cursor={{strokeDasharray:"3 3"}} contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                {pvData.map((d,i)=>(
                  <Scatter key={i} name={`Bölme ${i+1} (${chambers[i].gas})`} data={d.points} fill={d.color}/>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </>
        )}
        {activeChart==="Dalton" && (
          <>
            <SectionTitle>Dalton Kısmi Basınç Dağılımı — Toplam: {totalP.toFixed(3)} atm</SectionTitle>
            <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
              <PieChart width={220} height={220}>
                <Pie data={pressures} dataKey="value" cx={105} cy={105} outerRadius={90} labelLine={false}
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(1)}%`}>
                  {pressures.map((p,i)=><Cell key={i} fill={p.color}/>)}
                </Pie>
                <Tooltip formatter={v=>`${v} atm`} contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}}/>
              </PieChart>
              <div style={{ flex:1 }}>
                {pressures.map((p,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <div style={{ width:14,height:14,borderRadius:3,background:p.color,flexShrink:0 }}/>
                    <div style={{ fontSize:12,color:"#e4e4e7",flex:1 }}>{p.name}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:p.color }}>{p.value.toFixed(3)} atm</div>
                    <div style={{ fontSize:11,color:"#52525b" }}>({((p.value/totalP)*100).toFixed(1)}%)</div>
                  </div>
                ))}
                <div style={{ marginTop:10,fontSize:11,color:"#52525b",borderTop:"1px solid #27272a",paddingTop:8 }}>
                  P_toplam = {pressures.map(p=>`P(${p.name.split(" ")[0]})`).join(" + ")} = {totalP.toFixed(3)} atm
                </div>
              </div>
            </div>
          </>
        )}
        {history.length === 0 && activeChart !== "PV_curve" && activeChart !== "Dalton" && (
          <div style={{ textAlign:"center",color:"#3f3f46",fontSize:13,padding:"30px 0" }}>
            ▶ Kaydet butonuna basarak veri toplamaya başlayın
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — MAXWELL-BOLTZMANN
// ══════════════════════════════════════════════════════════════
function MaxwellTab() {
  const [gasA, setGasA] = useState("He");
  const [gasB, setGasB] = useState("N₂");
  const [tempA, setTempA] = useState(300);
  const [tempB, setTempB] = useState(600);
  const [showBoth, setShowBoth] = useState(true);

  function mbDist(v, T, M) {
    const m = M / 1000 / NA; // kg per molecule
    const a = Math.sqrt(KB * T / m);
    return 4 * Math.PI * Math.pow(v, 2) * Math.pow(1 / (Math.sqrt(2 * Math.PI) * a), 3) * Math.exp(-v * v / (2 * a * a));
  }

  function buildCurve(gasLabel, T) {
    const M = gasObj(gasLabel).molar;
    const vMax = Math.sqrt(2 * KB * T / (M / 1000 / NA)) * 4;
    return Array.from({ length: 120 }, (_, i) => {
      const v = (i / 119) * vMax;
      return { v: Math.round(v), f: parseFloat((mbDist(v, T, M) * 1e-3).toFixed(6)) };
    });
  }

  const dataA = useMemo(() => buildCurve(gasA, tempA), [gasA, tempA]);
  const dataB = useMemo(() => buildCurve(gasB, tempB), [gasB, tempB]);
  const merged = dataA.map((d, i) => ({ v: d.v, A: d.f, B: dataB[i]?.f ?? 0 }));

  function vMost(T, M) { return Math.sqrt(2 * KB * T / (M / 1000 / NA)); }
  function vAvg(T, M)  { return Math.sqrt(8 * KB * T / (Math.PI * M / 1000 / NA)); }
  function vRms(T, M)  { return Math.sqrt(3 * KB * T / (M / 1000 / NA)); }

  const gA = gasObj(gasA), gB = gasObj(gasB);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
        {/* Gas A */}
        <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
          <SectionTitle>Gaz A — <span style={{color:gA.color}}>{gasA}</span></SectionTitle>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:10 }}>
            {GAS_PRESETS.map(g=><Pill key={g.label} active={gasA===g.label} color={g.color} onClick={()=>setGasA(g.label)}>{g.label}</Pill>)}
          </div>
          <Slider label="Sıcaklık" value={tempA} min={50} max={1200} step={10} unit="K" color={gA.color} onChange={setTempA}/>
          <div style={{ display:"flex",gap:6,marginTop:6,flexWrap:"wrap" }}>
            <StatCard label="v_en olası" value={Math.round(vMost(tempA,gA.molar))} unit="m/s" color={gA.color}/>
            <StatCard label="v_ort" value={Math.round(vAvg(tempA,gA.molar))} unit="m/s" color={gA.color}/>
            <StatCard label="v_rms" value={Math.round(vRms(tempA,gA.molar))} unit="m/s" color={gA.color}/>
          </div>
        </div>
        {/* Gas B */}
        <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
          <SectionTitle>Gaz B — <span style={{color:gB.color}}>{gasB}</span></SectionTitle>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:10 }}>
            {GAS_PRESETS.map(g=><Pill key={g.label} active={gasB===g.label} color={g.color} onClick={()=>setGasB(g.label)}>{g.label}</Pill>)}
          </div>
          <Slider label="Sıcaklık" value={tempB} min={50} max={1200} step={10} unit="K" color={gB.color} onChange={setTempB}/>
          <div style={{ display:"flex",gap:6,marginTop:6,flexWrap:"wrap" }}>
            <StatCard label="v_en olası" value={Math.round(vMost(tempB,gB.molar))} unit="m/s" color={gB.color}/>
            <StatCard label="v_ort" value={Math.round(vAvg(tempB,gB.molar))} unit="m/s" color={gB.color}/>
            <StatCard label="v_rms" value={Math.round(vRms(tempB,gB.molar))} unit="m/s" color={gB.color}/>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background:"#18181b",borderRadius:10,padding:16,border:"1px solid #27272a" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
          <SectionTitle>Maxwell-Boltzmann Hız Dağılımı</SectionTitle>
          <Pill active={showBoth} onClick={()=>setShowBoth(b=>!b)}>İkisini Karşılaştır</Pill>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={merged} margin={{left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
            <XAxis dataKey="v" stroke="#52525b" fontSize={10} label={{value:"Hız (m/s)",position:"insideBottomRight",offset:-5,fill:"#52525b",fontSize:10}}/>
            <YAxis stroke="#52525b" fontSize={10} label={{value:"f(v) ×10³",angle:-90,position:"insideLeft",fill:"#52525b",fontSize:10}}/>
            <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}} formatter={v=>[v,"f(v)"]}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Area type="monotone" dataKey="A" stroke={gA.color} fill={gA.color+"33"} strokeWidth={2} dot={false} name={`${gasA} @ ${tempA}K`}/>
            {showBoth && <Area type="monotone" dataKey="B" stroke={gB.color} fill={gB.color+"22"} strokeWidth={2} dot={false} name={`${gasB} @ ${tempB}K`}/>}
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ fontSize:11,color:"#3f3f46",marginTop:6,textAlign:"center" }}>
          Ağır gazlar → daha yavaş ve geniş dağılım · Yüksek T → dağılım sağa kayar ve düzleşir
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 4 — EĞİTİM MODU
// ══════════════════════════════════════════════════════════════
const EXPERIMENTS = [
  {
    id: "boyle",
    title: "Boyle Yasası",
    formula: "P₁V₁ = P₂V₂  (T sabit)",
    desc: "Sıcaklık sabit tutulurken hacim değiştirilir, basınç gözlemlenir.",
    color: "#f97316",
    steps: [
      { label: "V = 2 L", mol: 0.5, V: 2, T: 300 },
      { label: "V = 4 L", mol: 0.5, V: 4, T: 300 },
      { label: "V = 6 L", mol: 0.5, V: 6, T: 300 },
      { label: "V = 8 L", mol: 0.5, V: 8, T: 300 },
    ]
  },
  {
    id: "charles",
    title: "Charles Yasası",
    formula: "V₁/T₁ = V₂/T₂  (P sabit)",
    desc: "Basınç sabit tutulurken sıcaklık değiştirilir, hacim gözlemlenir.",
    color: "#38bdf8",
    steps: [
      { label: "T = 150 K", mol: 0.5, V: 4, T: 150 },
      { label: "T = 300 K", mol: 0.5, V: 8, T: 300 },
      { label: "T = 450 K", mol: 0.5, V: 12, T: 450 },
      { label: "T = 600 K", mol: 0.5, V: 16, T: 600 },
    ]
  },
  {
    id: "gaylussac",
    title: "Gay-Lussac Yasası",
    formula: "P₁/T₁ = P₂/T₂  (V sabit)",
    desc: "Hacim sabit tutulurken sıcaklık değiştirilir, basınç gözlemlenir.",
    color: "#ef4444",
    steps: [
      { label: "T = 200 K", mol: 0.5, V: 5, T: 200 },
      { label: "T = 400 K", mol: 0.5, V: 5, T: 400 },
      { label: "T = 600 K", mol: 0.5, V: 5, T: 600 },
      { label: "T = 800 K", mol: 0.5, V: 5, T: 800 },
    ]
  },
];

const QUIZ = [
  { q: "Bir gazın sıcaklığı 300 K'den 600 K'ye çıkarılıyor. Hacim sabitken basınç ne olur?", opts:["2 katına çıkar","Yarıya düşer","Değişmez","4 katına çıkar"], ans:0, law:"Gay-Lussac" },
  { q: "Bir gazın hacmi 4 L'den 2 L'ye düşürülüyor. Sıcaklık sabitken basınç ne olur?", opts:["Yarıya düşer","Değişmez","2 katına çıkar","4 katına çıkar"], ans:2, law:"Boyle" },
  { q: "PV = nRT formülünde R nedir?", opts:["Sıcaklık sabiti","İdeal gaz sabiti","Mol sayısı","Basınç birimi"], ans:1, law:"İdeal Gaz" },
  { q: "Maxwell-Boltzmann dağılımında sıcaklık arttıkça dağılım ne olur?", opts:["Sola kayar","Değişmez","Sağa kayar ve düzleşir","Daha dar ve yüksek olur"], ans:2, law:"Kinetik Teori" },
  { q: "Van der Waals denklemi ideal gazdan ne zaman önemli ölçüde farklılaşır?", opts:["Düşük basınçta","Yüksek sıcaklıkta","Yüksek basınç / düşük sıcaklıkta","Düşük mol sayısında"], ans:2, law:"Gerçek Gaz" },
];

function EduTab() {
  const [exp, setExp] = useState(null);
  const [step, setStep] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState("exp"); // "exp" | "quiz"

  const curExp = exp ? EXPERIMENTS.find(e=>e.id===exp) : null;
  const curStep = curExp?.steps[step] || null;
  const P = curStep ? idealP(curStep.mol, curStep.T, curStep.V) : 0;

  function nextStep() {
    if (step < curExp.steps.length - 1) setStep(s=>s+1);
  }
  function prevStep() {
    if (step > 0) setStep(s=>s-1);
  }

  function answerQuiz(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === QUIZ[quizIdx].ans) setScore(s=>s+1);
  }
  function nextQuiz() {
    if (quizIdx < QUIZ.length - 1) { setQuizIdx(q=>q+1); setSelected(null); }
    else setDone(true);
  }

  // Chart data for experiment
  const chartData = curExp ? curExp.steps.map(s=>({
    label: s.label,
    P: parseFloat(idealP(s.mol, s.T, s.V).toFixed(3)),
    V: s.V, T: s.T
  })) : [];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",gap:6 }}>
        <Pill active={mode==="exp"} onClick={()=>setMode("exp")} color="#a78bfa">🧪 Deney</Pill>
        <Pill active={mode==="quiz"} onClick={()=>setMode("quiz")} color="#fbbf24">❓ Soru-Cevap</Pill>
      </div>

      {mode === "exp" && (
        <>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {EXPERIMENTS.map(e=>(
              <button key={e.id} onClick={()=>{setExp(e.id);setStep(0);}} style={{
                flex:"1 1 180px",padding:"12px 14px",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",
                background:exp===e.id?e.color+"22":"#18181b",
                outline:exp===e.id?`1.5px solid ${e.color}`:"1px solid #27272a"
              }}>
                <div style={{fontSize:13,fontWeight:700,color:e.color,marginBottom:4}}>{e.title}</div>
                <div style={{fontSize:11,color:"#52525b"}}>{e.formula}</div>
              </button>
            ))}
          </div>

          {curExp && (
            <div style={{ background:"#18181b",borderRadius:10,padding:16,border:"1px solid #27272a" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:12 }}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:curExp.color}}>{curExp.title}</div>
                  <div style={{fontSize:12,color:"#52525b",marginTop:2}}>{curExp.desc}</div>
                  <div style={{fontSize:13,fontFamily:"monospace",color:"#e4e4e7",marginTop:4,background:"#09090b",display:"inline-block",padding:"4px 10px",borderRadius:6}}>{curExp.formula}</div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={prevStep} disabled={step===0} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #3f3f46",background:"#27272a",color:step===0?"#3f3f46":"#e4e4e7",cursor:step===0?"not-allowed":"pointer",fontSize:13}}>← Önceki</button>
                  <button onClick={nextStep} disabled={!curExp||step===curExp.steps.length-1} style={{padding:"6px 14px",borderRadius:8,border:"none",background:curExp.color+"33",color:curExp.color,cursor:"pointer",fontWeight:700,fontSize:13}}>Sonraki →</button>
                </div>
              </div>

              {/* Step display */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:14 }}>
                {curExp.steps.map((s,i)=>(
                  <button key={i} onClick={()=>setStep(i)} style={{
                    padding:"7px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                    background:i===step?curExp.color+"33":"#27272a",
                    color:i===step?curExp.color:"#71717a",
                    outline:i===step?`1.5px solid ${curExp.color}`:"none"
                  }}>{s.label}</button>
                ))}
              </div>

              {curStep && (
                <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:14 }}>
                  <StatCard label="n (mol)" value={curStep.mol.toFixed(2)} unit="mol" color="#a78bfa"/>
                  <StatCard label="V (L)" value={curStep.V.toFixed(1)} unit="L" color="#38bdf8"/>
                  <StatCard label="T (K)" value={curStep.T} unit="K" color={tempClr(curStep.T)}/>
                  <StatCard label="P (atm)" value={P.toFixed(3)} unit="atm" color={curExp.color}/>
                  <StatCard label="P·V" value={(P*curStep.V).toFixed(3)} unit="atm·L" color="#4ade80"/>
                </div>
              )}

              {/* Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="label" stroke="#52525b" fontSize={10}/>
                  <YAxis stroke="#52525b" fontSize={10}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="P" stroke={curExp.color} strokeWidth={2} dot={{r:4}} name="P (atm)"/>
                  <Line type="monotone" dataKey="V" stroke="#38bdf8" strokeWidth={2} dot={{r:4}} name="V (L)" strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {mode === "quiz" && (
        <div style={{ background:"#18181b",borderRadius:10,padding:16,border:"1px solid #27272a",maxWidth:600 }}>
          {done ? (
            <div style={{ textAlign:"center",padding:"20px 0" }}>
              <div style={{ fontSize:40,marginBottom:10 }}>{score>=4?"🏆":score>=2?"🎯":"📚"}</div>
              <div style={{ fontSize:20,fontWeight:800,color:"#f4f4f5",marginBottom:6 }}>
                {score} / {QUIZ.length} Doğru
              </div>
              <div style={{ fontSize:13,color:"#71717a",marginBottom:16 }}>
                {score===QUIZ.length?"Mükemmel! Tüm soruları doğru cevapladın.":score>=3?"Çok iyi! Biraz daha pratik yeterli.":"Tekrar çalışmak için deneylere bak."}
              </div>
              <button onClick={()=>{setQuizIdx(0);setSelected(null);setScore(0);setDone(false);}} style={{
                padding:"9px 20px",borderRadius:9,border:"none",background:"#a78bfa33",color:"#a78bfa",fontWeight:700,cursor:"pointer"
              }}>Tekrar Başla</button>
            </div>
          ) : (
            <>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <div style={{ fontSize:11,color:"#52525b" }}>Soru {quizIdx+1} / {QUIZ.length}</div>
                <div style={{ fontSize:11,color:"#fbbf24",fontWeight:700 }}>Puan: {score}</div>
              </div>
              <div style={{ background:"#09090b",borderRadius:8,padding:"8px 10px",fontSize:10,color:"#52525b",marginBottom:10 }}>
                Konu: {QUIZ[quizIdx].law}
              </div>
              <div style={{ fontSize:14,fontWeight:600,color:"#f4f4f5",marginBottom:16,lineHeight:1.5 }}>
                {QUIZ[quizIdx].q}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {QUIZ[quizIdx].opts.map((o,i)=>{
                  const isCorrect = i === QUIZ[quizIdx].ans;
                  const isSelected = i === selected;
                  return (
                    <button key={i} onClick={()=>answerQuiz(i)} style={{
                      padding:"10px 14px",borderRadius:9,border:"none",cursor:selected===null?"pointer":"default",
                      textAlign:"left",fontSize:13,fontWeight:500,transition:"all .15s",
                      background: selected===null?"#27272a"
                        : isCorrect?"#14532d"
                        : isSelected?"#7f1d1d"
                        :"#1c1c1e",
                      color: selected===null?"#e4e4e7"
                        : isCorrect?"#4ade80"
                        : isSelected?"#f87171"
                        :"#52525b",
                      outline: isSelected?(isCorrect?"1.5px solid #22c55e":"1.5px solid #ef4444"):"none"
                    }}>
                      {String.fromCharCode(65+i)}) {o}
                      {selected!==null && isCorrect && " ✓"}
                      {selected!==null && isSelected && !isCorrect && " ✗"}
                    </button>
                  );
                })}
              </div>
              {selected !== null && (
                <button onClick={nextQuiz} style={{
                  marginTop:14,width:"100%",padding:"9px",borderRadius:9,border:"none",
                  background:"#a78bfa33",color:"#a78bfa",fontWeight:700,cursor:"pointer",fontSize:13
                }}>
                  {quizIdx < QUIZ.length-1 ? "Sonraki Soru →" : "Sonucu Gör"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 5 — REAL GAS (Van der Waals + Heat Transfer + Mixture)
// ══════════════════════════════════════════════════════════════
function RealGasTab() {
  const [gas, setGas] = useState("CO₂");
  const [mol, setMol] = useState(1.0);
  const [V, setV] = useState(3);
  const [T, setT] = useState(300);
  const [mode, setMode] = useState("compare"); // "compare" | "mixture" | "heat"

  // Mixture
  const [mixGases, setMixGases] = useState([
    { gas:"N₂", mol:0.4 },
    { gas:"O₂", mol:0.3 },
    { gas:"CO₂",mol:0.2 },
  ]);
  const [mixV, setMixV] = useState(5);
  const [mixT, setMixT] = useState(300);

  // Heat transfer
  const [chamH, setChamH] = useState([
    { gas:"He", mol:0.3, V:3, T:600 },
    { gas:"N₂", mol:0.4, V:3, T:200 },
  ]);
  const [heatTick, setHeatTick] = useState(0);
  const [heatRunning, setHeatRunning] = useState(false);

  useEffect(() => {
    if (!heatRunning) return;
    const t = setInterval(() => {
      setChamH(prev => {
        const [a, b] = prev;
        const delta = (a.T - b.T) * 0.04;
        return [
          { ...a, T: Math.max(50, a.T - delta) },
          { ...b, T: Math.min(1000, b.T + delta) },
        ];
      });
      setHeatTick(x => x + 1);
    }, 100);
    return () => clearInterval(t);
  }, [heatRunning]);

  const gObj = gasObj(gas);
  const Pid  = idealP(mol, T, V);
  const Pvdw = vdwP(mol, T, V, gObj.a, gObj.b);
  const diff = ((Pvdw - Pid) / (Pid || 1) * 100).toFixed(2);

  // VdW curve
  const vdwCurve = Array.from({length:60},(_,i)=>{
    const Vi = 0.3 + i * 0.25;
    return {
      V: parseFloat(Vi.toFixed(2)),
      ideal: parseFloat(idealP(mol, T, Vi).toFixed(3)),
      vdw:   parseFloat(Math.max(0, vdwP(mol, T, Vi, gObj.a, gObj.b)).toFixed(3)),
    };
  });

  // Mixture stats
  const totalMixMol = mixGases.reduce((s,g)=>s+g.mol,0);
  const mixPartials  = mixGases.map(g=>({
    ...g, P: parseFloat(idealP(g.mol, mixT, mixV).toFixed(3)),
    frac: parseFloat((g.mol/totalMixMol).toFixed(3)),
    color: gasObj(g.gas).color
  }));
  const totalMixP = mixPartials.reduce((s,g)=>s+g.P,0);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
        <Pill active={mode==="compare"} onClick={()=>setMode("compare")} color="#a78bfa">⚗️ İdeal vs VdW</Pill>
        <Pill active={mode==="mixture"} onClick={()=>setMode("mixture")} color="#38bdf8">🧪 Gaz Karışımı</Pill>
        <Pill active={mode==="heat"}    onClick={()=>setMode("heat")}    color="#f97316">🌡️ Isı Transferi</Pill>
      </div>

      {mode === "compare" && (
        <>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
              <SectionTitle>Gaz Seç</SectionTitle>
              <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:10 }}>
                {GAS_PRESETS.map(g=><Pill key={g.label} active={gas===g.label} color={g.color} onClick={()=>setGas(g.label)}>{g.label}</Pill>)}
              </div>
              <Slider label="Mol (n)" value={mol} min={0.1} max={4} step={0.1} unit="mol" color={gObj.color} onChange={setMol}/>
              <Slider label="Hacim (V)" value={V} min={0.3} max={20} step={0.1} unit="L" color="#38bdf8" onChange={setV}/>
              <Slider label="Sıcaklık (T)" value={T} min={50} max={1000} step={5} unit="K" color={tempClr(T)} onChange={setT}/>
              <div style={{ marginTop:8,background:"#09090b",borderRadius:8,padding:10,fontSize:11,color:"#52525b" }}>
                <div style={{ color:"#a1a1aa",fontWeight:600,marginBottom:4 }}>VdW Sabitleri — {gas}</div>
                a = {gObj.a} L²·atm/mol² &nbsp;·&nbsp; b = {gObj.b} L/mol
              </div>
            </div>
            <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
              <SectionTitle>Karşılaştırma</SectionTitle>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <div style={{ background:"#09090b",borderRadius:8,padding:10 }}>
                  <div style={{ fontSize:11,color:"#52525b",marginBottom:4 }}>İdeal Gaz (PV=nRT)</div>
                  <div style={{ fontSize:22,fontWeight:800,color:"#38bdf8" }}>{Pid.toFixed(4)} <span style={{fontSize:13}}>atm</span></div>
                </div>
                <div style={{ background:"#09090b",borderRadius:8,padding:10 }}>
                  <div style={{ fontSize:11,color:"#52525b",marginBottom:4 }}>Van der Waals</div>
                  <div style={{ fontSize:22,fontWeight:800,color:gObj.color }}>{isNaN(Pvdw)?"-":Pvdw.toFixed(4)} <span style={{fontSize:13}}>atm</span></div>
                </div>
                <div style={{ background:"#09090b",borderRadius:8,padding:10 }}>
                  <div style={{ fontSize:11,color:"#52525b",marginBottom:4 }}>Fark</div>
                  <div style={{ fontSize:18,fontWeight:800,color:Math.abs(parseFloat(diff))>5?"#f87171":"#4ade80" }}>
                    {isNaN(Pvdw)?"-":`${diff}%`}
                  </div>
                  <div style={{ fontSize:10,color:"#52525b",marginTop:2 }}>
                    {Math.abs(parseFloat(diff))>5?"⚠️ İdeal olmayan davranış belirgin":"✓ İdeal yaklaşım geçerli"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background:"#18181b",borderRadius:10,padding:16,border:"1px solid #27272a" }}>
            <SectionTitle>P-V Eğrisi: İdeal vs Van der Waals</SectionTitle>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={vdwCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="V" stroke="#52525b" fontSize={10} label={{value:"V (L)",position:"insideBottomRight",offset:-5,fill:"#52525b",fontSize:10}}/>
                <YAxis stroke="#52525b" fontSize={10}/>
                <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="ideal" stroke="#38bdf8" strokeWidth={2} dot={false} name="İdeal Gaz"/>
                <Line type="monotone" dataKey="vdw"   stroke={gObj.color} strokeWidth={2} dot={false} strokeDasharray="6 3" name={`${gas} (VdW)`}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {mode === "mixture" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
              <SectionTitle>Karışım Koşulları</SectionTitle>
              <Slider label="Toplam Hacim" value={mixV} min={1} max={20} step={0.5} unit="L" color="#38bdf8" onChange={setMixV}/>
              <Slider label="Sıcaklık" value={mixT} min={50} max={1000} step={5} unit="K" color={tempClr(mixT)} onChange={setMixT}/>
              <SectionTitle>Gaz Bileşenleri</SectionTitle>
              {mixGases.map((g,i)=>(
                <div key={i} style={{ marginBottom:8,background:"#09090b",borderRadius:8,padding:8 }}>
                  <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:6 }}>
                    {GAS_PRESETS.slice(0,5).map(pg=>(
                      <Pill key={pg.label} active={g.gas===pg.label} color={pg.color}
                        onClick={()=>setMixGases(prev=>prev.map((x,j)=>j===i?{...x,gas:pg.label}:x))}>
                        {pg.label}
                      </Pill>
                    ))}
                  </div>
                  <Slider label={`Mol ${i+1}`} value={g.mol} min={0.05} max={2} step={0.05} unit="mol"
                    color={gasObj(g.gas).color}
                    onChange={v=>setMixGases(prev=>prev.map((x,j)=>j===i?{...x,mol:v}:x))}/>
                </div>
              ))}
            </div>
            <div style={{ flex:"1 1 220px",background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
              <SectionTitle>Dalton Kısmi Basınçlar</SectionTitle>
              {mixPartials.map((g,i)=>(
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
                    <span style={{ fontSize:12,color:g.color,fontWeight:700 }}>{g.gas}</span>
                    <span style={{ fontSize:12,color:"#e4e4e7" }}>{g.P.toFixed(3)} atm ({(g.frac*100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height:8,background:"#09090b",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${g.frac*100}%`,background:g.color,borderRadius:4 }}/>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:12,borderTop:"1px solid #27272a",paddingTop:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:13,color:"#a1a1aa",fontWeight:700 }}>P_toplam</span>
                  <span style={{ fontSize:16,fontWeight:800,color:"#4ade80" }}>{totalMixP.toFixed(3)} atm</span>
                </div>
                <div style={{ fontSize:11,color:"#52525b",marginTop:4 }}>n_toplam = {totalMixMol.toFixed(2)} mol</div>
              </div>
              <div style={{ marginTop:10,background:"#09090b",borderRadius:8,padding:8,fontSize:11,color:"#52525b" }}>
                Dalton Yasası: P_top = P₁ + P₂ + P₃ + …<br/>
                Her gaz diğerlerinden bağımsız davranır.
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "heat" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ background:"#18181b",borderRadius:10,padding:14,border:"1px solid #27272a" }}>
            <SectionTitle>İki Bölme Arası Isı Transferi</SectionTitle>
            <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:14 }}>
              {chamH.map((c,i)=>(
                <div key={i} style={{ flex:"1 1 180px",background:"#09090b",borderRadius:8,padding:12,border:`1px solid ${tempClr(c.T)}44` }}>
                  <div style={{ fontSize:12,fontWeight:700,color:tempClr(c.T),marginBottom:8 }}>
                    Bölme {i+1} — {c.gas}
                  </div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    <StatCard label="T" value={Math.round(c.T)} unit="K" color={tempClr(c.T)}/>
                    <StatCard label="P" value={idealP(c.mol,c.T,c.V).toFixed(3)} unit="atm" color={pClr(idealP(c.mol,c.T,c.V))}/>
                  </div>
                  <div style={{ marginTop:8,height:10,background:"#27272a",borderRadius:5,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${((c.T-50)/950)*100}%`,background:tempClr(c.T),borderRadius:5,transition:"width .2s" }}/>
                  </div>
                  {!heatRunning && (
                    <div style={{ marginTop:8 }}>
                      <Slider label="Başlangıç T" value={c.T} min={50} max={1000} step={10} unit="K" color={tempClr(c.T)}
                        onChange={v=>setChamH(prev=>prev.map((x,j)=>j===i?{...x,T:v}:x))}/>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Equilibrium indicator */}
            <div style={{ textAlign:"center",marginBottom:12 }}>
              {Math.abs(chamH[0].T - chamH[1].T) < 2
                ? <span style={{ color:"#4ade80",fontWeight:700,fontSize:14 }}>⚖️ Termal Denge Sağlandı — T_ortak ≈ {Math.round(chamH[0].T)} K</span>
                : <span style={{ color:"#f97316",fontSize:13 }}>Isı aktarımı devam ediyor… ΔT = {Math.round(Math.abs(chamH[0].T-chamH[1].T))} K</span>
              }
            </div>

            <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
              <button onClick={()=>setHeatRunning(r=>!r)} style={{
                padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
                background:heatRunning?"#7f1d1d33":"#14532d33",
                color:heatRunning?"#f87171":"#4ade80",
                outline:`1.5px solid ${heatRunning?"#ef4444":"#22c55e"}`
              }}>{heatRunning?"⏹ Durdur":"▶ Başlat"}</button>
              <button onClick={()=>{setHeatRunning(false);setChamH([{gas:"He",mol:0.3,V:3,T:600},{gas:"N₂",mol:0.4,V:3,T:200}]);}} style={{
                padding:"8px 16px",borderRadius:9,border:"1px solid #3f3f46",background:"#18181b",color:"#71717a",cursor:"pointer",fontSize:13
              }}>↺ Sıfırla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
const T0 = 300;

export default function App() {
  const [activeTab, setActiveTab] = useState("sim");
  const [chambers, setChambers] = useState(defaultChambers(3));
  const [numChambers, setNumChambers] = useState(3);
  const [leftOpen,  setLeftOpen]  = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftP,  setLeftP]  = useState(1.0);
  const [rightP, setRightP] = useState(1.0);

  return (
    <div style={{
      minHeight:"100vh",
      background:"#09090b",
      color:"#e4e4e7",
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* Header */}
      <div style={{ background:"#111113",borderBottom:"1px solid #1c1c1e",padding:"12px 20px" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:17,fontWeight:800,color:"#f4f4f5",letterSpacing:-0.3 }}>⚗️ Gaz Laboratuvarı</div>
            <div style={{ fontSize:10,color:"#3f3f46",marginTop:1 }}>PV=nRT · Maxwell-Boltzmann · Van der Waals</div>
          </div>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginLeft:"auto" }}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
                padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",
                fontSize:12,fontWeight:600,transition:"all .15s",
                background:activeTab===tab.id?"#1c1c3a":"transparent",
                color:activeTab===tab.id?"#a78bfa":"#52525b",
                outline:activeTab===tab.id?"1.5px solid #a78bfa44":"none"
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"16px 14px" }}>
        {activeTab==="sim" && (
          <SimTab
            chambers={chambers} setChambers={setChambers}
            numChambers={numChambers} setNumChambers={setNumChambers}
            leftOpen={leftOpen}   setLeftOpen={setLeftOpen}
            rightOpen={rightOpen} setRightOpen={setRightOpen}
            leftP={leftP}   setLeftP={setLeftP}
            rightP={rightP} setRightP={setRightP}
          />
        )}
        {activeTab==="graphs"  && <GraphsTab chambers={chambers}/>}
        {activeTab==="maxwell" && <MaxwellTab/>}
        {activeTab==="edu"     && <EduTab/>}
        {activeTab==="realgas" && <RealGasTab/>}
      </div>

      <div style={{ textAlign:"center",padding:"14px",fontSize:10,color:"#1c1c1e",marginTop:10 }}>
        R = 0.0821 L·atm/mol·K · Nₐ = 6.022×10²³ · kB = 1.38×10⁻²³ J/K
      </div>
    </div>
  );
}

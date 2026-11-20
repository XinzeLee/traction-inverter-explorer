import React, { useMemo, useState } from 'react';
import { Box, CarFront, RotateCcw, Layers3, MousePointer2, ChevronRight, Crosshair, Info, Github, ArrowRight } from 'lucide-react';
import Viewer from './Viewer.jsx';
import CommunityCounter from './CommunityCounter.jsx';
import { visualReferences } from './references.js';

const REPOSITORY_URL = 'https://github.com/XinzeLee/traction-inverter-explorer';
const CREATOR_URL = 'https://github.com/XinzeLee';

const systemInverter = { id:'sys-inverter', name:'Traction inverter', category:'Traction drive', description:'The traction inverter converts DC from the high-voltage battery to three-phase AC for the motor. In a regenerative operating mode, the power path can also run back toward the battery.' };
const systemSources = [
  { label:'TI: EV charging and power architecture', url:'https://www.ti.com/document-viewer/lit/html/SSZTA03/GUID-914A2889-092F-4218-8E24-16A295783CEF' },
  { label:'DOE: wireless vehicle charging', url:'https://www.energy.gov/sites/default/files/2024-11/VTO_2023_APR_ELECTRIFICATION%20REPORT_compliant_.pdf' },
];

export default function App() {
  const [parts, setParts] = useState([]);
  const [vehicleParts, setVehicleParts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selected, setSelected] = useState('dc-link');
  const [systemSelected, setSystemSelected] = useState('sys-inverter');
  const [exploded, setExploded] = useState(true);
  const [vehicle, setVehicle] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const systemParts = useMemo(() => [systemInverter, ...vehicleParts], [vehicleParts]);
  const shownParts = vehicle ? systemParts : parts;
  const activeId = vehicle ? systemSelected : selected;
  const selectedPart = shownParts.find(p => p.id === activeId);
  const categories = useMemo(() => [...new Set(shownParts.map(p => p.category))], [shownParts]);
  const normalizeId = id => id === 'traction-inverter' ? 'sys-inverter' : id;
  const connectedIds = [...new Set(connections.filter(c => normalizeId(c.from) === activeId || normalizeId(c.to) === activeId).map(c => normalizeId(normalizeId(c.from) === activeId ? c.to : c.from)))];
  const reset = () => { setExploded(true); setVehicle(false); setIsolate(false); setSelected('dc-link'); setSystemSelected('sys-inverter'); setResetKey(x => x+1); };
  const selectPart = id => { if (vehicle) setSystemSelected(id); else {setSelected(id);setIsolate(false);} };
  return <div className="app">
    <header className="topbar">
      <div className="brand brand-astra"><span className="brand-copy"><strong><u>ASTRA</u> Lab</strong><small><span>Next-generation <u>A</u>I for <u>S</u>emiconductors and power elec<u>T</u>ronics</span><span>- <u>R</u>esearch and <u>A</u>dvancements</span></small></span></div>
      <div className="header-title">{vehicle ? 'Electric vehicle' : 'Traction inverter'} <span>/</span> {vehicle ? '3D power system' : '3D assembly'}</div>
      <div className="toolbar">
        <button className={vehicle ? 'primary' : ''} onClick={() => {setVehicle(!vehicle);setIsolate(false);}} aria-pressed={vehicle}><CarFront size={17}/><span>{vehicle ? 'Vehicle system' : 'Vehicle view'}</span></button>
        <button className={!vehicle && exploded ? 'primary' : ''} onClick={() => {setVehicle(false);setExploded(vehicle ? true : !exploded);setIsolate(false);}} aria-pressed={!vehicle && exploded}><Layers3 size={17}/><span>{vehicle ? 'Inverter detail' : exploded ? 'Exploded view' : 'Assembled view'}</span></button>
        <button className="reset" onClick={reset} aria-label="Reset view"><RotateCcw size={17}/><span>Reset</span></button>
      </div>
      <a className="header-repo" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" aria-label="View source code on GitHub" title="View source code on GitHub"><Github size={20}/></a>
    </header>
    <main className="workspace">
      <aside className="parts-panel">
        <div className="panel-intro"><span className="small-label">{vehicle ? 'THE VEHICLE SYSTEM' : 'THE ASSEMBLY'}</span><h1>{vehicle ? 'EV power system' : 'Traction inverter'}</h1><p>{vehicle ? 'Explore how the battery, motor, charging paths and auxiliary loads connect.' : 'Follow the power from the battery to the motor and explore the hardware inside.'}</p></div>
        <div className="parts-title"><span>{vehicle ? 'SYSTEM COMPONENTS' : 'COMPONENTS'}</span><span>{String(shownParts.length).padStart(2,'0')}</span></div>
        <div className="parts-scroll">{categories.map(category => <section className="part-category" key={category}><h2>{category}</h2>{shownParts.filter(p => p.category === category).map(part => <button key={part.id} className={'part-row '+(part.id===activeId?'selected':'')} onClick={() => selectPart(part.id)} aria-pressed={part.id===activeId}><span className={vehicle?'part-number':'part-dot'}>{vehicle ? String(shownParts.findIndex(p=>p.id===part.id)+1).padStart(2,'0') : null}</span><span>{part.name}</span><ChevronRight size={15}/></button>)}</section>)}</div>
      </aside>
      <section className="stage" aria-label="3D model viewer">
        <Viewer exploded={exploded} vehicle={vehicle} selected={selected} systemSelected={systemSelected} isolate={isolate} onSelect={id => {setSelected(id);setIsolate(false);}} onSystemSelect={setSystemSelected} onParts={setParts} onSystemParts={setVehicleParts} onSystemConnections={setConnections} resetKey={resetKey}/>
        <div className="stage-top"><span className="stage-kicker">{vehicle ? 'VEHICLE POWER SYSTEM' : 'ASSEMBLY VIEW'}</span><strong>{vehicle ? 'Explore the power paths' : 'Explore the inverter'}</strong><p>{vehicle ? 'Select a numbered component or use the list.' : 'Select a component to learn how it works.'}</p></div>
        <div className="stage-bottom"><span><MousePointer2 size={15}/> Drag to rotate</span><span>Scroll to zoom</span>{!vehicle && <span>Click a part to inspect</span>}</div>
        {vehicle && <div className="system-legend" aria-label="Connection legend"><span><i className="legend-hv"/> HV DC</span><span><i className="legend-phase"/> Motor AC</span><span><i className="legend-ac"/> Inlet AC</span><span><i className="legend-charge"/> Charging DC</span><span><i className="legend-signal"/> BMS signal</span><span><i className="legend-wireless"/> Wireless field</span></div>}
      </section>
      <aside className="inspector" aria-live="polite">
        <div className="inspector-label"><span>{vehicle ? 'SYSTEM DETAIL' : 'COMPONENT DETAIL'}</span><span>{selectedPart ? String(shownParts.findIndex(p=>p.id===activeId)+1).padStart(2,'0') : '—'} / {String(shownParts.length).padStart(2,'0')}</span></div>
        {selectedPart ? <><div className="inspect-icon"><Box size={26} strokeWidth={1.3}/></div><span className="category-label">{selectedPart.category}</span><h2>{selectedPart.name}</h2><p className="description">{selectedPart.description}</p><div className="divider"/><div className="detail-row"><span>{vehicle ? 'System' : 'Assembly'}</span><strong>{vehicle ? 'Battery electric vehicle' : 'Three-phase traction inverter'}</strong></div><div className="detail-row"><span>View</span><strong>{vehicle ? 'Vehicle system' : isolate ? 'Isolated' : exploded ? 'Exploded' : 'Assembled'}</strong></div>{vehicle ? (activeId === 'sys-inverter' ? <button className="isolate" onClick={()=>{setVehicle(false);setExploded(true);setIsolate(false);}}><ArrowRight size={16}/> Explore inverter internals</button> : null) : <button className={'isolate '+(isolate?'is-isolated':'')} onClick={() => setIsolate(!isolate)}><Crosshair size={16}/>{isolate ? 'Show all components' : 'Isolate component'}</button>}</> : <p>Select a component to inspect it.</p>}
        {vehicle && connectedIds.length > 0 && <div className="connected-links"><span>CONNECTED COMPONENTS</span>{connectedIds.map(id => {const item=systemParts.find(p=>p.id===id);return item ? <button key={id} onClick={()=>setSystemSelected(id)}>{item.name}<ChevronRight size={13}/></button> : null;})}</div>}
        <div className="source-links"><span>{vehicle ? 'SYSTEM REFERENCES' : 'VISUAL REFERENCES'}</span>{(vehicle ? systemSources : (visualReferences[selected] || [])).map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div><div className="inspector-foot"><Info size={15}/><p>{vehicle ? 'Conceptual layout. Locations are illustrative; wired and wireless charging are alternative paths.' : 'Reference-informed teaching model. The assembly combines features from several products; geometry and ratings are illustrative.'}</p></div>
      </aside>
    </main>
    <footer className="footer"><span>POWER ELECTRONICS <b> / </b> ELECTRIC VEHICLES</span><span className="footer-description">{vehicle ? 'Illustrative vehicle architecture and optional charging paths' : 'Conceptual two-level, three-phase inverter'}</span><div className="footer-right"><CommunityCounter/><a className="creator-credit" href={CREATOR_URL} target="_blank" rel="noopener noreferrer">Created by Xinze Li</a></div></footer>
  </div>
}

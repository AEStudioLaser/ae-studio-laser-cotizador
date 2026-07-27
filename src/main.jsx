
import React, {useEffect, useMemo, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Calculator, History, Settings, Save, Trash2, Printer, MessageCircle, Menu, X, RotateCcw} from 'lucide-react'
import './styles.css'

const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n)||0)
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

const defaults = {
  printer:'Bambu Lab A1',
  electricityPrice:1.20,
  printerWatts:90,
  wearPerHour:5,
  defaultProfit:50,
  roundTo:5,
  materials:[
    {id:'pla',name:'PLA',priceKg:298},
    {id:'petg',name:'PETG',priceKg:340}
  ]
}

function useLocal(key, initial){
  const [value,setValue]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(key)) ?? initial}catch{return initial}
  })
  useEffect(()=>localStorage.setItem(key,JSON.stringify(value)),[key,value])
  return [value,setValue]
}

function App(){
  const [page,setPage]=useState('quote')
  const [open,setOpen]=useState(false)
  const [settings,setSettings]=useLocal('ae_stage1_settings',defaults)
  const [history,setHistory]=useLocal('ae_stage1_history',[])

  useEffect(()=>{
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
  },[])

  const nav=[
    ['quote','Cotizador',Calculator],
    ['history','Historial',History],
    ['settings','Configuración',Settings]
  ]

  const go=id=>{setPage(id);setOpen(false)}

  return <div className="shell">
    <aside className={`sidebar ${open?'open':''}`}>
      <div className="brand">
        <img src="/logo-ae.png" alt="A&E Studio Laser"/>
        <div><strong>A&E Studio Laser</strong><span>Etapa 1 · Cotizador 3D</span></div>
      </div>
      <nav>
        {nav.map(([id,label,Icon])=><button className={page===id?'active':''} key={id} onClick={()=>go(id)}><Icon size={19}/>{label}</button>)}
      </nav>
      <small>Datos guardados en este dispositivo</small>
    </aside>

    <main>
      <header>
        <button className="menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
        <div><h1>{nav.find(x=>x[0]===page)?.[1]}</h1><p>A&E Studio Laser</p></div>
      </header>

      {page==='quote' && <Quote settings={settings} history={history} setHistory={setHistory}/>}
      {page==='history' && <HistoryPage history={history} setHistory={setHistory}/>}
      {page==='settings' && <SettingsPage settings={settings} setSettings={setSettings}/>}
    </main>
  </div>
}

function Quote({settings,history,setHistory}){
  const [form,setForm]=useState({
    client:'',
    project:'',
    material:settings.materials[0]?.id||'pla',
    quantity:1,
    weight:50,
    hours:4,
    minutes:0,
    extras:0,
    labor:0,
    profit:settings.defaultProfit
  })

  useEffect(()=>{
    if(!settings.materials.some(m=>m.id===form.material)){
      setForm(f=>({...f,material:settings.materials[0]?.id||''}))
    }
  },[settings.materials])

  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const mat=settings.materials.find(m=>m.id===form.material)||settings.materials[0]

  const calc=useMemo(()=>{
    const hrs=Number(form.hours||0)+Number(form.minutes||0)/60
    const materialCost=(Number(form.weight||0)/1000)*Number(mat?.priceKg||0)
    const electricity=hrs*(Number(settings.printerWatts||0)/1000)*Number(settings.electricityPrice||0)
    const wear=hrs*Number(settings.wearPerHour||0)
    const production=materialCost+electricity+wear+Number(form.extras||0)+Number(form.labor||0)
    const raw=production*(1+Number(form.profit||0)/100)
    const round=Number(settings.roundTo||1)
    const total=Math.ceil(raw/round)*round
    return {hrs,materialCost,electricity,wear,production,total,unit:total/Math.max(1,Number(form.quantity||1))}
  },[form,settings,mat])

  const save=()=>{
    const item={id:uid(),date:new Date().toISOString(),...form,materialName:mat?.name||'',...calc}
    setHistory([item,...history])
    alert('Cotización guardada.')
  }

  const whatsapp=()=>{
    const text=`A&E Studio Laser\nCotización de impresión 3D\n\nCliente: ${form.client||'—'}\nProyecto: ${form.project||'—'}\nCantidad: ${form.quantity}\nPrecio por pieza: ${money(calc.unit)}\nTotal: ${money(calc.total)}`
    const url=`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.location.href=url
  }

  return <div className="grid">
    <section className="card">
      <div className="title"><div><h2>Nueva cotización</h2><p>Captura solo los datos necesarios.</p></div></div>

      <div className="formGrid">
        <Field label="Cliente"><input value={form.client} onChange={e=>set('client',e.target.value)} placeholder="Nombre del cliente"/></Field>
        <Field label="Proyecto"><input value={form.project} onChange={e=>set('project',e.target.value)} placeholder="Ej. Llavero personalizado"/></Field>
        <Field label="Material" full><select value={form.material} onChange={e=>set('material',e.target.value)}>{settings.materials.map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.priceKg)}/kg</option>)}</select></Field>
        <Field label="Cantidad"><input type="number" min="1" value={form.quantity} onChange={e=>set('quantity',e.target.value)}/></Field>
        <Field label="Peso total (g)"><input type="number" min="0" value={form.weight} onChange={e=>set('weight',e.target.value)}/></Field>
        <Field label="Horas"><input type="number" min="0" value={form.hours} onChange={e=>set('hours',e.target.value)}/></Field>
        <Field label="Minutos"><input type="number" min="0" max="59" value={form.minutes} onChange={e=>set('minutes',e.target.value)}/></Field>
        <Field label="Extras ($)"><input type="number" min="0" value={form.extras} onChange={e=>set('extras',e.target.value)}/></Field>
        <Field label="Mano de obra ($)"><input type="number" min="0" value={form.labor} onChange={e=>set('labor',e.target.value)}/></Field>
        <Field label={`Ganancia: ${form.profit}%`} full><input type="range" min="0" max="150" step="5" value={form.profit} onChange={e=>set('profit',e.target.value)}/></Field>
      </div>

      <div className="actions">
        <button className="primary" onClick={save}><Save size={18}/>Guardar</button>
        <button onClick={whatsapp}><MessageCircle size={18}/>WhatsApp</button>
        <button onClick={()=>window.print()}><Printer size={18}/>PDF / Imprimir</button>
      </div>
    </section>

    <aside>
      <div className="total">
        <span>Total sugerido</span>
        <strong>{money(calc.total)}</strong>
        <div><span>Precio por pieza</span><b>{money(calc.unit)}</b></div>
      </div>
      <div className="card">
        <h2>Desglose</h2>
        <Line label="Material" value={calc.materialCost}/>
        <Line label="Electricidad" value={calc.electricity}/>
        <Line label="Desgaste" value={calc.wear}/>
        <Line label="Mano de obra" value={form.labor}/>
        <Line label="Extras" value={form.extras}/>
        <Line label="Costo de producción" value={calc.production} bold/>
        <Line label="Ganancia" value={calc.total-calc.production} bold/>
      </div>
    </aside>
  </div>
}

function HistoryPage({history,setHistory}){
  return <section className="card">
    <div className="title">
      <div><h2>Historial de cotizaciones</h2><p>{history.length} cotizaciones guardadas.</p></div>
      {history.length>0&&<button className="danger" onClick={()=>confirm('¿Borrar todo el historial?')&&setHistory([])}><Trash2 size={17}/>Borrar todo</button>}
    </div>
    {history.length===0?<div className="empty">Todavía no hay cotizaciones guardadas.</div>:
    <div className="tableWrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Proyecto</th><th>Material</th><th>Total</th><th></th></tr></thead>
    <tbody>{history.map(h=><tr key={h.id}><td>{new Date(h.date).toLocaleDateString('es-MX')}</td><td>{h.client||'—'}</td><td>{h.project||'—'}</td><td>{h.materialName}</td><td><b>{money(h.total)}</b></td><td><button className="icon" onClick={()=>setHistory(history.filter(x=>x.id!==h.id))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}
  </section>
}

function SettingsPage({settings,setSettings}){
  const [draft,setDraft]=useState(settings)
  useEffect(()=>setDraft(settings),[settings])
  const updateMat=(id,k,v)=>setDraft(d=>({...d,materials:d.materials.map(m=>m.id===id?{...m,[k]:v}:m)}))
  const addMat=()=>setDraft(d=>({...d,materials:[...d.materials,{id:uid(),name:'Nuevo material',priceKg:0}]}))
  const reset=()=>setDraft(defaults)

  return <section className="card">
    <div className="title"><div><h2>Configuración</h2><p>Ajusta los costos usados por el cotizador.</p></div></div>
    <div className="formGrid">
      <Field label="Impresora"><input value={draft.printer} onChange={e=>setDraft({...draft,printer:e.target.value})}/></Field>
      <Field label="Electricidad ($/kWh)"><input type="number" step="0.01" value={draft.electricityPrice} onChange={e=>setDraft({...draft,electricityPrice:e.target.value})}/></Field>
      <Field label="Consumo de impresora (W)"><input type="number" value={draft.printerWatts} onChange={e=>setDraft({...draft,printerWatts:e.target.value})}/></Field>
      <Field label="Desgaste por hora ($)"><input type="number" value={draft.wearPerHour} onChange={e=>setDraft({...draft,wearPerHour:e.target.value})}/></Field>
      <Field label="Ganancia predeterminada (%)"><input type="number" value={draft.defaultProfit} onChange={e=>setDraft({...draft,defaultProfit:e.target.value})}/></Field>
      <Field label="Redondear precios a ($)"><input type="number" value={draft.roundTo} onChange={e=>setDraft({...draft,roundTo:e.target.value})}/></Field>
    </div>

    <div className="materialsHead"><h3>Materiales de impresión 3D</h3><button onClick={addMat}>Agregar material</button></div>
    <div className="materials">
      {draft.materials.map(m=><div className="material" key={m.id}>
        <input value={m.name} onChange={e=>updateMat(m.id,'name',e.target.value)}/>
        <input type="number" value={m.priceKg} onChange={e=>updateMat(m.id,'priceKg',e.target.value)}/>
        <button className="icon" onClick={()=>setDraft(d=>({...d,materials:d.materials.filter(x=>x.id!==m.id)}))}><Trash2 size={17}/></button>
      </div>)}
    </div>

    <div className="actions">
      <button className="primary" onClick={()=>{setSettings(draft);alert('Configuración guardada.')}}><Save size={18}/>Guardar configuración</button>
      <button onClick={reset}><RotateCcw size={18}/>Restaurar valores</button>
    </div>
  </section>
}

function Field({label,full,children}){return <label className={`field ${full?'full':''}`}><span>{label}</span>{children}</label>}
function Line({label,value,bold}){return <div className={`line ${bold?'bold':''}`}><span>{label}</span><b>{money(value)}</b></div>}

createRoot(document.getElementById('root')).render(<App/>)

import React, {useMemo, useState} from 'react'
import {ExternalLink, Link2, Palette, Plus, Save, Search, Trash2} from 'lucide-react'
import {
  CREATIVE_STATES,
  CREATIVE_TECHNIQUES,
  CREATIVE_WORK_TYPES,
  EMPTY_CREATIVE_PROJECT,
  creativeStatusLabel,
  isCanvaUrl,
  validateCreativeProject,
} from './creativeProject'
import './creative.css'

const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

function Field({label,children,full,error}) {
  return <label className={`field ${full ? 'full' : ''}`}>
    <span>{label}</span>
    {children}
    {error && <small className="fieldError">{error}</small>}
  </label>
}

function selectedName(list,itemId,fallback) {
  return list.find(item => item.id === itemId)?.name || fallback
}

export default function CreativeProjectsPage({
  projects,
  setProjects,
  clients,
  inventory,
  orders,
  products,
}) {
  const [form,setForm] = useState(EMPTY_CREATIVE_PROJECT)
  const [editing,setEditing] = useState(null)
  const [search,setSearch] = useState('')
  const [notice,setNotice] = useState('')
  const errors = useMemo(() => validateCreativeProject(form), [form])
  const canvaValid = isCanvaUrl(form.canvaUrl)
  const isCricut = ['Cricut','Vinil','Sticker','DTF'].includes(form.technique) || ['Cricut','Vinil','Sticker','DTF'].includes(form.workType)
  const isLaser = ['Corte láser','Grabado láser'].includes(form.technique) || ['Corte láser','Grabado láser'].includes(form.workType)
  const shown = projects.filter(project => {
    const client = selectedName(clients,project.clientId,'')
    return `${project.name} ${project.workType} ${project.technique} ${client}`.toLowerCase().includes(search.toLowerCase())
  })
  const update = (key,value) => {
    setForm(current => ({...current,[key]:value}))
    setNotice('')
  }
  const reset = () => {
    setForm(EMPTY_CREATIVE_PROJECT)
    setEditing(null)
    setNotice('')
  }
  const save = () => {
    if (Object.keys(errors).length) {
      setNotice('Revisa los campos señalados antes de guardar.')
      return
    }
    const now = new Date().toISOString()
    const project = {
      ...form,
      id: editing || id(),
      quantity: Number(form.quantity),
      createdAt: editing ? projects.find(item => item.id === editing)?.createdAt || now : now,
      updatedAt: now,
    }
    setProjects(editing ? projects.map(item => item.id === editing ? project : item) : [project,...projects])
    setNotice(editing ? 'Proyecto actualizado.' : 'Proyecto creativo guardado.')
    setForm(EMPTY_CREATIVE_PROJECT)
    setEditing(null)
  }
  const edit = project => {
    setEditing(project.id)
    setForm({...EMPTY_CREATIVE_PROJECT,...project})
    setNotice('')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const openCanva = url => {
    if (!isCanvaUrl(url) || !url) return
    window.open(url,'_blank','noopener,noreferrer')
  }

  return <div className="creativePage">
    <section className="creativeHero">
      <div>
        <span>Organización del diseño</span>
        <h2>Proyectos para Canva, Cricut y láser</h2>
        <p>Relaciona cada idea con tus clientes, materiales, productos y pedidos existentes.</p>
      </div>
      <Palette size={42}/>
    </section>

    <section className="card">
      <div className="cardTitle"><div><h2>{editing ? 'Editar proyecto creativo' : 'Nuevo proyecto creativo'}</h2><p>La app organiza el trabajo; el archivo se diseña y exporta manualmente en la herramienta correspondiente.</p></div></div>
      <div className="formGrid">
        <Field label="Nombre del proyecto" error={errors.name}>
          <input aria-invalid={Boolean(errors.name)} value={form.name} onChange={event => update('name',event.target.value)} placeholder="Ej. Stickers para cumpleaños"/>
        </Field>
        <Field label="Cliente existente">
          <select value={form.clientId} onChange={event => update('clientId',event.target.value)}>
            <option value="">Sin cliente asociado</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </Field>
        <Field label="Tipo de trabajo">
          <select value={form.workType} onChange={event => update('workType',event.target.value)}>
            {CREATIVE_WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Técnica o herramienta">
          <select value={form.technique} onChange={event => update('technique',event.target.value)}>
            {CREATIVE_TECHNIQUES.map(technique => <option key={technique} value={technique}>{technique}</option>)}
          </select>
        </Field>
        <Field label="Producto del catálogo">
          <select value={form.productId} onChange={event => update('productId',event.target.value)}>
            <option value="">Sin producto asociado</option>
            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
        <Field label="Material del inventario">
          <select value={form.materialId} onChange={event => update('materialId',event.target.value)}>
            <option value="">Sin material asociado</option>
            {inventory.map(material => <option key={material.id} value={material.id}>{material.name} · {Number(material.stock) || 0} disponibles</option>)}
          </select>
        </Field>
        <div className="creativeMeasures">
          <Field label={`Ancho (${form.unit})`} error={errors.dimensions}>
            <input type="number" min=".1" step=".1" value={form.width} onChange={event => update('width',event.target.value)} placeholder="Opcional"/>
          </Field>
          <Field label={`Alto (${form.unit})`}>
            <input type="number" min=".1" step=".1" value={form.height} onChange={event => update('height',event.target.value)} placeholder="Opcional"/>
          </Field>
          <Field label="Unidad">
            <select value={form.unit} onChange={event => update('unit',event.target.value)}><option value="cm">cm</option><option value="mm">mm</option></select>
          </Field>
        </div>
        <Field label="Cantidad" error={errors.quantity}>
          <input aria-invalid={Boolean(errors.quantity)} type="number" min="1" step="1" value={form.quantity} onChange={event => update('quantity',event.target.value)}/>
        </Field>
        <Field label="Color">
          <input value={form.color} onChange={event => update('color',event.target.value)} placeholder="Ej. Azul marino"/>
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={event => update('status',event.target.value)}>
            {CREATIVE_STATES.map(([state,label]) => <option key={state} value={state}>{label}</option>)}
          </select>
        </Field>
        <Field label="Pedido existente">
          <select value={form.orderId} onChange={event => update('orderId',event.target.value)}>
            <option value="">Sin pedido asociado</option>
            {orders.map(order => <option key={order.id} value={order.id}>{order.project || 'Pedido'} · {order.client || 'Sin cliente'}</option>)}
          </select>
        </Field>
        <Field label="Enlace de Canva" full error={errors.canvaUrl}>
          <div className={`linkInput ${form.canvaUrl && !canvaValid ? 'invalid' : ''}`}>
            <Link2 size={18}/>
            <input type="url" value={form.canvaUrl} onChange={event => update('canvaUrl',event.target.value)} placeholder="https://www.canva.com/design/..."/>
            <button type="button" disabled={!form.canvaUrl || !canvaValid} onClick={() => openCanva(form.canvaUrl)}><ExternalLink size={17}/>Abrir</button>
          </div>
        </Field>
        <Field label="Referencia del archivo" full>
          <input value={form.fileReference} onChange={event => update('fileReference',event.target.value)} placeholder="Ej. etiquetas-cumple-v3.svg (no se sube el archivo)"/>
        </Field>
      </div>

      {isCricut && <section className="preparationBox">
        <h3>Preparación para Cricut</h3>
        <div className="formGrid">
          <Field label="Tipo de corte">
            <select value={form.cricutMode} onChange={event => update('cricutMode',event.target.value)}>
              <option value="cut">Corte sencillo</option>
              <option value="printcut">Impresión y corte</option>
            </select>
          </Field>
          <Field label="Formato previsto">
            <select value={form.cricutFormat} onChange={event => update('cricutFormat',event.target.value)}><option>SVG</option><option>PNG transparente</option><option>PDF</option></select>
          </Field>
          <label className="checkField"><input type="checkbox" checked={form.needsOffset} onChange={event => update('needsOffset',event.target.checked)}/><span>Necesita offset</span></label>
          <label className="checkField"><input type="checkbox" checked={form.transparentBackground} onChange={event => update('transparentBackground',event.target.checked)}/><span>Fondo transparente</span></label>
        </div>
      </section>}

      {isLaser && <section className="preparationBox">
        <h3>Preparación para LightBurn</h3>
        <div className="formGrid">
          <Field label="Operación">
            <select value={form.laserOperation} onChange={event => update('laserOperation',event.target.value)}><option value="cut">Corte</option><option value="engrave">Grabado</option><option value="both">Corte y grabado</option></select>
          </Field>
          <Field label="Grosor del material (mm)" error={errors.thickness}>
            <input type="number" min=".1" step=".1" value={form.thickness} onChange={event => update('thickness',event.target.value)} placeholder="Opcional"/>
          </Field>
          <Field label="Formato previsto">
            <select value={form.laserFormat} onChange={event => update('laserFormat',event.target.value)}><option>SVG</option><option>DXF</option><option>PDF</option><option>PNG</option></select>
          </Field>
          <Field label="Notas de producción">
            <input value={form.productionNotes} onChange={event => update('productionNotes',event.target.value)} placeholder="Capas, velocidad o preparación"/>
          </Field>
        </div>
      </section>}

      <Field label="Notas" full>
        <textarea rows="4" value={form.notes} onChange={event => update('notes',event.target.value)} placeholder="Observaciones, cambios solicitados y detalles del cliente"/>
      </Field>
      {notice && <div className={Object.keys(errors).length ? 'validationSummary' : 'success'}>{notice}</div>}
      <div className="actions">
        <button className="primary" onClick={save}><Save size={18}/>{editing ? 'Guardar cambios' : 'Guardar proyecto'}</button>
        {editing && <button onClick={reset}>Cancelar edición</button>}
        {form.canvaUrl && <button onClick={() => update('canvaUrl','')}><Trash2 size={17}/>Quitar enlace de Canva</button>}
      </div>
    </section>

    <section className="card">
      <div className="cardTitle"><div><h2>Proyectos creativos</h2><p>{projects.length} proyectos organizados.</p></div></div>
      <label className="searchBox"><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar proyecto, cliente o técnica…"/></label>
      {shown.length
        ? <div className="creativeGrid">{shown.map(project => {
          const client = selectedName(clients,project.clientId,'Sin cliente')
          const material = selectedName(inventory,project.materialId,'Sin material')
          return <article className="creativeCard" key={project.id}>
            <div className="creativeCardTop"><span className={`creativeStatus ${project.status}`}>{creativeStatusLabel(project.status)}</span><small>{project.workType}</small></div>
            <h3>{project.name}</h3>
            <p>{client} · {project.technique}</p>
            <dl>
              <div><dt>Medidas</dt><dd>{project.width && project.height ? `${project.width} × ${project.height} ${project.unit}` : 'Pendientes'}</dd></div>
              <div><dt>Material</dt><dd>{material}</dd></div>
              <div><dt>Cantidad</dt><dd>{project.quantity}</dd></div>
            </dl>
            <div className="rowActions">
              {project.canvaUrl && <button onClick={() => openCanva(project.canvaUrl)}><ExternalLink size={16}/>Canva</button>}
              <button onClick={() => edit(project)}>Editar</button>
              <button className="iconButton danger" aria-label={`Eliminar ${project.name}`} onClick={() => confirm(`¿Eliminar ${project.name}?`) && setProjects(projects.filter(item => item.id !== project.id))}><Trash2 size={16}/></button>
            </div>
          </article>
        })}</div>
        : <div className="creativeEmpty"><Plus/><p>Aún no hay proyectos creativos con este filtro.</p></div>}
    </section>

    <section className="creativeWorkflow">
      <h3>Flujo de trabajo con Canva</h3>
      <ol>
        <li>Crear el proyecto y seleccionar cliente, producto, medidas y material.</li>
        <li>Abrir o crear el diseño en Canva y guardar aquí su enlace.</li>
        <li>Exportar manualmente el archivo.</li>
        <li>Prepararlo en Cricut Design Space o LightBurn.</li>
        <li>Relacionarlo con el pedido existente y fabricar.</li>
      </ol>
      <p>No existe una conexión automática con Canva en esta versión.</p>
    </section>
  </div>
}

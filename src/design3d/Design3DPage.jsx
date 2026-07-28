import React, {useMemo, useRef, useState} from 'react'
import {Check, Clipboard, Download, Edit3, FileCode2, RotateCcw, Send} from 'lucide-react'
import {
  DEFAULT_KEYCHAIN,
  generateKeychainScad,
  keychainSummary,
  safeDesignFileName,
  validateKeychain,
} from './keychain'
import './design3d.css'

const number = value => Number(value) || 0

function DimensionField({label,unit = 'mm',name,value,onChange,error,min,step = 0.1}) {
  return <label className="field">
    <span>{label} ({unit})</span>
    <div className={`unitInput ${error ? 'invalid' : ''}`}>
      <input
        aria-invalid={Boolean(error)}
        type="number"
        min={min}
        step={step}
        name={name}
        value={value}
        onChange={onChange}
      />
      <b>{unit}</b>
    </div>
    {error && <small className="fieldError">{error}</small>}
  </label>
}

function KeychainPreview({values}) {
  const length = Math.max(30, number(values.length))
  const height = Math.max(15, number(values.height))
  const hole = Math.max(2, number(values.holeDiameter))
  const text = String(values.text || '').trim() || 'Texto'
  const textStart = height + number(values.margin)
  const textArea = Math.max(5, length - textStart - number(values.margin))

  return <div className="keychainPreview">
    <div className="previewHeader">
      <b>Vista previa aproximada</b>
      <span>No sustituye el render de OpenSCAD</span>
    </div>
    <svg
      role="img"
      aria-label={`Vista previa del llavero ${text}`}
      viewBox={`-4 -9 ${length + 8} ${height + 18}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={length} height={height} rx={height / 2} className="previewBase"/>
      <circle cx={height / 2} cy={height / 2} r={hole / 2} className="previewHole"/>
      <text
        x={textStart + textArea / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        textLength={Math.max(1,Math.min(textArea, text.length * number(values.textSize) * .58))}
        lengthAdjust="spacingAndGlyphs"
        className="previewText"
      >
        {text}
      </text>
      <line x1="0" y1={height + 5} x2={length} y2={height + 5} className="measureLine"/>
      <text x={length / 2} y={height + 8} textAnchor="middle" className="measureText">{number(values.length)} mm</text>
      <line x1={length + 3} y1="0" x2={length + 3} y2={height} className="measureLine"/>
      <text x={length + 5} y={height / 2} className="measureText" transform={`rotate(90 ${length + 5} ${height / 2})`}>{number(values.height)} mm</text>
    </svg>
  </div>
}

export default function Design3DPage({onQuote}) {
  const [values,setValues] = useState(DEFAULT_KEYCHAIN)
  const [notice,setNotice] = useState('')
  const formRef = useRef(null)
  const errors = useMemo(() => validateKeychain(values), [values])
  const valid = Object.keys(errors).length === 0
  const code = useMemo(() => valid ? generateKeychainScad(values) : '', [values,valid])
  const summary = useMemo(() => keychainSummary(values), [values])
  const change = event => {
    const {name,value} = event.target
    setValues(current => ({...current,[name]:value}))
    setNotice('')
  }
  const copy = async () => {
    if (!valid) return setNotice('Corrige los campos señalados antes de copiar el código.')
    try {
      await navigator.clipboard.writeText(code)
      setNotice('Código OpenSCAD copiado.')
    } catch {
      setNotice('No fue posible copiar automáticamente. Selecciona el código y cópialo manualmente.')
    }
  }
  const download = () => {
    if (!valid) return setNotice('Corrige los campos señalados antes de descargar.')
    const url = URL.createObjectURL(new Blob([code], {type:'text/plain;charset=utf-8'}))
    const link = document.createElement('a')
    link.href = url
    link.download = safeDesignFileName(values.text)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url),1000)
    setNotice(`Archivo ${safeDesignFileName(values.text)} descargado.`)
  }
  const quote = () => {
    if (!valid) return setNotice('Corrige los campos señalados antes de cotizar.')
    onQuote({
      id: crypto.randomUUID?.() || `${Date.now()}`,
      project: summary.name,
      quantity: number(values.quantity),
      designMeta: {
        type: 'Llavero personalizado',
        text: String(values.text).trim(),
        length: number(values.length),
        height: number(values.height),
        thickness: number(values.baseThickness),
        unit: 'mm',
      },
    })
  }

  return <div className="design3dPage">
    <section className="designHero">
      <div>
        <span>Generador paramétrico</span>
        <h2>Llavero personalizado con nombre</h2>
        <p>Configura las medidas, revisa la vista previa y genera un archivo editable para OpenSCAD.</p>
      </div>
      <FileCode2 size={42}/>
    </section>

    <div className="designWorkspace">
      <section className="card" ref={formRef}>
        <div className="cardTitle"><div><h2>Medidas del diseño</h2><p>Solo mostramos los parámetros necesarios para fabricar una pieza válida.</p></div></div>
        <div className="formGrid">
          <label className="field full">
            <span>Nombre o texto</span>
            <input
              aria-invalid={Boolean(errors.text)}
              name="text"
              maxLength="30"
              value={values.text}
              onChange={change}
              placeholder="Ej. Emiliano"
            />
            {errors.text && <small className="fieldError">{errors.text}</small>}
          </label>
          <DimensionField label="Largo total" name="length" value={values.length} onChange={change} error={errors.length} min="30"/>
          <DimensionField label="Alto" name="height" value={values.height} onChange={change} error={errors.height} min="15"/>
          <DimensionField label="Grosor de la base" name="baseThickness" value={values.baseThickness} onChange={change} error={errors.baseThickness} min="1.2"/>
          <DimensionField label="Relieve del texto" name="textRelief" value={values.textRelief} onChange={change} error={errors.textRelief} min=".4"/>
          <DimensionField label="Diámetro del orificio" name="holeDiameter" value={values.holeDiameter} onChange={change} error={errors.holeDiameter} min="2"/>
          <DimensionField label="Margen" name="margin" value={values.margin} onChange={change} error={errors.margin} min=".8"/>
          <DimensionField label="Tamaño del texto" name="textSize" value={values.textSize} onChange={change} error={errors.textSize} min="3"/>
          <label className="field">
            <span>Cantidad (piezas)</span>
            <input aria-invalid={Boolean(errors.quantity)} name="quantity" type="number" min="1" max="20" step="1" value={values.quantity} onChange={change}/>
            {errors.quantity && <small className="fieldError">{errors.quantity}</small>}
          </label>
        </div>
        <div className="actions">
          <button onClick={() => setValues(DEFAULT_KEYCHAIN)}><RotateCcw size={18}/>Restaurar medidas</button>
        </div>
      </section>

      <div>
        <KeychainPreview values={values}/>
        <section className="designSummary">
          <span>Diseño</span>
          <h3>{summary.name}</h3>
          <dl>
            <div><dt>Medidas</dt><dd>{summary.dimensions}</dd></div>
            <div><dt>Grosor total</dt><dd>{summary.totalThickness} mm</dd></div>
            <div><dt>Cantidad</dt><dd>{summary.quantity} pieza(s)</dd></div>
          </dl>
        </section>
      </div>
    </div>

    <section className="card codeCard">
      <div className="cardTitle"><div><h2>Código OpenSCAD</h2><p>La fuente puede variar según las fuentes instaladas en tu computadora.</p></div></div>
      {!valid
        ? <div className="validationSummary"><b>Revisa el formulario</b><p>El código estará disponible cuando todas las medidas sean válidas.</p></div>
        : <pre tabIndex="0"><code>{code}</code></pre>}
      {notice && <div className="success"><Check size={17}/>{notice}</div>}
      <div className="actions">
        <button className="primary" onClick={copy} disabled={!valid}><Clipboard size={18}/>Copiar código</button>
        <button onClick={download} disabled={!valid}><Download size={18}/>Descargar .scad</button>
        <button onClick={() => formRef.current?.scrollIntoView({behavior:'smooth'})}><Edit3 size={18}/>Editar diseño</button>
        <button onClick={quote} disabled={!valid}><Send size={18}/>Cotizar diseño</button>
      </div>
    </section>
  </div>
}

import React, {useMemo, useState} from 'react'
import {ChevronDown, ChevronUp, CircleDollarSign, Plus, Trash2} from 'lucide-react'
import {createPayment, PAYMENT_METHODS, paymentMethodLabel, paymentSummary} from './payments'

const money = value =>
  new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN'}).format(Number(value) || 0)

const today = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

const statusLabels = {
  unpaid: 'Sin pago',
  partial: 'Pago parcial',
  paid: 'Pagado',
}

export default function OrderPayments({order, onChange, onDeliverAndPay, locked = false}) {
  const [open, setOpen] = useState(false)
  const [settlementMethod, setSettlementMethod] = useState('cash')
  const [form, setForm] = useState({amount: '', date: today(), method: 'transfer', note: ''})
  const summary = useMemo(() => paymentSummary(order), [order])
  const payments = Array.isArray(order.payments) ? order.payments : []
  const advanceEnabled = order.advanceEnabled ?? payments.length > 0

  const toggleAdvance = enabled => {
    onChange({...order, advanceEnabled: enabled})
    setOpen(enabled || payments.length > 0)
  }

  const addPayment = () => {
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return alert('Escribe un anticipo o abono mayor que cero.')
    if (amount > summary.balance + 0.005) {
      return alert(`El pago no puede ser mayor que el saldo de ${money(summary.balance)}.`)
    }

    const payment = createPayment({
      ...form,
      id: uid(),
      createdAt: new Date().toISOString(),
    })
    onChange({...order, advanceEnabled: true, payments: [payment, ...payments]})
    setForm({amount: '', date: today(), method: 'transfer', note: ''})
  }

  const removePayment = paymentId => {
    if (locked) return
    if (!confirm('¿Eliminar este pago? El saldo pendiente volverá a aumentar.')) return
    onChange({...order, payments: payments.filter(payment => payment.id !== paymentId)})
  }

  return <section className="paymentBox">
    {!locked && summary.balance > 0 && <div className="simplePaymentActions">
      <label className="advanceSwitch">
        <input type="checkbox" checked={advanceEnabled} onChange={event => toggleAdvance(event.target.checked)}/>
        <span><b>Este pedido lleva anticipo o abonos</b><small>Actívalo solamente si el cliente pagará antes de la entrega.</small></span>
      </label>
      <div className="deliverAndPay">
        <label><span>Método del pago final</span><select value={settlementMethod} onChange={event => setSettlementMethod(event.target.value)}>{PAYMENT_METHODS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <button className="primary" onClick={() => onDeliverAndPay?.(order, settlementMethod)}><CircleDollarSign size={18}/>Entregado y pagado</button>
      </div>
    </div>}

    {!locked && summary.balance <= 0.005 && order.status !== 'delivered' && <div className="paidDeliveryAction"><span>Este pedido ya está liquidado.</span><button className="primary" onClick={() => onDeliverAndPay?.(order, settlementMethod)}>Marcar como entregado</button></div>}

    <div className="paymentSummary">
      <div>
        <span className={`paymentStatus ${summary.status}`}>{statusLabels[summary.status]}</span>
        <b>{money(summary.balance)} por cobrar</b>
        <small>{money(summary.paid)} recibido de {money(summary.total)}</small>
      </div>
      {(locked || payments.length > 0 || advanceEnabled) && <button className="paymentToggle" onClick={() => setOpen(!open)}>
        <CircleDollarSign size={18}/>
        {locked ? 'Ver pagos' : payments.length ? 'Anticipos y abonos' : 'Registrar anticipo'}
        {open ? <ChevronUp size={17}/> : <ChevronDown size={17}/>} 
      </button>}
    </div>
    <div className="paymentProgress" aria-label={`${summary.progress.toFixed(0)}% pagado`}>
      <span style={{width: `${summary.progress}%`}}/>
    </div>

    {open && <div className="paymentDetails">
      {!locked && advanceEnabled && summary.balance > 0 && <div className="paymentForm">
        <label className="field"><span>{payments.length ? 'Nuevo abono ($)' : 'Anticipo recibido ($)'}</span><input type="number" min=".01" step=".01" max={summary.balance} value={form.amount} onChange={event => setForm({...form, amount: event.target.value})} placeholder={String(summary.balance)}/></label>
        <label className="field"><span>Fecha del pago</span><input type="date" value={form.date} onChange={event => setForm({...form, date: event.target.value})}/></label>
        <label className="field"><span>Método</span><select value={form.method} onChange={event => setForm({...form, method: event.target.value})}>{PAYMENT_METHODS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="field"><span>Nota opcional</span><input value={form.note} onChange={event => setForm({...form, note: event.target.value})} placeholder="Ej. Anticipo para iniciar"/></label>
        <button className="primary paymentAdd" onClick={addPayment}><Plus size={17}/>{payments.length ? 'Agregar abono' : 'Guardar anticipo'}</button>
      </div>}

      {!locked && advanceEnabled && summary.balance > 0 && <label className="field paymentDue"><span>Fecha prometida para liquidar</span><input type="date" value={order.paymentDueDate || ''} onChange={event => onChange({...order, paymentDueDate: event.target.value})}/></label>}

      {payments.length > 0 && <div className="paymentHistory">
        <h4>Historial de pagos</h4>
        {payments.map(payment => <div className="paymentRow" key={payment.id}>
          <div><b>{money(payment.amount)}</b><span>{new Date(`${payment.date}T12:00:00`).toLocaleDateString('es-MX')} · {paymentMethodLabel(payment.method)}</span>{payment.note && <small>{payment.note}</small>}</div>
          {!locked && <button className="iconButton danger" aria-label="Eliminar pago" onClick={() => removePayment(payment.id)}><Trash2 size={15}/></button>}
        </div>)}
      </div>}
    </div>}
  </section>
}

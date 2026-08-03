import React, {useMemo, useState} from 'react'
import {CircleDollarSign, ReceiptText, Save, ShoppingCart, Trash2, WalletCards} from 'lucide-react'
import {currentMonth, financeSummary} from './finance'
import './finance.css'

const money = value => new Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'}).format(Number(value) || 0)
const number = value => Number(value) || 0
const today = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

const emptyForm = () => ({
  type:'expense', date:today(), concept:'', amount:'', category:'operations', method:'cash',
  supplier:'', inventoryId:'', quantity:0, notes:'',
})

const expenseCategories = [
  ['operations','Operación general'], ['electricity','Electricidad'], ['shipping','Envíos'],
  ['maintenance','Mantenimiento'], ['advertising','Publicidad'], ['tools','Herramientas'],
  ['subscriptions','Suscripciones'], ['rent','Renta'], ['other','Otro'],
]
const purchaseCategories = [
  ['equipment','Equipo o herramienta'], ['other','Compra fuera de inventario'],
]
const methods = [['cash','Efectivo'],['transfer','Transferencia'],['card','Tarjeta'],['other','Otro']]

function Stat({label, value, tone='blue', note}) {
  return <article className={`financeStat ${tone}`}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>
}

export default function FinancePage({orders, inventory, transactions, setTransactions}) {
  const [month, setMonth] = useState(currentMonth())
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState('')
  const summary = useMemo(() => financeSummary({orders, transactions, inventory, month}), [orders, transactions, inventory, month])
  const categories = form.type === 'purchase' ? purchaseCategories : expenseCategories

  const changeType = type => setForm({...emptyForm(), type, category:type === 'purchase' ? 'equipment' : 'operations'})
  const save = () => {
    if (!form.concept.trim()) return alert('Escribe el concepto de la compra o gasto.')
    if (number(form.amount) <= 0) return alert('Escribe un importe mayor a cero.')

    const transaction = {
      ...form,
      id:id(),
      amount:number(form.amount),
      createdAt:new Date().toISOString(),
    }
    setTransactions([transaction, ...transactions])
    setSaved(transaction.type === 'purchase' ? 'Compra externa registrada correctamente.' : 'Gasto registrado correctamente.')
    setForm(emptyForm())
  }

  const remove = transaction => {
    const inventoryNote = transaction.inventoryId
      ? ' Esta compra se originó en Inventario; al eliminar el movimiento no se devolverán ni quitarán existencias.'
      : ''
    if (confirm(`¿Eliminar este movimiento?${inventoryNote}`)) setTransactions(transactions.filter(item => item.id !== transaction.id))
  }

  return <>
    <section className="financeHero">
      <div className="financeHeroIcon"><WalletCards size={32}/></div>
      <div><span>Control interno del negocio</span><h2>Finanzas sencillas</h2><p>Compras, gastos, cobros y saldos pendientes en un mismo lugar.</p></div>
      <label className="financeMonth"><span>Mes</span><input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label>
    </section>

    <div className="financeStats">
      <Stat label="Cobrado" value={money(summary.collected)} tone="green" note="Pagos recibidos en el mes"/>
      <Stat label="Por cobrar" value={money(summary.receivable)} tone="orange" note="Saldo de pedidos no cancelados"/>
      <Stat label="Compras" value={money(summary.purchases)} tone="purple" note="Inventario, productos y equipo"/>
      <Stat label="Gastos" value={money(summary.expenses)} tone="red" note="Operación del negocio"/>
      <Stat label="Flujo del mes" value={money(summary.cashFlow)} tone={summary.cashFlow >= 0 ? 'blue' : 'red'} note="Cobrado menos compras y gastos"/>
      <Stat label="Utilidad estimada" value={money(summary.estimatedNetProfit)} tone={summary.estimatedNetProfit >= 0 ? 'green' : 'red'} note="Ventas entregadas menos producción y gastos"/>
      <Stat label="Valor del inventario" value={money(summary.inventoryValue)} tone="purple" note="Existencias al costo actual"/>
    </div>

    <div className="financeColumns">
      <section className="card financeEntry">
        <div className="cardTitle"><div><h2>Registrar salida de dinero</h2><p>Los materiales y productos se compran desde Inventario y aparecen aquí automáticamente.</p></div></div>
        <div className="financeType">
          <button className={form.type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}><ReceiptText size={18}/>Gasto</button>
          <button className={form.type === 'purchase' ? 'active' : ''} onClick={() => changeType('purchase')}><ShoppingCart size={18}/>Otra compra</button>
        </div>
        <div className="formGrid">
          <label className="field"><span>Fecha</span><input type="date" value={form.date} onChange={event => setForm({...form, date:event.target.value})}/></label>
          <label className="field"><span>Importe ($)</span><input type="number" min="0" step=".01" value={form.amount} onChange={event => setForm({...form, amount:event.target.value})} placeholder="0.00"/></label>
          <label className="field full"><span>Concepto</span><input value={form.concept} onChange={event => setForm({...form, concept:event.target.value})} placeholder={form.type === 'purchase' ? 'Ej. Compra de una herramienta' : 'Ej. Pago de envío'}/></label>
          <label className="field"><span>Categoría</span><select value={form.category} onChange={event => setForm({...form, category:event.target.value})}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Forma de pago</span><select value={form.method} onChange={event => setForm({...form, method:event.target.value})}>{methods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {form.type === 'purchase' && <label className="field"><span>Proveedor</span><input value={form.supplier} onChange={event => setForm({...form, supplier:event.target.value})} placeholder="Opcional"/></label>}
          <label className="field full"><span>Notas</span><textarea value={form.notes} onChange={event => setForm({...form, notes:event.target.value})} placeholder="Opcional"/></label>
        </div>
        {form.type === 'purchase' && <div className="inventoryPurchaseNote"><ShoppingCart size={18}/><span>Usa esta opción solo para equipo u otras compras que <b>no controlas en Inventario</b>.</span></div>}
        <div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar {form.type === 'purchase' ? 'compra externa' : 'gasto'}</button></div>
        {saved && <div className="success"><CircleDollarSign size={17}/>{saved}</div>}
      </section>

      <section className="card financeGuide">
        <div className="cardTitle"><div><h2>Cómo se calcula</h2><p>Sin términos contables complicados.</p></div></div>
        <ol>
          <li><b>Las compras de inventario</b> se registran una sola vez desde Inventario y llegan aquí automáticamente.</li>
          <li><b>Los cobros</b> se toman automáticamente de los anticipos, abonos y pagos de pedidos.</li>
          <li><b>Las compras</b> reducen el dinero disponible, pero no borran ni reducen tus ventas.</li>
          <li><b>Los gastos</b> incluyen luz, envíos, publicidad, mantenimiento y otros pagos del negocio.</li>
        </ol>
        <div className="financeFormula"><span>Flujo del mes</span><b>Cobrado − compras − gastos</b></div>
        <div className="financeFormula"><span>Utilidad estimada</span><b>Ventas entregadas − producción − gastos</b></div>
        <small>Este módulo es para control interno. No sustituye facturación ni asesoría fiscal.</small>
      </section>
    </div>

    <section className="card">
      <div className="cardTitle"><div><h2>Movimientos del mes</h2><p>{summary.transactions.length} compras y gastos registrados.</p></div></div>
      {summary.transactions.length ? <div className="financeMovements">{summary.transactions.map(transaction => <article key={transaction.id}>
        <div className={`movementIcon ${transaction.type}`}>{transaction.type === 'purchase' ? <ShoppingCart/> : <ReceiptText/>}</div>
        <div className="grow"><b>{transaction.concept}</b><span>{new Date(`${transaction.date}T12:00:00`).toLocaleDateString('es-MX')} · {transaction.type === 'purchase' ? 'Compra' : 'Gasto'}{transaction.supplier ? ` · ${transaction.supplier}` : ''}</span></div>
        <strong>{money(transaction.amount)}</strong>
        <button className="iconButton danger" aria-label="Eliminar movimiento" onClick={() => remove(transaction)}><Trash2 size={17}/></button>
      </article>)}</div> : <div className="financeEmpty"><WalletCards size={34}/><p>Todavía no hay compras ni gastos en este mes.</p></div>}
    </section>
  </>
}

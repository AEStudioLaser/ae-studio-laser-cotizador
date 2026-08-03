import React, {useMemo, useState} from 'react'
import {CircleDollarSign, PackagePlus, ReceiptText, Save, ShoppingCart, Trash2, WalletCards} from 'lucide-react'
import {applyInventoryPurchase, currentMonth, financeSummary, inventoryQuantityLabel} from './finance'
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
  supplier:'', inventoryId:'', quantity:1, notes:'',
})

const expenseCategories = [
  ['operations','Operación general'], ['electricity','Electricidad'], ['shipping','Envíos'],
  ['maintenance','Mantenimiento'], ['advertising','Publicidad'], ['tools','Herramientas'],
  ['subscriptions','Suscripciones'], ['rent','Renta'], ['other','Otro'],
]
const purchaseCategories = [
  ['materials','Materia prima'], ['products','Productos para venta'], ['equipment','Equipo o herramienta'], ['other','Otra compra'],
]
const methods = [['cash','Efectivo'],['transfer','Transferencia'],['card','Tarjeta'],['other','Otro']]

function Stat({label, value, tone='blue', note}) {
  return <article className={`financeStat ${tone}`}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>
}

export default function FinancePage({orders, inventory, setInventory, transactions, setTransactions}) {
  const [month, setMonth] = useState(currentMonth())
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState('')
  const summary = useMemo(() => financeSummary({orders, transactions, inventory, month}), [orders, transactions, inventory, month])
  const selectedInventory = inventory.find(item => item.id === form.inventoryId)
  const categories = form.type === 'purchase' ? purchaseCategories : expenseCategories

  const changeType = type => setForm({...emptyForm(), type, category:type === 'purchase' ? 'materials' : 'operations'})
  const save = () => {
    if (!form.concept.trim()) return alert('Escribe el concepto de la compra o gasto.')
    if (number(form.amount) <= 0) return alert('Escribe un importe mayor a cero.')
    if (form.inventoryId && number(form.quantity) <= 0) return alert('Escribe la cantidad que entrará al inventario.')

    const transaction = {
      ...form,
      id:id(),
      amount:number(form.amount),
      quantity:form.inventoryId ? number(form.quantity) : 0,
      createdAt:new Date().toISOString(),
    }
    setTransactions([transaction, ...transactions])
    if (transaction.type === 'purchase' && transaction.inventoryId) {
      setInventory(applyInventoryPurchase(inventory, transaction))
    }
    setSaved(transaction.type === 'purchase' ? 'Compra registrada correctamente.' : 'Gasto registrado correctamente.')
    setForm(emptyForm())
  }

  const remove = transaction => {
    const inventoryNote = transaction.inventoryId
      ? ' Este movimiento agregó existencias; al eliminarlo no se modificará el inventario.'
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
      <Stat label="Compras" value={money(summary.purchases)} tone="purple" note="Materiales, productos y equipo"/>
      <Stat label="Gastos" value={money(summary.expenses)} tone="red" note="Operación del negocio"/>
      <Stat label="Flujo del mes" value={money(summary.cashFlow)} tone={summary.cashFlow >= 0 ? 'blue' : 'red'} note="Cobrado menos compras y gastos"/>
      <Stat label="Utilidad estimada" value={money(summary.estimatedNetProfit)} tone={summary.estimatedNetProfit >= 0 ? 'green' : 'red'} note="Ventas entregadas menos producción y gastos"/>
      <Stat label="Valor del inventario" value={money(summary.inventoryValue)} tone="purple" note="Existencias al costo actual"/>
    </div>

    <div className="financeColumns">
      <section className="card financeEntry">
        <div className="cardTitle"><div><h2>Registrar salida de dinero</h2><p>Una compra aumenta inventario; un gasto solo registra la salida.</p></div></div>
        <div className="financeType">
          <button className={form.type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}><ReceiptText size={18}/>Gasto</button>
          <button className={form.type === 'purchase' ? 'active' : ''} onClick={() => changeType('purchase')}><ShoppingCart size={18}/>Compra</button>
        </div>
        <div className="formGrid">
          <label className="field"><span>Fecha</span><input type="date" value={form.date} onChange={event => setForm({...form, date:event.target.value})}/></label>
          <label className="field"><span>Importe ($)</span><input type="number" min="0" step=".01" value={form.amount} onChange={event => setForm({...form, amount:event.target.value})} placeholder="0.00"/></label>
          <label className="field full"><span>Concepto</span><input value={form.concept} onChange={event => setForm({...form, concept:event.target.value})} placeholder={form.type === 'purchase' ? 'Ej. Compra de 10 termos' : 'Ej. Pago de envío'}/></label>
          <label className="field"><span>Categoría</span><select value={form.category} onChange={event => setForm({...form, category:event.target.value})}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Forma de pago</span><select value={form.method} onChange={event => setForm({...form, method:event.target.value})}>{methods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {form.type === 'purchase' && <>
            <label className="field full"><span>Agregar existencia a Inventario (opcional)</span><select value={form.inventoryId} onChange={event => setForm({...form, inventoryId:event.target.value})}><option value="">No modificar inventario</option>{inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {selectedInventory && <label className="field"><span>Cantidad comprada ({inventoryQuantityLabel(selectedInventory)})</span><input type="number" min=".01" step={selectedInventory.trackingMode === 'grams' ? '.1' : '1'} value={form.quantity} onChange={event => setForm({...form, quantity:event.target.value})}/></label>}
            <label className="field"><span>Proveedor</span><input value={form.supplier} onChange={event => setForm({...form, supplier:event.target.value})} placeholder="Opcional"/></label>
          </>}
          <label className="field full"><span>Notas</span><textarea value={form.notes} onChange={event => setForm({...form, notes:event.target.value})} placeholder="Opcional"/></label>
        </div>
        {selectedInventory && <div className="inventoryPurchaseNote"><PackagePlus size={18}/><span>Al guardar se sumarán <b>{number(form.quantity)} {inventoryQuantityLabel(selectedInventory)}</b> a {selectedInventory.name}.</span></div>}
        <div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar {form.type === 'purchase' ? 'compra' : 'gasto'}</button></div>
        {saved && <div className="success"><CircleDollarSign size={17}/>{saved}</div>}
      </section>

      <section className="card financeGuide">
        <div className="cardTitle"><div><h2>Cómo se calcula</h2><p>Sin términos contables complicados.</p></div></div>
        <ol>
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

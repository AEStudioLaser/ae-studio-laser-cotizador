const asAmount = value => {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

export const PAYMENT_METHODS = [
  ['transfer', 'Transferencia'],
  ['cash', 'Efectivo'],
  ['card', 'Tarjeta'],
  ['other', 'Otro'],
]

export const paymentMethodLabel = method =>
  PAYMENT_METHODS.find(([id]) => id === method)?.[1] || 'Otro'

export function paymentSummary(order) {
  const total = asAmount(order?.total)
  const payments = Array.isArray(order?.payments) ? order.payments : []
  const paid = payments.reduce((sum, payment) => sum + asAmount(payment?.amount), 0)
  const balance = Math.max(0, total - paid)
  const status = balance <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

  return {
    total,
    paid,
    balance,
    status,
    progress: total > 0 ? Math.min(100, (paid / total) * 100) : 100,
  }
}

export function isPaymentOverdue(order, referenceDate = new Date()) {
  const {balance} = paymentSummary(order)
  if (balance <= 0 || !order?.paymentDueDate) return false

  const due = new Date(`${order.paymentDueDate}T23:59:59`)
  return Number.isFinite(due.getTime()) && due.getTime() < referenceDate.getTime()
}

export function createPayment({id, amount, date, method, note, createdAt}) {
  return {
    id,
    amount: asAmount(amount),
    date,
    method: method || 'transfer',
    note: String(note || '').trim(),
    createdAt,
  }
}

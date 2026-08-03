const amount = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const dateValue = value => String(value || '').slice(0, 10)

export const currentMonth = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 7)
}

export const inMonth = (value, month) => !month || dateValue(value).startsWith(month)

export const inventoryUnitCost = item =>
  amount(item?.purchaseTotal) / Math.max(1, amount(item?.purchaseQty))

export function inventoryValue(item) {
  const unitCost = inventoryUnitCost(item)
  if (item?.trackingMode !== 'area') return unitCost * amount(item?.stock)

  const purchaseArea = Math.max(1, amount(item?.materialWidth) * amount(item?.materialLength))
  return unitCost * (amount(item?.areaRemaining) / purchaseArea)
}

export function inventoryQuantityLabel(item) {
  if (item?.trackingMode === 'area') return 'placas, rollos o tramos'
  if (item?.trackingMode === 'grams') return 'gramos'
  if (item?.trackingMode === 'sheets') return 'hojas'
  return 'piezas'
}

export function createInventoryPurchaseTransaction(item, purchase = {}) {
  return {
    id:purchase.id,
    type:'purchase',
    category:item?.type === 'product' ? 'products' : 'materials',
    concept:`Compra de ${item?.name || 'inventario'}`,
    amount:amount(purchase.amount ?? item?.purchaseTotal),
    date:purchase.date || item?.purchaseDate || dateValue(new Date().toISOString()),
    method:purchase.method || item?.purchaseMethod || 'other',
    supplier:purchase.supplier ?? item?.supplier ?? '',
    inventoryId:item?.id || '',
    quantity:amount(purchase.quantity ?? item?.purchaseQty),
    inventoryApplied:true,
    source:'inventory',
    notes:String(purchase.notes || '').trim(),
    createdAt:purchase.createdAt || new Date().toISOString(),
  }
}

export function applyInventoryPurchase(items, transaction) {
  if (!transaction?.inventoryId) return items

  const purchasedQuantity = amount(transaction.quantity)
  const purchaseAmount = amount(transaction.amount)
  if (!purchasedQuantity || !purchaseAmount) return items

  return items.map(item => {
    if (item.id !== transaction.inventoryId) return item

    const updatedAt = transaction.createdAt || new Date().toISOString()
    const common = {
      purchaseDate: transaction.date || item.purchaseDate,
      supplier: transaction.supplier || item.supplier,
      updatedAt,
    }

    if (item.trackingMode === 'area') {
      const baseArea = Math.max(1, amount(item.materialWidth) * amount(item.materialLength))
      const currentArea = amount(item.areaRemaining)
      const addedArea = baseArea * purchasedQuantity
      const currentValue = inventoryValue(item)
      const nextArea = currentArea + addedArea
      const costPerArea = (currentValue + purchaseAmount) / Math.max(1, nextArea)

      return {
        ...item,
        ...common,
        stock: amount(item.stock) + purchasedQuantity,
        areaRemaining: nextArea,
        purchaseQty: 1,
        purchaseTotal: costPerArea * baseArea,
      }
    }

    const currentStock = amount(item.stock)
    const nextStock = currentStock + purchasedQuantity
    const nextValue = inventoryValue(item) + purchaseAmount

    return {
      ...item,
      ...common,
      stock: nextStock,
      purchaseQty: nextStock || 1,
      purchaseTotal: nextValue,
    }
  })
}

const orderPaid = order => (Array.isArray(order?.payments) ? order.payments : [])
  .reduce((sum, payment) => sum + amount(payment?.amount), 0)

export function financeSummary({orders = [], transactions = [], inventory = [], month = ''}) {
  const validOrders = orders.filter(order => order?.status !== 'cancelled')
  const collected = validOrders.reduce((sum, order) => sum +
    (Array.isArray(order.payments) ? order.payments : [])
      .filter(payment => inMonth(payment.date || payment.createdAt || order.createdAt, month))
      .reduce((paymentSum, payment) => paymentSum + amount(payment.amount), 0), 0)

  const receivable = validOrders.reduce((sum, order) =>
    sum + Math.max(0, amount(order.total) - orderPaid(order)), 0)

  const monthTransactions = transactions.filter(transaction => inMonth(transaction.date || transaction.createdAt, month))
  const purchases = monthTransactions
    .filter(transaction => transaction.type === 'purchase')
    .reduce((sum, transaction) => sum + amount(transaction.amount), 0)
  const expenses = monthTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + amount(transaction.amount), 0)

  const delivered = validOrders.filter(order => order.status === 'delivered' &&
    inMonth(order.deliveredAt || order.updatedAt || order.createdAt || order.date, month))
  const deliveredSales = delivered.reduce((sum, order) => sum + amount(order.total), 0)
  const productionCost = delivered.reduce((sum, order) => sum + amount(order.productionCost), 0)
  const inventoryTotal = inventory.reduce((sum, item) => sum + inventoryValue(item), 0)

  return {
    collected,
    receivable,
    purchases,
    expenses,
    cashFlow: collected - purchases - expenses,
    deliveredSales,
    productionCost,
    grossProfit: deliveredSales - productionCost,
    estimatedNetProfit: deliveredSales - productionCost - expenses,
    inventoryValue: inventoryTotal,
    transactions: monthTransactions,
  }
}

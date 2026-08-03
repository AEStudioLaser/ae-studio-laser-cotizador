import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_KEYCHAIN,
  escapeOpenScadText,
  generateKeychainScad,
  safeDesignFileName,
  validateKeychain,
} from '../src/design3d/keychain.js'
import {
  EMPTY_CREATIVE_PROJECT,
  isCanvaUrl,
  validateCreativeProject,
} from '../src/creative/creativeProject.js'
import {
  calculateCricutConsumption,
  calculateServicePrice,
  calculateSheetMaterialCost,
  remainingAreaLength,
  resolveServiceFinalPrice,
} from '../src/pricing/serviceQuote.js'
import {calculateFilamentBreakdown, resolvePrintPrice} from '../src/pricing/print3d.js'
import {createPayment, isOrderFinalized, isPaymentOverdue, normalizePaymentPlan, paymentSummary, settleAndDeliverOrder} from '../src/orders/payments.js'
import {createProductionParameters, defaultProfileForJob} from '../src/productionPresets.js'
import {applyInventoryPurchase, financeSummary} from '../src/finance.js'

test('cada máquina inicia con un perfil de producción recomendado', () => {
  const print = createProductionParameters('3d','detail')
  const laser = createProductionParameters('laser','mdf-cut')
  const cricut = createProductionParameters('cricut','iron-on')

  assert.equal(print.layerHeight,0.16)
  assert.equal(laser.speed,400)
  assert.equal(laser.airAssist,'Encendido')
  assert.equal(cricut.mirror,'Sí')
})

test('el tipo de trabajo selecciona un perfil inicial coherente', () => {
  assert.equal(defaultProfileForJob('laser','engrave'),'mdf-engrave')
  assert.equal(defaultProfileForJob('cricut','stickers'),'printable-sticker')
  assert.equal(defaultProfileForJob('cricut','paper'),'medium-cardstock')
})

test('las medidas predeterminadas del llavero son válidas', () => {
  assert.deepEqual(validateKeychain(DEFAULT_KEYCHAIN), {})
})

test('el orificio debe caber dentro del llavero', () => {
  const errors = validateKeychain({...DEFAULT_KEYCHAIN,holeDiameter:20})
  assert.match(errors.holeDiameter,/orificio/i)
})

test('los caracteres especiales no rompen la cadena OpenSCAD', () => {
  assert.equal(escapeOpenScadText('Ana \"A\"\\B\nC'), 'Ana \\"A\\"\\\\B C')
})

test('el archivo SCAD usa un nombre seguro', () => {
  assert.equal(safeDesignFileName('José & Ana'), 'llavero-jose-ana.scad')
})

test('el código OpenSCAD contiene geometría y cantidad', () => {
  const code = generateKeychainScad({...DEFAULT_KEYCHAIN,quantity:3})
  assert.match(code,/module personalized_keychain/)
  assert.match(code,/difference\(\)/)
  assert.match(code,/linear_extrude/)
  assert.match(code,/quantity = 3;/)
  assert.ok(code.length > 500)
})

test('solo se aceptan enlaces HTTPS de Canva', () => {
  assert.equal(isCanvaUrl('https://www.canva.com/design/ABC/view'),true)
  assert.equal(isCanvaUrl('https://canva.com/design/ABC'),true)
  assert.equal(isCanvaUrl('http://www.canva.com/design/ABC'),false)
  assert.equal(isCanvaUrl('https://example.com/design/ABC'),false)
})

test('un proyecto creativo requiere nombre y cantidad válida', () => {
  const emptyErrors = validateCreativeProject(EMPTY_CREATIVE_PROJECT)
  assert.match(emptyErrors.name,/nombre/i)

  const valid = validateCreativeProject({
    ...EMPTY_CREATIVE_PROJECT,
    name:'Etiquetas escolares',
    quantity:24,
    width:5,
    height:2,
    canvaUrl:'https://www.canva.com/design/ABC/view',
  })
  assert.deepEqual(valid,{})
})

test('Cricut suma producto base, material y personalización', () => {
  const price = calculateServicePrice({
    productionCost:30,
    profitPercent:50,
    productBase:100,
    roundTo:5,
    addProductToService:true,
  })

  assert.equal(price.total,145)
  assert.equal(price.personalizationPrice,45)
  assert.equal(price.profitAmount,15)
})

test('Láser conserva el producto como precio mínimo', () => {
  const price = calculateServicePrice({
    productionCost:30,
    profitPercent:50,
    productBase:100,
    roundTo:5,
    addProductToService:false,
  })

  assert.equal(price.total,100)
})

test('el vinil se descuenta por superficie utilizada', () => {
  const usage = calculateCricutConsumption({
    width:5,
    height:5,
    quantity:1,
    trackingMode:'area',
  })

  assert.deepEqual(usage,{unit:'cm²',amount:25})
  assert.equal(remainingAreaLength(6000-usage.amount,60),99.58333333333333)
})

test('las hojas de sticker se descuentan según las piezas que caben', () => {
  const usage = calculateCricutConsumption({
    width:5,
    height:5,
    quantity:25,
    piecesPerSheet:20,
    trackingMode:'sheets',
  })

  assert.deepEqual(usage,{unit:'hojas',amount:2})
  assert.equal(calculateSheetMaterialCost(12,usage.amount),24)
})

test('la impresión multicolor suma costos y gramos por filamento', () => {
  const filament = calculateFilamentBreakdown({
    primaryMaterial:{id:'pla-red',name:'PLA rojo',priceKg:300,inventoryId:'red-stock'},
    primaryWeight:40,
    extraColors:[
      {id:'blue',weight:10,material:{id:'pla-blue',name:'PLA azul',priceKg:400,inventoryId:'blue-stock'}},
    ],
  })

  assert.equal(filament.totalGrams,50)
  assert.equal(filament.totalCost,16)
  assert.deepEqual(filament.inventoryUsage,{'red-stock':40,'blue-stock':10})
})

test('los gramos del mismo rollo se acumulan antes de descontar inventario', () => {
  const filament = calculateFilamentBreakdown({
    primaryMaterial:{id:'pla',name:'PLA',priceKg:298,inventoryId:'same-stock'},
    primaryWeight:25,
    extraColors:[
      {id:'extra',weight:5,material:{id:'pla',name:'PLA',priceKg:298,inventoryId:'same-stock'}},
    ],
  })

  assert.deepEqual(filament.inventoryUsage,{'same-stock':30})
})

test('el precio manual permite una promoción y conserva la rentabilidad real', () => {
  const price = resolvePrintPrice({
    productionCost:60,
    automaticTotal:120,
    quantity:3,
    priceMode:'manual',
    manualTotal:100,
  })

  assert.equal(price.total,100)
  assert.equal(price.unit,100/3)
  assert.equal(price.profitAmount,40)
  assert.equal(price.marginPercent,40)
  assert.equal(price.belowCost,false)
})

test('el precio manual alerta cuando queda debajo del costo', () => {
  const price = resolvePrintPrice({
    productionCost:110,
    automaticTotal:170,
    quantity:3,
    priceMode:'manual',
    manualTotal:100,
  })

  assert.equal(price.total,100)
  assert.equal(price.profitAmount,-10)
  assert.equal(price.belowCost,true)
})

test('láser permite definir un total manual y conserva la sugerencia automática', () => {
  const price = resolveServiceFinalPrice({
    productionCost:80,
    automaticTotal:150,
    automaticProfitAmount:70,
    quantity:2,
    priceMode:'manual',
    manualTotal:120,
  })

  assert.equal(price.automaticTotal,150)
  assert.equal(price.total,120)
  assert.equal(price.unit,60)
  assert.equal(price.profitAmount,40)
  assert.equal(price.marginPercent,40/120*100)
  assert.equal(price.belowCost,false)
})

test('Cricut alerta si la promoción manual no cubre producto y personalización', () => {
  const price = resolveServiceFinalPrice({
    productionCost:130,
    automaticTotal:210,
    automaticProfitAmount:80,
    quantity:3,
    priceMode:'manual',
    manualTotal:100,
  })

  assert.equal(price.total,100)
  assert.equal(price.profitAmount,-30)
  assert.equal(price.belowCost,true)
})

test('un pedido anterior sin pagos conserva todo su saldo pendiente', () => {
  const summary = paymentSummary({total:1500})

  assert.deepEqual(summary,{
    total:1500,
    paid:0,
    balance:1500,
    status:'unpaid',
    progress:0,
  })
})

test('los anticipos y abonos calculan el saldo y el estado parcial', () => {
  const summary = paymentSummary({
    total:1500,
    payments:[
      {amount:500},
      {amount:400},
    ],
  })

  assert.equal(summary.paid,900)
  assert.equal(summary.balance,600)
  assert.equal(summary.status,'partial')
  assert.equal(summary.progress,60)
})

test('al liquidar un pedido cambia automáticamente a pagado', () => {
  const summary = paymentSummary({
    total:1500,
    payments:[
      {amount:500},
      {amount:1000},
    ],
  })

  assert.equal(summary.balance,0)
  assert.equal(summary.status,'paid')
  assert.equal(summary.progress,100)
})

test('detecta una fecha de liquidación vencida solo cuando existe saldo', () => {
  const reference = new Date('2026-07-29T12:00:00')
  assert.equal(isPaymentOverdue({total:100,paymentDueDate:'2026-07-28',payments:[]},reference),true)
  assert.equal(isPaymentOverdue({total:100,paymentDueDate:'2026-07-28',payments:[{amount:100}]},reference),false)
})

test('normaliza un pago antes de guardarlo en el historial', () => {
  const payment = createPayment({
    id:'payment-1',
    amount:'250.50',
    date:'2026-07-29',
    method:'cash',
    note:'  Segundo abono  ',
    createdAt:'2026-07-29T12:00:00.000Z',
  })

  assert.equal(payment.amount,250.5)
  assert.equal(payment.note,'Segundo abono')
  assert.equal(payment.method,'cash')
})

test('un pedido entregado con saldo pendiente sigue activo', () => {
  assert.equal(isOrderFinalized({
    status:'delivered',
    total:500,
    payments:[{amount:200}],
  }),false)
})

test('solo un pedido entregado y liquidado queda finalizado', () => {
  const paidOrder={total:500,payments:[{amount:500}]}

  assert.equal(isOrderFinalized({...paidOrder,status:'ready'}),false)
  assert.equal(isOrderFinalized({...paidOrder,status:'delivered'}),true)
})

test('los pedidos anteriores usan anticipo como forma de pago predeterminada', () => {
  assert.equal(normalizePaymentPlan(), 'deposit')
  assert.equal(normalizePaymentPlan('on_delivery'), 'on_delivery')
})

test('entregado y pagado liquida solamente el saldo pendiente', () => {
  const order=settleAndDeliverOrder({
    status:'ready',
    total:500,
    payments:[{id:'advance',amount:200}],
  },{
    id:'settlement',
    date:'2026-08-02',
    method:'cash',
    createdAt:'2026-08-02T12:00:00.000Z',
  })

  assert.equal(order.status,'delivered')
  assert.equal(order.payments[0].amount,300)
  assert.equal(order.payments[0].method,'cash')
  assert.equal(paymentSummary(order).balance,0)
  assert.equal(isOrderFinalized(order),true)
})

test('entregar un pedido ya liquidado no duplica el pago', () => {
  const order=settleAndDeliverOrder({status:'ready',total:100,payments:[{amount:100}]})

  assert.equal(order.status,'delivered')
  assert.equal(order.payments.length,1)
})

test('finanzas separa cobros, compras y gastos sin reducir las ventas', () => {
  const summary=financeSummary({
    month:'2026-08',
    orders:[{status:'delivered',total:1000,productionCost:400,createdAt:'2026-08-01T12:00:00Z',deliveredAt:'2026-08-02T12:00:00Z',payments:[{amount:800,date:'2026-08-02'}]}],
    transactions:[
      {type:'purchase',amount:300,date:'2026-08-02'},
      {type:'expense',amount:100,date:'2026-08-03'},
    ],
    inventory:[],
  })
  assert.equal(summary.collected,800)
  assert.equal(summary.deliveredSales,1000)
  assert.equal(summary.purchases,300)
  assert.equal(summary.expenses,100)
  assert.equal(summary.cashFlow,400)
  assert.equal(summary.estimatedNetProfit,500)
})

test('finanzas muestra como pendiente el saldo no cobrado', () => {
  const summary=financeSummary({orders:[{status:'process',total:500,payments:[{amount:200,date:'2026-08-01'}]}]})
  assert.equal(summary.receivable,300)
})

test('registrar una compra suma piezas al inventario y actualiza el costo promedio', () => {
  const items=[{id:'tumbler',trackingMode:'units',stock:5,purchaseQty:5,purchaseTotal:500,supplier:'A'}]
  const updated=applyInventoryPurchase(items,{inventoryId:'tumbler',quantity:5,amount:750,supplier:'B',date:'2026-08-02'})
  assert.equal(updated[0].stock,10)
  assert.equal(updated[0].purchaseTotal,1250)
  assert.equal(updated[0].purchaseQty,10)
  assert.equal(updated[0].supplier,'B')
})

test('registrar material por superficie suma el área comprada', () => {
  const items=[{id:'vinyl',trackingMode:'area',stock:1,materialWidth:60,materialLength:100,areaRemaining:3000,purchaseQty:1,purchaseTotal:60}]
  const updated=applyInventoryPurchase(items,{inventoryId:'vinyl',quantity:1,amount:70,date:'2026-08-02'})
  assert.equal(updated[0].areaRemaining,9000)
  assert.equal(updated[0].stock,2)
})

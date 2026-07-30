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

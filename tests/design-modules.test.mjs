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


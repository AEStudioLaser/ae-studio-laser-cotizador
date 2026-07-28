export const CREATIVE_WORK_TYPES = [
  'Cricut',
  'Corte láser',
  'Grabado láser',
  'Vinil',
  'Sticker',
  'DTF',
  'Papelería creativa',
  'Diseño para termo',
  'Diseño para vaso',
  'Etiquetas',
  'Topper',
  'Letrero',
  'Otro',
]

export const CREATIVE_STATES = [
  ['idea','Idea'],
  ['design','En diseño'],
  ['review','Listo para revisión'],
  ['approved','Aprobado'],
  ['production','Listo para producción'],
  ['finished','Terminado'],
]

export const CREATIVE_TECHNIQUES = [
  'Canva',
  'Cricut',
  'Corte láser',
  'Grabado láser',
  'Vinil',
  'Sticker',
  'DTF',
  'Papelería creativa',
  'Otro',
]

export const EMPTY_CREATIVE_PROJECT = {
  name: '',
  clientId: '',
  workType: 'Cricut',
  productId: '',
  technique: 'Canva',
  width: '',
  height: '',
  unit: 'cm',
  quantity: 1,
  materialId: '',
  color: '',
  canvaUrl: '',
  fileReference: '',
  notes: '',
  status: 'idea',
  orderId: '',
  cricutMode: 'cut',
  needsOffset: false,
  transparentBackground: false,
  cricutFormat: 'SVG',
  laserOperation: 'cut',
  thickness: '',
  laserFormat: 'SVG',
  productionNotes: '',
}

export function isCanvaUrl(value) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'canva.com' || url.hostname.endsWith('.canva.com'))
  } catch {
    return false
  }
}

export function validateCreativeProject(project) {
  const errors = {}
  const width = Number(project.width)
  const height = Number(project.height)
  const quantity = Number(project.quantity)

  if (!String(project.name || '').trim()) errors.name = 'Escribe el nombre del proyecto.'
  if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'La cantidad debe ser un número entero mayor que cero.'
  if ((project.width !== '' || project.height !== '') && (!(width > 0) || !(height > 0))) {
    errors.dimensions = 'Captura ancho y alto mayores que cero, o deja ambas medidas vacías.'
  }
  if (!isCanvaUrl(project.canvaUrl)) errors.canvaUrl = 'Usa un enlace HTTPS válido de Canva.'
  if (project.thickness !== '' && !(Number(project.thickness) > 0)) {
    errors.thickness = 'El grosor debe ser mayor que cero.'
  }

  return errors
}

export function creativeStatusLabel(value) {
  return CREATIVE_STATES.find(([id]) => id === value)?.[1] || value
}


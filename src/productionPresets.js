const print3dProfiles = [
  {
    id: 'general',
    name: 'Uso general',
    description: 'Buen equilibrio entre calidad, tiempo y resistencia.',
    parameters: {
      nozzle: 0.4,
      layerHeight: 0.2,
      walls: 3,
      topBottom: 4,
      infill: 15,
      pattern: 'Gyroid',
      supports: 'Automáticos si son necesarios',
      adhesion: 'Sin borde; usar brim si la base es pequeña',
    },
  },
  {
    id: 'detail',
    name: 'Detalle / llaveros',
    description: 'Para texto pequeño, relieves, recuerdos y piezas decorativas.',
    parameters: {
      nozzle: 0.4,
      layerHeight: 0.16,
      walls: 3,
      topBottom: 4,
      infill: 15,
      pattern: 'Gyroid',
      supports: 'Automáticos si son necesarios',
      adhesion: 'Brim de 3–5 mm si la base es pequeña',
    },
  },
  {
    id: 'resistant',
    name: 'Pieza resistente',
    description: 'Para soportes, ensambles y piezas de uso continuo.',
    parameters: {
      nozzle: 0.4,
      layerHeight: 0.2,
      walls: 4,
      topBottom: 5,
      infill: 25,
      pattern: 'Gyroid',
      supports: 'Automáticos si son necesarios',
      adhesion: 'Brim de 5 mm si existe riesgo de desprendimiento',
    },
  },
  {
    id: 'draft',
    name: 'Borrador rápido',
    description: 'Para validar medidas antes de producir la versión final.',
    parameters: {
      nozzle: 0.4,
      layerHeight: 0.28,
      walls: 2,
      topBottom: 3,
      infill: 12,
      pattern: 'Gyroid',
      supports: 'Solo en zonas críticas',
      adhesion: 'Sin borde; usar brim si es necesario',
    },
  },
]

const laserProfiles = [
  {
    id: 'mdf-cut',
    name: 'MDF 3 mm · corte',
    description: 'Punto de partida para Sculpfun de 20 W.',
    parameters: {speed: 400, power: 95, passes: 1, airAssist: 'Encendido', mode: 'M3 · potencia constante', focus: 'En la superficie'},
  },
  {
    id: 'mdf-engrave',
    name: 'MDF · grabado',
    description: 'Para texto y gráficos; prueba primero en un sobrante.',
    parameters: {speed: 3000, power: 20, passes: 1, airAssist: 'Apagado o bajo', mode: 'M4 · potencia dinámica', focus: 'En la superficie'},
  },
  {
    id: 'plywood-cut',
    name: 'Triplay 3 mm · corte',
    description: 'El pegamento y el número de capas pueden cambiar el resultado.',
    parameters: {speed: 600, power: 90, passes: 1, airAssist: 'Encendido', mode: 'M3 · potencia constante', focus: 'En la superficie'},
  },
  {
    id: 'plywood-engrave',
    name: 'Triplay · grabado',
    description: 'Ajusta potencia según el tono que buscas.',
    parameters: {speed: 2800, power: 22, passes: 1, airAssist: 'Apagado o bajo', mode: 'M4 · potencia dinámica', focus: 'En la superficie'},
  },
  {
    id: 'acrylic-black-cut',
    name: 'Acrílico negro 3 mm · corte',
    description: 'Solo acrílico opaco compatible; no usar transparente.',
    parameters: {speed: 300, power: 95, passes: 2, airAssist: 'Encendido', mode: 'M3 · potencia constante', focus: 'En la superficie'},
  },
  {
    id: 'coated-tumbler-engrave',
    name: 'Termo recubierto · grabado',
    description: 'Requiere rotatorio y una prueba discreta en el recubrimiento.',
    parameters: {speed: 2000, power: 25, passes: 1, airAssist: 'Apagado o bajo', mode: 'M4 · potencia dinámica', focus: 'Sobre la superficie curva'},
  },
]

const cricutProfiles = [
  {
    id: 'vinyl-adhesive',
    name: 'Vinil adhesivo',
    description: 'Para vinil permanente o removible.',
    parameters: {designSpaceSetting: 'Premium Vinyl · Permanent/Removable', pressure: 'Predeterminada', passes: 1, blade: 'Punta fina', mirror: 'No', mat: 'StandardGrip'},
  },
  {
    id: 'iron-on',
    name: 'Vinil textil / Iron-On',
    description: 'Coloca el lado brillante hacia abajo y activa espejo.',
    parameters: {designSpaceSetting: 'Everyday Iron-On', pressure: 'Predeterminada', passes: 1, blade: 'Punta fina', mirror: 'Sí', mat: 'StandardGrip'},
  },
  {
    id: 'printable-sticker',
    name: 'Sticker imprimible',
    description: 'Calibra Imprimir luego cortar antes de un pedido grande.',
    parameters: {designSpaceSetting: 'Printable Sticker Paper, White', pressure: 'Predeterminada', passes: 2, blade: 'Punta fina', mirror: 'No', mat: 'LightGrip o StandardGrip'},
  },
  {
    id: 'laminated-sticker',
    name: 'Sticker laminado',
    description: 'El laminado puede requerir Más presión según su grosor.',
    parameters: {designSpaceSetting: 'Laminated Printable Sticker Paper, White', pressure: 'Predeterminada', passes: 2, blade: 'Punta fina', mirror: 'No', mat: 'StandardGrip'},
  },
  {
    id: 'medium-cardstock',
    name: 'Cartulina 216 g',
    description: 'Para papelería creativa y cortes de complejidad media.',
    parameters: {designSpaceSetting: 'Medium Cardstock · 80 lb (216 gsm)', pressure: 'Predeterminada', passes: 1, blade: 'Punta fina', mirror: 'No', mat: 'LightGrip o StandardGrip'},
  },
]

export const productionProfiles = {
  '3d': print3dProfiles,
  laser: laserProfiles,
  cricut: cricutProfiles,
}

export function createProductionParameters(service, profileId) {
  const profiles = productionProfiles[service] || productionProfiles['3d']
  const profile = profiles.find(item => item.id === profileId) || profiles[0]
  return {
    service,
    profileId: profile.id,
    profileName: profile.name,
    ...profile.parameters,
  }
}

export function defaultProfileForJob(service, jobType) {
  if (service === 'laser') return jobType === 'engrave' ? 'mdf-engrave' : 'mdf-cut'
  if (service === 'cricut') {
    if (jobType === 'stickers' || jobType === 'printcut') return 'printable-sticker'
    if (jobType === 'paper') return 'medium-cardstock'
    return 'vinyl-adhesive'
  }
  return 'general'
}

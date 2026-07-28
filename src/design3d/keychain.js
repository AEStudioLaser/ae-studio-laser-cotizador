export const DEFAULT_KEYCHAIN = {
  text: 'Emiliano',
  length: 60,
  height: 22,
  baseThickness: 3,
  textRelief: 1.2,
  holeDiameter: 4,
  margin: 2,
  textSize: 7,
  quantity: 1,
}

const number = value => Number(value)
const rounded = value => Math.round(number(value) * 100) / 100

export function validateKeychain(values) {
  const errors = {}
  const text = String(values.text || '').trim()
  const length = number(values.length)
  const height = number(values.height)
  const baseThickness = number(values.baseThickness)
  const textRelief = number(values.textRelief)
  const holeDiameter = number(values.holeDiameter)
  const margin = number(values.margin)
  const textSize = number(values.textSize)
  const quantity = number(values.quantity)

  if (!text) errors.text = 'El texto no puede estar vacío.'
  else if (text.length > 30) errors.text = 'Usa un texto de máximo 30 caracteres.'

  if (!Number.isFinite(length) || length <= 0) errors.length = 'El largo debe ser mayor que cero.'
  else if (length < 30 || length > 150) errors.length = 'Usa un largo entre 30 y 150 mm.'

  if (!Number.isFinite(height) || height <= 0) errors.height = 'El alto debe ser mayor que cero.'
  else if (height < 15 || height > 50) errors.height = 'Usa un alto entre 15 y 50 mm.'

  if (Number.isFinite(length) && Number.isFinite(height) && length < height + 10) {
    errors.length = 'El largo debe superar el alto por al menos 10 mm.'
  }

  if (!Number.isFinite(baseThickness) || baseThickness < 1.2 || baseThickness > 10) {
    errors.baseThickness = 'Usa un grosor imprimible entre 1.2 y 10 mm.'
  }

  if (!Number.isFinite(textRelief) || textRelief < 0.4 || textRelief > 4) {
    errors.textRelief = 'Usa un relieve entre 0.4 y 4 mm.'
  }

  if (
    Number.isFinite(baseThickness) &&
    Number.isFinite(textRelief) &&
    baseThickness + textRelief > 12
  ) {
    errors.textRelief = 'El grosor total no debe superar 12 mm.'
  }

  if (!Number.isFinite(margin) || margin < 0.8 || margin > 10) {
    errors.margin = 'Usa un margen entre 0.8 y 10 mm.'
  }

  if (!Number.isFinite(holeDiameter) || holeDiameter < 2 || holeDiameter > 12) {
    errors.holeDiameter = 'Usa un orificio entre 2 y 12 mm.'
  } else if (
    Number.isFinite(height) &&
    Number.isFinite(margin) &&
    holeDiameter + margin * 2 > height
  ) {
    errors.holeDiameter = 'El orificio y su margen deben caber dentro del llavero.'
  }

  if (!Number.isFinite(textSize) || textSize < 3 || textSize > 18) {
    errors.textSize = 'Usa un tamaño de texto entre 3 y 18 mm.'
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    errors.quantity = 'La cantidad debe ser un número entero entre 1 y 20.'
  }

  if (!errors.text && !errors.length && !errors.height && !errors.margin && !errors.textSize) {
    const availableWidth = length - height - margin * 2
    const estimatedTextWidth = text.length * textSize * 0.58
    if (estimatedTextWidth > availableWidth * 1.08) {
      const recommended = Math.max(3, Math.floor((availableWidth / (text.length * 0.58)) * 10) / 10)
      errors.textSize = `El texto no cabe razonablemente. Prueba con ${recommended} mm o menos.`
    }
  }

  return errors
}

export function escapeOpenScadText(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
}

export function safeDesignFileName(text) {
  const slug = String(text || 'diseno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return `llavero-${slug || 'personalizado'}.scad`
}

export function keychainSummary(values) {
  return {
    name: `Llavero personalizado: ${String(values.text || '').trim()}`,
    dimensions: `${rounded(values.length)} × ${rounded(values.height)} × ${rounded(values.baseThickness)} mm`,
    totalThickness: rounded(number(values.baseThickness) + number(values.textRelief)),
    quantity: number(values.quantity),
  }
}

export function generateKeychainScad(values) {
  const text = escapeOpenScadText(String(values.text || '').trim())
  const length = rounded(values.length)
  const height = rounded(values.height)
  const baseThickness = rounded(values.baseThickness)
  const textRelief = rounded(values.textRelief)
  const holeDiameter = rounded(values.holeDiameter)
  const margin = rounded(values.margin)
  const textSize = rounded(values.textSize)
  const quantity = Math.max(1, Math.trunc(number(values.quantity)))

  return `/*
  A&E Studio Maker
  Llavero personalizado con nombre

  La apariencia del texto puede variar según las fuentes instaladas.
  No requiere librerías externas.
*/

text_value = "${text}";
keychain_length = ${length};       // mm
keychain_height = ${height};       // mm
base_thickness = ${baseThickness}; // mm
text_relief = ${textRelief};       // mm
hole_diameter = ${holeDiameter};   // mm
edge_margin = ${margin};           // mm
text_size = ${textSize};           // mm
quantity = ${quantity};
copy_spacing = 4;                  // mm
font_name = "Liberation Sans:style=Bold";
$fn = 72;

module rounded_keychain_2d() {
  hull() {
    translate([keychain_height / 2, keychain_height / 2])
      circle(d = keychain_height);
    translate([keychain_length - keychain_height / 2, keychain_height / 2])
      circle(d = keychain_height);
  }
}

module keychain_base() {
  difference() {
    linear_extrude(height = base_thickness)
      rounded_keychain_2d();

    translate([keychain_height / 2, keychain_height / 2, -0.1])
      cylinder(h = base_thickness + 0.2, d = hole_diameter);
  }
}

module raised_name() {
  usable_start = keychain_height + edge_margin;
  usable_end = keychain_length - edge_margin;
  text_center_x = (usable_start + usable_end) / 2;

  translate([text_center_x, keychain_height / 2, base_thickness])
    linear_extrude(height = text_relief)
      text(
        text_value,
        size = text_size,
        font = font_name,
        halign = "center",
        valign = "center"
      );
}

module personalized_keychain() {
  union() {
    keychain_base();
    raised_name();
  }
}

for (copy_index = [0 : quantity - 1]) {
  translate([0, copy_index * (keychain_height + copy_spacing), 0])
    personalized_keychain();
}
`
}


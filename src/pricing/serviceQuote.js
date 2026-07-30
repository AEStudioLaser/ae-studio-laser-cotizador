const amount = value => Number(value) || 0

export function calculateServicePrice({
  productionCost,
  profitPercent,
  productBase = 0,
  roundTo = 1,
  addProductToService = false,
}) {
  const knownCosts = Math.max(0, amount(productionCost))
  const base = Math.max(0, amount(productBase))
  const profit = Math.max(0, amount(profitPercent)) / 100
  const step = Math.max(1, amount(roundTo))
  const personalizationBeforeRounding = knownCosts * (1 + profit)
  const beforeRounding = addProductToService
    ? base + personalizationBeforeRounding
    : Math.max(base, personalizationBeforeRounding)
  const total = Math.ceil(beforeRounding / step) * step
  const personalizationPrice = addProductToService ? total - base : total

  return {
    total,
    productBase: base,
    personalizationPrice,
    profitAmount: personalizationPrice - knownCosts,
  }
}

export function resolveServiceFinalPrice({
  productionCost,
  automaticTotal,
  automaticProfitAmount,
  quantity = 1,
  priceMode = 'auto',
  manualTotal = '',
}) {
  const cost = Math.max(0, amount(productionCost))
  const automatic = Math.max(0, amount(automaticTotal))
  const qty = Math.max(1, amount(quantity))
  const isManual = priceMode === 'manual' && manualTotal !== ''
  const total = isManual ? Math.max(0, amount(manualTotal)) : automatic
  const profitAmount = isManual ? total - cost : amount(automaticProfitAmount)

  return {
    automaticTotal: automatic,
    isManual,
    total,
    unit: total / qty,
    profitAmount,
    marginPercent: total > 0 ? profitAmount / total * 100 : 0,
    belowCost: isManual && total < cost,
  }
}

export function calculateCricutConsumption({
  width,
  height,
  quantity,
  piecesPerSheet,
  trackingMode,
}) {
  const pieceWidth = Math.max(0, amount(width))
  const pieceHeight = Math.max(0, amount(height))
  const pieces = Math.max(1, Math.ceil(amount(quantity)))

  if (trackingMode === 'sheets') {
    return {
      unit: 'hojas',
      amount: Math.ceil(pieces / Math.max(1, Math.floor(amount(piecesPerSheet)))),
    }
  }

  return {
    unit: 'cm²',
    amount: pieceWidth * pieceHeight * pieces,
  }
}

export function remainingAreaLength(areaCm2, widthCm) {
  const width = Math.max(0, amount(widthCm))
  return width ? Math.max(0, amount(areaCm2)) / width : 0
}

export function calculateSheetMaterialCost(sheetCost, sheetsUsed) {
  return Math.max(0, amount(sheetCost)) * Math.max(0, Math.ceil(amount(sheetsUsed)))
}

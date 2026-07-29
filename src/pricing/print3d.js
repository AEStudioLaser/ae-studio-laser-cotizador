const amount = value => Number(value) || 0

export function calculateFilamentBreakdown({primaryMaterial, primaryWeight, extraColors = []}) {
  const lines = [
    {
      id: primaryMaterial?.id || 'primary',
      name: primaryMaterial?.name || 'Material principal',
      grams: Math.max(0, amount(primaryWeight)),
      priceKg: Math.max(0, amount(primaryMaterial?.priceKg)),
      inventoryId: primaryMaterial?.inventoryId || '',
    },
    ...extraColors.map(color => ({
      id: color.id,
      name: color.material?.name || 'Material adicional',
      grams: Math.max(0, amount(color.weight)),
      priceKg: Math.max(0, amount(color.material?.priceKg)),
      inventoryId: color.material?.inventoryId || '',
    })),
  ].filter(line => line.grams > 0)

  const inventoryUsage = lines.reduce((usage,line) => {
    if (line.inventoryId) usage[line.inventoryId] = (usage[line.inventoryId] || 0) + line.grams
    return usage
  },{})

  return {
    lines:lines.map(line => ({...line,cost:line.grams / 1000 * line.priceKg})),
    totalCost:lines.reduce((total,line) => total + line.grams / 1000 * line.priceKg,0),
    totalGrams:lines.reduce((total,line) => total + line.grams,0),
    inventoryUsage,
  }
}

export function resolvePrintPrice({
  productionCost,
  automaticTotal,
  quantity = 1,
  priceMode = 'auto',
  manualTotal = '',
}) {
  const cost = Math.max(0, amount(productionCost))
  const automatic = Math.max(0, amount(automaticTotal))
  const qty = Math.max(1, amount(quantity))
  const isManual = priceMode === 'manual' && manualTotal !== ''
  const total = isManual ? Math.max(0, amount(manualTotal)) : automatic
  const profitAmount = total - cost

  return {
    automaticTotal: automatic,
    isManual,
    total,
    unit: total / qty,
    profitAmount,
    marginPercent: total > 0 ? profitAmount / total * 100 : 0,
    belowCost: total < cost,
  }
}

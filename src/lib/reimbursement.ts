export interface ReimbursementCalculationInputs {
  baseSalary: number
  includesTerco?: boolean
  includesAbono?: boolean
  dissidioAmount: number
}

export interface ReimbursementBreakdown {
  baseSalary: number
  tercoFerias: number
  abonoAmount: number
  dissidioAmount: number
  totalAmount: number
}

/**
 * Executive Annual / Vacation calculation:
 * Soma:
 * - Salário Base
 * - Terço Constitucional de Férias: se includesTerco = true (+ base_salary / 3), senão 0
 * - Abono Pecuniário de Férias: se includesAbono = true (+ base_salary / 3), senão 0
 * - Retroativo de Dissídio: valor absoluto de dissidioAmount
 * Total = Salário Base + Terço de Férias + Abono Pecuniário + Dissídio
 *
 * Uses exact fractions without intermediate rounding; rounded to 2 decimal places at the end.
 */
export function calculateReimbursement(
  inputs: ReimbursementCalculationInputs,
): ReimbursementBreakdown {
  const baseSalary =
    Number.isFinite(inputs.baseSalary) && inputs.baseSalary > 0 ? inputs.baseSalary : 0
  const dissidioRaw = Number.isFinite(inputs.dissidioAmount) ? inputs.dissidioAmount : 0
  const dissidioAmount = Math.abs(dissidioRaw)

  const tercoFerias = inputs.includesTerco ? baseSalary / 3 : 0
  const abonoAmount = inputs.includesAbono ? baseSalary / 3 : 0

  const rawTotal = baseSalary + tercoFerias + abonoAmount + dissidioAmount
  const totalAmount = Math.round((rawTotal + Number.EPSILON) * 100) / 100

  return {
    baseSalary,
    tercoFerias,
    abonoAmount,
    dissidioAmount,
    totalAmount,
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

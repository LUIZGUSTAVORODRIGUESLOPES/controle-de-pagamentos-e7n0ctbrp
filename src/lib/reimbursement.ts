export interface ReimbursementCalculationInputs {
  baseSalary: number
  vacationDays?: number
  temAbono?: boolean
  includesAbono?: boolean
  includesTerco?: boolean
  dissidioAmount: number
}

export interface ReimbursementBreakdown {
  baseSalary: number
  diasGozados: number
  valorFerias: number
  tercoFerias: number
  diasAbono: number
  temAbono: boolean
  valorAbono: number
  tercoAbono: number
  abonoAmount: number // valorAbono + tercoAbono para compatibilidade
  dissidioAmount: number
  totalAmount: number
  dailyRate: number
}

/**
 * Executive Annual / Vacation calculation com proporcionalidade completa:
 * 1. Férias Gozadas:
 *    valorFerias = (baseSalary / 30) * diasGozados
 *    tercoFerias = valorFerias / 3
 * 2. Abono Pecuniário:
 *    diasAbono = temAbono ? 10 : 0
 *    valorAbono = (baseSalary / 30) * diasAbono
 *    tercoAbono = valorAbono / 3
 * 3. Total:
 *    totalAmount = valorFerias + tercoFerias + valorAbono + tercoAbono + dissidioAmount
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

  // Dias de férias gozados: padrão 30, limite [0, 30]
  const rawVacationDays = inputs.vacationDays !== undefined ? Number(inputs.vacationDays) : 30
  const diasGozados = Number.isFinite(rawVacationDays)
    ? Math.max(0, Math.min(30, rawVacationDays))
    : 30

  // 1. Férias Gozadas
  const valorFerias = (baseSalary / 30) * diasGozados
  // Se includesTerco foi passado explicitamente como false e diasGozados > 0, pode ser 0,
  // mas por especificação padrão o terço constitucional é proporcional: valorFerias / 3
  const tercoFerias = inputs.includesTerco === false ? 0 : valorFerias / 3

  // 2. Abono Pecuniário (Vender Férias): "Não" (0 dias) ou "Sim (10 dias)"
  const temAbono = Boolean(inputs.temAbono ?? inputs.includesAbono)
  const diasAbono = temAbono ? 10 : 0
  const valorAbono = (baseSalary / 30) * diasAbono
  const tercoAbono = valorAbono / 3

  // 3. Total
  const rawTotal = valorFerias + tercoFerias + valorAbono + tercoAbono + dissidioAmount
  const totalAmount = Math.round((rawTotal + Number.EPSILON) * 100) / 100

  const dailyRate = baseSalary / 30

  return {
    baseSalary,
    diasGozados,
    valorFerias,
    tercoFerias,
    diasAbono,
    temAbono,
    valorAbono,
    tercoAbono,
    abonoAmount: valorAbono + tercoAbono,
    dissidioAmount,
    totalAmount,
    dailyRate,
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

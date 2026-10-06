export interface ReimbursementCalculationInputs {
  baseSalary: number
  includesAbono: boolean
  dissidioAmount: number
}

export interface ReimbursementBreakdown {
  decimoTerceiro: number
  tercoFerias: number
  fixoAnual: number
  abonoAmount: number
  dissidioAmount: number
  totalAmount: number
}

/**
 * Executive Annual Reimbursement calculation:
 * - Fixo Anual: base_salary (referente ao 13º) + (base_salary / 3) (referente ao 1/3 de férias).
 * - Abono (se includes_abono = true): soma mais (base_salary / 3).
 * - Dissídio: soma o valor absoluto de dissidio_amount.
 * - Total = Fixo Anual + Abono (se houver) + Dissídio.
 *
 * Uses exact fractions without intermediate rounding; rounded to 2 decimal places only at the end.
 */
export function calculateReimbursement(
  inputs: ReimbursementCalculationInputs,
): ReimbursementBreakdown {
  const baseSalary =
    Number.isFinite(inputs.baseSalary) && inputs.baseSalary > 0 ? inputs.baseSalary : 0
  const dissidioRaw = Number.isFinite(inputs.dissidioAmount) ? inputs.dissidioAmount : 0
  const dissidioAmount = Math.abs(dissidioRaw)

  const decimoTerceiro = baseSalary
  const tercoFerias = baseSalary / 3
  const fixoAnual = decimoTerceiro + tercoFerias

  const abonoAmount = inputs.includesAbono ? baseSalary / 3 : 0

  const rawTotal = fixoAnual + abonoAmount + dissidioAmount
  const totalAmount = Math.round((rawTotal + Number.EPSILON) * 100) / 100

  return {
    decimoTerceiro,
    tercoFerias,
    fixoAnual,
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

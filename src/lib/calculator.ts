import type { TipoPagamento } from '@/types/pagamento'

export interface CalculationInputs {
  valorBase: number
  tipoPagamento: TipoPagamento | ''
  diasGozadas?: number
  diasVendidas?: number
}

export interface CalculationBreakdown {
  diaria: number
  c1Gozadas: number
  c2Vendidas: number
  c3Terco: number
  diasTrabalhados?: number
  valorLiquido: number
}

/**
 * Exact calculation formulas as required:
 * Diaria = Valor Base Mensal / 30
 *
 * 1. Tipo = "Mensalidade Padrão":
 *    Valor_Liquido = Valor Base Mensal.
 * 2. Tipo = "Férias":
 *    Cálculo 1 (Gozadas) = Dias que vai descansar * Diaria
 *    Cálculo 2 (Abono) = Dias que vai vender * Diaria
 *    Cálculo 3 (Terço Constitucional) = Valor Base Mensal / 3
 *    Valor_Liquido = C1 + C2 + C3.
 * 3. Tipo = "Saldo de Salário (pós-férias)":
 *    Dias Trabalhados = 30 - Dias que vai descansar
 *    Valor_Liquido = Dias Trabalhados * Diaria.
 * 4. Tipo = "13º Salário - Integral":
 *    Valor_Liquido = Valor Base Mensal.
 * 5. Tipo = "13º Salário - 1ª Parcela" OU "13º Salário - 2ª Parcela":
 *    Valor_Liquido = Valor Base Mensal / 2.
 */
export function calculateValorLiquido(inputs: CalculationInputs): CalculationBreakdown {
  const { valorBase, tipoPagamento } = inputs
  const safeBase = Number.isFinite(valorBase) && valorBase > 0 ? valorBase : 0
  const diaria = safeBase / 30

  const diasGozadas = Math.max(0, Math.floor(inputs.diasGozadas || 0))
  const diasVendidas = Math.max(0, Math.floor(inputs.diasVendidas || 0))

  let c1Gozadas = 0
  let c2Vendidas = 0
  let c3Terco = 0
  let diasTrabalhados: number | undefined
  let valorLiquido = 0

  switch (tipoPagamento) {
    case 'Mensalidade Padrão':
      valorLiquido = safeBase
      break

    case 'Férias':
      c1Gozadas = diasGozadas * diaria
      c2Vendidas = diasVendidas * diaria
      c3Terco = safeBase / 3
      valorLiquido = c1Gozadas + c2Vendidas + c3Terco
      break

    case 'Saldo de Salário (pós-férias)':
      diasTrabalhados = Math.max(0, 30 - diasGozadas)
      valorLiquido = diasTrabalhados * diaria
      break

    case '13º Salário - Integral':
      valorLiquido = safeBase
      break

    case '13º Salário - 1ª Parcela':
    case '13º Salário - 2ª Parcela':
      valorLiquido = safeBase / 2
      break

    default:
      valorLiquido = 0
  }

  // Round to 2 decimal places to avoid floating point precision issues while preserving exact cents
  valorLiquido = Math.round((valorLiquido + Number.EPSILON) * 100) / 100

  return {
    diaria,
    c1Gozadas,
    c2Vendidas,
    c3Terco,
    diasTrabalhados,
    valorLiquido,
  }
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function formatDatePtBR(dateString: string): string {
  if (!dateString) return ''
  try {
    // PocketBase dates are ISO strings: "2024-12-05 09:00:00.000Z" or "2024-12-05"
    const cleaned = dateString.replace(' ', 'T')
    const date = new Date(cleaned)
    if (isNaN(date.getTime())) {
      // try fallback if format is YYYY-MM-DD
      const [year, month, day] = dateString.split('T')[0].split(' ')[0].split('-')
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
      }
      return dateString
    }
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date)
  } catch {
    return dateString
  }
}

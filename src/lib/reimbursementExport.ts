import type { ReimbursementRecord } from '@/types/reimbursement'
import { formatDatePtBR } from '@/lib/calculator'

export function getCurrentBrazilPeriod(): {
  year: number
  month: number
  period: string
  monthLabel: string
} {
  // Use Intl.DateTimeFormat with timeZone 'America/Sao_Paulo'
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const yearPart = parts.find((p) => p.type === 'year')?.value || String(now.getFullYear())
  const monthPart =
    parts.find((p) => p.type === 'month')?.value || String(now.getMonth() + 1).padStart(2, '0')

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const monthIndex = parseInt(monthPart, 10) - 1
  const monthLabel = `${monthNames[monthIndex] || monthPart}/${yearPart}`

  return {
    year: parseInt(yearPart, 10),
    month: parseInt(monthPart, 10),
    period: `${yearPart}-${monthPart}`,
    monthLabel,
  }
}

export function formatPeriodDisplay(
  period?: string,
  year?: number,
  type?: 'mensal' | 'anual',
): string {
  if (period) {
    if (period.includes('-')) {
      const [y, m] = period.split('-')
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      const idx = parseInt(m, 10) - 1
      const label = monthNames[idx] || m
      return `${label}/${y}`
    }
    return `Ano ${period}`
  }
  if (year) {
    return `Ano ${year}`
  }
  return type === 'mensal' ? 'Mensal' : 'Anual'
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export function exportReimbursementsToCsv(
  records: ReimbursementRecord[],
  filename = 'historico-reembolsos.csv',
): void {
  // UTF-8 BOM so Excel opens it with correct Brazilian Portuguese accents and symbols
  const BOM = '\uFEFF'

  const headers = [
    'Data de Criação',
    'Tipo',
    'Período / Ano',
    'Executivo / Usuário',
    'E-mail',
    'Salário Base (R$)',
    'Dias de Férias Gozados',
    '1/3 Constitucional de Férias',
    'Abono Pecuniário',
    'Dissídio (R$)',
    'Valor Total (R$)',
    'Valor Pago (R$)',
    'Saldo a Receber (R$)',
    'Status',
  ]

  const rows = records.map((r) => {
    const dataCriacao = formatDatePtBR(r.created)
    const tipo = r.type === 'mensal' ? 'Mensal' : 'Anual'
    const periodo = r.reference_period || (r.reference_year ? String(r.reference_year) : '-')
    const usuario = r.expand?.user?.name || 'Executivo'
    const email = r.expand?.user?.email || '-'
    const salarioBase = Number(r.base_salary || 0)
      .toFixed(2)
      .replace('.', ',')
    const diasFerias =
      r.type === 'anual' && r.vacation_days !== undefined && r.vacation_days !== null
        ? String(r.vacation_days)
        : '-'
    const terco = r.includes_terco ? 'Sim (+1/3)' : 'Não'
    const abono = r.includes_abono ? 'Sim (10 dias)' : 'Não'
    const dissidio = Number(r.dissidio_amount || 0)
      .toFixed(2)
      .replace('.', ',')
    const total = Number(r.total_amount || 0)
      .toFixed(2)
      .replace('.', ',')
    const pago = Number(r.amount_paid || 0)
      .toFixed(2)
      .replace('.', ',')
    const saldo = Math.max(0, Number(r.total_amount || 0) - Number(r.amount_paid || 0))
      .toFixed(2)
      .replace('.', ',')
    const status =
      r.status === 'paid' ? 'Pago' : r.status === 'partial' ? 'Pagamento Parcial' : 'Pendente'

    return [
      escapeCsvField(dataCriacao),
      escapeCsvField(tipo),
      escapeCsvField(periodo),
      escapeCsvField(usuario),
      escapeCsvField(email),
      escapeCsvField(salarioBase),
      escapeCsvField(diasFerias),
      escapeCsvField(terco),
      escapeCsvField(abono),
      escapeCsvField(dissidio),
      escapeCsvField(total),
      escapeCsvField(pago),
      escapeCsvField(saldo),
      escapeCsvField(status),
    ].join(';')
  })

  const csvContent = BOM + [headers.map(escapeCsvField).join(';'), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

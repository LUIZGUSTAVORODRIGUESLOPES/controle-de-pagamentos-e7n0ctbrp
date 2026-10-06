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

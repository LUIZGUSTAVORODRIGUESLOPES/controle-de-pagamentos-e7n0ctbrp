import pb from '@/lib/pocketbase/client'
import type { PagamentoRecord, PagamentoInput, StatusPagamento } from '@/types/pagamento'
import { calculateValorLiquido } from '@/lib/calculator'

export const pagamentosService = {
  /**
   * Fetch all payment records for the authenticated user, sorted by Data_Pagamento descending.
   */
  async list(): Promise<PagamentoRecord[]> {
    return pb.collection('pagamentos').getFullList<PagamentoRecord>({
      sort: '-Data_Pagamento',
      requestKey: null,
    })
  },

  /**
   * Create a new payment record.
   * Calculates Valor_Liquido automatically using exact formulas and sets Status = 'Pendente'.
   */
  async create(input: PagamentoInput): Promise<PagamentoRecord> {
    const authUser = pb.authStore.record
    if (!authUser) {
      throw new Error('Usuário não autenticado.')
    }

    const { valorLiquido } = calculateValorLiquido({
      valorBase: input.Valor_Base,
      tipoPagamento: input.Tipo_Pagamento,
      diasGozadas: input.Dias_Ferias_Gozadas || 0,
      diasVendidas: input.Dias_Ferias_Vendidas || 0,
    })

    // Zero out vacation days for non-vacation payment types as per specs
    const isFerias = input.Tipo_Pagamento === 'Férias'
    const isSaldoFerias = input.Tipo_Pagamento === 'Saldo de Salário (pós-férias)'

    const diasGozadas = isFerias || isSaldoFerias ? Number(input.Dias_Ferias_Gozadas || 0) : 0
    const diasVendidas = isFerias ? Number(input.Dias_Ferias_Vendidas || 0) : 0

    // Ensure Data_Pagamento is an ISO string suitable for PocketBase date field
    let formattedDate = input.Data_Pagamento
    if (formattedDate && !formattedDate.includes('T') && !formattedDate.includes(' ')) {
      formattedDate = `${formattedDate} 12:00:00.000Z`
    }

    const record = await pb.collection('pagamentos').create<PagamentoRecord>({
      user: authUser.id,
      Mes_Ano: input.Mes_Ano.trim(),
      Data_Pagamento: formattedDate,
      Tipo_Pagamento: input.Tipo_Pagamento,
      Valor_Base: Number(input.Valor_Base),
      Dias_Ferias_Gozadas: diasGozadas,
      Dias_Ferias_Vendidas: diasVendidas,
      Valor_Liquido: valorLiquido,
      Status: 'Pendente',
    })

    return record
  },

  /**
   * Update record status (e.g. mark as 'Pago').
   */
  async updateStatus(id: string, status: StatusPagamento): Promise<PagamentoRecord> {
    return pb.collection('pagamentos').update<PagamentoRecord>(id, {
      Status: status,
    })
  },

  /**
   * Delete a payment record by ID.
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('pagamentos').delete(id)
  },
}

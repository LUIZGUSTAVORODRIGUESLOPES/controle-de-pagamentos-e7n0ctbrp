export type TipoPagamento =
  | 'Mensalidade Padrão'
  | 'Férias'
  | 'Saldo de Salário (pós-férias)'
  | '13º Salário - 1ª Parcela'
  | '13º Salário - 2ª Parcela'
  | '13º Salário - Integral'

export type StatusPagamento = 'Pendente' | 'Pago'

import type { RecordModel } from 'pocketbase'

export interface PagamentoRecord extends RecordModel {
  user: string
  Mes_Ano: string
  Data_Pagamento: string
  Tipo_Pagamento: TipoPagamento
  Valor_Base: number
  Dias_Ferias_Gozadas: number
  Dias_Ferias_Vendidas: number
  Valor_Liquido: number
  Status: StatusPagamento
}

export interface PagamentoInput {
  Mes_Ano: string
  Data_Pagamento: string
  Tipo_Pagamento: TipoPagamento
  Valor_Base: number
  Dias_Ferias_Gozadas?: number
  Dias_Ferias_Vendidas?: number
}

export interface UserRecord {
  id: string
  email: string
  name: string
  role?: 'admin' | 'user' | string
  avatar?: string
  monthly_salary?: number
  created: string
  updated: string
}

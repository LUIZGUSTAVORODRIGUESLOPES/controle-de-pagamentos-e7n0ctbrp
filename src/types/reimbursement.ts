import type { RecordModel } from 'pocketbase'
import type { UserRecord } from './pagamento'

export type ReimbursementStatus = 'pending' | 'paid'
export type ReimbursementType = 'mensal' | 'anual'

export interface ReimbursementRecord extends RecordModel {
  user: string
  reference_period?: string
  reference_year?: number
  type?: ReimbursementType
  base_salary?: number
  includes_abono?: boolean
  dissidio_amount?: number
  total_amount: number
  status: ReimbursementStatus
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

export interface ReimbursementAnnualInput {
  user: string
  reference_year: number
  base_salary: number
  includes_abono: boolean
  dissidio_amount: number
}

export interface ReimbursementMonthlyInput {
  user: string
  reference_period: string // "YYYY-MM"
  base_salary?: number
  total_amount: number
}

export type ReimbursementInput = ReimbursementAnnualInput

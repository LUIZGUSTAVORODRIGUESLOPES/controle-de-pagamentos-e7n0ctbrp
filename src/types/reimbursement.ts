import type { RecordModel } from 'pocketbase'
import type { UserRecord } from './pagamento'

export type ReimbursementStatus = 'pending' | 'paid'

export interface ReimbursementRecord extends RecordModel {
  user: string
  reference_year: number
  base_salary: number
  includes_abono: boolean
  dissidio_amount: number
  total_amount: number
  status: ReimbursementStatus
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

export interface ReimbursementInput {
  user: string
  reference_year: number
  base_salary: number
  includes_abono: boolean
  dissidio_amount: number
}

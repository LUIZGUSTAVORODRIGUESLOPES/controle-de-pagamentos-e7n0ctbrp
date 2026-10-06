import type { RecordModel } from 'pocketbase'
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

export type ReimbursementStatus = 'pending' | 'partial' | 'paid'
export type ReimbursementType = 'mensal' | 'anual'

export interface ReimbursementRecord extends RecordModel {
  user: string
  reference_period?: string
  reference_year?: number
  type?: ReimbursementType
  base_salary?: number
  includes_terco?: boolean
  includes_abono?: boolean
  dissidio_amount?: number
  total_amount: number
  amount_paid?: number
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
  reference_period?: string
  base_salary: number
  includes_terco?: boolean
  includes_abono?: boolean
  dissidio_amount: number
  amount_paid?: number
}

export interface ReimbursementMonthlyInput {
  user: string
  reference_period: string // "YYYY-MM"
  base_salary?: number
  total_amount: number
  amount_paid?: number
}

export interface ReimbursementUpdateInput {
  user?: string
  reference_period?: string
  reference_year?: number
  type?: ReimbursementType
  base_salary?: number
  includes_terco?: boolean
  includes_abono?: boolean
  dissidio_amount?: number
  total_amount?: number
  amount_paid?: number
  status?: ReimbursementStatus
}

export type ReimbursementInput = ReimbursementAnnualInput

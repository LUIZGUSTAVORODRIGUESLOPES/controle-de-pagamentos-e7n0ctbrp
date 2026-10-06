import pb from '@/lib/pocketbase/client'
import type {
  ReimbursementRecord,
  ReimbursementAnnualInput,
  ReimbursementMonthlyInput,
  ReimbursementStatus,
} from '@/types/reimbursement'
import type { UserRecord } from '@/types/pagamento'
import { calculateReimbursement } from '@/lib/reimbursement'

export const reimbursementsService = {
  /**
   * List all reimbursements sorted by created descending.
   * Expands the user relation to show executive name/email.
   */
  async list(): Promise<ReimbursementRecord[]> {
    return pb.collection('reimbursements').getFullList<ReimbursementRecord>({
      sort: '-created',
      expand: 'user',
      requestKey: null,
    })
  },

  /**
   * List available users for executive selection.
   * Admin permission allows reading users collection.
   */
  async listUsers(): Promise<UserRecord[]> {
    return pb.collection('users').getFullList<UserRecord>({
      sort: 'name,email',
      requestKey: null,
    })
  },

  /**
   * Get fresh data for a specific user.
   */
  async getUser(id: string): Promise<UserRecord> {
    return pb.collection('users').getOne<UserRecord>(id, {
      requestKey: null,
    })
  },

  /**
   * Update a user's monthly salary (admin action).
   */
  async updateUserSalary(userId: string, monthlySalary: number): Promise<UserRecord> {
    return pb.collection('users').update<UserRecord>(userId, {
      monthly_salary: monthlySalary,
    })
  },

  /**
   * Check if there is already a pending monthly reimbursement for a user and period.
   */
  async hasPendingMonthlyForPeriod(userId: string, period: string): Promise<boolean> {
    try {
      const records = await pb.collection('reimbursements').getList<ReimbursementRecord>(1, 1, {
        filter: `user = "${userId}" && type = "mensal" && status = "pending" && reference_period = "${period}"`,
        requestKey: null,
      })
      return records.totalItems > 0
    } catch {
      return false
    }
  },

  /**
   * Create a monthly reimbursement with type = 'mensal', status = 'pending'.
   */
  async createMonthly(input: ReimbursementMonthlyInput): Promise<ReimbursementRecord> {
    const totalAmount = Math.round((Number(input.total_amount) + Number.EPSILON) * 100) / 100
    const baseSalary = Number(input.base_salary) || totalAmount

    const record = await pb.collection('reimbursements').create<ReimbursementRecord>(
      {
        user: input.user,
        reference_period: input.reference_period,
        type: 'mensal',
        base_salary: baseSalary,
        includes_abono: false,
        dissidio_amount: 0,
        total_amount: totalAmount,
        status: 'pending',
      },
      {
        expand: 'user',
      },
    )

    return record
  },

  /**
   * Create a new annual reimbursement with total calculated using exact rules.
   * Default status is 'pending', type is 'anual'.
   */
  async createAnnual(input: ReimbursementAnnualInput): Promise<ReimbursementRecord> {
    const breakdown = calculateReimbursement({
      baseSalary: Number(input.base_salary) || 0,
      includesAbono: Boolean(input.includes_abono),
      dissidioAmount: Number(input.dissidio_amount) || 0,
    })

    const year = Number(input.reference_year)

    const record = await pb.collection('reimbursements').create<ReimbursementRecord>(
      {
        user: input.user,
        reference_year: year,
        reference_period: String(year),
        type: 'anual',
        base_salary: Number(input.base_salary),
        includes_abono: Boolean(input.includes_abono),
        dissidio_amount: Math.abs(Number(input.dissidio_amount) || 0),
        total_amount: breakdown.totalAmount,
        status: 'pending',
      },
      {
        expand: 'user',
      },
    )

    return record
  },

  /**
   * Backward-compatibility alias for createAnnual
   */
  async create(input: ReimbursementAnnualInput): Promise<ReimbursementRecord> {
    return this.createAnnual(input)
  },

  /**
   * Update reimbursement total_amount (e.g. from modal edit).
   */
  async updateTotalAmount(id: string, totalAmount: number): Promise<ReimbursementRecord> {
    return pb.collection('reimbursements').update<ReimbursementRecord>(
      id,
      {
        total_amount: Math.round((Number(totalAmount) + Number.EPSILON) * 100) / 100,
      },
      { expand: 'user' },
    )
  },

  /**
   * Update reimbursement status (e.g. 'paid').
   */
  async updateStatus(id: string, status: ReimbursementStatus): Promise<ReimbursementRecord> {
    return pb
      .collection('reimbursements')
      .update<ReimbursementRecord>(id, { status }, { expand: 'user' })
  },

  /**
   * Delete reimbursement.
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('reimbursements').delete(id)
  },
}

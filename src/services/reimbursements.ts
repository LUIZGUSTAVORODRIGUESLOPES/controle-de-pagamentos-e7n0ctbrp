import pb from '@/lib/pocketbase/client'
import type {
  ReimbursementRecord,
  ReimbursementAnnualInput,
  ReimbursementMonthlyInput,
  ReimbursementUpdateInput,
  ReimbursementStatus,
} from '@/types/reimbursement'
import type { UserRecord } from '@/types/reimbursement'
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
   * Check if there is already a non-paid (pending or partial) monthly reimbursement for a user and period.
   */
  async hasPendingMonthlyForPeriod(userId: string, period: string): Promise<boolean> {
    try {
      const records = await pb.collection('reimbursements').getList<ReimbursementRecord>(1, 1, {
        filter: `user = "${userId}" && type = "mensal" && (status = "pending" || status = "partial") && reference_period = "${period}"`,
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
    const amountPaid = Math.round((Number(input.amount_paid || 0) + Number.EPSILON) * 100) / 100

    let status: ReimbursementStatus = 'pending'
    if (amountPaid >= totalAmount && totalAmount > 0) {
      status = 'paid'
    } else if (amountPaid > 0) {
      status = 'partial'
    }

    const record = await pb.collection('reimbursements').create<ReimbursementRecord>(
      {
        user: input.user,
        reference_period: input.reference_period,
        type: 'mensal',
        base_salary: baseSalary,
        includes_abono: false,
        dissidio_amount: 0,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        status,
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
    const temAbono = Boolean(input.tem_abono ?? input.includes_abono)
    const vacationDays =
      input.vacation_days !== undefined
        ? Math.max(0, Math.min(30, Number(input.vacation_days) || 0))
        : 30

    const breakdown = calculateReimbursement({
      baseSalary: Number(input.base_salary) || 0,
      vacationDays,
      temAbono,
      includesAbono: temAbono,
      includesTerco: input.includes_terco !== undefined ? Boolean(input.includes_terco) : true,
      dissidioAmount: Number(input.dissidio_amount) || 0,
    })

    const year = Number(input.reference_year)
    const period = input.reference_period?.trim() || String(year)
    const amountPaid = Math.round((Number(input.amount_paid || 0) + Number.EPSILON) * 100) / 100

    let status: ReimbursementStatus = 'pending'
    if (amountPaid >= breakdown.totalAmount && breakdown.totalAmount > 0) {
      status = 'paid'
    } else if (amountPaid > 0) {
      status = 'partial'
    }

    const record = await pb.collection('reimbursements').create<ReimbursementRecord>(
      {
        user: input.user,
        reference_year: year,
        reference_period: period,
        type: 'anual',
        base_salary: Number(input.base_salary),
        includes_terco: input.includes_terco !== undefined ? Boolean(input.includes_terco) : true,
        includes_abono: temAbono,
        vacation_days: vacationDays,
        dissidio_amount: Math.abs(Number(input.dissidio_amount) || 0),
        total_amount: breakdown.totalAmount,
        amount_paid: amountPaid,
        status,
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
   * Update reimbursement status (e.g. 'paid', 'partial', 'pending').
   */
  async updateStatus(
    id: string,
    status: ReimbursementStatus,
    amountPaid?: number,
  ): Promise<ReimbursementRecord> {
    const payload: Partial<ReimbursementRecord> = { status }
    if (amountPaid !== undefined) {
      payload.amount_paid = Math.round((Number(amountPaid) + Number.EPSILON) * 100) / 100
    }
    return pb
      .collection('reimbursements')
      .update<ReimbursementRecord>(id, payload, { expand: 'user' })
  },

  /**
   * Register a payment for a reimbursement:
   * Adds paymentValue to existing amount_paid (or sets it if mode is 'set'),
   * automatically recalculating the status:
   * - 'paid' if amount_paid >= total_amount
   * - 'partial' if amount_paid > 0 and < total_amount
   * - 'pending' if amount_paid <= 0
   */
  async registerPayment(
    reimbursement: ReimbursementRecord,
    paymentValueToAdd: number,
  ): Promise<ReimbursementRecord> {
    const currentPaid = Number(reimbursement.amount_paid || 0)
    const newAmountPaid =
      Math.round((currentPaid + Number(paymentValueToAdd) + Number.EPSILON) * 100) / 100
    const totalAmount = Number(reimbursement.total_amount || 0)

    let newStatus: ReimbursementStatus = 'pending'
    if (newAmountPaid >= totalAmount - 0.001) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0.001) {
      newStatus = 'partial'
    } else {
      newStatus = 'pending'
    }

    return pb.collection('reimbursements').update<ReimbursementRecord>(
      reimbursement.id,
      {
        amount_paid: Math.max(0, newAmountPaid),
        status: newStatus,
      },
      { expand: 'user' },
    )
  },

  /**
   * Update full reimbursement record.
   */
  async update(id: string, input: ReimbursementUpdateInput): Promise<ReimbursementRecord> {
    const payload: Partial<ReimbursementRecord> = {}
    if (input.user !== undefined) payload.user = input.user
    if (input.reference_period !== undefined) payload.reference_period = input.reference_period
    if (input.reference_year !== undefined) payload.reference_year = input.reference_year
    if (input.type !== undefined) payload.type = input.type
    if (input.base_salary !== undefined) {
      payload.base_salary = Math.round((Number(input.base_salary) + Number.EPSILON) * 100) / 100
    }
    if (input.includes_terco !== undefined) payload.includes_terco = Boolean(input.includes_terco)
    if (input.includes_abono !== undefined) {
      payload.includes_abono = Boolean(input.includes_abono)
    } else if (input.tem_abono !== undefined) {
      payload.includes_abono = Boolean(input.tem_abono)
    }
    if (input.vacation_days !== undefined) {
      payload.vacation_days = Math.max(
        0,
        Math.min(30, Math.round(Number(input.vacation_days) || 0)),
      )
    }
    if (input.dissidio_amount !== undefined) {
      payload.dissidio_amount =
        Math.round((Number(input.dissidio_amount) + Number.EPSILON) * 100) / 100
    }
    if (input.total_amount !== undefined) {
      payload.total_amount = Math.round((Number(input.total_amount) + Number.EPSILON) * 100) / 100
    }
    if (input.amount_paid !== undefined) {
      payload.amount_paid = Math.round((Number(input.amount_paid) + Number.EPSILON) * 100) / 100
    }
    if (input.status !== undefined) {
      payload.status = input.status
    }

    return pb.collection('reimbursements').update<ReimbursementRecord>(id, payload, {
      expand: 'user',
    })
  },

  /**
   * Delete reimbursement.
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('reimbursements').delete(id)
  },
}

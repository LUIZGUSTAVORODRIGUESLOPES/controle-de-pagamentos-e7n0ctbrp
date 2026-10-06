import pb from '@/lib/pocketbase/client'
import type {
  ReimbursementRecord,
  ReimbursementInput,
  ReimbursementStatus,
} from '@/types/reimbursement'
import type { UserRecord } from '@/types/pagamento'
import { calculateReimbursement } from '@/lib/reimbursement'

export const reimbursementsService = {
  /**
   * List all reimbursements sorted by reference_year descending, then created descending.
   * Expands the user relation to show executive name/email.
   */
  async list(): Promise<ReimbursementRecord[]> {
    return pb.collection('reimbursements').getFullList<ReimbursementRecord>({
      sort: '-reference_year,-created',
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
   * Create a new reimbursement with total calculated using exact rules.
   * Default status is 'pending'.
   */
  async create(input: ReimbursementInput): Promise<ReimbursementRecord> {
    const breakdown = calculateReimbursement({
      baseSalary: Number(input.base_salary) || 0,
      includesAbono: Boolean(input.includes_abono),
      dissidioAmount: Number(input.dissidio_amount) || 0,
    })

    const record = await pb.collection('reimbursements').create<ReimbursementRecord>(
      {
        user: input.user,
        reference_year: Number(input.reference_year),
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

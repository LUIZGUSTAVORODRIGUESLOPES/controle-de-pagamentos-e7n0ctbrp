import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pencil,
  Loader2,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
  Calculator,
} from 'lucide-react'
import { formatBRL, calculateReimbursement } from '@/lib/reimbursement'
import { formatPeriodDisplay } from '@/lib/reimbursementExport'
import type {
  ReimbursementRecord,
  ReimbursementStatus,
  ReimbursementType,
  ReimbursementUpdateInput,
} from '@/types/reimbursement'
import type { UserRecord } from '@/types/pagamento'

interface EditReimbursementModalProps {
  record: ReimbursementRecord | null
  users: UserRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updated: ReimbursementUpdateInput) => Promise<void>
}

export function EditReimbursementModal({
  record,
  users,
  open,
  onOpenChange,
  onSave,
}: EditReimbursementModalProps) {
  // Form fields
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [type, setType] = useState<ReimbursementType>('mensal')
  const [referencePeriod, setReferencePeriod] = useState<string>('')
  const [referenceYear, setReferenceYear] = useState<string>('')
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>('')
  const [includesAbono, setIncludesAbono] = useState<boolean>(false)
  const [dissidioInput, setDissidioInput] = useState<string>('')
  const [totalAmountInput, setTotalAmountInput] = useState<string>('')
  const [amountPaidInput, setAmountPaidInput] = useState<string>('')
  const [status, setStatus] = useState<ReimbursementStatus>('pending')
  const [autoStatus, setAutoStatus] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Populate form when modal opens or record changes
  useEffect(() => {
    if (record) {
      setSelectedUser(record.user || '')
      setType(record.type || 'mensal')
      setReferencePeriod(record.reference_period || '')
      setReferenceYear(
        record.reference_year
          ? String(record.reference_year)
          : record.reference_period
            ? record.reference_period.split('-')[0]
            : '2026',
      )
      setBaseSalaryInput(
        record.base_salary !== undefined
          ? record.base_salary.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
      )
      setIncludesAbono(Boolean(record.includes_abono))
      setDissidioInput(
        record.dissidio_amount !== undefined
          ? record.dissidio_amount.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0,00',
      )
      setTotalAmountInput(
        record.total_amount !== undefined
          ? record.total_amount.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0,00',
      )
      setAmountPaidInput(
        record.amount_paid !== undefined
          ? record.amount_paid.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0,00',
      )
      setStatus(record.status || 'pending')
      setAutoStatus(true)
      setFormError(null)
    }
  }, [record, open])

  // Parse helper for Brazilian currency format
  const parseCurrency = (val: string): number => {
    if (!val) return 0
    const normalized = val.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }

  const numericBaseSalary = useMemo(() => parseCurrency(baseSalaryInput), [baseSalaryInput])
  const numericDissidio = useMemo(() => parseCurrency(dissidioInput), [dissidioInput])
  const numericTotal = useMemo(() => parseCurrency(totalAmountInput), [totalAmountInput])
  const numericPaid = useMemo(() => parseCurrency(amountPaidInput), [amountPaidInput])

  // Recalculate status automatically based on amount_paid vs total_amount
  // Regra registerPayment: quitado -> paid, parcial -> partial (> 0 e < total), zero -> pending
  const computedStatus = useMemo((): ReimbursementStatus => {
    if (numericTotal > 0 && numericPaid >= numericTotal - 0.001) {
      return 'paid'
    } else if (numericPaid > 0.001) {
      return 'partial'
    }
    return 'pending'
  }, [numericTotal, numericPaid])

  // Update status when autoStatus is true and computedStatus changes
  useEffect(() => {
    if (autoStatus) {
      setStatus(computedStatus)
    }
  }, [autoStatus, computedStatus])

  // Quick recalculate total using Annual Formula
  const handleRecalculateAnnual = () => {
    const breakdown = calculateReimbursement({
      baseSalary: numericBaseSalary,
      includesAbono,
      dissidioAmount: numericDissidio,
    })
    setTotalAmountInput(
      breakdown.totalAmount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }

  // Quick set amount_paid to total_amount (quitar total)
  const handleSetPaidInFull = () => {
    setAmountPaidInput(
      numericTotal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }

  // Quick set amount_paid to zero (estornar)
  const handleSetUnpaid = () => {
    setAmountPaidInput('0,00')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!record) return
    setFormError(null)

    if (numericTotal < 0) {
      setFormError('O valor total não pode ser negativo.')
      return
    }

    if (numericPaid < 0) {
      setFormError('O valor pago não pode ser negativo.')
      return
    }

    const yearVal = parseInt(referenceYear, 10)
    const finalYear = isNaN(yearVal) ? undefined : yearVal
    const finalPeriod = referencePeriod.trim() || (finalYear ? String(finalYear) : undefined)

    const payload: ReimbursementUpdateInput = {
      user: selectedUser || undefined,
      type,
      reference_period: finalPeriod,
      reference_year: finalYear,
      base_salary: numericBaseSalary,
      includes_abono: type === 'anual' ? includesAbono : false,
      dissidio_amount: numericDissidio,
      total_amount: numericTotal,
      amount_paid: numericPaid,
      status,
    }

    try {
      setIsSaving(true)
      await onSave(record.id, payload)
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      setFormError(err?.message || 'Erro ao atualizar o lançamento. Verifique os campos.')
    } finally {
      setIsSaving(false)
    }
  }

  const saldoRestante = Math.max(0, numericTotal - numericPaid)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Editar Lançamento de Reembolso
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Altere os valores, competência, tipo ou status do lançamento.{' '}
                {record && (
                  <span className="font-semibold text-slate-700">
                    (
                    {formatPeriodDisplay(
                      record.reference_period,
                      record.reference_year,
                      record.type,
                    )}
                    )
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Linha 1: Executivo e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editUser" className="text-xs font-semibold text-slate-700">
                Executivo / Beneficiário <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={isSaving}>
                <SelectTrigger id="editUser" className="text-xs">
                  <SelectValue placeholder="Selecione o executivo..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name || u.email} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editType" className="text-xs font-semibold text-slate-700">
                Tipo de Lançamento <span className="text-red-500">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as ReimbursementType)}
                disabled={isSaving}
              >
                <SelectTrigger id="editType" className="text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal" className="text-xs">
                    Mensal (Lançamento Regular)
                  </SelectItem>
                  <SelectItem value="anual" className="text-xs">
                    Anual (Acerto / Dissídio / 13º / Férias)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Competência (Período / Ano) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="editPeriod"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>Período de Competência (reference_period)</span>
                <span className="text-[10px] text-slate-400">Ex: 2026-10 ou 2026</span>
              </Label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="editPeriod"
                  type="text"
                  value={referencePeriod}
                  onChange={(e) => setReferencePeriod(e.target.value)}
                  placeholder="2026-10"
                  className="pl-8 text-xs font-medium text-slate-900"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="editYear"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>Ano de Referência (reference_year)</span>
                <span className="text-[10px] text-slate-400">Ex: 2026</span>
              </Label>
              <Input
                id="editYear"
                type="number"
                min={2000}
                max={2100}
                value={referenceYear}
                onChange={(e) => setReferenceYear(e.target.value)}
                placeholder="2026"
                className="text-xs font-medium tabular-nums text-slate-900"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Linha 3: Salário Base e Dissídio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editBaseSalary" className="text-xs font-semibold text-slate-700">
                Salário Base (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  R$
                </span>
                <Input
                  id="editBaseSalary"
                  type="text"
                  value={baseSalaryInput}
                  onChange={(e) => setBaseSalaryInput(e.target.value)}
                  placeholder="15000,00"
                  className="pl-9 text-xs font-medium tabular-nums text-slate-900"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editDissidio" className="text-xs font-semibold text-slate-700">
                Retroativo de Dissídio (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  R$
                </span>
                <Input
                  id="editDissidio"
                  type="text"
                  value={dissidioInput}
                  onChange={(e) => setDissidioInput(e.target.value)}
                  placeholder="0,00"
                  className="pl-9 text-xs font-medium tabular-nums text-slate-900"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Campo condicional: Inclui Abono (para anual) */}
          {type === 'anual' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between">
              <label
                htmlFor="editIncludesAbono"
                className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800"
              >
                <Checkbox
                  id="editIncludesAbono"
                  checked={includesAbono}
                  onCheckedChange={(checked) => setIncludesAbono(Boolean(checked))}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span>Incluir Abono de Férias (10 dias = base_salary / 3)</span>
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRecalculateAnnual}
                disabled={isSaving || numericBaseSalary <= 0}
                className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                title="Recalcular o Valor Total pela fórmula oficial de Acerto Anual"
              >
                <Calculator className="w-3 h-3 mr-1" />
                Recalcular Total
              </Button>
            </div>
          )}

          {/* Linha 4: Valor Total e Valor Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="editTotalAmount"
                className="text-xs font-semibold text-slate-900 flex items-center justify-between"
              >
                <span>
                  Valor Total do Lançamento (R$) <span className="text-red-500">*</span>
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  R$
                </span>
                <Input
                  id="editTotalAmount"
                  type="text"
                  value={totalAmountInput}
                  onChange={(e) => setTotalAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="pl-9 text-sm font-bold tabular-nums text-slate-900 border-slate-300"
                  disabled={isSaving}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="editAmountPaid" className="text-xs font-semibold text-emerald-800">
                  Valor Pago / Quitado (R$)
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSetPaidInFull}
                    disabled={isSaving || numericTotal <= 0}
                    className="text-[10px] font-semibold text-emerald-700 hover:underline"
                  >
                    Quitar Tudo
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleSetUnpaid}
                    disabled={isSaving}
                    className="text-[10px] text-slate-500 hover:underline"
                  >
                    Zerar
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  R$
                </span>
                <Input
                  id="editAmountPaid"
                  type="text"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  placeholder="0,00"
                  className="pl-9 text-sm font-bold tabular-nums text-emerald-800 border-slate-300"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Linha 5: Saldo e Status com Recálculo Automático */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <div className="text-xs">
                <span className="text-slate-500">Saldo a Receber / Devedor: </span>
                <strong
                  className={`tabular-nums font-bold ${
                    saldoRestante > 0.001 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {formatBRL(saldoRestante)}
                </strong>
              </div>

              {/* Toggle de Recálculo Automático de Status */}
              <label
                htmlFor="toggleAutoStatus"
                className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none"
              >
                <Checkbox
                  id="toggleAutoStatus"
                  checked={autoStatus}
                  onCheckedChange={(checked) => setAutoStatus(Boolean(checked))}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span className="flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Recalcular status automaticamente pelo valor pago
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <Label htmlFor="editStatus" className="text-xs font-semibold text-slate-700">
                  Status do Lançamento
                </Label>
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val as ReimbursementStatus)
                    setAutoStatus(false)
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger id="editStatus" className="text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="text-xs">
                      Pendente (Aguardando Pagamento)
                    </SelectItem>
                    <SelectItem value="partial" className="text-xs">
                      Pagamento Parcial (Saldo Devedor Restante)
                    </SelectItem>
                    <SelectItem value="paid" className="text-xs">
                      Pago (Quitado Integralmente)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-4">
                <span className="text-xs text-slate-500">Status resultante:</span>
                {status === 'paid' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                    Pago
                  </Badge>
                ) : status === 'partial' ? (
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Parcial</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                    Pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando Alterações...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

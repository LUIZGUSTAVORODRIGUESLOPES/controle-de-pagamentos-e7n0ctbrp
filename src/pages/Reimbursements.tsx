import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Calculator,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
  AlertCircle,
} from 'lucide-react'
import { reimbursementsService } from '@/services/reimbursements'
import { calculateReimbursement, formatBRL } from '@/lib/reimbursement'
import { formatDatePtBR } from '@/lib/calculator'
import { useToast } from '@/hooks/use-toast'
import type { ReimbursementRecord } from '@/types/reimbursement'
import type { UserRecord } from '@/types/pagamento'

export default function Reimbursements() {
  const { toast } = useToast()

  // Data states
  const [reimbursements, setReimbursements] = useState<ReimbursementRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Form states
  const currentYear = new Date().getFullYear()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [referenceYear, setReferenceYear] = useState<string>(String(currentYear))
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>('15000,00')
  const [includesAbono, setIncludesAbono] = useState<boolean>(false)
  const [dissidioInput, setDissidioInput] = useState<string>('0,00')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Actions states
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<ReimbursementRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [receiptRecord, setReceiptRecord] = useState<ReimbursementRecord | null>(null)

  // Load initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [listData, usersData] = await Promise.all([
        reimbursementsService.list(),
        reimbursementsService.listUsers(),
      ])
      setReimbursements(listData)
      setUsers(usersData)
      if (!selectedUserId && usersData.length > 0) {
        setSelectedUserId(usersData[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err?.message || 'Não foi possível carregar a lista de reembolsos.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedUserId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Parse numeric values
  const numericBaseSalary = useMemo(() => {
    if (!baseSalaryInput) return 0
    const normalized = baseSalaryInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }, [baseSalaryInput])

  const numericDissidio = useMemo(() => {
    if (!dissidioInput) return 0
    const normalized = dissidioInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : Math.abs(parsed)
  }, [dissidioInput])

  // Dynamic preview calculation
  const breakdown = useMemo(() => {
    return calculateReimbursement({
      baseSalary: numericBaseSalary,
      includesAbono,
      dissidioAmount: numericDissidio,
    })
  }, [numericBaseSalary, includesAbono, numericDissidio])

  // Summary statistics
  const stats = useMemo(() => {
    let totalPago = 0
    let totalPendente = 0
    const count = reimbursements.length

    for (const r of reimbursements) {
      if (r.status === 'paid') {
        totalPago += r.total_amount
      } else {
        totalPendente += r.total_amount
      }
    }

    return {
      totalPago,
      totalPendente,
      count,
    }
  }, [reimbursements])

  // Filtered reimbursements by executive name/email or year
  const filteredReimbursements = useMemo(() => {
    if (!searchTerm.trim()) return reimbursements
    const term = searchTerm.trim().toLowerCase()
    return reimbursements.filter((r) => {
      const userName = r.expand?.user?.name?.toLowerCase() || ''
      const userEmail = r.expand?.user?.email?.toLowerCase() || ''
      const yearStr = String(r.reference_year)
      return userName.includes(term) || userEmail.includes(term) || yearStr.includes(term)
    })
  }, [reimbursements, searchTerm])

  // Handle Form Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedUserId) {
      setFormError('Selecione o Executivo / Usuário.')
      return
    }

    const yearNum = parseInt(referenceYear, 10)
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      setFormError('Informe um ano de referência válido (ex.: 2024).')
      return
    }

    if (numericBaseSalary <= 0) {
      setFormError('Informe um Salário Base válido maior que zero.')
      return
    }

    try {
      setIsSubmitting(true)
      await reimbursementsService.create({
        user: selectedUserId,
        reference_year: yearNum,
        base_salary: numericBaseSalary,
        includes_abono: includesAbono,
        dissidio_amount: numericDissidio,
      })

      toast({
        title: 'Reembolso cadastrado!',
        description: `Reembolso do ano ${yearNum} criado com status Pendente.`,
      })

      // Reset form
      setBaseSalaryInput('15000,00')
      setIncludesAbono(false)
      setDissidioInput('0,00')
      fetchData()
    } catch (err: any) {
      console.error(err)
      setFormError(
        err?.message || 'Erro ao registrar reembolso. Verifique os dados e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Mark as Paid
  const handleMarkAsPaid = async (item: ReimbursementRecord) => {
    try {
      setUpdatingId(item.id)
      await reimbursementsService.updateStatus(item.id, 'paid')
      toast({
        title: 'Status atualizado!',
        description: `Reembolso de ${item.expand?.user?.name || 'Executivo'} (${item.reference_year}) marcado como Pago.`,
      })
      fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err?.message || 'Não foi possível marcar como Pago.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return
    try {
      setIsDeleting(true)
      await reimbursementsService.delete(recordToDelete.id)
      toast({
        title: 'Reembolso excluído',
        description: 'O registro foi removido com sucesso.',
      })
      setRecordToDelete(null)
      fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir o reembolso.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Print Receipt
  const handlePrintReceipt = (item: ReimbursementRecord) => {
    setReceiptRecord(item)
    // Small timeout to allow DOM render before opening print dialog
    setTimeout(() => {
      window.print()
    }, 250)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Reembolso Anual Executivo
              </h2>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs px-2 py-0.5">
                Exclusivo Admin
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gestão e apuração anual de reembolsos com 13º salário, 1/3 de férias, abono e
              dissídio.
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form (5 cols) */}
          <div className="lg:col-span-5 w-full">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Novo Reembolso Anual
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Preencha os parâmetros para calcular e registrar o reembolso executivo.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <form onSubmit={handleCreate} className="space-y-4">
                  {formError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. Seleção do Usuário Executivo */}
                  <div className="space-y-1.5">
                    <Label htmlFor="userSelect" className="text-xs font-semibold text-slate-700">
                      Executivo / Usuário <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                      disabled={isSubmitting || users.length === 0}
                    >
                      <SelectTrigger id="userSelect" className="text-slate-800">
                        <SelectValue placeholder="Selecione o executivo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="font-medium">{u.name || u.email}</span>{' '}
                            <span className="text-slate-400 text-xs">({u.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Ano de Referência */}
                  <div className="space-y-1.5">
                    <Label htmlFor="referenceYear" className="text-xs font-semibold text-slate-700">
                      Ano de Referência <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="referenceYear"
                      type="number"
                      min={2000}
                      max={2100}
                      value={referenceYear}
                      onChange={(e) => setReferenceYear(e.target.value)}
                      placeholder="2024"
                      className="tabular-nums text-slate-800"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-slate-400">Ex.: 2024 ou 2025</p>
                  </div>

                  {/* 3. Salário Base */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="baseSalary"
                      className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                    >
                      <span>
                        Salário Base (R$) <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Ex.: 15.000,00</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        R$
                      </span>
                      <Input
                        id="baseSalary"
                        type="text"
                        value={baseSalaryInput}
                        onChange={(e) => setBaseSalaryInput(e.target.value)}
                        placeholder="15000,00"
                        className="pl-9 font-medium tabular-nums text-slate-800"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* 4. Checkbox Incluir Abono Pecuniário (10 dias) */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
                    <label
                      htmlFor="includesAbono"
                      className="flex items-start gap-3 cursor-pointer select-none"
                    >
                      <Checkbox
                        id="includesAbono"
                        checked={includesAbono}
                        onCheckedChange={(checked) => setIncludesAbono(Boolean(checked))}
                        disabled={isSubmitting}
                        className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-800 block">
                          Incluir Abono Pecuniário (10 dias)
                        </span>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Adiciona 1/3 do salário base correspondente à venda de 10 dias de férias.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* 5. Input Numérico Retroativo de Dissídio */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="dissidio"
                      className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                    >
                      <span>Retroativo de Dissídio (R$)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Opcional</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        R$
                      </span>
                      <Input
                        id="dissidio"
                        type="text"
                        value={dissidioInput}
                        onChange={(e) => setDissidioInput(e.target.value)}
                        placeholder="0,00"
                        className="pl-9 font-medium tabular-nums text-slate-800"
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Diferenças salariais ou retroativos aprovados em dissídio coletivo.
                    </p>
                  </div>

                  {/* Dynamic Preview */}
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-teal-50/60 border border-emerald-200/90 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Prévia do Cálculo</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-emerald-300 text-emerald-800 bg-white/70 text-[10px]"
                      >
                        Ano {referenceYear || currentYear}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between border-b border-emerald-200/60 pb-2">
                      <span className="text-xs text-slate-600 font-medium">Total Calculado:</span>
                      <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                        {formatBRL(breakdown.totalAmount)}
                      </span>
                    </div>

                    {/* Breakdown */}
                    <div className="text-[11px] text-slate-600 space-y-1 pt-0.5">
                      <div className="flex justify-between">
                        <span>13º Salário (Salário Base Integral):</span>
                        <span className="font-medium text-slate-800 tabular-nums">
                          {formatBRL(breakdown.decimoTerceiro)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>1/3 Constitucional de Férias (Base / 3):</span>
                        <span className="font-medium text-slate-800 tabular-nums">
                          {formatBRL(breakdown.tercoFerias)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-700 font-medium border-t border-emerald-200/40 pt-1">
                        <span>= Subtotal Fixo Anual:</span>
                        <span className="tabular-nums">{formatBRL(breakdown.fixoAnual)}</span>
                      </div>

                      {includesAbono && (
                        <div className="flex justify-between text-emerald-800 font-medium">
                          <span>+ Abono Pecuniário (Base / 3):</span>
                          <span className="tabular-nums">{formatBRL(breakdown.abonoAmount)}</span>
                        </div>
                      )}

                      {numericDissidio > 0 && (
                        <div className="flex justify-between text-emerald-800 font-medium">
                          <span>+ Retroativo de Dissídio:</span>
                          <span className="tabular-nums">
                            {formatBRL(breakdown.dissidioAmount)}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500 italic pt-1">
                        Registro será salvo com status inicial <strong>Pendente</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 shadow-sm active:scale-[0.98] transition-transform"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gravando Reembolso...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-1.5" />
                        Gravar Reembolso
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Listing Table & History (7 cols) */}
          <div className="lg:col-span-7 w-full">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Histórico de Reembolsos Executivos
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {stats.count === 1
                        ? '1 reembolso registrado'
                        : `${stats.count} reembolsos registrados`}
                    </CardDescription>
                  </div>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-3 gap-2.5 pt-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Total Pago</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 mt-1 tabular-nums truncate">
                      {formatBRL(stats.totalPago)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 sm:p-3 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Total Pendente</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-amber-700 mt-1 tabular-nums truncate">
                      {formatBRL(stats.totalPendente)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 sm:p-3 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Lançamentos</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-slate-800 mt-1 tabular-nums">
                      {stats.count}
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por executivo ou ano..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 p-4 sm:p-6">
                {isLoading && reimbursements.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-xs text-slate-500">Carregando reembolsos...</p>
                  </div>
                ) : filteredReimbursements.length === 0 ? (
                  <div className="py-14 px-4 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-800">
                      {searchTerm
                        ? 'Nenhum reembolso com este filtro'
                        : 'Nenhum reembolso registrado ainda'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      {searchTerm
                        ? 'Verifique o nome do executivo ou ano pesquisado.'
                        : 'Use o formulário ao lado para cadastrar o primeiro reembolso executivo.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReimbursements.map((r) => {
                      const isPaid = r.status === 'paid'
                      const isUpdating = updatingId === r.id
                      const execName = r.expand?.user?.name || 'Executivo'
                      const execEmail = r.expand?.user?.email || ''

                      return (
                        <div
                          key={r.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                        >
                          {/* Left: Executivo, Ano, Detalhes */}
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-base">
                                Ano {r.reference_year}
                              </span>
                              {r.includes_abono && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 px-1.5 py-0"
                                >
                                  + Abono 10d
                                </Badge>
                              )}
                              {r.dissidio_amount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 px-1.5 py-0"
                                >
                                  + Dissídio
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>{execName}</span>
                              {execEmail && (
                                <span className="text-slate-400 font-normal">({execEmail})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                              <span>Base: {formatBRL(r.base_salary)}</span>
                              {r.dissidio_amount > 0 && (
                                <span>• Dissídio: {formatBRL(r.dissidio_amount)}</span>
                              )}
                            </div>
                          </div>

                          {/* Middle: Valor Total */}
                          <div className="flex items-baseline md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                            <span className="text-[11px] text-slate-400 md:hidden">
                              Total Reembolso:
                            </span>
                            <div className="text-right">
                              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                                {formatBRL(r.total_amount)}
                              </span>
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                Emissão: {formatDatePtBR(r.created)}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status badge & Actions */}
                          <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                            <div>
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Pago
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pendente
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Alterar status para 'Pago' (when still pending) */}
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsPaid(r)}
                                  disabled={isUpdating}
                                  title="Marcar como Pago"
                                  className="h-8 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                      <span className="hidden sm:inline">Marcar como </span>Pago
                                    </>
                                  )}
                                </Button>
                              )}

                              {/* Botão Exportar PDF / Recibo formal para o Financeiro */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintReceipt(r)}
                                title="Exportar recibo PDF para o Financeiro"
                                className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                <span>Recibo PDF</span>
                              </Button>

                              {/* Excluir (lixeira) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setRecordToDelete(r)}
                                title="Excluir reembolso"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Deletion */}
      <Dialog
        open={!!recordToDelete}
        onOpenChange={(open) => {
          if (!open) setRecordToDelete(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle>Excluir este reembolso?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              Esta ação não pode ser desfeita. O reembolso referente ao ano{' '}
              <strong>{recordToDelete?.reference_year}</strong> para{' '}
              <strong>{recordToDelete?.expand?.user?.name || 'Executivo'}</strong> (
              {recordToDelete ? formatBRL(recordToDelete.total_amount) : ''}) será excluído
              permanentemente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="outline" onClick={() => setRecordToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Modal / Print view for Financial department */}
      {receiptRecord && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[99999] text-slate-900 font-sans">
          <div className="max-w-[760px] mx-auto border border-slate-300 rounded-xl p-8 space-y-6 bg-white">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  RECIBO FORMAL DE REEMBOLSO ANUAL EXECUTIVO
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Documento comprobatório para Departamento Financeiro / Contabilidade
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border border-slate-300 bg-slate-50">
                  Ano Referência: {receiptRecord.reference_year}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Beneficiário */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Beneficiário / Executivo:</span>
                <span className="text-slate-900 font-bold text-sm">
                  {receiptRecord.expand?.user?.name || 'Executivo'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">E-mail:</span>
                <span className="text-slate-800 font-semibold">
                  {receiptRecord.expand?.user?.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Status do Pagamento:</span>
                <span className="text-slate-900 font-bold uppercase">
                  {receiptRecord.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Código do Registro:</span>
                <span className="text-slate-700 font-mono text-[11px]">{receiptRecord.id}</span>
              </div>
            </div>

            {/* Composição do Cálculo */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Demonstrativo de Composição e Apuração
              </h3>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2.5">Rubrica / Parcela</th>
                    <th className="text-left p-2.5">Fórmula de Apuração</th>
                    <th className="text-right p-2.5">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Salário Base Mensal</td>
                    <td className="p-2.5 text-slate-500">Valor de referência contratual</td>
                    <td className="p-2.5 text-right font-medium">
                      {formatBRL(receiptRecord.base_salary)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">13º Salário (Integral)</td>
                    <td className="p-2.5 text-slate-500">Salário Base</td>
                    <td className="p-2.5 text-right font-medium">
                      {formatBRL(receiptRecord.base_salary)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">
                      1/3 Constitucional de Férias
                    </td>
                    <td className="p-2.5 text-slate-500">Salário Base / 3</td>
                    <td className="p-2.5 text-right font-medium">
                      {formatBRL(receiptRecord.base_salary / 3)}
                    </td>
                  </tr>
                  {receiptRecord.includes_abono && (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Abono Pecuniário (10 dias)
                      </td>
                      <td className="p-2.5 text-slate-500">Salário Base / 3 (10 dias vendidos)</td>
                      <td className="p-2.5 text-right font-medium text-emerald-800">
                        {formatBRL(receiptRecord.base_salary / 3)}
                      </td>
                    </tr>
                  )}
                  {receiptRecord.dissidio_amount > 0 && (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Retroativo de Dissídio Coletivo
                      </td>
                      <td className="p-2.5 text-slate-500">Valor retroativo pactuado</td>
                      <td className="p-2.5 text-right font-medium text-emerald-800">
                        {formatBRL(receiptRecord.dissidio_amount)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td className="p-3 text-slate-900 text-sm" colSpan={2}>
                      VALOR TOTAL DO REEMBOLSO
                    </td>
                    <td className="p-3 text-right text-base text-emerald-700">
                      {formatBRL(receiptRecord.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Termo e Assinaturas */}
            <div className="pt-8 text-xs text-slate-500 space-y-8">
              <p className="leading-relaxed">
                Declaramos para os devidos fins contábeis e fiscais que os valores acima
                discriminados referem-se à apuração do Reembolso Anual Executivo referente ao ano
                base de <strong>{receiptRecord.reference_year}</strong>, devidamente autorizado pela
                administração da empresa.
              </p>

              <div className="grid grid-cols-2 gap-12 pt-10 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-800">
                    {receiptRecord.expand?.user?.name || 'Executivo Beneficiário'}
                  </p>
                  <p className="text-[10px] text-slate-400">Assinatura do Executivo</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-800">Departamento Financeiro</p>
                  <p className="text-[10px] text-slate-400">Controle e Aprovação</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

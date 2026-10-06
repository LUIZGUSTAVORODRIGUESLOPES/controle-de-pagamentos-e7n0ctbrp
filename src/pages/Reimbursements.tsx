import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Pencil,
  PlusCircle,
  Printer,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { reimbursementsService } from '@/services/reimbursements'
import { calculateReimbursement, formatBRL } from '@/lib/reimbursement'
import { formatDatePtBR } from '@/lib/calculator'
import {
  getCurrentBrazilPeriod,
  formatPeriodDisplay,
  exportReimbursementsToCsv,
} from '@/lib/reimbursementExport'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { ReimbursementRecord, ReimbursementUpdateInput } from '@/types/reimbursement'
import type { UserRecord } from '@/types/reimbursement'
import {
  ReimbursementFilterBar,
  type ReimbursementFiltersState,
} from '@/components/ReimbursementFilterBar'
import { EditReimbursementModal } from '@/components/EditReimbursementModal'

export default function Reimbursements() {
  const { user: authUser } = useAuth()
  const { toast } = useToast()

  // Tab state
  const [activeTab, setActiveTab] = useState<'mensais' | 'anual' | 'historico'>('mensais')

  // Data states
  const [reimbursements, setReimbursements] = useState<ReimbursementRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Quick Action: Gerar Lançamento do Mês
  const brazilCurrent = useMemo(() => getCurrentBrazilPeriod(), [])
  const [isGeneratingMonth, setIsGeneratingMonth] = useState<boolean>(false)

  // Salary Edit Modal (allows admin to adjust user's base monthly salary)
  const [editingSalaryUser, setEditingSalaryUser] = useState<UserRecord | null>(null)
  const [salaryInput, setSalaryInput] = useState<string>('')
  const [isSavingSalary, setIsSavingSalary] = useState<boolean>(false)

  // Form states - Aba 2 (Acertos Anuais)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [referencePeriodAnnual, setReferencePeriodAnnual] = useState<string>(brazilCurrent.period)
  const [referenceYear, setReferenceYear] = useState<string>(String(brazilCurrent.year))
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>('15000,00')
  const [includesTerco, setIncludesTerco] = useState<boolean>(true)
  const [includesAbono, setIncludesAbono] = useState<boolean>(false)
  const [dissidioInput, setDissidioInput] = useState<string>('0,00')
  const [isSubmittingAnnual, setIsSubmittingAnnual] = useState<boolean>(false)
  const [annualFormError, setAnnualFormError] = useState<string | null>(null)

  // Actions states
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<ReimbursementRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [receiptRecord, setReceiptRecord] = useState<ReimbursementRecord | null>(null)

  // Fetch all reimbursements and users
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [listData, usersData] = await Promise.all([
        reimbursementsService.list(),
        reimbursementsService.listUsers(),
      ])
      setReimbursements(listData)
      setUsers(usersData)

      // Set initial user selection if none set
      if (!selectedUserId && usersData.length > 0) {
        // default to current logged-in user if present in list
        const me = usersData.find((u) => u.id === authUser?.id)
        if (me) {
          setSelectedUserId(me.id)
          if (me.monthly_salary) {
            setBaseSalaryInput(
              me.monthly_salary.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            )
          }
        } else {
          setSelectedUserId(usersData[0].id)
          if (usersData[0].monthly_salary) {
            setBaseSalaryInput(
              usersData[0].monthly_salary.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            )
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err?.message || 'Não foi possível carregar os reembolsos.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedUserId, authUser?.id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Current logged-in user's monthly salary (preferred from user profile, fallback to default)
  const loggedInUserRecord = useMemo(() => {
    return users.find((u) => u.id === authUser?.id) || null
  }, [users, authUser?.id])

  const loggedInMonthlySalary = useMemo(() => {
    if (loggedInUserRecord?.monthly_salary && loggedInUserRecord.monthly_salary > 0) {
      return loggedInUserRecord.monthly_salary
    }
    // Fallback: search for last monthly reimbursement of this user
    const lastMonthly = reimbursements.find(
      (r) => r.user === authUser?.id && r.type === 'mensal' && r.total_amount > 0,
    )
    if (lastMonthly) return lastMonthly.total_amount
    return 15000 // default fallback
  }, [loggedInUserRecord, reimbursements, authUser?.id])

  // Update baseSalaryInput when selected user changes in Annual Tab
  const handleUserChange = (newUserId: string) => {
    setSelectedUserId(newUserId)
    const u = users.find((item) => item.id === newUserId)
    if (u?.monthly_salary && u.monthly_salary > 0) {
      setBaseSalaryInput(
        u.monthly_salary.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      )
    }
  }

  // Check if current logged-in user ALREADY has an open monthly reimbursement for current month
  const hasPendingMonthlyForCurrentMonth = useMemo(() => {
    if (!authUser?.id) return false
    return reimbursements.some(
      (r) =>
        r.user === authUser.id &&
        r.type === 'mensal' &&
        r.status !== 'paid' &&
        r.reference_period === brazilCurrent.period,
    )
  }, [reimbursements, authUser?.id, brazilCurrent.period])

  // Unified Edit Modal State (abre para qualquer lançamento)
  const [editingRecord, setEditingRecord] = useState<ReimbursementRecord | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)

  // Filtros da Aba 1 (Mensais em Aberto)
  const [mensalFilters, setMensalFilters] = useState<ReimbursementFiltersState>({
    search: '',
    sortField: 'competence',
    sortOrder: 'desc',
    type: 'all',
    status: 'all',
  })

  // Filtros da Aba 3 (Histórico e Quitações)
  const [historicoFilters, setHistoricoFilters] = useState<ReimbursementFiltersState>({
    search: '',
    sortField: 'competence',
    sortOrder: 'desc',
    type: 'all',
    status: 'all',
  })

  // Listas base
  const rawPendingMonthlyList = useMemo(() => {
    // Permite que qualquer lançamento não-pago apareça na lista de pendências
    return reimbursements.filter((r) => r.status !== 'paid')
  }, [reimbursements])

  const rawPaidHistoryList = useMemo(() => {
    return reimbursements.filter((r) => r.status === 'paid')
  }, [reimbursements])

  // Função auxiliar de ordenação e filtro
  const applyFiltersAndSort = useCallback(
    (records: ReimbursementRecord[], filters: ReimbursementFiltersState) => {
      let result = records

      // 1. Filtro de Busca
      if (filters.search.trim()) {
        const term = filters.search.trim().toLowerCase()
        result = result.filter((r) => {
          const userName = r.expand?.user?.name?.toLowerCase() || ''
          const userEmail = r.expand?.user?.email?.toLowerCase() || ''
          const periodStr = (r.reference_period || String(r.reference_year || '')).toLowerCase()
          const typeStr = (r.type || 'anual').toLowerCase()
          return (
            userName.includes(term) ||
            userEmail.includes(term) ||
            periodStr.includes(term) ||
            typeStr.includes(term)
          )
        })
      }

      // 2. Filtro de Tipo (mensal, anual)
      if (filters.type !== 'all') {
        result = result.filter((r) => r.type === filters.type)
      }

      // 3. Filtro de Status (pending, partial, paid)
      if (filters.status !== 'all') {
        result = result.filter((r) => r.status === filters.status)
      }

      // 4. Ordenação
      return [...result].sort((a, b) => {
        let diff = 0
        if (filters.sortField === 'competence') {
          // reference_period ou reference_year
          const keyA = (
            a.reference_period ||
            (a.reference_year ? String(a.reference_year) : '') ||
            ''
          ).toLowerCase()
          const keyB = (
            b.reference_period ||
            (b.reference_year ? String(b.reference_year) : '') ||
            ''
          ).toLowerCase()
          diff = keyA.localeCompare(keyB)
        } else if (filters.sortField === 'payment_date') {
          // updated ou created
          const dateA = new Date(a.updated || a.created || 0).getTime()
          const dateB = new Date(b.updated || b.created || 0).getTime()
          diff = dateA - dateB
        } else if (filters.sortField === 'total_amount') {
          diff = (a.total_amount || 0) - (b.total_amount || 0)
        }

        return filters.sortOrder === 'asc' ? diff : -diff
      })
    },
    [],
  )

  // Listas filtradas e ordenadas
  const pendingMonthlyList = useMemo(() => {
    return applyFiltersAndSort(rawPendingMonthlyList, mensalFilters)
  }, [rawPendingMonthlyList, mensalFilters, applyFiltersAndSort])

  const paidHistoryList = useMemo(() => {
    return applyFiltersAndSort(rawPaidHistoryList, historicoFilters)
  }, [rawPaidHistoryList, historicoFilters, applyFiltersAndSort])

  // Parse numeric values for Annual Calculator
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

  // Dynamic preview calculation for Aba 2 (Acertos Anuais)
  // Rules: Salário Base + Terço Constitucional (+1/3) + Abono Pecuniário (+1/3) + Dissídio
  const annualBreakdown = useMemo(() => {
    return calculateReimbursement({
      baseSalary: numericBaseSalary,
      includesTerco,
      includesAbono,
      dissidioAmount: numericDissidio,
    })
  }, [numericBaseSalary, includesTerco, includesAbono, numericDissidio])

  // Summary statistics
  const stats = useMemo(() => {
    let totalPago = 0
    let totalSaldoPendenteMensal = 0
    let totalSaldoPendenteAnual = 0
    let countParciais = 0

    for (const r of reimbursements) {
      const amountPaid = Number(r.amount_paid ?? (r.status === 'paid' ? r.total_amount : 0))
      const saldo = Math.max(0, r.total_amount - amountPaid)
      totalPago += amountPaid

      if (r.status === 'partial') {
        countParciais += 1
      }

      if (r.status !== 'paid') {
        if (r.type === 'mensal') {
          totalSaldoPendenteMensal += saldo
        } else {
          totalSaldoPendenteAnual += saldo
        }
      }
    }

    return {
      totalPago,
      totalSaldoPendenteMensal,
      totalSaldoPendenteAnual,
      totalSaldoPendenteGeral: totalSaldoPendenteMensal + totalSaldoPendenteAnual,
      countMensalPendente: pendingMonthlyList.length,
      countParciais,
      countPago: paidHistoryList.length,
      countTotal: reimbursements.length,
    }
  }, [reimbursements, pendingMonthlyList.length, paidHistoryList.length])

  // Quick Action: Gerar Lançamento do Mês
  const handleGenerateMonthly = async () => {
    if (!authUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Usuário não autenticado',
        description: 'Faça login para gerar o lançamento mensal.',
      })
      return
    }

    if (hasPendingMonthlyForCurrentMonth) {
      toast({
        title: 'Lançamento já gerado',
        description: `Já existe um lançamento pendente para o período ${brazilCurrent.monthLabel}.`,
      })
      return
    }

    try {
      setIsGeneratingMonth(true)
      const salary = loggedInMonthlySalary

      await reimbursementsService.createMonthly({
        user: authUser.id,
        reference_period: brazilCurrent.period,
        base_salary: salary,
        total_amount: salary,
        amount_paid: 0,
      })

      toast({
        title: 'Lançamento mensal gerado!',
        description: `Lançamento de ${formatBRL(salary)} referente a ${brazilCurrent.monthLabel} criado como Pendente.`,
      })

      await fetchData()
      setActiveTab('mensais')
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar lançamento',
        description: err?.message || 'Não foi possível gerar o lançamento do mês.',
      })
    } finally {
      setIsGeneratingMonth(false)
    }
  }

  // Payment Confirmation Modal State
  const [payingRecord, setPayingRecord] = useState<ReimbursementRecord | null>(null)
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false)

  // Open Payment Modal
  const handleOpenPaymentModal = (item: ReimbursementRecord) => {
    setPayingRecord(item)
    const paidSoFar = Number(item.amount_paid || 0)
    const remainingBalance = Math.max(0, item.total_amount - paidSoFar)
    // Sugerir o saldo restante por padrão
    setPaymentAmountInput(
      remainingBalance.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }

  // Confirm payment in modal (recalculates status automatically)
  const handleConfirmPayment = async () => {
    if (!payingRecord) return
    const normalized = paymentAmountInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)

    if (isNaN(parsed) || parsed <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um valor pago maior que zero.',
      })
      return
    }

    try {
      setIsSubmittingPayment(true)
      const updated = await reimbursementsService.registerPayment(payingRecord, parsed)

      const remainingBalance = Math.max(0, updated.total_amount - (updated.amount_paid || 0))
      let statusDesc = ''
      if (updated.status === 'paid') {
        statusDesc = 'Quitado integralmente (Status: Pago)!'
      } else if (updated.status === 'partial') {
        statusDesc = `Pagamento parcial registrado! Restam ${formatBRL(remainingBalance)} a receber.`
      }

      toast({
        title: 'Pagamento registrado com sucesso!',
        description: statusDesc,
      })

      setPayingRecord(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar pagamento',
        description: err?.message || 'Não foi possível registrar o pagamento.',
      })
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Quitar integralmente direto (atalho)
  const handlePayInFullDirect = async (item: ReimbursementRecord) => {
    try {
      setUpdatingId(item.id)
      const paidSoFar = Number(item.amount_paid || 0)
      const remainingBalance = Math.max(0, item.total_amount - paidSoFar)
      await reimbursementsService.registerPayment(item, remainingBalance)
      toast({
        title: 'Pagamento total confirmado!',
        description: `Lançamento quitado integralmente com sucesso.`,
      })
      await fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao confirmar quitação total',
        description: err?.message || 'Não foi possível atualizar o status.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Open Edit Modal (suporta qualquer tipo de lançamento em qualquer aba)
  const handleOpenEdit = (item: ReimbursementRecord) => {
    setEditingRecord(item)
    setIsEditModalOpen(true)
  }

  // Save Edit Record completo
  const handleSaveEditRecord = async (id: string, updated: ReimbursementUpdateInput) => {
    try {
      await reimbursementsService.update(id, updated)
      toast({
        title: 'Lançamento atualizado com sucesso!',
        description: `As alterações no lançamento foram gravadas.`,
      })
      setIsEditModalOpen(false)
      setEditingRecord(null)
      await fetchData()
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar lançamento',
        description: err?.message || 'Não foi possível salvar as alterações.',
      })
      throw err
    }
  }

  // Handle Salary Update for User
  const handleSaveUserSalary = async () => {
    if (!editingSalaryUser) return
    const normalized = salaryInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    if (isNaN(parsed) || parsed < 0) {
      toast({
        variant: 'destructive',
        title: 'Salário inválido',
        description: 'Informe um valor válido maior ou igual a zero.',
      })
      return
    }

    try {
      setIsSavingSalary(true)
      await reimbursementsService.updateUserSalary(editingSalaryUser.id, parsed)
      toast({
        title: 'Salário fixo atualizado!',
        description: `Salário de ${editingSalaryUser.name} definido para ${formatBRL(parsed)}.`,
      })
      setEditingSalaryUser(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar salário',
        description: err?.message || 'Não foi possível atualizar o salário fixo.',
      })
    } finally {
      setIsSavingSalary(false)
    }
  }

  // Handle Submit Annual Calculator (Aba 2)
  const handleCreateAnnual = async (e: React.FormEvent) => {
    e.preventDefault()
    setAnnualFormError(null)

    if (!selectedUserId) {
      setAnnualFormError('Selecione o Executivo / Usuário.')
      return
    }

    const yearNum = parseInt(referenceYear, 10)
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      setAnnualFormError('Informe um ano de referência válido (ex.: 2026).')
      return
    }

    if (numericBaseSalary <= 0) {
      setAnnualFormError('Informe um Salário Base válido maior que zero.')
      return
    }

    try {
      setIsSubmittingAnnual(true)
      const periodVal = referencePeriodAnnual.trim() || `${yearNum}`
      await reimbursementsService.createAnnual({
        user: selectedUserId,
        reference_year: yearNum,
        reference_period: periodVal,
        base_salary: numericBaseSalary,
        includes_terco: includesTerco,
        includes_abono: includesAbono,
        dissidio_amount: numericDissidio,
      })

      toast({
        title: 'Acerto gravado com sucesso!',
        description: `Lançamento de ${formatBRL(annualBreakdown.totalAmount)} criado com status Pendente na competência ${periodVal}.`,
      })

      // Reset form
      setIncludesTerco(true)
      setIncludesAbono(false)
      setDissidioInput('0,00')
      await fetchData()
      // Go to Aba 1 (mensais em aberto) where pending reimbursements live
      setActiveTab('mensais')
    } catch (err: any) {
      console.error(err)
      setAnnualFormError(
        err?.message || 'Erro ao registrar acerto anual. Verifique os dados e tente novamente.',
      )
    } finally {
      setIsSubmittingAnnual(false)
    }
  }

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return
    try {
      setIsDeleting(true)
      await reimbursementsService.delete(recordToDelete.id)
      toast({
        title: 'Registro excluído',
        description: 'O reembolso foi removido com sucesso.',
      })
      setRecordToDelete(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir o registro.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle CSV Export
  const handleExportCsv = () => {
    if (paidHistoryList.length === 0) {
      toast({
        title: 'Nenhum registro para exportar',
        description: 'Não há registros com status Pago no histórico.',
      })
      return
    }
    const filename = `historico-reembolsos-${brazilCurrent.period}.csv`
    exportReimbursementsToCsv(paidHistoryList, filename)
    toast({
      title: 'Exportação concluída!',
      description: `Arquivo ${filename} gerado com ${paidHistoryList.length} registro(s).`,
    })
  }

  // Print Receipt
  const handlePrintReceipt = (item: ReimbursementRecord) => {
    setReceiptRecord(item)
    setTimeout(() => {
      window.print()
    }, 250)
  }

  // Backward compatibility: filteredPaidHistory aponta para paidHistoryList (já filtrada e ordenada)
  const filteredPaidHistory = paidHistoryList

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Header & Quick Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Gestão de Reembolsos
              </h2>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs px-2 py-0.5">
                Exclusivo Admin
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Lançamentos mensais automáticos, calculadora de acertos anuais e histórico consolidado
              para o Financeiro.
            </p>
          </div>

          {/* Quick Action: Gerar Lançamento do Mês */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateMonthly}
              disabled={isGeneratingMonth || hasPendingMonthlyForCurrentMonth || isLoading}
              className={`font-semibold text-xs sm:text-sm h-10 px-4 shadow-sm transition-all ${
                hasPendingMonthlyForCurrentMonth
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={
                hasPendingMonthlyForCurrentMonth
                  ? `Já existe um lançamento pendente para ${brazilCurrent.monthLabel}`
                  : `Criar lançamento mensal pendente de ${formatBRL(loggedInMonthlySalary)} para ${brazilCurrent.monthLabel}`
              }
            >
              {isGeneratingMonth ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : hasPendingMonthlyForCurrentMonth ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                  Lançamento de {brazilCurrent.monthLabel} já gerado
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Gerar Lançamento do Mês ({brazilCurrent.monthLabel})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Banner de Destaque do Saldo Devedor / Aumento por Dissídio */}
        {stats.totalSaldoPendenteGeral > 0 && (
          <div className="rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-red-950">
                    Atenção: Saldo devedor da empresa em aberto
                  </h3>
                  <Badge className="bg-red-600 text-white hover:bg-red-600 border-none text-[11px] font-semibold">
                    R$ 116,51 / mês desde Agosto/2026
                  </Badge>
                </div>
                <p className="text-xs text-red-800/90 mt-1 leading-relaxed">
                  A partir de Agosto/2026 o salário base teve aumento por dissídio (de R$ 1.754,73
                  para R$ 1.871,24), mas a empresa continuou creditando o valor antigo. Foi gerado
                  um saldo a favor do executivo de <strong>R$ 116,51 por mês</strong> nos períodos
                  em aberto (Ago a Out/2026).
                </p>
              </div>
            </div>
            <div className="bg-white/90 border border-red-200 rounded-lg px-4 py-2 text-right shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total a Receber
              </span>
              <span className="text-xl font-extrabold text-red-700 tabular-nums">
                {formatBRL(stats.totalSaldoPendenteGeral)}
              </span>
            </div>
          </div>
        )}

        {/* Global Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Salário Fixo Cadastrado</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatBRL(loggedInMonthlySalary)}
              </span>
              {loggedInUserRecord && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSalaryUser(loggedInUserRecord)
                    setSalaryInput(
                      (loggedInUserRecord.monthly_salary || 1871.24).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    )
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium underline flex items-center gap-0.5"
                  title="Alterar salário fixo do usuário"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {loggedInUserRecord?.name || 'Usuário Atual'}
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-red-800 font-semibold">
              <span>Saldo em Aberto (A Receber)</span>
              <Clock className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-lg font-bold text-red-700 mt-1 block tabular-nums">
              {formatBRL(stats.totalSaldoPendenteGeral)}
            </span>
            <p className="text-[10px] text-red-800 mt-0.5">
              {stats.countParciais > 0
                ? `${stats.countParciais} lançamento(s) com pagamento parcial`
                : `${stats.countMensalPendente} lançamento(s) em aberto`}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>Total Pago Realizado</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-lg font-bold text-emerald-800 mt-1 block tabular-nums">
              {formatBRL(stats.totalPago)}
            </span>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              {stats.countPago === 1
                ? '1 reembolso liquidado'
                : `${stats.countPago} reembolsos quitados`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total de Registros</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 mt-1 block tabular-nums">
              {stats.countTotal}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Mensais e anuais consolidados</p>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full max-w-xl h-11 p-1 bg-slate-200/80 rounded-xl">
            <TabsTrigger
              value="mensais"
              className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              <Calendar className="w-4 h-4 mr-1.5 text-slate-600" />
              Lançamentos em Aberto ({rawPendingMonthlyList.length})
            </TabsTrigger>{' '}
            <TabsTrigger
              value="anual"
              className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              <Calculator className="w-4 h-4 mr-1.5 text-emerald-600" />
              Acertos Anuais
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
            >
              <FileCheck2 className="w-4 h-4 mr-1.5 text-slate-600" />
              Histórico & Exportação ({paidHistoryList.length})
            </TabsTrigger>
          </TabsList>

          {/* ======================================================== */}
          {/* ABA 1: Lançamentos Mensais (Pendentes e Parciais) */}
          {/* ======================================================== */}
          <TabsContent value="mensais" className="mt-4 space-y-4">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Lançamentos em Aberto (Pendentes e Parciais)</span>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs px-2 py-0.5">
                        {pendingMonthlyList.length} de {rawPendingMonthlyList.length} lançamento(s)
                      </Badge>
                      {stats.countParciais > 0 && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-xs px-2 py-0.5">
                          {stats.countParciais} com saldo devedor
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Controle de pagamentos mensais e suporte a pagamentos parciais com saldo a
                      receber destacado.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleGenerateMonthly}
                    disabled={isGeneratingMonth || hasPendingMonthlyForCurrentMonth}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Novo Lançamento ({brazilCurrent.monthLabel})
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 p-4 sm:p-6 space-y-4">
                {/* Barra de Filtros e Ordenação da Aba Mensais */}
                <ReimbursementFilterBar
                  filters={mensalFilters}
                  onChange={setMensalFilters}
                  onReset={() =>
                    setMensalFilters({
                      search: '',
                      sortField: 'competence',
                      sortOrder: 'desc',
                      type: 'all',
                      status: 'all',
                    })
                  }
                  totalCount={rawPendingMonthlyList.length}
                  filteredCount={pendingMonthlyList.length}
                  showTypeFilter={true}
                  showStatusFilter={true}
                  showSortPaymentDate={false}
                />

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-xs text-slate-500">Carregando lançamentos...</p>
                  </div>
                ) : pendingMonthlyList.length === 0 ? (
                  <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-800">
                      {rawPendingMonthlyList.length === 0
                        ? 'Nenhum lançamento mensal pendente'
                        : 'Nenhum lançamento encontrado com os filtros selecionados'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                      {rawPendingMonthlyList.length === 0
                        ? 'Todos os pagamentos mensais foram confirmados integralmente ou ainda não foram gerados.'
                        : 'Tente ajustar os critérios de busca ou redefinir os filtros acima.'}
                    </p>
                    {rawPendingMonthlyList.length === 0 ? (
                      <Button
                        onClick={handleGenerateMonthly}
                        disabled={hasPendingMonthlyForCurrentMonth || isGeneratingMonth}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        Gerar Lançamento do Mês ({brazilCurrent.monthLabel})
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setMensalFilters({
                            search: '',
                            sortField: 'competence',
                            sortOrder: 'desc',
                            type: 'all',
                            status: 'all',
                          })
                        }
                        className="mt-4 text-xs"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Período</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Executivo / Usuário</th>
                          <th className="p-3 text-right">Salário Base</th>
                          <th className="p-3 text-right">Valor Total</th>
                          <th className="p-3 text-right">Valor Pago</th>
                          <th className="p-3 text-right">Saldo Devedor</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pendingMonthlyList.map((item) => {
                          const isUpdating = updatingId === item.id
                          const execName = item.expand?.user?.name || 'Executivo'
                          const execEmail = item.expand?.user?.email || ''
                          const valorPago = Number(item.amount_paid || 0)
                          const saldoReceber = Math.max(0, item.total_amount - valorPago)
                          const isPartial = item.status === 'partial'

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isPartial
                                  ? 'bg-red-50/60 hover:bg-red-100/60 border-l-4 border-l-red-500'
                                  : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    {formatPeriodDisplay(
                                      item.reference_period,
                                      item.reference_year,
                                      item.type,
                                    )}
                                  </span>
                                  {isPartial && (
                                    <span className="text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded">
                                      Déficit
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold uppercase ${
                                    item.type === 'mensal'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {item.type === 'mensal' ? 'Mensal' : 'Anual'}
                                </Badge>
                              </td>

                              <td className="p-3">
                                <div className="font-medium text-slate-800">{execName}</div>
                                {execEmail && (
                                  <div className="text-[10px] text-slate-400">{execEmail}</div>
                                )}
                              </td>

                              <td className="p-3 text-right text-slate-600 tabular-nums whitespace-nowrap">
                                {item.base_salary ? formatBRL(item.base_salary) : '-'}
                              </td>

                              <td className="p-3 text-right font-bold text-sm text-slate-900 tabular-nums whitespace-nowrap">
                                {formatBRL(item.total_amount)}
                              </td>

                              <td className="p-3 text-right font-medium text-sm text-emerald-700 tabular-nums whitespace-nowrap">
                                {formatBRL(valorPago)}
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                {saldoReceber > 0.001 ? (
                                  <span
                                    className={`inline-block font-extrabold text-sm tabular-nums px-2 py-0.5 rounded ${
                                      isPartial
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {formatBRL(saldoReceber)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium">R$ 0,00</span>
                                )}
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                {isPartial ? (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300 text-[11px] px-2 py-0.5 font-bold flex items-center gap-1 w-fit">
                                    <AlertCircle className="w-3 h-3 text-red-600" />
                                    Pagamento Parcial
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Pendente
                                  </Badge>
                                )}
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Botão Editar Completo */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEdit(item)}
                                    title="Editar lançamento completo (valores, competência, status)"
                                    className="h-7 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                  >
                                    <Pencil className="w-3 h-3 mr-1 text-emerald-600" />
                                    Editar
                                  </Button>

                                  {/* Botão Confirmar Pagamento (abre modal com input rápido de quanto foi pago) */}
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenPaymentModal(item)}
                                    disabled={isUpdating}
                                    title="Informar quanto foi pago e atualizar status automaticamente"
                                    className={`h-7 text-xs font-semibold text-white ${
                                      isPartial
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                  >
                                    <DollarSign className="w-3 h-3 mr-0.5" />
                                    Confirmar Pagamento
                                  </Button>

                                  {/* Excluir */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRecordToDelete(item)}
                                    title="Excluir lançamento"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================================================== */}
          {/* ABA 2: Acertos Anuais (Calculadora) */}
          {/* ======================================================== */}
          <TabsContent value="anual" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Formulário (5 colunas) */}
              <div className="lg:col-span-5 w-full">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">
                          Calculadora de Acerto Anual
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Apuração dos direitos anuais executivos com fórmula dinâmica.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-5">
                    <form onSubmit={handleCreateAnnual} className="space-y-4">
                      {annualFormError && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{annualFormError}</span>
                        </div>
                      )}

                      {/* 1. Seleção do Usuário Executivo */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="annualUserSelect"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Executivo / Usuário <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={selectedUserId}
                          onValueChange={handleUserChange}
                          disabled={isSubmittingAnnual || users.length === 0}
                        >
                          <SelectTrigger id="annualUserSelect" className="text-slate-800">
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

                      {/* 1. Mês/Ano de Referência e Ano */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="annualReferencePeriod"
                            className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                          >
                            <span>
                              Mês/Ano de Referência <span className="text-red-500">*</span>
                            </span>
                          </Label>
                          <Input
                            id="annualReferencePeriod"
                            type="text"
                            value={referencePeriodAnnual}
                            onChange={(e) => {
                              const val = e.target.value
                              setReferencePeriodAnnual(val)
                              const parts = val.split('-')
                              if (parts[0] && parts[0].length === 4) {
                                setReferenceYear(parts[0])
                              }
                            }}
                            placeholder="2026-10"
                            className="tabular-nums text-slate-800 text-xs"
                            required
                            disabled={isSubmittingAnnual}
                          />
                          <p className="text-[10px] text-slate-400">Ex.: 2026-10</p>
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="annualReferenceYear"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Ano de Referência <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="annualReferenceYear"
                            type="number"
                            min={2000}
                            max={2100}
                            value={referenceYear}
                            onChange={(e) => setReferenceYear(e.target.value)}
                            placeholder="2026"
                            className="tabular-nums text-slate-800 text-xs"
                            required
                            disabled={isSubmittingAnnual}
                          />
                          <p className="text-[10px] text-slate-400">Ex.: 2026</p>
                        </div>
                      </div>

                      {/* 2. Salário Base */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="annualBaseSalary"
                          className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                        >
                          <span>
                            Salário Base <span className="text-red-500">*</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Ex.: 15.000,00
                          </span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                            R$
                          </span>
                          <Input
                            id="annualBaseSalary"
                            type="text"
                            value={baseSalaryInput}
                            onChange={(e) => setBaseSalaryInput(e.target.value)}
                            placeholder="15000,00"
                            className="pl-9 font-medium tabular-nums text-slate-800"
                            required
                            disabled={isSubmittingAnnual}
                          />
                        </div>
                      </div>

                      {/* 3. Checkbox: Adicionar Terço Constitucional de Férias (+1/3) */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
                        <label
                          htmlFor="annualIncludesTerco"
                          className="flex items-start gap-3 cursor-pointer select-none"
                        >
                          <Checkbox
                            id="annualIncludesTerco"
                            checked={includesTerco}
                            onCheckedChange={(checked) => setIncludesTerco(Boolean(checked))}
                            disabled={isSubmittingAnnual}
                            className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-slate-800 block">
                              Adicionar Terço Constitucional de Férias (+1/3)
                            </span>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Soma + base_salary/3 referente ao 1/3 constitucional.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* 4. Checkbox: Adicionar Abono Pecuniário de Férias (+1/3) */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
                        <label
                          htmlFor="annualIncludesAbono"
                          className="flex items-start gap-3 cursor-pointer select-none"
                        >
                          <Checkbox
                            id="annualIncludesAbono"
                            checked={includesAbono}
                            onCheckedChange={(checked) => setIncludesAbono(Boolean(checked))}
                            disabled={isSubmittingAnnual}
                            className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-slate-800 block">
                              Adicionar Abono Pecuniário de Férias (+1/3)
                            </span>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Soma + base_salary/3 referente ao abono pecuniário (venda de 10 dias).
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* 5. Input para Retroativo de Dissídio */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="annualDissidio"
                          className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                        >
                          <span>Retroativo de Dissídio</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Opcional (R$)
                          </span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                            R$
                          </span>
                          <Input
                            id="annualDissidio"
                            type="text"
                            value={dissidioInput}
                            onChange={(e) => setDissidioInput(e.target.value)}
                            placeholder="0,00"
                            className="pl-9 font-medium tabular-nums text-slate-800"
                            disabled={isSubmittingAnnual}
                          />
                        </div>
                      </div>

                      {/* Botão para Salvar como pending na coleção */}
                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 shadow-sm active:scale-[0.98] transition-transform"
                        disabled={isSubmittingAnnual}
                      >
                        {isSubmittingAnnual ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando Acerto...
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 mr-1.5" />
                            Salvar Acerto Anual (Pendente)
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Demonstração do Cálculo Dinâmico (7 colunas) */}
              <div className="lg:col-span-7 w-full space-y-4">
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-emerald-100 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Demonstrativo do Cálculo Dinâmico
                        </CardTitle>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        Ano {referenceYear || brazilCurrent.year}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      Regras de cálculo exatas calculadas em tempo real em TypeScript.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Big Total */}
                    <div className="rounded-xl bg-white border border-emerald-200 p-4 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Total
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Salário Base + Terço de Férias + Abono Pecuniário + Dissídio
                        </p>
                      </div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight tabular-nums">
                        {formatBRL(annualBreakdown.totalAmount)}
                      </span>
                    </div>

                    {/* Fórmulas detalhadas: preview dinâmico com componentes separados */}
                    <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Memória de Cálculo (Componentes Separados)
                      </h4>

                      <div className="space-y-2 text-xs text-slate-700">
                        {/* 1. Salário Base */}
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-800">Salário Base</span>
                            <p className="text-[10px] text-slate-400">Valor base integral</p>
                          </div>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatBRL(annualBreakdown.baseSalary)}
                          </span>
                        </div>

                        {/* 2. Terço de Férias */}
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-800">
                              Terço de Férias (+1/3)
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {includesTerco
                                ? '+ base_salary / 3 (selecionado)'
                                : 'Não selecionado (R$ 0,00)'}
                            </p>
                          </div>
                          <span
                            className={`font-semibold tabular-nums ${includesTerco ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
                          >
                            {formatBRL(annualBreakdown.tercoFerias)}
                          </span>
                        </div>

                        {/* 3. Abono Pecuniário */}
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-800">
                              Abono Pecuniário (+1/3)
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {includesAbono
                                ? '+ base_salary / 3 (selecionado)'
                                : 'Não selecionado (R$ 0,00)'}
                            </p>
                          </div>
                          <span
                            className={`font-semibold tabular-nums ${includesAbono ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
                          >
                            {formatBRL(annualBreakdown.abonoAmount)}
                          </span>
                        </div>

                        {/* 4. Dissídio */}
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-800">Dissídio</span>
                            <p className="text-[10px] text-slate-400">
                              Retroativo de dissídio coletivo
                            </p>
                          </div>
                          <span
                            className={`font-semibold tabular-nums ${numericDissidio > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
                          >
                            {formatBRL(annualBreakdown.dissidioAmount)}
                          </span>
                        </div>

                        {/* 5. Total */}
                        <div className="flex items-center justify-between py-2 bg-emerald-50/80 px-2.5 rounded-lg font-bold text-emerald-900 border border-emerald-200">
                          <span>Total</span>
                          <span className="tabular-nums text-sm">
                            {formatBRL(annualBreakdown.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-slate-600 text-[11px] leading-relaxed">
                      Ao clicar em <strong>Salvar Acerto Anual (Pendente)</strong>, o sistema grava
                      o registro com status <code>pending</code>. Posteriormente, ele pode ser
                      quitado na Aba 1 ou visualizado no Histórico.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ======================================================== */}
          {/* ABA 3: Histórico e Exportação (status = 'paid') */}
          {/* ======================================================== */}
          <TabsContent value="historico" className="mt-4 space-y-4">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Histórico Consolidado de Pagamentos</span>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs px-2 py-0.5">
                        {paidHistoryList.length} registro(s) quitado(s)
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Todos os registros pagos (mensais e anuais) ordenados por data. Exporte a
                      planilha em CSV para o Financeiro.
                    </CardDescription>
                  </div>

                  {/* Botão de Exportação CSV */}
                  <Button
                    onClick={handleExportCsv}
                    disabled={rawPaidHistoryList.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5 shadow-sm self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Exportar Histórico (CSV)
                  </Button>
                </div>

                {/* Barra Completa de Filtros e Ordenação da Aba Histórico */}
                <div className="pt-3">
                  <ReimbursementFilterBar
                    filters={historicoFilters}
                    onChange={setHistoricoFilters}
                    onReset={() =>
                      setHistoricoFilters({
                        search: '',
                        sortField: 'competence',
                        sortOrder: 'desc',
                        type: 'all',
                        status: 'all',
                      })
                    }
                    totalCount={rawPaidHistoryList.length}
                    filteredCount={paidHistoryList.length}
                    showTypeFilter={true}
                    showStatusFilter={false}
                    showSortPaymentDate={true}
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-4 p-4 sm:p-6">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-xs text-slate-500">Carregando histórico...</p>
                  </div>
                ) : filteredPaidHistory.length === 0 ? (
                  <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-800">
                      {rawPaidHistoryList.length === 0
                        ? 'Nenhum pagamento registrado como Pago ainda'
                        : 'Nenhum pagamento encontrado com os filtros selecionados'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      {rawPaidHistoryList.length === 0
                        ? 'Quando um lançamento mensal ou acerto anual for pago, ele aparecerá aqui.'
                        : 'Verifique os termos de busca ou redefina os filtros acima.'}
                    </p>
                    {rawPaidHistoryList.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setHistoricoFilters({
                            search: '',
                            sortField: 'competence',
                            sortOrder: 'desc',
                            type: 'all',
                            status: 'all',
                          })
                        }
                        className="mt-4 text-xs"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Data Quitação</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Período / Ano</th>
                          <th className="p-3">Executivo / Usuário</th>
                          <th className="p-3 text-right">Salário Base</th>
                          <th className="p-3 text-right">Abono / Dissídio</th>
                          <th className="p-3 text-right">Valor Total</th>
                          <th className="p-3 text-right">Valor Pago</th>
                          <th className="p-3 text-right">Saldo a Receber</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPaidHistory.map((item) => {
                          const execName = item.expand?.user?.name || 'Executivo'
                          const execEmail = item.expand?.user?.email || ''
                          const isMensal = item.type === 'mensal'
                          const valorPago = Number(item.amount_paid ?? item.total_amount)
                          const saldo = Math.max(0, item.total_amount - valorPago)

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                                {formatDatePtBR(item.updated || item.created)}
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold uppercase ${
                                    isMensal
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {isMensal ? 'Mensal' : 'Anual'}
                                </Badge>
                              </td>

                              <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                {formatPeriodDisplay(
                                  item.reference_period,
                                  item.reference_year,
                                  item.type,
                                )}
                              </td>

                              <td className="p-3">
                                <div className="font-medium text-slate-800">{execName}</div>
                                {execEmail && (
                                  <div className="text-[10px] text-slate-400">{execEmail}</div>
                                )}
                              </td>

                              <td className="p-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                                {item.base_salary ? formatBRL(item.base_salary) : '-'}
                              </td>

                              <td className="p-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                                {item.includes_terco && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] mr-1">
                                    +1/3 Férias
                                  </span>
                                )}
                                {item.includes_abono && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] mr-1">
                                    +Abono 10d
                                  </span>
                                )}
                                {item.dissidio_amount && item.dissidio_amount > 0 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px]">
                                    +{formatBRL(item.dissidio_amount)}
                                  </span>
                                ) : !item.includes_abono && !item.includes_terco ? (
                                  '-'
                                ) : null}
                              </td>

                              <td className="p-3 text-right font-bold text-sm text-slate-900 tabular-nums whitespace-nowrap">
                                {formatBRL(item.total_amount)}
                              </td>

                              <td className="p-3 text-right font-bold text-sm text-emerald-700 tabular-nums whitespace-nowrap">
                                {formatBRL(valorPago)}
                              </td>

                              <td className="p-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                                {saldo > 0.001 ? formatBRL(saldo) : 'R$ 0,00'}
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Pago
                                </Badge>
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Botão Editar Completo */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEdit(item)}
                                    title="Editar lançamento (valores, datas, competência, status)"
                                    className="h-7 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                  >
                                    <Pencil className="w-3 h-3 mr-1 text-emerald-600" />
                                    Editar
                                  </Button>

                                  {/* Recibo formal / Impressão */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrintReceipt(item)}
                                    title="Visualizar e imprimir recibo PDF"
                                    className="h-7 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100"
                                  >
                                    <Printer className="w-3 h-3 mr-1 text-slate-500" />
                                    Recibo
                                  </Button>

                                  {/* Excluir */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRecordToDelete(item)}
                                    title="Excluir do histórico"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ======================================================== */}
      {/* MODAL UNIFICADO: Editar Lançamento Completo */}
      {/* ======================================================== */}
      <EditReimbursementModal
        record={editingRecord}
        users={users}
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open)
          if (!open) setEditingRecord(null)
        }}
        onSave={handleSaveEditRecord}
      />

      {/* ======================================================== */}
      {/* MODAL 2: Editar Salário Fixo Cadastrado do Usuário */}
      {/* ======================================================== */}
      <Dialog
        open={!!editingSalaryUser}
        onOpenChange={(open) => {
          if (!open) setEditingSalaryUser(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5" />
            </div>
            <DialogTitle>Definir Salário Fixo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Configure o salário fixo de <strong>{editingSalaryUser?.name}</strong>. Esse valor é
              utilizado como base para a geração dos lançamentos mensais automáticos e nos cálculos
              anuais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="salaryUser" className="text-xs font-semibold text-slate-700">
              Salário Fixo Mensal (R$) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                R$
              </span>
              <Input
                id="salaryUser"
                type="text"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                placeholder="15000,00"
                className="pl-9 font-medium tabular-nums text-slate-900"
                autoFocus
                disabled={isSavingSalary}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setEditingSalaryUser(null)}
              disabled={isSavingSalary}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveUserSalary}
              disabled={isSavingSalary}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSavingSalary ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Salário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: Informar Pagamento (Suporte a Pagamentos Parciais) */}
      {/* ======================================================== */}
      <Dialog
        open={!!payingRecord}
        onOpenChange={(open) => {
          if (!open) setPayingRecord(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5" />
            </div>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Informe o valor a ser pago para o período{' '}
              <strong>
                {payingRecord
                  ? formatPeriodDisplay(
                      payingRecord.reference_period,
                      payingRecord.reference_year,
                      payingRecord.type,
                    )
                  : ''}
              </strong>{' '}
              de <strong>{payingRecord?.expand?.user?.name || 'Executivo'}</strong>.
            </DialogDescription>
          </DialogHeader>

          {payingRecord && (
            <div className="space-y-4 py-2">
              {/* Quadro resumo do lançamento */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Valor Total do Lançamento:</span>
                  <strong className="text-slate-900 tabular-nums">
                    {formatBRL(payingRecord.total_amount)}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Valor Já Pago Anteriormente:</span>
                  <span className="text-emerald-700 font-semibold tabular-nums">
                    {formatBRL(payingRecord.amount_paid || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
                  <span className="font-semibold">Saldo Atual a Receber:</span>
                  <span className="font-bold text-red-600 text-sm tabular-nums">
                    {formatBRL(
                      Math.max(0, payingRecord.total_amount - (payingRecord.amount_paid || 0)),
                    )}
                  </span>
                </div>
              </div>

              {/* Input do valor a pagar nesta operação */}
              <div className="space-y-1.5">
                <Label htmlFor="paymentInput" className="text-xs font-semibold text-slate-700">
                  Quanto está sendo pago agora? (R$) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    R$
                  </span>
                  <Input
                    id="paymentInput"
                    type="text"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    placeholder="0,00"
                    className="pl-9 font-semibold text-base tabular-nums text-slate-900"
                    autoFocus
                    disabled={isSubmittingPayment}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Esse valor será somado ao total já pago. Se quitar o total, o status mudará para{' '}
                  <strong className="text-emerald-700">Pago</strong>; se restar saldo, ficará como{' '}
                  <strong className="text-red-600">Pagamento Parcial</strong>.
                </p>
              </div>

              {/* Botões rápidos de atalho */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const saldo = Math.max(
                      0,
                      payingRecord.total_amount - (payingRecord.amount_paid || 0),
                    )
                    setPaymentAmountInput(
                      saldo.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    )
                  }}
                  className="text-[11px] h-7 text-slate-700 border-slate-300"
                >
                  Quitar Saldo Restante
                </Button>
                {payingRecord.type === 'mensal' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentAmountInput('116,51')
                    }}
                    className="text-[11px] h-7 text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                  >
                    Diferença Dissídio (R$ 116,51)
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setPayingRecord(null)}
              disabled={isSubmittingPayment}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isSubmittingPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando Pagamento...
                </>
              ) : (
                'Salvar Pagamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: Confirmação de Exclusão */}
      {/* ======================================================== */}
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
            <DialogTitle>Excluir este lançamento?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              Esta ação não pode ser desfeita. O registro referente a{' '}
              <strong>
                {recordToDelete
                  ? formatPeriodDisplay(
                      recordToDelete.reference_period,
                      recordToDelete.reference_year,
                      recordToDelete.type,
                    )
                  : ''}
              </strong>{' '}
              para <strong>{recordToDelete?.expand?.user?.name || 'Executivo'}</strong> no valor de{' '}
              <strong>{recordToDelete ? formatBRL(recordToDelete.total_amount) : ''}</strong> será
              excluído permanentemente.
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

      {/* ======================================================== */}
      {/* Recibo para Impressão Formal / Financeiro */}
      {/* ======================================================== */}
      {receiptRecord && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[99999] text-slate-900 font-sans">
          <div className="max-w-[760px] mx-auto border border-slate-300 rounded-xl p-8 space-y-6 bg-white">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Recibo Formal de Reembolso Executivo
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Documento comprobatório para Departamento Financeiro / Contabilidade
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border border-slate-300 bg-slate-50">
                  {formatPeriodDisplay(
                    receiptRecord.reference_period,
                    receiptRecord.reference_year,
                    receiptRecord.type,
                  )}
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
                <span className="text-slate-500 block font-medium">Tipo de Reembolso:</span>
                <span className="text-slate-900 font-bold uppercase">
                  {receiptRecord.type === 'mensal' ? 'Lançamento Mensal' : 'Acerto Anual'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Status do Pagamento:</span>
                <span
                  className={`text-slate-900 font-bold uppercase ${
                    receiptRecord.status === 'paid'
                      ? 'text-emerald-700'
                      : receiptRecord.status === 'partial'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {receiptRecord.status === 'paid'
                    ? 'Pago / Liquidado'
                    : receiptRecord.status === 'partial'
                      ? 'Pagamento Parcial'
                      : 'Pendente'}
                </span>
              </div>
            </div>

            {/* Composição */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Demonstrativo de Composição
              </h3>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2.5">Descrição</th>
                    <th className="text-right p-2.5">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receiptRecord.base_salary && (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Salário Base de Referência
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {formatBRL(receiptRecord.base_salary)}
                      </td>
                    </tr>
                  )}
                  {receiptRecord.includes_terco && (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Terço Constitucional de Férias (+1/3)
                      </td>
                      <td className="p-2.5 text-right font-medium text-emerald-800">
                        {formatBRL((receiptRecord.base_salary || 0) / 3)}
                      </td>
                    </tr>
                  )}
                  {receiptRecord.includes_abono && (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Abono Pecuniário de Férias (+1/3)
                      </td>
                      <td className="p-2.5 text-right font-medium text-emerald-800">
                        {formatBRL((receiptRecord.base_salary || 0) / 3)}
                      </td>
                    </tr>
                  )}
                  {receiptRecord.dissidio_amount && receiptRecord.dissidio_amount > 0 ? (
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">
                        Retroativo de Dissídio Coletivo
                      </td>
                      <td className="p-2.5 text-right font-medium text-emerald-800">
                        {formatBRL(receiptRecord.dissidio_amount)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td className="p-3 text-slate-900 text-sm">VALOR TOTAL DO REEMBOLSO</td>
                    <td className="p-3 text-right text-base text-slate-900">
                      {formatBRL(receiptRecord.total_amount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-emerald-800">VALOR JÁ PAGO</td>
                    <td className="p-2.5 text-right font-bold text-base text-emerald-700">
                      {formatBRL(
                        receiptRecord.amount_paid ??
                          (receiptRecord.status === 'paid' ? receiptRecord.total_amount : 0),
                      )}
                    </td>
                  </tr>
                  {receiptRecord.status !== 'paid' && (
                    <tr className="bg-red-50 text-red-900 font-bold">
                      <td className="p-2.5 font-bold text-red-800">SALDO REMANESCENTE A RECEBER</td>
                      <td className="p-2.5 text-right font-bold text-base text-red-700">
                        {formatBRL(
                          Math.max(
                            0,
                            receiptRecord.total_amount - Number(receiptRecord.amount_paid || 0),
                          ),
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Termo e Assinaturas */}
            <div className="pt-8 text-xs text-slate-500 space-y-8">
              <p className="leading-relaxed">
                Declaramos para os devidos fins contábeis e fiscais que os valores acima
                discriminados referem-se ao reembolso executivo autorizado pela administração da
                empresa.
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

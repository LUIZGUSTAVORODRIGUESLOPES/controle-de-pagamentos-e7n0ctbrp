import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  Wallet,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Loader2,
  Palmtree,
  Sparkles,
} from 'lucide-react'
import type { PagamentoRecord } from '@/types/pagamento'
import { formatCurrencyBRL, formatDatePtBR } from '@/lib/calculator'
import { pagamentosService } from '@/services/pagamentos'
import { useToast } from '@/hooks/use-toast'

interface HistoricoPagamentosProps {
  pagamentos: PagamentoRecord[]
  isLoading: boolean
  onRefresh: () => void
}

export const HistoricoPagamentos: React.FC<HistoricoPagamentosProps> = ({
  pagamentos,
  isLoading,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [recordToDelete, setRecordToDelete] = useState<PagamentoRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Filter by Mes_Ano substring (case-insensitive)
  const filteredPagamentos = useMemo(() => {
    if (!searchTerm.trim()) return pagamentos
    const term = searchTerm.trim().toLowerCase()
    return pagamentos.filter((p) => p.Mes_Ano.toLowerCase().includes(term))
  }, [pagamentos, searchTerm])

  // Summary strip statistics
  const stats = useMemo(() => {
    let totalPago = 0
    let totalPendente = 0
    const count = pagamentos.length

    for (const p of pagamentos) {
      if (p.Status === 'Pago') {
        totalPago += p.Valor_Liquido
      } else {
        totalPendente += p.Valor_Liquido
      }
    }

    return {
      totalPago,
      totalPendente,
      count,
    }
  }, [pagamentos])

  // Action: Marcar como Pago
  const handleMarkAsPaid = async (p: PagamentoRecord) => {
    try {
      setUpdatingId(p.id)
      await pagamentosService.updateStatus(p.id, 'Pago')
      toast({
        title: 'Status atualizado!',
        description: `Lançamento de ${p.Tipo_Pagamento} (${p.Mes_Ano}) marcado como Pago.`,
      })
      onRefresh()
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

  // Action: Confirm and delete
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return
    try {
      setIsDeleting(true)
      await pagamentosService.delete(recordToDelete.id)
      toast({
        title: 'Lançamento excluído',
        description: 'O registro foi removido com sucesso.',
      })
      setRecordToDelete(null)
      onRefresh()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir o lançamento.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {stats.count === 1
                  ? '1 registro encontrado'
                  : `${stats.count} registros encontrados`}
              </CardDescription>
            </div>
          </div>

          {/* Summary strip: 3 chips */}
          <div className="grid grid-cols-3 gap-2.5 pt-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3 flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Total Pago</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-emerald-700 mt-1 tabular-nums truncate">
                {formatCurrencyBRL(stats.totalPago)}
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 sm:p-3 flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Total Pendente</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-amber-700 mt-1 tabular-nums truncate">
                {formatCurrencyBRL(stats.totalPendente)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 sm:p-3 flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Registros</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-slate-800 mt-1 tabular-nums">
                {stats.count}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por Mês/Ano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 p-4 sm:p-6">
          {isLoading && pagamentos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-500">Carregando pagamentos...</p>
            </div>
          ) : filteredPagamentos.length === 0 ? (
            <div className="py-14 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Wallet className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold text-slate-800">
                {searchTerm ? 'Nenhum lançamento com este filtro' : 'Nenhum registro ainda'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchTerm
                  ? 'Verifique o formato pesquisado (ex.: 01/2025) ou limpe a busca.'
                  : 'Use o formulário ao lado para registrar o primeiro pagamento.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPagamentos.map((p) => {
                const isPaid = p.Status === 'Pago'
                const isUpdating = updatingId === p.id

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* Left: Mes_Ano, Tipo, Data */}
                    <div className="space-y-1 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{p.Mes_Ano}</span>
                        {p.Tipo_Pagamento.includes('Férias') && (
                          <span className="inline-flex items-center text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">
                            <Palmtree className="w-2.5 h-2.5 mr-1" />
                            {p.Dias_Ferias_Gozadas}d descanso
                            {p.Dias_Ferias_Vendidas > 0 && ` + ${p.Dias_Ferias_Vendidas}d abono`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">{p.Tipo_Pagamento}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>Pago/Previsto para: {formatDatePtBR(p.Data_Pagamento)}</span>
                      </div>
                    </div>

                    {/* Middle: Valor Liquido */}
                    <div className="flex items-baseline md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                      <span className="text-[11px] text-slate-400 md:hidden">Valor Líquido:</span>
                      <div className="text-right">
                        <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                          {formatCurrencyBRL(p.Valor_Liquido)}
                        </span>
                        <div className="text-[10px] text-slate-400 tabular-nums">
                          Base: {formatCurrencyBRL(p.Valor_Base)}
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
                        {/* "Marcar como Pago" (only for Pendente) */}
                        {!isPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(p)}
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

                        {/* "Excluir" (Trash icon button with confirmation dialog) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRecordToDelete(p)}
                          title="Excluir lançamento"
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
            <DialogTitle>Excluir este lançamento?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              Esta ação não pode ser desfeita. O registro de{' '}
              <strong>{recordToDelete?.Tipo_Pagamento}</strong> referente a{' '}
              <strong>{recordToDelete?.Mes_Ano}</strong> (
              {recordToDelete ? formatCurrencyBRL(recordToDelete.Valor_Liquido) : ''}) será excluído
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
    </>
  )
}

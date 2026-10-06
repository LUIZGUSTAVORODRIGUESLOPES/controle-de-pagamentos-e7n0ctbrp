import React, { useState, useEffect, useCallback } from 'react'
import { FormularioLancamento } from '@/components/FormularioLancamento'
import { HistoricoPagamentos } from '@/components/HistoricoPagamentos'
import { pagamentosService } from '@/services/pagamentos'
import { useRealtime } from '@/hooks/use-realtime'
import type { PagamentoRecord } from '@/types/pagamento'

export default function Index() {
  const [pagamentos, setPagamentos] = useState<PagamentoRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchPagamentos = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await pagamentosService.list()
      setPagamentos(data)
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPagamentos()
  }, [fetchPagamentos])

  // Real-time subscription to "pagamentos" collection
  useRealtime<PagamentoRecord>('pagamentos', (data) => {
    // When a record is created, updated or deleted across tabs/devices
    if (data.action === 'create') {
      setPagamentos((prev) => {
        // avoid duplicate if already added
        if (prev.some((p) => p.id === data.record.id)) return prev
        const updated = [data.record, ...prev]
        // maintain sorted by Data_Pagamento desc
        return updated.sort((a, b) => b.Data_Pagamento.localeCompare(a.Data_Pagamento))
      })
    } else if (data.action === 'update') {
      setPagamentos((prev) => prev.map((p) => (p.id === data.record.id ? data.record : p)))
    } else if (data.action === 'delete') {
      setPagamentos((prev) => prev.filter((p) => p.id !== data.record.id))
    }
  })

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Painel Financeiro
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerencie mensalidades, férias, abonos e 13º salário com cálculos precisos.
          </p>
        </div>
      </div>

      {/* Two Column Layout:
          Desktop: Form ~40% (lg:col-span-5), History ~60% (lg:col-span-7)
          Mobile: Single column, collapses to Form on top, History below (< 900px)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-5 w-full">
          <FormularioLancamento onSuccess={fetchPagamentos} />
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-7 w-full">
          <HistoricoPagamentos
            pagamentos={pagamentos}
            isLoading={isLoading}
            onRefresh={fetchPagamentos}
          />
        </div>
      </div>
    </div>
  )
}

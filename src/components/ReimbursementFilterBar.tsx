import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ArrowUpDown, Filter, X, SlidersHorizontal } from 'lucide-react'
import type { ReimbursementStatus, ReimbursementType } from '@/types/reimbursement'

export type SortField = 'competence' | 'payment_date' | 'total_amount'
export type SortOrder = 'asc' | 'desc'
export type FilterType = 'all' | ReimbursementType
export type FilterStatus = 'all' | ReimbursementStatus

export interface ReimbursementFiltersState {
  search: string
  sortField: SortField
  sortOrder: SortOrder
  type: FilterType
  status: FilterStatus
}

interface ReimbursementFilterBarProps {
  filters: ReimbursementFiltersState
  onChange: (filters: ReimbursementFiltersState) => void
  onReset: () => void
  totalCount: number
  filteredCount: number
  showStatusFilter?: boolean
  showTypeFilter?: boolean
  showSortPaymentDate?: boolean
  className?: string
}

export function ReimbursementFilterBar({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
  showStatusFilter = true,
  showTypeFilter = true,
  showSortPaymentDate = true,
  className = '',
}: ReimbursementFilterBarProps) {
  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.sortField !== 'competence' ||
    filters.sortOrder !== 'desc' ||
    filters.type !== 'all' ||
    (showStatusFilter && filters.status !== 'all')

  const update = (partial: Partial<ReimbursementFiltersState>) => {
    onChange({ ...filters, ...partial })
  }

  return (
    <div
      className={`space-y-3 bg-slate-50/70 p-3 sm:p-4 rounded-xl border border-slate-200/80 ${className}`}
    >
      {/* Linha principal: Busca e filtros rápidos */}
      <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por executivo, mês/ano, período..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9 h-9 text-xs sm:text-sm bg-white border-slate-200"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controles de Filtros e Ordenação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ordenação por campo */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 pl-2 pr-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Ordenar:</span>
            </span>
            <Select
              value={filters.sortField}
              onValueChange={(val) => update({ sortField: val as SortField })}
            >
              <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 w-[130px] sm:w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competence" className="text-xs">
                  Competência (Mês/Ano)
                </SelectItem>
                {showSortPaymentDate && (
                  <SelectItem value="payment_date" className="text-xs">
                    Data de Quitação
                  </SelectItem>
                )}
                <SelectItem value="total_amount" className="text-xs">
                  Valor Total
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Alternador Ascendente/Descendente */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              title={filters.sortOrder === 'asc' ? 'Ordem: Crescente' : 'Ordem: Decrescente'}
              className="h-7 px-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {filters.sortOrder === 'asc' ? '↑ Cresc' : '↓ Decresc'}
            </Button>
          </div>

          {/* Filtro por Tipo */}
          {showTypeFilter && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 pl-2 pr-0.5 hidden sm:inline">
                Tipo:
              </span>
              <Select
                value={filters.type}
                onValueChange={(val) => update({ type: val as FilterType })}
              >
                <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 w-[100px] sm:w-[110px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Tipos
                  </SelectItem>
                  <SelectItem value="mensal" className="text-xs">
                    Mensal
                  </SelectItem>
                  <SelectItem value="anual" className="text-xs">
                    Anual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por Status */}
          {showStatusFilter && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 pl-2 pr-0.5 hidden sm:inline">
                Status:
              </span>
              <Select
                value={filters.status}
                onValueChange={(val) => update({ status: val as FilterStatus })}
              >
                <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 w-[110px] sm:w-[125px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    Pendente
                  </SelectItem>
                  <SelectItem value="partial" className="text-xs">
                    Parcial
                  </SelectItem>
                  <SelectItem value="paid" className="text-xs">
                    Pago (Quitado)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botão Limpar Filtros quando ativo */}
          {isFiltered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 border-dashed border-slate-300 hover:bg-slate-100"
              title="Restaurar visualização padrão"
            >
              <X className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Barra de resumo de registros encontrados */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60">
        <span className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-slate-400" />
          Exibindo <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> lançamento(s)
          {isFiltered && <span className="text-emerald-700 font-medium">(filtrado)</span>}
        </span>

        {isFiltered && (
          <span className="text-slate-400 hidden sm:inline">
            Filtros ativos:{' '}
            {[
              filters.search ? `"${filters.search}"` : null,
              filters.type !== 'all' ? `Tipo: ${filters.type}` : null,
              filters.status !== 'all' ? `Status: ${filters.status}` : null,
              `Ordenado por: ${
                filters.sortField === 'competence'
                  ? 'Competência'
                  : filters.sortField === 'payment_date'
                    ? 'Data de Quitação'
                    : 'Valor Total'
              } (${filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})`,
            ]
              .filter(Boolean)
              .join(' • ')}
          </span>
        )}
      </div>
    </div>
  )
}

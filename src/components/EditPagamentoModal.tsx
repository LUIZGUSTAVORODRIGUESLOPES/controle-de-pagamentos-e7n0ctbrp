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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Loader2, AlertCircle, Sparkles, Calendar, CheckCircle2, Clock } from 'lucide-react'
import type {
  PagamentoRecord,
  PagamentoUpdateInput,
  TipoPagamento,
  StatusPagamento,
} from '@/types/pagamento'
import { calculateValorLiquido, formatCurrencyBRL } from '@/lib/calculator'

const TIPOS_PAGAMENTO: { value: TipoPagamento; label: string }[] = [
  { value: 'Mensalidade Padrão', label: 'Mensalidade Padrão' },
  { value: 'Férias', label: 'Férias' },
  { value: 'Saldo de Salário (pós-férias)', label: 'Saldo de Salário (pós-férias)' },
  { value: '13º Salário - 1ª Parcela', label: '13º Salário - 1ª Parcela' },
  { value: '13º Salário - 2ª Parcela', label: '13º Salário - 2ª Parcela' },
  { value: '13º Salário - Integral', label: '13º Salário - Integral' },
]

function extractDateOnly(dateString: string): string {
  if (!dateString) return ''
  return dateString.split('T')[0].split(' ')[0]
}

interface EditPagamentoModalProps {
  record: PagamentoRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updated: PagamentoUpdateInput) => Promise<void>
}

export function EditPagamentoModal({
  record,
  open,
  onOpenChange,
  onSave,
}: EditPagamentoModalProps) {
  const [valorBaseInput, setValorBaseInput] = useState<string>('')
  const [mesAno, setMesAno] = useState<string>('')
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento | ''>('')
  const [dataPagamento, setDataPagamento] = useState<string>('')
  const [diasDescansar, setDiasDescansar] = useState<string>('0')
  const [diasVender, setDiasVender] = useState<string>('0')
  const [status, setStatus] = useState<StatusPagamento>('Pendente')

  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Populate form fields when modal opens or record changes
  useEffect(() => {
    if (record) {
      setMesAno(record.Mes_Ano || '')
      setTipoPagamento(record.Tipo_Pagamento || '')
      setDataPagamento(extractDateOnly(record.Data_Pagamento))
      setValorBaseInput(
        record.Valor_Base !== undefined
          ? record.Valor_Base.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
      )
      setDiasDescansar(String(record.Dias_Ferias_Gozadas ?? 0))
      setDiasVender(String(record.Dias_Ferias_Vendidas ?? 0))
      setStatus(record.Status || 'Pendente')
      setErrorMessage(null)
    }
  }, [record, open])

  // Parse numeric valor base
  const numericValorBase = useMemo(() => {
    if (!valorBaseInput) return 0
    const normalized = valorBaseInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }, [valorBaseInput])

  const parsedDiasDescansar = Math.max(0, parseInt(diasDescansar, 10) || 0)
  const parsedDiasVender = Math.max(0, parseInt(diasVender, 10) || 0)

  // Conditionals:
  // - Dias que vai descansar: shown ONLY if "Férias" or "Saldo de Salário (pós-férias)"
  // - Dias que vai vender (Abono): shown ONLY if "Férias"
  const showDiasDescansar =
    tipoPagamento === 'Férias' || tipoPagamento === 'Saldo de Salário (pós-férias)'
  const showDiasVender = tipoPagamento === 'Férias'

  // Live calculation preview
  const breakdown = useMemo(() => {
    if (!tipoPagamento) return null
    return calculateValorLiquido({
      valorBase: numericValorBase,
      tipoPagamento,
      diasGozadas: showDiasDescansar ? parsedDiasDescansar : 0,
      diasVendidas: showDiasVender ? parsedDiasVender : 0,
    })
  }, [
    numericValorBase,
    tipoPagamento,
    showDiasDescansar,
    parsedDiasDescansar,
    showDiasVender,
    parsedDiasVender,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!record) return
    setErrorMessage(null)

    if (numericValorBase <= 0) {
      setErrorMessage('Informe um Valor Base Mensal válido.')
      return
    }

    if (!mesAno.trim()) {
      setErrorMessage('Informe o Mês/Ano de referência (ex: 01/2025).')
      return
    }

    if (!tipoPagamento) {
      setErrorMessage('Selecione o Tipo de Pagamento.')
      return
    }

    if (!dataPagamento) {
      setErrorMessage('Selecione a Data do Pagamento.')
      return
    }

    const payload: PagamentoUpdateInput = {
      Mes_Ano: mesAno.trim(),
      Data_Pagamento: dataPagamento,
      Tipo_Pagamento: tipoPagamento as TipoPagamento,
      Valor_Base: numericValorBase,
      Dias_Ferias_Gozadas: showDiasDescansar ? parsedDiasDescansar : 0,
      Dias_Ferias_Vendidas: showDiasVender ? parsedDiasVender : 0,
      Status: status,
    }

    try {
      setIsSaving(true)
      await onSave(record.id, payload)
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(
        err?.data?.message || err?.message || 'Erro ao atualizar o pagamento. Verifique os campos.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Editar Lançamento
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Altere os dados do lançamento. O valor líquido será recalculado automaticamente.{' '}
                {record && (
                  <span className="font-semibold text-slate-700">
                    ({record.Tipo_Pagamento} • {record.Mes_Ano})
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Linha 1: Valor Base Mensal e Mês/Ano Referência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="editValorBase"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>
                  Valor Base Mensal (R$) <span className="text-red-500">*</span>
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                  R$
                </span>
                <Input
                  id="editValorBase"
                  type="text"
                  value={valorBaseInput}
                  onChange={(e) => setValorBaseInput(e.target.value)}
                  placeholder="1871,25"
                  className="pl-9 font-medium tabular-nums text-slate-800"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="editMesAno"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>
                  Mês/Ano Referência <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Ex: 01/2025</span>
              </Label>
              <Input
                id="editMesAno"
                type="text"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                placeholder="01/2025"
                maxLength={7}
                className="text-slate-800"
                required
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Linha 2: Tipo de Pagamento e Data do Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editTipoPagamento" className="text-xs font-semibold text-slate-700">
                Tipo de Pagamento <span className="text-red-500">*</span>
              </Label>
              <Select
                value={tipoPagamento}
                onValueChange={(val) => setTipoPagamento(val as TipoPagamento)}
                disabled={isSaving}
              >
                <SelectTrigger id="editTipoPagamento" className="text-slate-800">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PAGAMENTO.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editDataPagamento" className="text-xs font-semibold text-slate-700">
                Data do Pagamento <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="editDataPagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="text-slate-800"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Campos condicionais de férias */}
          {showDiasDescansar && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="editDiasDescansar" className="text-xs font-semibold text-slate-700">
                  Dias de Férias que vai descansar <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="editDiasDescansar"
                  type="number"
                  min={0}
                  max={30}
                  value={diasDescansar}
                  onChange={(e) => setDiasDescansar(e.target.value)}
                  className="tabular-nums text-slate-800"
                  disabled={isSaving}
                />
                <p className="text-[11px] text-slate-400">Total de dias de gozo / descanso</p>
              </div>

              {showDiasVender ? (
                <div className="space-y-1.5">
                  <Label htmlFor="editDiasVender" className="text-xs font-semibold text-slate-700">
                    Dias de Férias que vai vender (Abono) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editDiasVender"
                    type="number"
                    min={0}
                    max={10}
                    value={diasVender}
                    onChange={(e) => setDiasVender(e.target.value)}
                    className="tabular-nums text-slate-800"
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-slate-400">
                    Abono pecuniário (máximo permitido: 10 dias)
                  </p>
                </div>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Linha: Status do Pagamento */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <Label htmlFor="editStatus" className="text-xs font-semibold text-slate-700">
                  Status do Lançamento
                </Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as StatusPagamento)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="editStatus" className="text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente" className="text-xs">
                      Pendente (Aguardando Pagamento)
                    </SelectItem>
                    <SelectItem value="Pago" className="text-xs">
                      Pago (Concluído)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-4">
                <span className="text-xs text-slate-500">Status atual:</span>
                {status === 'Pago' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Pago
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Prévia do Valor Líquido recalculado */}
          {tipoPagamento && breakdown && (
            <div className="rounded-xl bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/50 border border-emerald-200/80 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Novo Valor Líquido Recalculado</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tipoPagamento}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-b border-emerald-200/50 pb-2">
                <span className="text-xs text-slate-600">Total Recalculado:</span>
                <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                  {formatCurrencyBRL(breakdown.valorLiquido)}
                </span>
              </div>

              {/* Detalhes da fórmula */}
              <div className="text-[11px] text-slate-600 space-y-1 pt-0.5">
                <div className="flex justify-between">
                  <span>Valor Base Mensal:</span>
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formatCurrencyBRL(numericValorBase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Diária (Base / 30):</span>
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formatCurrencyBRL(breakdown.diaria)}
                  </span>
                </div>

                {tipoPagamento === 'Férias' && (
                  <>
                    <div className="flex justify-between text-emerald-800">
                      <span>1. Dias de descanso ({parsedDiasDescansar}d × diária):</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrencyBRL(breakdown.c1Gozadas)}
                      </span>
                    </div>
                    {parsedDiasVender > 0 && (
                      <div className="flex justify-between text-emerald-800">
                        <span>2. Abono pecuniário ({parsedDiasVender}d × diária):</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrencyBRL(breakdown.c2Vendidas)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-800">
                      <span>3. 1/3 Constitucional (Base / 3):</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrencyBRL(breakdown.c3Terco)}
                      </span>
                    </div>
                  </>
                )}

                {tipoPagamento === 'Saldo de Salário (pós-férias)' && (
                  <div className="flex justify-between text-emerald-800">
                    <span>
                      Dias Trabalhados (30 - {parsedDiasDescansar} = {breakdown.diasTrabalhados}d ×
                      diária):
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrencyBRL(breakdown.valorLiquido)}
                    </span>
                  </div>
                )}

                {(tipoPagamento === '13º Salário - 1ª Parcela' ||
                  tipoPagamento === '13º Salário - 2ª Parcela') && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Cálculo de Parcela (Base / 2):</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrencyBRL(breakdown.valorLiquido)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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

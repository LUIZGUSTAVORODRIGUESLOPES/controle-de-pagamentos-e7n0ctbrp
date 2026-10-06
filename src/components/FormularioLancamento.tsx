import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, Calendar, DollarSign, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { calculateValorLiquido, formatCurrencyBRL } from '@/lib/calculator'
import { pagamentosService } from '@/services/pagamentos'
import { useToast } from '@/hooks/use-toast'
import type { TipoPagamento } from '@/types/pagamento'

const DEFAULT_VALOR_BASE = 1871.25

const TIPOS_PAGAMENTO: { value: TipoPagamento; label: string }[] = [
  { value: 'Mensalidade Padrão', label: 'Mensalidade Padrão' },
  { value: 'Férias', label: 'Férias' },
  { value: 'Saldo de Salário (pós-férias)', label: 'Saldo de Salário (pós-férias)' },
  { value: '13º Salário - 1ª Parcela', label: '13º Salário - 1ª Parcela' },
  { value: '13º Salário - 2ª Parcela', label: '13º Salário - 2ª Parcela' },
  { value: '13º Salário - Integral', label: '13º Salário - Integral' },
]

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface FormularioLancamentoProps {
  onSuccess?: () => void
}

export const FormularioLancamento: React.FC<FormularioLancamentoProps> = ({ onSuccess }) => {
  const { toast } = useToast()

  // Form states
  const [valorBaseInput, setValorBaseInput] = useState<string>('1871,25')
  const [mesAno, setMesAno] = useState<string>('')
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento | ''>('')
  const [dataPagamento, setDataPagamento] = useState<string>(getTodayString())
  const [diasDescansar, setDiasDescansar] = useState<string>('0')
  const [diasVender, setDiasVender] = useState<string>('0')

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Parse numeric valor base
  const numericValorBase = useMemo(() => {
    if (!valorBaseInput) return 0
    const normalized = valorBaseInput.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }, [valorBaseInput])

  const parsedDiasDescansar = Math.max(0, parseInt(diasDescansar, 10) || 0)
  const parsedDiasVender = Math.max(0, parseInt(diasVender, 10) || 0)

  // Conditionals per specification:
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

  const resetForm = () => {
    setValorBaseInput('1871,25')
    setMesAno('')
    setTipoPagamento('')
    setDataPagamento(getTodayString())
    setDiasDescansar('0')
    setDiasVender('0')
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      setIsSubmitting(true)
      await pagamentosService.create({
        Valor_Base: numericValorBase,
        Mes_Ano: mesAno.trim(),
        Tipo_Pagamento: tipoPagamento as TipoPagamento,
        Data_Pagamento: dataPagamento,
        Dias_Ferias_Gozadas: showDiasDescansar ? parsedDiasDescansar : 0,
        Dias_Ferias_Vendidas: showDiasVender ? parsedDiasVender : 0,
      })

      toast({
        title: 'Pagamento registrado!',
        description: `Lançamento de ${tipoPagamento} (${mesAno.trim()}) salvo com sucesso.`,
      })

      resetForm()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(
        err?.data?.message || err?.message || 'Erro ao salvar o pagamento. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Novo Lançamento</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registre um pagamento e o valor líquido será calculado automaticamente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Valor Base Mensal */}
          <div className="space-y-1.5">
            <Label
              htmlFor="valorBase"
              className="text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>
                Valor Base Mensal (R$) <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Padrão: R$ 1.871,25</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                R$
              </span>
              <Input
                id="valorBase"
                type="text"
                value={valorBaseInput}
                onChange={(e) => setValorBaseInput(e.target.value)}
                placeholder="1871,25"
                className="pl-9 font-medium tabular-nums text-slate-800"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 2. Mês/Ano Referência */}
          <div className="space-y-1.5">
            <Label htmlFor="mesAno" className="text-xs font-semibold text-slate-700">
              Mês/Ano Referência <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mesAno"
              type="text"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              placeholder="01/2025"
              maxLength={7}
              className="text-slate-800"
              required
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-slate-400">Ex.: 01/2025</p>
          </div>

          {/* 3. Tipo de Pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="tipoPagamento" className="text-xs font-semibold text-slate-700">
              Tipo de Pagamento <span className="text-red-500">*</span>
            </Label>
            <Select
              value={tipoPagamento}
              onValueChange={(val) => setTipoPagamento(val as TipoPagamento)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="tipoPagamento" className="text-slate-800">
                <SelectValue placeholder="Selecione..." />
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

          {/* 4. Data do Pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="dataPagamento" className="text-xs font-semibold text-slate-700">
              Data do Pagamento <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="dataPagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="text-slate-800"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 5. Dias de Férias que vai descansar - Condicional: Férias OU Saldo de Salário (pós-férias) */}
          <div
            className={`transition-all duration-200 overflow-hidden ${
              showDiasDescansar
                ? 'max-h-28 opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="diasDescansar" className="text-xs font-semibold text-slate-700">
                Dias de Férias que vai descansar <span className="text-red-500">*</span>
              </Label>
              <Input
                id="diasDescansar"
                type="number"
                min={0}
                max={30}
                value={diasDescansar}
                onChange={(e) => setDiasDescansar(e.target.value)}
                className="tabular-nums text-slate-800"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-slate-400">Total de dias de gozo / descanso</p>
            </div>
          </div>

          {/* 6. Dias de Férias que vai vender (Abono) - Condicional: APENAS Férias */}
          <div
            className={`transition-all duration-200 overflow-hidden ${
              showDiasVender
                ? 'max-h-28 opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="diasVender" className="text-xs font-semibold text-slate-700">
                Dias de Férias que vai vender (Abono) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="diasVender"
                type="number"
                min={0}
                max={10}
                value={diasVender}
                onChange={(e) => setDiasVender(e.target.value)}
                className="tabular-nums text-slate-800"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-slate-400">
                Abono pecuniário (máximo permitido: 10 dias)
              </p>
            </div>
          </div>

          {/* Live calculation panel: "Prévia do Valor Líquido" - shown only when Tipo_Pagamento is selected */}
          {tipoPagamento && breakdown && (
            <div className="rounded-xl bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/50 border border-emerald-200/80 p-4 space-y-3 shadow-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Prévia do Valor Líquido</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tipoPagamento}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-b border-emerald-200/50 pb-2">
                <span className="text-xs text-slate-600">Total a Receber:</span>
                <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                  {formatCurrencyBRL(breakdown.valorLiquido)}
                </span>
              </div>

              {/* Formula details breakdown */}
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

                <p className="text-[10px] text-slate-500 italic pt-1">
                  Cálculo previsto — será salvo como Pendente.
                </p>
              </div>
            </div>
          )}

          {/* Primary Submit Button */}
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 shadow-sm active:scale-[0.98] transition-transform"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando Lançamento...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-1.5" />
                Salvar Lançamento
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const { confirmEmailChange } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!token) {
      setErrorMessage('Token de confirmação ausente no link.')
      return
    }

    if (!password) {
      setErrorMessage('Por favor, informe sua senha atual.')
      return
    }

    try {
      setIsLoading(true)
      await confirmEmailChange(token, password)
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(
        err?.data?.message || err?.message || 'Link inválido, expirado ou senha incorreta.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Controle de Pagamentos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Confirmação de alteração de e-mail</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Confirmar novo e-mail</CardTitle>
            <CardDescription>
              Para confirmar a mudança de e-mail, digite sua senha de acesso
            </CardDescription>
          </CardHeader>

          {status === 'success' ? (
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">E-mail alterado com sucesso!</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Seu endereço de e-mail foi atualizado. Faça login novamente utilizando o novo
                    e-mail.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link to="/login">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    Fazer login com novo e-mail
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Sua senha atual</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !token}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={isLoading || !token}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    'Confirmar alteração de e-mail'
                  )}
                </Button>

                <div className="text-center text-sm text-slate-600 mt-2">
                  <Link
                    to="/login"
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Voltar para o login
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-slate-400 mt-8">
          © {new Date().getFullYear()} Controle de Pagamentos
        </p>
      </div>
    </div>
  )
}

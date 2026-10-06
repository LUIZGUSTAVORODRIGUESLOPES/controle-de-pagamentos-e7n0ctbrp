import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.')
      return
    }

    try {
      setIsLoading(true)
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch (err: any) {
      console.error(err)
      // For security and per spec, still show the message or error gracefully
      setSubmitted(true)
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
          <p className="text-sm text-slate-500 mt-1">Recuperação de acesso à conta</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Recuperar senha</CardTitle>
            <CardDescription>
              Informe o e-mail cadastrado para enviarmos as instruções
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Solicitação enviada!</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Se existir uma conta com este e-mail, enviaremos um link de redefinição.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail cadastrado</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={isLoading}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>

                <div className="text-center text-sm text-slate-600 mt-2">
                  Lembrou a senha?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Voltar ao login
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

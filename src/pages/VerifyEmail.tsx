import React, { useEffect, useState } from 'react'
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
import { Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  const { confirmVerification } = useAuth()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Token de verificação ausente no link.')
      return
    }

    let isMounted = true

    confirmVerification(token)
      .then(() => {
        if (isMounted) setStatus('success')
      })
      .catch((err: any) => {
        if (isMounted) {
          setStatus('error')
          setErrorMessage(err?.data?.message || err?.message || 'Link inválido ou expirado.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [token, confirmVerification])

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
          <p className="text-sm text-slate-500 mt-1">Validação de endereço de e-mail</p>
        </div>

        <Card className="shadow-sm border-slate-200 text-center">
          <CardHeader>
            <CardTitle className="text-xl">Confirmação de e-mail</CardTitle>
            <CardDescription>
              {status === 'verifying' && 'Validando seu endereço de e-mail...'}
              {status === 'success' && 'Seu e-mail foi autenticado com sucesso.'}
              {status === 'error' && 'Não foi possível validar seu e-mail.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center py-6">
            {status === 'verifying' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-sm text-slate-600">Verificando dados...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">
                  E-mail verificado com sucesso!
                </h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Sua conta está ativa e pronta para uso. Faça login para continuar.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">Falha na verificação</h3>
                <p className="text-sm text-slate-500 max-w-xs">{errorMessage}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center">
            <Link to="/login" className="w-full">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                Ir para o login
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-8">
          © {new Date().getFullYear()} Controle de Pagamentos
        </p>
      </div>
    </div>
  )
}

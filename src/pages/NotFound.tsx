/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-5xl font-black text-emerald-600">404</span>
        <h1 className="text-xl font-bold text-slate-900 mt-3">Página não encontrada</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          A página que você está procurando não existe ou foi movida.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
        >
          Voltar para o Início
        </a>
      </div>
    </div>
  )
}

export default NotFound

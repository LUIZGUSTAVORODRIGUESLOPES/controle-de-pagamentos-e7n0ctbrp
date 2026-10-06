import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wallet, LogOut, User, Receipt, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const isAdmin = user?.role === 'admin'

  // Scroll detection for subtle header background blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'U'

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Fixed Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-md border-slate-200 shadow-xs'
            : 'bg-white/95 backdrop-blur-sm border-slate-200'
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: App Title and Wallet Icon + Navigation links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight block">
                  Controle de Pagamentos
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:block -mt-1">
                  Gestão de Salários, Férias e 13º
                </span>
              </div>
            </Link>

            {/* Navigation items */}
            {user && (
              <nav className="hidden md:flex items-center gap-1.5 ml-2 pl-4 border-l border-slate-200">
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    location.pathname === '/' || location.pathname.startsWith('/reimbursements')
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reembolsos & Lançamentos</span>
                  {isAdmin && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 font-bold border-0"
                    >
                      Admin
                    </Badge>
                  )}
                </Link>
              </nav>
            )}
          </div>

          {/* Right: User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 h-auto rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Avatar className="w-8 h-8 border border-slate-200 bg-emerald-50 text-emerald-800 font-semibold text-xs">
                    <AvatarFallback className="bg-emerald-100 text-emerald-800">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">{userName}</p>
                    <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                      {user.email}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900 leading-none">
                        {userName}
                      </p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-none truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/')}
                  className="md:hidden cursor-pointer text-xs font-medium text-slate-700"
                >
                  <Receipt className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  <span>Reembolsos & Lançamentos</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Main Content Area - padded to account for fixed header */}
      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-[1120px] mx-auto px-4">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <div className="max-w-[1120px] mx-auto px-4">
          © {new Date().getFullYear()} Controle de Pagamentos
        </div>
      </footer>
    </div>
  )
}

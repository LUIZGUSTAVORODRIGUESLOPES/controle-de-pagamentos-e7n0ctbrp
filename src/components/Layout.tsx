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
import { Wallet, LogOut, User } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)

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
          {/* Left: App Title and Wallet Icon */}
          <div className="flex items-center gap-3">
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
                    <p className="text-xs font-semibold text-slate-900 leading-none">{userName}</p>
                    <p className="text-[11px] text-slate-500 leading-none truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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

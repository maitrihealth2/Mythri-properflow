'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/history', label: 'Your Sessions', icon: 'history' },
  { href: '/text-chat', label: 'Chat', icon: 'health_and_safety' },
  { href: '/profile', label: 'Profile', icon: 'person' },
  { href: '/feedback', label: 'Feedback', icon: 'feedback' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Don't render on login or voice pages
  if (pathname === '/login' || pathname?.startsWith('/voice')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around items-center bg-white/70 backdrop-blur-2xl py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-white/40">
      {navItems.map(({ href, label, icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center w-16 gap-0.5 transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98] ${
              isActive ? 'text-primary' : 'text-on-surface-variant/60 hover:text-primary'
            }`}
          >
            {isActive ? (
              <>
                <div className="bg-primary text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 -translate-y-1">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className="text-[10px] font-label-md font-bold -mt-0.5">{label}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[24px] mt-1">{icon}</span>
                <span className="text-[10px] font-label-md mt-0.5">{label}</span>
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

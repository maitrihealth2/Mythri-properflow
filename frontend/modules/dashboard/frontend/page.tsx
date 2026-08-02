'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDashboardStats, getOnboardingStatus } from '@/core/api'

const getMoodIcon = (mood: string) => {
  switch (mood?.toLowerCase()) {
    case 'joy': return 'wb_sunny';
    case 'calm': return 'spa';
    case 'sadness': return 'water_drop';
    case 'anger': return 'storm';
    case 'fear': return 'air';
    case 'disgust': return 'waves';
    case 'surprise': return 'flare';
    case 'neutral': return 'lens_blur';
    default: return 'spa';
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [username, setUsername] = useState('Seeker')
  const [menuOpen, setMenuOpen] = useState(false)
  const [greeting, setGreeting] = useState('Good morning')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
    if (!token) {
      router.replace('/login')
    } else {
      const storedName = localStorage.getItem('mb_username')
      if (storedName) setUsername(storedName)
      
      // Check onboarding status
      getOnboardingStatus().then(status => {
        if (!status.completed) {
          router.replace('/onboarding')
        } else {
          getDashboardStats().then(setStats).catch(console.error)
        }
      }).catch(console.error)
    }

    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [router])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes orb-breathe-large {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(122, 74, 95, 0.15); }
          50% { transform: scale(1.08); box-shadow: 0 0 80px rgba(122, 74, 95, 0.3); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 18s ease-in-out infinite; }
        .orb-pulse { animation: orb-breathe-large 6s ease-in-out infinite; }
        .ring-pulse { animation: ring-pulse 6s ease-in-out infinite; }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 10px 40px rgba(60, 31, 51, 0.03);
        }
        .glass-panel:hover {
          background: rgba(255, 255, 255, 0.65);
          box-shadow: 0 15px 50px rgba(60, 31, 51, 0.05);
        }
      `}} />

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fff8f5]">
        <div className="absolute inset-0 bg-[url('/assets/background.png')] bg-cover bg-center opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f5]/60 via-transparent to-[#fff8f5]/80"></div>
        <div className="absolute inset-0 bg-grain opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 z-40 w-full px-5 md:px-8 py-4 lg:py-5 flex justify-between items-center transition-all animate-fade-in-up glass-panel border-b border-white/60" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4">
          <span className="text-headline-md font-headline-md font-medium text-primary tracking-wide">Mythri</span>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-12 h-12 flex items-center justify-center rounded-full glass-panel text-primary transition-all active:scale-95 z-50">
            <span className="material-symbols-outlined text-[24px]">grid_view</span>
          </button>
          
          <nav className={`absolute right-0 top-[110%] w-56 bg-white/70 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-3xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 ${menuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
            <Link href="/home" className="text-primary font-bold bg-white/80 px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md transition-colors">
              <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
            </Link>
            <Link href="/text-chat" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
            </Link>
            <Link href="/history" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">history</span> Journal
            </Link>
            <Link href="/feedback" className="text-on-surface-variant hover:bg-white/60 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
              <span className="material-symbols-outlined text-[20px]">feedback</span> Feedback
            </Link>
            <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
            <button onClick={() => { 
              localStorage.clear(); 
              document.cookie = 'mb_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              router.replace('/login'); 
            }} className="text-error hover:bg-error/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md text-left w-full">
              <span className="material-symbols-outlined text-[20px]">logout</span> Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - Single Screen on Desktop */}
      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 lg:px-8 pt-20 pb-24 md:pb-6 flex flex-col md:flex-row gap-4 lg:gap-6 md:h-[100dvh] overflow-y-auto md:overflow-hidden hide-scrollbar">
        
        {/* COLUMN 1: The Core Experience (Left) */}
        <section className="flex flex-col justify-center flex-none md:w-[30%] lg:w-[28%] gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="mb-2 text-center md:text-left pl-2 shrink-0">
            <h1 className="text-display-sm lg:text-display-md font-headline-md text-primary mb-1 tracking-tight leading-tight">
              <span className="opacity-70 font-light italic text-headline-sm lg:text-headline-lg">{greeting},</span><br/>{username}.
            </h1>
            <p className="text-body-sm lg:text-body-md text-on-surface-variant font-body-md opacity-80 max-w-sm mx-auto md:mx-0">
              "Small steps every day create lasting change."
            </p>
          </div>

          <div className="flex flex-col items-center justify-center relative group cursor-pointer mt-8" onClick={() => router.push('/voice-chat')}>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 ring-pulse scale-[0.7] md:scale-[0.8] lg:scale-95 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-primary/10 ring-pulse scale-[0.8] md:scale-90 lg:scale-110 pointer-events-none" style={{ animationDelay: '1s' }}></div>
            
            <div className="w-40 h-40 lg:w-56 lg:h-56 rounded-full bg-gradient-to-br from-white/80 to-primary-fixed/50 backdrop-blur-xl border border-white/60 shadow-2xl orb-pulse flex flex-col items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-[1.03]">
              <span className="material-symbols-outlined text-[40px] lg:text-[56px] text-primary mb-2 opacity-80 group-hover:opacity-100 transition-opacity" style={{ fontVariationSettings: "'wght' 300" }}>mic</span>
              <div className="flex gap-1 items-center h-4 opacity-50">
                <div className="w-1 h-2 bg-primary rounded-full"></div>
                <div className="w-1 h-3 bg-primary rounded-full"></div>
                <div className="w-1 h-4 bg-primary rounded-full"></div>
                <div className="w-1 h-3 bg-primary rounded-full"></div>
                <div className="w-1 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
            
            <div className="mt-6 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 absolute -bottom-8 lg:-bottom-12">
              <span className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-md tracking-wider shadow-lg text-xs lg:text-sm">Start Conversation</span>
            </div>
          </div>
        </section>

        {/* COLUMN 2: Insights & Suggestions (Middle) */}
        <section className="flex flex-col justify-center flex-1 gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          
          <div className="glass-panel rounded-3xl p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-fixed/40 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="flex flex-col h-full justify-center">
              <p className="text-[10px] lg:text-xs font-label-md text-on-surface-variant uppercase tracking-widest opacity-70 mb-2 lg:mb-4">Today's Snapshot</p>
              <div className="flex justify-between items-center px-2">
                <div className="flex flex-col">
                  <span className="material-symbols-outlined text-[28px] lg:text-[32px] text-primary mb-1" style={{ fontVariationSettings: "'wght' 300" }}>
                    {stats?.current_mood ? getMoodIcon(stats.current_mood) : 'spa'}
                  </span>
                  <span className="text-headline-sm text-primary">{stats?.current_mood || 'Calm'}</span>
                  <span className="text-[10px] lg:text-xs text-on-surface-variant mt-1">Current Mood</span>
                </div>
                <div className="w-px h-10 lg:h-12 bg-outline-variant/30"></div>
                <div className="flex flex-col text-right">
                  <span className="material-symbols-outlined text-[24px] lg:text-[28px] text-primary/60 mb-1 ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-headline-sm text-primary">{stats?.wellness_streak || 0} Days</span>
                  <span className="text-[10px] lg:text-xs text-on-surface-variant mt-1">Wellness Streak</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 lg:p-6 flex flex-col justify-center relative overflow-hidden group cursor-pointer transition-all duration-500" onClick={() => router.push('/text-chat')}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-start gap-4 relative z-10 h-full flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px] lg:text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>auto_awesome</span>
                </div>
                <p className="text-[10px] lg:text-xs font-label-md text-primary uppercase tracking-widest opacity-80">Mythri Suggests</p>
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-headline-md text-primary leading-tight mb-2">You've had a busy week. Take 5 minutes to reflect today.</h3>
                <span className="inline-flex items-center gap-1 text-[10px] lg:text-xs font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                  Begin Reflection <span className="material-symbols-outlined text-[14px] transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 lg:p-6 flex flex-col justify-center">
            <p className="text-[10px] lg:text-xs font-label-md text-on-surface-variant uppercase tracking-widest opacity-70 mb-2 lg:mb-4">Journey Summary</p>
            <div className="flex flex-col gap-2 lg:gap-3 justify-center h-full px-2">
              <div className="flex justify-between items-center">
                <span className="text-xs lg:text-sm text-on-surface-variant">Total Sessions</span>
                <span className="font-headline-md text-base lg:text-lg text-primary">{stats?.total_sessions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs lg:text-sm text-on-surface-variant">Journal Entries</span>
                <span className="font-headline-md text-base lg:text-lg text-primary">{stats?.journal_entries || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs lg:text-sm text-on-surface-variant">Mindful Minutes</span>
                <span className="font-headline-md text-base lg:text-lg text-primary">{stats?.mindful_minutes || 0}</span>
              </div>
            </div>
          </div>

        </section>

        {/* COLUMN 3: Actions & Reflections (Right) */}
        <section className="flex flex-col justify-center flex-[1.2] gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          
          <div className="grid grid-cols-2 gap-3 lg:gap-4 shrink-0">
            <Link href="/history" className="glass-panel rounded-3xl p-3 lg:p-5 flex flex-col items-center justify-center text-center gap-2 group transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/50 border border-white flex items-center justify-center text-primary group-hover:bg-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px] lg:text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>edit_document</span>
              </div>
              <div>
                <h4 className="font-headline-md text-sm lg:text-base text-primary mb-0.5">Journal</h4>
                <p className="text-[9px] lg:text-[10px] text-on-surface-variant">Write your thoughts</p>
              </div>
            </Link>

            <Link href="/voice-chat" className="glass-panel rounded-3xl p-3 lg:p-5 flex flex-col items-center justify-center text-center gap-2 group transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/50 border border-white flex items-center justify-center text-primary group-hover:bg-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px] lg:text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>mic</span>
              </div>
              <div>
                <h4 className="font-headline-md text-sm lg:text-base text-primary mb-0.5">Voice</h4>
                <p className="text-[9px] lg:text-[10px] text-on-surface-variant">Speak freely</p>
              </div>
            </Link>

            <Link href="/text-chat" className="glass-panel rounded-3xl p-3 lg:p-5 flex flex-col items-center justify-center text-center gap-2 group transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/50 border border-white flex items-center justify-center text-primary group-hover:bg-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px] lg:text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>self_improvement</span>
              </div>
              <div>
                <h4 className="font-headline-md text-sm lg:text-base text-primary mb-0.5">Exercises</h4>
                <p className="text-[9px] lg:text-[10px] text-on-surface-variant">Breathe & Ground</p>
              </div>
            </Link>
            
            <Link href="/profile" className="glass-panel rounded-3xl p-3 lg:p-5 flex flex-col items-center justify-center text-center gap-2 group transition-all duration-500 hover:-translate-y-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/50 border border-white flex items-center justify-center text-primary group-hover:bg-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px] lg:text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>insights</span>
              </div>
              <div>
                <h4 className="font-headline-md text-sm lg:text-base text-primary mb-0.5">Progress</h4>
                <p className="text-[9px] lg:text-[10px] text-on-surface-variant">Your journey</p>
              </div>
            </Link>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2rem] p-5 lg:p-8 relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\\'0 0 200 200\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'noise\\' x=\\'0\\' y=\\'0\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.65\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23noise)\\'/%3E%3C/svg%3E')] opacity-[0.05] mix-blend-overlay"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-center lg:justify-between">
              <div>
                <span className="material-symbols-outlined text-[28px] lg:text-[36px] opacity-40 mb-2 lg:mb-4" style={{ fontVariationSettings: "'wght' 300" }}>format_quote</span>
                <h3 className="text-base lg:text-headline-sm font-headline-md leading-relaxed mb-3 lg:mb-4 max-w-sm">
                  "{stats?.today_reflection?.quote || "You do not have to be a fire for every mountain blocking you. You could be a water and soft river your way to freedom too."}"
                </h3>
                <p className="text-[10px] lg:text-xs opacity-70 italic">— {stats?.today_reflection?.author || "Nayyirah Waheed"}</p>
              </div>
              
              <div className="mt-4 pt-3 lg:pt-4 border-t border-white/10 flex flex-row justify-between items-center gap-3">
                <div>
                  <p className="font-label-md tracking-wider uppercase opacity-60 text-[9px] lg:text-[10px] mb-0.5">Today's Reflection</p>
                  <p className="font-medium text-xs lg:text-sm">{stats?.today_reflection?.prompt || "Where can you allow yourself to be softer today?"}</p>
                </div>
                <button onClick={() => router.push('/text-chat')} className="bg-white text-primary px-4 py-2 rounded-full text-[10px] lg:text-xs font-label-md transition-transform hover:scale-105 active:scale-95 shrink-0 shadow-lg">
                  Write Entry
                </button>
              </div>
            </div>
          </div>

        </section>
        
        {/* Mobile Spacer for BottomNav */}
        <div className="h-28 w-full md:hidden shrink-0"></div>

      </main>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, register, googleLogin } from '@/core/api'
import { auth, googleProvider } from '@/core/firebase'
import { signInWithPopup, sendPasswordResetEmail } from 'firebase/auth'
import { motion } from 'framer-motion'
import { useRef } from 'react'

const features = [
  { icon: 'shield_locked', title: 'A Safe Space', desc: 'Your conversations are private, encrypted, and completely judgement-free.' },
  { icon: 'psychology', title: 'Cognitive Reflection', desc: 'Identify patterns in your thoughts and navigate them gently with guided insights.' },
  { icon: 'self_improvement', title: 'Real-time Grounding', desc: 'Dynamic breathing and grounding exercises right when you need them most.' }
]

function FeatureCarousel() {
  const [idx, setIdx] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % features.length), 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col md:text-left text-center items-center md:items-start gap-3 md:gap-4 md:border-l-2 border-white/20 md:pl-6 py-2 transition-all duration-500 min-h-[140px]">
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
        <span className="material-symbols-outlined text-white/90 text-4xl md:text-[28px]">{features[idx].icon}</span>
        <h3 className="text-white font-headline-md text-2xl md:text-xl tracking-tight drop-shadow-md">{features[idx].title}</h3>
      </div>
      <p className="text-white/80 font-body-md text-base md:text-sm max-w-sm leading-relaxed drop-shadow px-6 md:px-0">
        {features[idx].desc}
      </p>
      
      {/* Dots */}
      <div className="flex justify-center md:justify-start gap-2 mt-2 w-full md:w-auto">
        {features.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/30 cursor-pointer hover:bg-white/50'}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  )
}

function SanctuaryWisp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  // Recenter when inactive
  useEffect(() => {
    if (!active && containerRef.current) {
      setPos({ 
        x: containerRef.current.clientWidth / 2, 
        y: containerRef.current.clientHeight / 2 
      })
    }
  }, [active])

  // Initial center
  useEffect(() => {
    if (containerRef.current) {
      setPos({ 
        x: containerRef.current.clientWidth / 2, 
        y: containerRef.current.clientHeight / 2 
      })
    }
  }, [])

  const handlePointer = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  return (
    <div 
      ref={containerRef}
      className="md:hidden absolute inset-0 z-20 overflow-hidden touch-none"
      onPointerMove={handlePointer}
      onPointerDown={(e) => { setActive(true); handlePointer(e); }}
      onPointerUp={() => setActive(false)}
      onPointerLeave={() => setActive(false)}
      onPointerCancel={() => setActive(false)}
    >
      {/* Wisp */}
      <motion.div
        animate={{ 
          x: pos.x - 32, 
          y: pos.y - 32, 
          scale: active ? 1.5 : 1,
          opacity: active ? 0.9 : 0.4
        }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.8 }}
        className="absolute w-16 h-16 pointer-events-none flex items-center justify-center"
      >
        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_20px_5px_rgba(255,255,255,0.8)]"></div>
        <motion.div 
           animate={{ scale: [1, 1.4, 1] }} 
           transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           className="absolute inset-0 bg-white/30 blur-xl rounded-full"
        />
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authPhase, setAuthPhase] = useState<'idle' | 'merging' | 'verifying' | 'success' | 'error' | 'transitioning'>('idle')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null;
    if (token) {
      router.replace('/home');
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      
      setAuthPhase('merging')
      await new Promise(r => setTimeout(r, 600))
      setAuthPhase('verifying')
      
      const data = await googleLogin(idToken)
      localStorage.setItem('mb_token', data.access_token)
      localStorage.setItem('mb_username', data.username)
      localStorage.setItem('mb_language', 'en-IN')
      document.cookie = `mb_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`
      sessionStorage.removeItem('mb_session_id')
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'Google' })
      }
      
      setAuthPhase('success')
      await new Promise(r => setTimeout(r, 800))
      
      setAuthPhase('transitioning')
      await new Promise(r => setTimeout(r, 400))
      
      if (data.needs_onboarding) {
        window.location.href = '/onboarding'
      } else {
        window.location.href = '/home'
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err)
      setError(err?.response?.data?.detail || err.message || "Google Sign-In failed.")
      setAuthPhase('idle')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError('Please enter your email address to reset your password.');
      setSuccessMessage('');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      await sendPasswordResetEmail(auth, form.email);
      setSuccessMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errMsg = err?.message || "Failed to send reset email.";
      if (errMsg.includes('user-not-found') || errMsg.includes('EMAIL_NOT_FOUND')) {
        errMsg = "No account found with this email address.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.email.trim() || !form.password.trim() || (mode === 'create' && !form.name.trim())) {
      setError('Please fill in all required fields')
      return
    }
    if (mode === 'create' && form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setError('')
    setSuccessMessage('')
    setLoading(true)
    
    setAuthPhase('merging')
    await new Promise(r => setTimeout(r, 600))
    setAuthPhase('verifying')

    try {
      const data = mode === 'signin'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, 'en-IN')
        
      localStorage.setItem('mb_token', data.access_token)
      localStorage.setItem('mb_username', data.username)
      localStorage.setItem('mb_language', 'en-IN')
      document.cookie = `mb_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`
      sessionStorage.removeItem('mb_session_id')
      
      setAuthPhase('success')
      await new Promise(r => setTimeout(r, 800))
      
      setAuthPhase('transitioning')
      await new Promise(r => setTimeout(r, 400))

      if (data.needs_onboarding) {
        window.location.href = '/onboarding'
      } else {
        window.location.href = '/home'
      }
    } catch (err: any) {
      console.error("API Error:", err)
      let errorMessage = err?.response?.data?.detail || err.message || "Something didn't quite work. Please check your details."
      
      if (typeof errorMessage === 'string') {
        const lowerError = errorMessage.toLowerCase();
        if (lowerError.includes('invalid_login_credentials') || lowerError.includes('invalid-credential') || lowerError.includes('wrong-password') || lowerError.includes('user-not-found')) {
          errorMessage = "Invalid credentials. Please check your email and password.";
        } else if (lowerError.includes('email-already-in-use') || lowerError.includes('email_exists')) {
          errorMessage = "An account with this email already exists.";
        } else if (lowerError.includes('weak-password')) {
          errorMessage = "Password should be at least 6 characters.";
        }
      }
      
      setError(errorMessage)
      setAuthPhase('error')
      await new Promise(r => setTimeout(r, 1500))
      
      setAuthPhase('idle')
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen relative overflow-hidden bg-surface dark:bg-background flex-col md:flex-row">
      <style dangerouslySetInnerHTML={{ __html: `
          @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
          }
      `}} suppressHydrationWarning />
      
      {/* Left Side: Visual Sanctuary (Full screen on mobile, 60% on desktop) */}
      <div className="absolute md:relative inset-0 md:inset-auto w-full md:w-[60%] h-screen overflow-hidden flex flex-col justify-between p-8 pt-16 md:p-12 lg:p-16 z-0">
        <img 
            src="/assets/login%20page.jpeg" 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover z-0" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80 md:bg-gradient-to-b md:from-black/70 md:via-black/30 md:to-black/80 z-10"></div>
        
        {/* Mobile-only Top Brand */}
        <div className="md:hidden relative z-20 text-center animate-fade-in-up mt-12" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-white font-display-lg text-5xl mb-2 tracking-tight drop-shadow-md">Mythri</h1>
            <p className="text-white/90 font-body-md text-base italic tracking-wide drop-shadow">A digital sanctuary for the mind.</p>
        </div>

        {/* Desktop Top Brand */}
        <div className="hidden md:block relative z-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-white font-display-lg text-5xl lg:text-6xl mb-2 tracking-tight">Mythri</h1>
            <p className="text-white/80 font-body-md text-lg italic tracking-wide">A digital sanctuary for the mind.</p>
        </div>
        
        {/* Desktop Feature Carousel */}
        <div className="hidden md:block relative z-20 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <FeatureCarousel />
        </div>

        {/* Mobile Interactive Wisp */}
        <SanctuaryWisp />

        {/* Mobile Get Started Button */}
        <div className="md:hidden relative z-20 w-full animate-fade-in-up mt-auto pb-4" style={{ animationDelay: '0.3s' }}>
            <button 
                onClick={() => setMobileDrawerOpen(true)}
                className="w-full bg-white text-on-surface font-label-md text-base h-14 rounded-full shadow-xl shadow-black/20 flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
            >
                Get Started
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      <div 
        className={`md:hidden absolute inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity duration-500 ${mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Right Side: Auth Panel (Bottom Sheet on Mobile, 40% on Desktop) */}
      <div className={`absolute md:relative bottom-0 w-full md:w-[40%] max-h-[85vh] md:max-h-none h-auto md:h-screen overflow-y-auto flex flex-col items-center justify-start md:justify-center p-6 md:p-12 bg-surface dark:bg-surface-container shadow-[0_-20px_40px_rgba(0,0,0,0.15)] md:shadow-[-20px_0_40px_rgba(0,0,0,0.1)] z-30 rounded-t-[2.5rem] md:rounded-none transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mobileDrawerOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
         
         {/* Mobile Drag Handle */}
         <div className="w-12 h-1.5 bg-outline/20 rounded-full mb-6 md:hidden flex-shrink-0 mx-auto cursor-pointer" onClick={() => setMobileDrawerOpen(false)}></div>

         <main className={`relative z-20 w-full max-w-[400px] mx-auto animate-fade-in-up transition-opacity duration-500 ${authPhase === 'transitioning' ? 'opacity-0' : 'opacity-100'}`} style={{ animationDelay: '0.2s' }}>
             
             {/* The Form */}
             <div id="authStep" className="w-full space-y-6 relative pb-8 md:pb-0">
                 
                 {/* Tab Switcher */}
                 <div className={`relative w-full flex border-b border-outline/20 transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden border-transparent mb-0' : 'opacity-100 h-10 mb-2'}`}>
                     <button
                         className={`flex-1 text-center font-label-md text-sm transition-colors pb-3 ${mode === 'signin' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                         onClick={() => { setMode('signin'); setError(''); }}
                         type="button" disabled={authPhase !== 'idle'}>
                         Sign in
                     </button>
                     <button
                         className={`flex-1 text-center font-label-md text-sm transition-colors pb-3 ${mode === 'create' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                         onClick={() => { setMode('create'); setError(''); }}
                         type="button" disabled={authPhase !== 'idle'}>
                         Create account
                     </button>
                     {/* Active Underline */}
                     <div className="absolute bottom-0 left-0 w-1/2 h-[2px] bg-primary tab-underline transition-transform duration-300"
                         style={{ transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)' }}></div>
                 </div>

                 {/* Auth Form */}
                 <form className="w-full space-y-4 relative" onSubmit={handleSubmit}>
                     
                     {/* Welcome Message (Dynamic) */}
                     <div className={`transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 scale-95 h-0 overflow-hidden mb-0' : 'opacity-100 scale-100 h-[60px] mb-2 space-y-1'}`}>
                         <h2 className="text-on-surface font-headline-md text-2xl md:text-3xl tracking-tight">
                             {mode === 'signin' ? 'Return to your space' : 'Join our sanctuary'}
                         </h2>
                         <p className="text-on-surface-variant font-body-sm text-sm">
                             {mode === 'signin' ? 'Take a deep breath and step inside.' : 'Begin your journey toward quiet reflection.'}
                         </p>
                     </div>

                     {/* Name Field (Hidden for Sign In) */}
                     {mode === 'create' && (
                         <div className={`transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden m-0' : 'opacity-100 h-[72px] space-y-1.5'} animate-fade-up`}>
                             <label className="block font-label-md text-sm text-on-surface ml-1" htmlFor="name">Full name</label>
                             <input
                                 className="w-full h-12 px-5 rounded-2xl border border-outline/20 bg-surface-variant/30 text-on-surface font-body-md placeholder:text-on-surface-variant/50 focus:bg-surface-variant/50 focus:border-primary transition-all outline-none"
                                 id="name" placeholder="John Doe" type="text"
                                 value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                 required
                                 disabled={authPhase !== 'idle'}
                             />
                         </div>
                     )}

                     {/* Credentials Merge Container */}
                     <div className={`relative flex flex-col mx-auto transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden z-20 ${
                         authPhase !== 'idle' 
                         ? 'gap-0 p-6 md:p-8 rounded-[2rem] bg-surface border border-primary/20 shadow-xl shadow-primary/5 scale-[1.02] w-[240px] h-[240px]'
                         : 'gap-4 p-0 bg-transparent border border-transparent rounded-2xl scale-100 w-full h-[160px]'
                     }`}>
                         
                         {/* Inside Verification UI */}
                         <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out z-30 ${
                             authPhase === 'verifying' || authPhase === 'success' || authPhase === 'error' || authPhase === 'transitioning'
                             ? 'opacity-100 pointer-events-auto delay-100 bg-surface/90 backdrop-blur-md'
                             : 'opacity-0 pointer-events-none'
                         }`}>
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-700 ${
                                 authPhase === 'success' 
                                 ? 'scale-100 bg-primary border border-primary/40 shadow-lg shadow-primary/20 text-on-primary' 
                                 : authPhase === 'error'
                                 ? 'scale-100 bg-error border border-error/40 shadow-lg shadow-error/20 text-on-error'
                                 : 'scale-90 bg-surface border border-outline/20'
                             }`}>
                                 {(authPhase === 'merging' || authPhase === 'verifying') && (
                                     <div className="w-8 h-8 relative flex items-center justify-center">
                                         <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                                         <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                                         <div className="absolute inset-0 border-2 border-primary/40 border-b-transparent rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
                                     </div>
                                 )}
                                 {authPhase === 'success' && (
                                     <svg className="w-8 h-8 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'drawCheck 0.6s ease-out forwards' }} />
                                     </svg>
                                 )}
                                 {authPhase === 'error' && (
                                     <svg className="w-8 h-8 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'drawCheck 0.4s ease-out forwards' }} />
                                     </svg>
                                 )}
                             </div>
                             <p className={`mt-4 font-label-md tracking-[0.2em] uppercase text-[10px] text-center px-4 transition-all duration-500 ${authPhase === 'success' ? 'opacity-100 text-primary' : authPhase === 'error' ? 'opacity-100 text-error' : 'opacity-70 animate-pulse text-primary'}`}>
                                 {authPhase === 'success' ? 'Identity Confirmed' : authPhase === 'error' ? 'Verification Failed' : 'Verifying...'}
                             </p>
                         </div>

                         {/* Email Input wrapper */}
                         <div className={`flex flex-col justify-center w-full transition-all duration-700 ease-in-out ${
                             authPhase !== 'idle' ? 'h-10 opacity-0 pointer-events-none' : 'h-[72px] opacity-100'
                         }`}>
                             <label className={`block font-label-md text-sm text-on-surface ml-1 mb-1.5 transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'opacity-100'}`} htmlFor="email">Email address</label>
                             <input
                                 className={`w-full h-12 px-5 rounded-2xl font-body-md transition-all duration-700 outline-none ${
                                     authPhase !== 'idle' 
                                     ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                     : 'bg-surface-variant/30 border border-outline/20 focus:bg-surface-variant/50 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50'
                                 }`}
                                 id="email" placeholder="name@example.com" required type="email"
                                 value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                 disabled={authPhase !== 'idle'}
                             />
                         </div>

                         {/* Password Input wrapper */}
                         <div className={`flex gap-4 w-full transition-all duration-700 ease-in-out ${
                             authPhase !== 'idle' ? 'h-10 opacity-0 pointer-events-none' : 'h-[72px] opacity-100'
                         }`}>
                             <div className="flex flex-col justify-center relative flex-1 h-full">
                                 <div className={`flex justify-between items-center px-1 mb-1.5 transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                     <label className="font-label-md text-sm text-on-surface" htmlFor="password">Password</label>
                                     {mode === 'signin' && (
                                         <button className="font-label-md text-primary/80 hover:text-primary transition-colors text-xs" onClick={handleForgotPassword} type="button" disabled={authPhase !== 'idle'}>Forgot?</button>
                                     )}
                                 </div>
                                 <div className="relative h-12">
                                     <input
                                         className={`w-full h-12 px-5 rounded-2xl font-body-md transition-all duration-700 outline-none ${
                                             authPhase !== 'idle' 
                                             ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                             : 'bg-surface-variant/30 border border-outline/20 focus:bg-surface-variant/50 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50'
                                         }`}
                                         id="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'}
                                         value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                         disabled={authPhase !== 'idle'}
                                     />
                                     <button
                                         className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'text-on-surface-variant hover:text-on-surface flex items-center'}`}
                                         onClick={() => setShowPassword(!showPassword)} type="button" disabled={authPhase !== 'idle'}>
                                         <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                     </button>
                                 </div>
                             </div>

                             {/* Confirm Password Field (Hidden for Sign In) */}
                             {mode === 'create' && (
                                 <div className={`flex flex-col justify-center relative flex-1 h-full transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                     <div className="flex justify-between items-center px-1 mb-1.5">
                                         <label className="font-label-md text-sm text-on-surface" htmlFor="confirmPassword">Confirm</label>
                                     </div>
                                     <div className="relative h-12">
                                         <input
                                             className={`w-full h-12 px-5 rounded-2xl font-body-md transition-all duration-700 outline-none ${
                                                 authPhase !== 'idle' 
                                                 ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                                 : 'bg-surface-variant/30 border border-outline/20 focus:bg-surface-variant/50 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50'
                                             }`}
                                             id="confirmPassword" placeholder="••••••••" required type={showConfirmPassword ? 'text' : 'password'}
                                             value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                             disabled={authPhase !== 'idle'}
                                         />
                                         <button
                                             className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors flex items-center"
                                             onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button" disabled={authPhase !== 'idle'}>
                                             <span className="material-symbols-outlined text-[18px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Error Message */}
                     <div className={`transition-all duration-300 overflow-hidden ${error ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                         <div className="py-3 px-4 bg-error-container/80 backdrop-blur-sm text-on-error-container border border-error/20 rounded-xl font-body-sm text-sm flex items-center gap-3">
                             <span className="material-symbols-outlined text-[18px]">info</span>
                             <span>{error}</span>
                         </div>
                     </div>

                     {/* Success Message */}
                     <div className={`transition-all duration-300 overflow-hidden ${successMessage ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                         <div className="py-3 px-4 bg-primary-container/80 backdrop-blur-sm text-on-primary-container border border-primary/20 rounded-xl font-body-sm text-sm flex items-center gap-3">
                             <span className="material-symbols-outlined text-[18px]">check_circle</span>
                             <span>{successMessage}</span>
                         </div>
                     </div>

                     {/* Submit Button */}
                     <button
                         className={`w-full bg-primary text-on-primary font-label-md text-sm rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-500 flex justify-center items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 mt-2 ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden p-0 border-0 mt-0' : 'h-12 opacity-100'}`}
                         type="submit" disabled={authPhase !== 'idle'}>
                         <span>{mode === 'signin' ? 'Continue to Sanctuary' : 'Create Account'}</span>
                         <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                     </button>
                 </form>

                 {/* Social/Other Methods */}
                 <div className={`w-full transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-24'} animate-fade-up`}>
                     <div className="flex items-center gap-4 mb-3 md:mb-4">
                         <div className="h-[1px] flex-1 bg-outline/20"></div>
                         <span className="font-label-md text-[10px] text-on-surface-variant/70 uppercase tracking-widest">or</span>
                         <div className="h-[1px] flex-1 bg-outline/20"></div>
                     </div>
                     <button
                         className="w-full h-12 border border-outline/30 bg-surface text-on-surface font-label-md text-sm rounded-2xl hover:bg-surface-variant transition-colors flex justify-center items-center gap-3 disabled:opacity-50"
                         type="button" onClick={handleGoogleLogin} disabled={authPhase !== 'idle'}>
                         <svg className="w-5 h-5" viewBox="0 0 24 24">
                             <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                             <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                             <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                             <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                         </svg>
                         Continue with Google
                     </button>
                 </div>
             </div>
         </main>
      </div>
    </div>
  )
}

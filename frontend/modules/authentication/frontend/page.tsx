'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, register, googleLogin, forgotPassword, safeLogError } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import { auth, googleProvider } from '@/core/firebase'
import { signInWithPopup, sendPasswordResetEmail } from 'firebase/auth'

export default function LoginPage() {
  const router = useRouter()
  const { token, user, loading: authLoading, setToken } = useAuth()
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  // Redirect already-authenticated users
  useEffect(() => {
    if (authLoading || !token) return
    if (!user) return
    if (user.waitlist_status === 'waitlisted') {
      router.replace('/waitlist')
    } else {
      router.replace('/home')
    }
  }, [token, user, authLoading, router])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')

      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      
      const data = await googleLogin(idToken)
      setToken(data.access_token, data.username)
      localStorage.setItem('mb_language', 'en-IN')
      sessionStorage.removeItem('mb_session_id')
      
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'Google' })
      }
      
      if (data?.waitlist_status === 'waitlisted') {
        router.replace('/waitlist')
      } else {
        router.replace('/home')
      }
    } catch (err: any) {
      safeLogError("Google Auth Error:", err)
      const detail = err?.response?.data?.detail || err.userMessage || err.message
      if (typeof detail === 'string' && detail.toLowerCase().includes('not allowed to access')) {
        setError("You are not allowed to access right now")
      } else {
        setError(detail || "Google Sign-In failed.")
      }
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim()) {
      setError('Please enter your email address to reset your password.')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')
      try {
        await forgotPassword(form.email.trim())
      } catch {
        await sendPasswordResetEmail(auth, form.email.trim())
      }
      setSuccessMessage('Password reset email sent. Please check your inbox.')
    } catch (err: any) {
      safeLogError("Password reset error:", err)
      let errMsg = err?.message || "Failed to send reset email."
      if (errMsg.includes('user-not-found') || errMsg.includes('EMAIL_NOT_FOUND')) {
        errMsg = "No account found with this email address."
      }
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.email.trim() || !form.password.trim() || (mode === 'create' && !form.name.trim())) {
      setError('Please fill in all required fields.')
      return
    }
    if (mode === 'create' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (mode === 'create' && !agreeTerms) {
      setError('Please accept the Terms & Privacy Policy to continue.')
      return
    }
    
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const data = mode === 'signin'
        ? await login(form.email.trim(), form.password)
        : await register(form.name.trim(), form.email.trim(), form.password, 'en-IN')
        
      setToken(data.access_token, data.username)
      localStorage.setItem('mb_language', 'en-IN')
      sessionStorage.removeItem('mb_session_id')
      
      if (data?.waitlist_status === 'waitlisted') {
        router.replace('/waitlist')
      } else {
        router.replace('/home')
      }
    } catch (err: any) {
      safeLogError("API Error:", err)
      let errorMessage = err?.response?.data?.detail || err.userMessage || err.message || "Authentication failed. Please verify your details."
      
      if (typeof errorMessage === 'string') {
        const lower = errorMessage.toLowerCase()
        if (lower.includes('not allowed to access')) {
          errorMessage = "You are not allowed to access right now."
        } else if (lower.includes('invalid_login_credentials') || lower.includes('invalid-credential') || lower.includes('wrong-password') || lower.includes('user-not-found')) {
          errorMessage = "Invalid credentials. Please check your email and password."
        } else if (lower.includes('email-already-in-use') || lower.includes('email_exists')) {
          errorMessage = "An account with this email already exists."
        } else if (lower.includes('weak-password')) {
          errorMessage = "Password should be at least 6 characters."
        }
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        /* Standalone floating glass pill tabs */
        .floating-glass-pill {
          background: rgba(255, 250, 243, 0.58);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 4px 16px -2px rgba(45, 28, 18, 0.12);
        }

        /* Standalone floating input pills */
        .floating-glass-input {
          background: rgba(255, 250, 243, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 6px 20px -3px rgba(45, 28, 18, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.6);
          transition: all 0.25s ease-in-out;
        }

        .floating-glass-input:focus-within {
          background: rgba(255, 255, 255, 0.94);
          border-color: rgba(62, 42, 32, 0.55);
          box-shadow: 0 8px 25px -4px rgba(45, 28, 18, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.85);
        }

        /* Standalone floating secondary button */
        .floating-glass-button {
          background: rgba(255, 250, 243, 0.68);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 6px 20px -3px rgba(45, 28, 18, 0.12);
          transition: all 0.25s ease-in-out;
        }

        .floating-glass-button:hover {
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 25px -3px rgba(45, 28, 18, 0.18);
        }

        .floating-text-shadow {
          text-shadow: 0 1px 4px rgba(255, 255, 255, 0.4), 0 2px 10px rgba(45, 28, 18, 0.2);
        }

        .brand-text-shadow {
          text-shadow: 0 2px 12px rgba(44, 30, 22, 0.4), 0 4px 24px rgba(0, 0, 0, 0.25);
        }
      `}} />

      {/* Main Container */}
      <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden font-sans antialiased text-[#2F1E16] bg-[#2A1D18]">
        
        {/* Responsive Background Images */}
        {/* Desktop/Tablet (md+): sanctuary-login-desktop.png */}
        {/* Mobile (<md): sanctuary-login-mobile.png */}
        <div 
          className="fixed inset-0 bg-cover bg-no-repeat pointer-events-none z-0 bg-center bg-[url('/assets/sanctuary/sanctuary-login-mobile.png')] md:bg-[url('/assets/sanctuary/sanctuary-login-desktop.png')]"
          aria-hidden="true"
        />

        {/* Ambient Warmth and Contrast Overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-[1] bg-gradient-to-b from-black/35 via-transparent to-black/45 md:bg-gradient-to-r md:from-black/25 md:via-transparent md:to-black/30"
          aria-hidden="true" 
        />

        {/* Main Content Grid */}
        <main className="relative z-10 w-full min-h-[100dvh] flex items-center px-5 sm:px-8 md:px-12 lg:px-20 py-8 md:py-12">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">
            
            {/* ================================================================= */}
            {/* LEFT SECTION: Brand Presentation                                  */}
            {/* ================================================================= */}
            <section className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left select-none pt-4 lg:pt-0">
              <div className="max-w-md flex flex-col items-center lg:items-start w-full">
                
                {/* 4-pointed curved star sparkle glyph */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-[#FAF6EE] mb-2 drop-shadow-md">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" />
                  </svg>
                </div>

                {/* Brand Title */}
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight font-normal text-[#FAF6EE] leading-none mb-3 brand-text-shadow">
                  Mythri
                </h1>

                {/* Tagline */}
                <p className="font-serif text-base sm:text-lg lg:text-[1.2rem] text-[#F3ECE2] opacity-95 tracking-wide font-light brand-text-shadow">
                  Your thoughts. A kinder place.
                </p>

                {/* Assurance badge */}
                <div className="hidden lg:flex items-center gap-2 mt-8 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white/95 text-xs shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Private, encrypted sanctuary</span>
                </div>
              </div>
            </section>

            {/* Center architectural spacer for natural arch view */}
            <div className="hidden lg:block lg:col-span-2"></div>

            {/* ================================================================= */}
            {/* RIGHT SECTION: INDIVIDUALLY FLOATING ELEMENTS (NO CONTAINER BOX)  */}
            {/* ================================================================= */}
            <section className="lg:col-span-5 w-full max-w-[420px] mx-auto lg:mr-0 lg:ml-auto flex flex-col">
              
              {/* Individually Floating Tab Switcher */}
              <div className="flex items-center justify-start mb-6 p-1 rounded-full floating-glass-pill w-fit">
                <button 
                  type="button" 
                  onClick={() => { setMode('signin'); setError(''); setSuccessMessage(''); setForgotPasswordOpen(false); }}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                    mode === 'signin' && !forgotPasswordOpen
                      ? 'bg-[#2B231E] text-[#FAF6EE] shadow-md'
                      : 'text-[#5C4538] hover:text-[#2B231E]'
                  }`}
                >
                  Log In
                </button>
                <button 
                  type="button" 
                  onClick={() => { setMode('create'); setError(''); setSuccessMessage(''); setForgotPasswordOpen(false); }}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                    mode === 'create'
                      ? 'bg-[#2B231E] text-[#FAF6EE] shadow-md'
                      : 'text-[#5C4538] hover:text-[#2B231E]'
                  }`}
                >
                  Create account
                </button>
              </div>

              {/* Individually Floating Header Title */}
              <header className="mb-6 text-left">
                <h2 className="font-serif text-3xl sm:text-4xl text-[#241710] font-normal leading-tight tracking-tight mb-1.5 floating-text-shadow">
                  {forgotPasswordOpen 
                    ? 'Reset your password'
                    : mode === 'signin' 
                      ? 'Welcome back' 
                      : 'Create account'}
                </h2>
                <p className="text-[#4E3B30] text-sm sm:text-base font-normal floating-text-shadow">
                  {forgotPasswordOpen
                    ? "Enter your email to receive a recovery link."
                    : mode === 'signin' 
                      ? 'Step into a calmer you.' 
                      : 'Begin your journey to peace of mind.'}
                </p>
              </header>

              {/* Status Alerts (Floating pills) */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-red-950/20 backdrop-blur-md border border-red-800/30 text-red-950 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm animate-fade-in-up">
                  <span className="material-symbols-outlined text-[18px] text-red-900 shrink-0 mt-0.5">error</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              {successMessage && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/20 backdrop-blur-md border border-emerald-800/30 text-emerald-950 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm animate-fade-in-up">
                  <span className="material-symbols-outlined text-[18px] text-emerald-900 shrink-0 mt-0.5">check_circle</span>
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* FORGOT PASSWORD FORM */}
              {forgotPasswordOpen ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {/* Floating Email Input Pill */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#5C4538]">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </div>
                    <input 
                      type="email" 
                      required 
                      value={form.email} 
                      onChange={(e) => setForm({ ...form, email: e.target.value })} 
                      placeholder="Your email address" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-full floating-glass-input text-sm text-[#2F1E16] placeholder:text-[#7A6658] outline-none"
                    />
                  </div>

                  {/* Floating Submit Button Pill */}
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-full bg-[#2B231E]/95 hover:bg-[#1E1713] text-[#FAF6EE] text-sm font-medium tracking-wide shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send recovery email</span>
                        <span className="text-sm">→</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => { setForgotPasswordOpen(false); setError(''); }}
                      className="text-xs text-[#4E3B30] hover:text-[#241710] font-medium transition-colors floating-text-shadow"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              ) : (
                /* LOGIN / SIGNUP FORM (ALL INDIVIDUALLY FLOATING) */
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  
                  {/* Floating Name Input Pill (Sign Up Only) */}
                  {mode === 'create' && (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#5C4538]">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <input 
                        type="text" 
                        required 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })} 
                        placeholder="Your preferred name" 
                        className="w-full pl-12 pr-4 py-3.5 rounded-full floating-glass-input text-sm text-[#2F1E16] placeholder:text-[#7A6658] outline-none"
                      />
                    </div>
                  )}

                  {/* Floating Email / Username Input Pill */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#5C4538]">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </div>
                    <input 
                      type="text" 
                      required 
                      autoComplete="username"
                      value={form.email} 
                      onChange={(e) => setForm({ ...form, email: e.target.value })} 
                      placeholder={mode === 'signin' ? "Email or username" : "Your email address"} 
                      className="w-full pl-12 pr-4 py-3.5 rounded-full floating-glass-input text-sm text-[#2F1E16] placeholder:text-[#7A6658] outline-none"
                    />
                  </div>

                  {/* Floating Password Input Pill */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#5C4538]">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      value={form.password} 
                      onChange={(e) => setForm({ ...form, password: e.target.value })} 
                      placeholder="Password" 
                      className="w-full pl-12 pr-12 py-3.5 rounded-full floating-glass-input text-sm text-[#2F1E16] placeholder:text-[#7A6658] outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#5C4538] hover:text-[#2F1E16] focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Floating Confirm Password Input Pill (Sign Up Only) */}
                  {mode === 'create' && (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#5C4538]">
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                      </div>
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        required 
                        autoComplete="new-password"
                        value={form.confirmPassword} 
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                        placeholder="Confirm password" 
                        className="w-full pl-12 pr-12 py-3.5 rounded-full floating-glass-input text-sm text-[#2F1E16] placeholder:text-[#7A6658] outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle confirm password visibility"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#5C4538] hover:text-[#2F1E16] focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Floating Terms Checkbox (Sign Up Only) */}
                  {mode === 'create' && (
                    <div className="flex items-start gap-2.5 pt-1 text-left px-1">
                      <input 
                        type="checkbox" 
                        id="terms-check" 
                        checked={agreeTerms} 
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-[#2B231E] focus:ring-[#2B231E] border-[#5C4538]/40"
                      />
                      <label htmlFor="terms-check" className="text-xs text-[#4E3B30] leading-snug floating-text-shadow">
                        I agree to the Terms of Service & Privacy Policy by Affyne Labs.
                      </label>
                    </div>
                  )}

                  {/* Floating Forgot Password Link (Sign In Only) */}
                  {mode === 'signin' && (
                    <div className="flex justify-end pt-0.5 px-2">
                      <button 
                        type="button" 
                        onClick={() => { setForgotPasswordOpen(true); setError(''); }}
                        className="text-xs text-[#4E3B30] hover:text-[#241710] font-medium transition-colors focus:outline-none floating-text-shadow"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Floating Primary Action Button Pill */}
                  <div className="pt-1">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-[#2B231E]/95 hover:bg-[#1E1713] text-[#FAF6EE] text-sm font-medium tracking-wide shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{mode === 'signin' ? 'Log In' : 'Create Account'}</span>
                          <span className="text-sm">→</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Floating Divider */}
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/30"></div>
                    <span className="flex-shrink mx-3 text-[#5C4538] text-[11px] uppercase tracking-wider font-medium floating-text-shadow">or</span>
                    <div className="flex-grow border-t border-white/30"></div>
                  </div>

                  {/* Floating Google Sign-In Button Pill */}
                  <button 
                    type="button" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3 px-5 rounded-full floating-glass-button text-[#2F1E16] text-sm font-medium tracking-wide active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                </form>
              )}

              {/* Floating Bottom Prompt */}
              <div className="mt-6 pt-3 text-center">
                <p className="text-xs sm:text-sm text-[#4E3B30] floating-text-shadow">
                  {mode === 'signin' ? (
                    <>
                      New to Mythri?{' '}
                      <button 
                        type="button" 
                        onClick={() => { setMode('create'); setError(''); setSuccessMessage(''); setForgotPasswordOpen(false); }}
                        className="font-semibold text-[#241710] underline underline-offset-4 decoration-[#241710]/50 hover:decoration-[#241710] transition-colors"
                      >
                        Create account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button 
                        type="button" 
                        onClick={() => { setMode('signin'); setError(''); setSuccessMessage(''); setForgotPasswordOpen(false); }}
                        className="font-semibold text-[#241710] underline underline-offset-4 decoration-[#241710]/50 hover:decoration-[#241710] transition-colors"
                      >
                        Log in
                      </button>
                    </>
                  )}
                </p>
              </div>

            </section>

          </div>
        </main>

      </div>
    </>
  )
}

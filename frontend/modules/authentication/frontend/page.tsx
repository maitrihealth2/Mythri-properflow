'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, register, googleLogin } from '@/core/api'
import { auth, googleProvider } from '@/core/firebase'
import { signInWithPopup, sendPasswordResetEmail } from 'firebase/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authPhase, setAuthPhase] = useState<'idle' | 'merging' | 'verifying' | 'success' | 'transitioning'>('idle')

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
    
    // Stage 2: Fields Combine
    setAuthPhase('merging')
    await new Promise(r => setTimeout(r, 600))
    
    // Stage 3: Verification Container
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
      
      // Stage 4: Successful Verification
      setAuthPhase('success')
      await new Promise(r => setTimeout(r, 800))
      
      // Stage 5: Transition to Home
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
      // Reverse Gracefully
      setAuthPhase('idle')
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center md:justify-start relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
          @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
          }
      `}} suppressHydrationWarning />
      
      {/* Image Background */}
      <img 
          src="/assets/login%20page.jpeg" 
          alt="Background" 
          className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none" 
      />
      
      {/* Overlay for better contrast */}
      <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-0 pointer-events-none"></div>
      
      {/* Main Authentication Container */}
      <main className={`relative z-10 w-full max-w-[420px] mx-auto md:mx-0 md:ml-[10vw] px-6 md:px-0 animate-fade-in-up transition-opacity duration-500 ${authPhase === 'transitioning' ? 'opacity-0' : 'opacity-100'}`} style={{ animationDelay: '0.1s' }}>
          <div className="bg-white/10 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] rounded-[2.5rem] w-full px-6 py-8 md:px-10 flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
              
              {/* The absolute overlay is removed because the verification UI is now inside the merged credential container */}

              {/* Brand Identity */}
              <div className={`text-center transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 -translate-y-4 blur-sm pointer-events-none' : 'opacity-100 translate-y-0 blur-none'} -mt-2`}>
                  <h1 className="text-white font-display-lg text-4xl md:text-5xl mb-1">Mythri</h1>
                  <p className="text-white/70 font-body-md text-sm md:text-base italic opacity-90">A digital sanctuary for the mind.</p>
              </div>

              {/* Step 1: Auth Container */}
              <div id="authStep" className="w-full space-y-5 relative">
                  
                  {/* Tab Switcher */}
                  <div className={`relative w-full flex border-b border-white/20 transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden border-transparent' : 'opacity-100 h-12'}`}>
                      <button
                          className={`flex-1 text-center font-label-md text-sm transition-colors ${mode === 'signin' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                          onClick={() => { setMode('signin'); setError(''); }}
                          type="button" disabled={authPhase !== 'idle'}>
                          Sign in
                      </button>
                      <button
                          className={`flex-1 text-center font-label-md text-sm transition-colors ${mode === 'create' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                          onClick={() => { setMode('create'); setError(''); }}
                          type="button" disabled={authPhase !== 'idle'}>
                          Create account
                      </button>
                      {/* Active Underline */}
                      <div className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-white tab-underline transition-transform duration-300"
                          style={{ transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)' }}></div>
                  </div>

                  {/* Auth Form */}
                  <form className="w-full space-y-3 relative" onSubmit={handleSubmit}>
                      
                      {/* Welcome Message (Dynamic) */}
                      <div className={`text-center transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 scale-95 h-0 overflow-hidden mb-0' : 'opacity-100 scale-100 h-[50px] mb-1 space-y-1'}`}>
                          <h2 className="text-white font-headline-md text-xl md:text-2xl">
                              {mode === 'signin' ? 'Welcome back' : 'Join our sanctuary'}
                          </h2>
                          <p className="text-white/70 font-body-sm text-xs md:text-sm">
                              {mode === 'signin' ? 'Please enter your credentials to continue.' : 'Begin your journey toward quiet reflection.'}
                          </p>
                      </div>

                      {/* Name Field (Hidden for Sign In) */}
                      {mode === 'create' && (
                          <div className={`transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-[72px] space-y-1.5'} animate-fade-up`}>
                              <label className="block font-label-md text-sm text-white ml-1" htmlFor="name">Full name</label>
                              <input
                                  className="w-full h-12 px-5 rounded-2xl border border-white/20 bg-white/20 text-white font-body-md placeholder:text-white/50 focus:bg-white/30 transition-all outline-none"
                                  id="name" placeholder="John Doe" type="text"
                                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                  required
                                  disabled={authPhase !== 'idle'}
                              />
                          </div>
                      )}

                      {/* Credentials Merge Container */}
                      <div className={`relative flex flex-col transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden z-20 ${
                          authPhase !== 'idle' 
                          ? 'gap-0 p-4 md:p-6 rounded-[2rem] bg-white/60 border border-primary/30 shadow-xl shadow-primary/5 scale-[1.02]'
                          : 'gap-4 p-0 bg-transparent border border-transparent rounded-2xl scale-100'
                      }`}>
                          
                          {/* Inside Verification UI (Only visible when merging/verifying/success) */}
                          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out z-30 ${
                              authPhase === 'verifying' || authPhase === 'success' || authPhase === 'transitioning'
                              ? 'opacity-100 pointer-events-auto delay-100'
                              : 'opacity-0 pointer-events-none'
                          }`}>
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-700 ${
                                  authPhase === 'success' 
                                  ? 'scale-100 bg-white/80 border border-primary/40 shadow-lg shadow-primary/20' 
                                  : 'scale-90 bg-white/40 border border-white/50'
                              }`}>
                                  {(authPhase === 'merging' || authPhase === 'verifying') && (
                                      <div className="w-8 h-8 relative flex items-center justify-center">
                                          <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                                          <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                                          <div className="absolute inset-0 border-2 border-primary/40 border-b-transparent rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
                                      </div>
                                  )}
                                  {authPhase === 'success' && (
                                      <svg className="w-8 h-8 text-primary drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'drawCheck 0.6s ease-out forwards' }} />
                                      </svg>
                                  )}
                              </div>
                              <p className={`mt-3 font-label-md text-primary tracking-[0.2em] uppercase text-[10px] transition-all duration-500 ${authPhase === 'success' ? 'opacity-100' : 'opacity-70 animate-pulse'}`}>
                                  {authPhase === 'success' ? 'Identity Confirmed' : 'Verifying...'}
                              </p>
                          </div>

                          {/* Email Input wrapper */}
                          <div className={`flex flex-col justify-center transition-all duration-700 ease-in-out ${
                              authPhase !== 'idle' ? 'h-10 opacity-0 pointer-events-none' : 'h-[72px] opacity-100'
                          }`}>
                              <label className={`block font-label-md text-sm text-white ml-1 mb-1.5 transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'opacity-100'}`} htmlFor="email">Email address</label>
                              <input
                                  className={`w-full h-12 px-5 rounded-2xl font-body-md placeholder:text-white/50 transition-all duration-700 outline-none ${
                                      authPhase !== 'idle' 
                                      ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                      : 'bg-white/20 border border-white/20 focus:bg-white/30 text-white'
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
                                      <label className="font-label-md text-sm text-white" htmlFor="password">Password</label>
                                      {mode === 'signin' && (
                                          <button className="font-label-md text-white/70 hover:text-white transition-colors text-xs" onClick={handleForgotPassword} type="button" disabled={authPhase !== 'idle'}>Forgot?</button>
                                      )}
                                  </div>
                                  <div className="relative h-12">
                                      <input
                                          className={`w-full h-12 px-5 rounded-2xl font-body-md placeholder:text-white/50 transition-all duration-700 outline-none ${
                                              authPhase !== 'idle' 
                                              ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                              : 'bg-white/20 border border-white/20 focus:bg-white/30 text-white'
                                          }`}
                                          id="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'}
                                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                          disabled={authPhase !== 'idle'}
                                      />
                                      <button
                                          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'text-white/60 hover:text-white flex items-center'}`}
                                          onClick={() => setShowPassword(!showPassword)} type="button" disabled={authPhase !== 'idle'}>
                                          <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                      </button>
                                  </div>
                              </div>

                              {/* Confirm Password Field (Hidden for Sign In) */}
                              {mode === 'create' && (
                                  <div className={`flex flex-col justify-center relative flex-1 h-full transition-opacity duration-300 ${authPhase !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                      <div className="flex justify-between items-center px-1 mb-1.5">
                                          <label className="font-label-md text-sm text-white" htmlFor="confirmPassword">Confirm</label>
                                      </div>
                                      <div className="relative h-12">
                                          <input
                                              className={`w-full h-12 px-5 rounded-2xl font-body-md placeholder:text-white/50 transition-all duration-700 outline-none ${
                                                  authPhase !== 'idle' 
                                                  ? 'bg-transparent border-transparent text-transparent placeholder:text-transparent' 
                                                  : 'bg-white/20 border border-white/20 focus:bg-white/30 text-white'
                                              }`}
                                              id="confirmPassword" placeholder="••••••••" required type={showConfirmPassword ? 'text' : 'password'}
                                              value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                              disabled={authPhase !== 'idle'}
                                          />
                                          <button
                                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors flex items-center"
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
                          <div className="py-3 px-4 bg-error-container/80 backdrop-blur-sm text-on-error-container rounded-xl font-body-sm text-sm flex items-center gap-3">
                              <span className="material-symbols-outlined text-[18px]">info</span>
                              <span>{error}</span>
                          </div>
                      </div>

                      {/* Success Message */}
                      <div className={`transition-all duration-300 overflow-hidden ${successMessage ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                          <div className="py-3 px-4 bg-primary/20 backdrop-blur-sm text-primary rounded-xl font-body-sm text-sm flex items-center gap-3">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              <span>{successMessage}</span>
                          </div>
                      </div>

                      {/* Submit Button */}
                      <button
                          className={`w-full bg-white text-black font-label-md text-sm rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-500 flex justify-center items-center gap-2 shadow-xl shadow-white/10 disabled:opacity-50 mt-1 ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden p-0 border-0 mt-0' : 'h-12 opacity-100'}`}
                          type="submit" disabled={authPhase !== 'idle'}>
                          <span>{mode === 'signin' ? 'Continue to Sanctuary' : 'Create Account'}</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                  </form>

                  {/* Social/Other Methods */}
                  <div className={`w-full transition-all duration-500 ease-in-out ${authPhase !== 'idle' ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-24'} animate-fade-up`}>
                      <div className="flex items-center gap-4 mb-2 md:mb-3">
                          <div className="h-[1px] flex-1 bg-white/20"></div>
                          <span className="font-label-md text-[10px] text-white/50 uppercase tracking-widest">or</span>
                          <div className="h-[1px] flex-1 bg-white/20"></div>
                      </div>
                      <button
                          className="w-full h-12 border border-white/30 bg-white/10 text-white font-label-md text-sm rounded-2xl hover:bg-white/20 transition-colors flex justify-center items-center gap-3 disabled:opacity-50"
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
          </div>
      </main>
    </div>
  )
}

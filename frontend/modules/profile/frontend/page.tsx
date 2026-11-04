'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { getProfile, updateProfile, logout, safeLogError } from '@/core/api'
import { useAuth } from '@/shared/components/contexts/AuthContext'
import ThemeToggle from '@/shared/components/ThemeToggle'
import SanctuaryNavRail from '@/shared/components/SanctuaryNavRail'
import { usePWAContext } from '@/shared/components/PWAProvider'

// ── Ambient Background Component ──────────────────────────────────────────────
const AmbientBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#FFFDF9] dark:bg-[#0a080c]">
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 bg-[url('/mythri_gradient_bg.jpg')] dark:bg-[url('/mythri_gradient_bg_dark_v2.jpg')]"
    />
    <div className="absolute inset-0 bg-white/40 dark:bg-black/15" />
    <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF9]/60 via-[#FDF5F2]/50 to-[#F5E6E1]/60 dark:from-[#141218]/25 dark:via-transparent dark:to-[#221A21]/25" />
    
    {/* Swirling Layer 1 - Muted Plum */}
    <motion.div
      className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] rounded-[40%_60%_70%_30%] blur-[120px] opacity-[0.14] dark:opacity-[0.08]"
      style={{ background: 'radial-gradient(circle, #7A4A5F 0%, transparent 70%)' }}
      animate={{ rotate: [0, 180, 360] }}
      transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
    />
    
    {/* Swirling Layer 2 - Dusty Mocha */}
    <motion.div
      className="absolute bottom-[-15%] right-[-10%] w-[70vw] h-[70vw] rounded-[60%_40%_30%_70%] blur-[130px] opacity-[0.12] dark:opacity-[0.07]"
      style={{ background: 'radial-gradient(circle, #9A7B88 0%, transparent 70%)' }}
      animate={{ rotate: [360, 180, 0] }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
    />
  </div>
)

export default function ProfilePage() {
  const router = useRouter()
  const { token, loading: authLoading, clearAuth } = useAuth()
  const { isInstallable, isInstalled, isStandalone, promptInstall } = usePWAContext()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  
  // Profile Data
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    full_name: '',
    preferred_name: '',
    age: '',
    profession: '',
    preferred_language: 'en-IN',
    setup_percentage: 0,
    member_since: '',
    onboarding_summary: '',
    onboarding_goals: [] as string[],
    onboarding_reasons: [] as string[]
  })
  const [form, setForm] = useState(profile)
  
  // Edit Modes for different sections
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    personal: false,
    contact: false,
    regional: false,
    privacy: false
  })

  const [activeSection, setActiveSection] = useState('personal')

  useEffect(() => {
    setMounted(true)
    if (authLoading) return
    if (!token) {
      router.replace('/login')
      return
    }
    
    getProfile().then(data => {
      const mapped = {
        username: data.username || '',
        email: data.email || '',
        full_name: data.full_name || '',
        preferred_name: data.preferred_name || '',
        age: data.age?.toString() || '',
        profession: data.profession || '',
        preferred_language: data.preferred_language || 'en-IN',
        setup_percentage: data.setup_percentage || 0,
        member_since: data.member_since ? new Date(data.member_since).getFullYear().toString() : '2024',
        onboarding_summary: data.onboarding_summary || '',
        onboarding_goals: data.onboarding_goals || [],
        onboarding_reasons: data.onboarding_reasons || []
      }
      setProfile(mapped)
      setForm(mapped)
    }).catch(err => {
      safeLogError("Failed to load profile", err)
      setError("Failed to load profile. Please refresh.")
    }).finally(() => {
      setLoading(false)
    })
  }, [router, authLoading, token])

  const toggleEdit = (section: string) => {
    if (editMode[section]) {
      setForm(profile)
    }
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }))
    setError(null)
  }

  const handleSave = async (section: string) => {
    setSaving(section)
    setError(null)
    try {
      const updatePayload = {
        full_name: form.full_name || null,
        preferred_name: form.preferred_name || null,
        age: form.age ? parseInt(form.age) : null,
        profession: form.profession || null,
        preferred_language: form.preferred_language
      }
      
      const data = await updateProfile(updatePayload)
      const mapped = {
        username: data.username || '',
        email: data.email || '',
        full_name: data.full_name || '',
        preferred_name: data.preferred_name || '',
        age: data.age?.toString() || '',
        profession: data.profession || '',
        preferred_language: data.preferred_language || 'en-IN',
        setup_percentage: data.setup_percentage || 0,
        member_since: data.member_since ? new Date(data.member_since).getFullYear().toString() : '2024',
        onboarding_summary: data.onboarding_summary || '',
        onboarding_goals: data.onboarding_goals || [],
        onboarding_reasons: data.onboarding_reasons || []
      }
      setProfile(mapped)
      setForm(mapped)
      setEditMode(prev => ({ ...prev, [section]: false }))
      setSuccessToast("Sanctuary profile updated")
      setTimeout(() => setSuccessToast(null), 2500)
    } catch (err) {
      safeLogError("Save profile failed", err)
      setError("Failed to save changes. Please try again.")
    } finally {
      setSaving(null)
    }
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col font-body-md text-[#2C2724] dark:text-[#FAF6EE] overflow-x-hidden">
      <AmbientBackground />

      {/* ── Left Sidebar Navigation Rail ── */}
      <SanctuaryNavRail variant="adaptive" />

      {/* ── Feedback / Success Toast ── */}
      <div
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          successToast
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-[#322119] dark:bg-[#1E1B22] text-[#FAF6F0] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-[#E3D8CC]/30 text-[12.5px] font-medium backdrop-blur-md">
          <span className="material-symbols-outlined text-[17px] text-[#78B39B]">check_circle</span>
          <span>{successToast}</span>
        </div>
      </div>

      {/* ── Top-Left Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 left-3 sm:left-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <Link
          href="/home"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 text-[#322119] dark:text-white/90 hover:scale-105 active:scale-95 transition-all"
          title="Return to Sanctuary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div className="h-8 sm:h-9 px-3 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#78B39B] animate-pulse" />
          <span className="font-serif text-[14px] sm:text-[15px] font-medium tracking-tight text-[#322119] dark:text-white/90">Sanctuary Profile</span>
        </div>
      </div>

      {/* ── Top-Right Floating Controls ── */}
      <div className="fixed top-3.5 sm:top-5 right-3 sm:right-6 z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="h-8 sm:h-9 px-1.5 sm:px-2 rounded-full bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-md shadow-xs border border-[#E3D8CC]/80 dark:border-white/10 flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Main Layout ── */}
      <main className="relative z-10 w-full max-w-[1300px] mx-auto px-4 md:px-8 pl-14 sm:pl-16 md:pl-24 pt-20 pb-16 flex flex-col md:flex-row gap-8 min-h-[calc(100dvh-5rem)]">
        
        {/* Left Sidebar: Profile Card & Navigation */}
        <aside className="w-full md:w-[320px] lg:w-[360px] flex flex-col gap-5 shrink-0">
          
          {/* User Profile Overview Card */}
          <div className="w-full rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-7 flex flex-col items-center relative shadow-[0_12px_36px_-6px_rgba(45,30,20,0.08)]">
            <div className="relative mb-5">
              <div className="w-24 h-24 rounded-full bg-[#F1E6D7]/80 dark:bg-white/10 border-4 border-white dark:border-[#2C2724] shadow-md flex items-center justify-center relative z-10 overflow-hidden">
                <span className="material-symbols-outlined text-[54px] text-[#8B6250] dark:text-zinc-200">
                  person
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-1 mb-5 relative z-10">
              <h1 className="font-serif text-[22px] font-medium text-[#322119] dark:text-[#FAF6EE] tracking-tight">
                {profile.preferred_name || profile.full_name || profile.username || 'Sanctuary Traveler'}
              </h1>
              <p className="text-[13px] text-[#8B6250] dark:text-[#CBAF91] italic">
                {profile.profession || 'Explorer of the Mind'}
              </p>
            </div>

            {/* Metrics */}
            <div className="w-full space-y-3 pt-3 border-t border-[#E3D8CC]/60 dark:border-white/10">
              <div className="flex justify-between items-center text-xs text-[#756A62] dark:text-[#A89D96]">
                <span className="uppercase tracking-wider font-semibold text-[10px]">Sanctuary Setup</span>
                <span className="font-bold text-[#322119] dark:text-white">{profile.setup_percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F1E6D7] dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#322119] dark:bg-[#FAF6EE] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profile.setup_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-[#756A62] dark:text-[#A89D96]">
                <span className="material-symbols-outlined text-[13px] text-[#8B6250]">auto_awesome</span>
                <span>Member since {profile.member_since}</span>
              </div>
            </div>
          </div>

          {/* Section Navigation Pills */}
          <nav className="flex flex-col gap-1.5 w-full">
            {[
              { id: 'personal', label: 'Personal Information', icon: 'person' },
              { id: 'contact', label: 'Contact', icon: 'mail' },
              { id: 'regional', label: 'Regional & Language', icon: 'language' },
              { id: 'onboarding', label: 'Onboarding Insights', icon: 'psychology' },
              { id: 'privacy', label: 'Privacy & Security', icon: 'security' },
            ].map(item => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#322119] text-[#FAF6F0] shadow-sm dark:bg-white dark:text-[#322119]'
                      : 'bg-white/60 dark:bg-[#1E1B22]/60 hover:bg-white/90 dark:hover:bg-[#1E1B22]/90 text-[#49362D] dark:text-zinc-200 border border-[#E3D8CC]/60 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#78B39B] animate-pulse" />}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Right Content Area: Sections */}
        <section className="flex-1 space-y-6 pb-20">
          
          <div className="px-1 mb-2">
            <h2 className="font-serif text-[26px] font-medium text-[#322119] dark:text-[#FAF6EE] tracking-tight">
              Your Profile
            </h2>
            <p className="text-[13px] text-[#756A62] dark:text-[#A89D96]">
              Manage your personal details and sanctuary preferences.
            </p>
            {error && (
              <div className="mt-3 py-2 px-4 bg-error-container/80 text-on-error-container rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
          </div>
          
          {loading && (
            <div className="w-full flex items-center justify-center py-16 text-[#8B6250]">
              <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Personal Information Panel */}
              <div
                id="personal"
                className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                      Personal Information
                    </h3>
                    <p className="text-[11px] text-[#756A62] dark:text-[#A89D96] uppercase tracking-wider mt-0.5">
                      The essence of you
                    </p>
                  </div>
                  <button
                    onClick={() => toggleEdit('personal')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#E3D8CC] dark:border-white/20 text-[12.5px] font-medium text-[#322119] dark:text-white hover:bg-[#F1E6D7]/60 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {editMode.personal ? 'close' : 'edit'}
                    </span>
                    <span>{editMode.personal ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Full Name
                    </label>
                    {editMode.personal ? (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-black/20 border border-[#E3D8CC] dark:border-white/15 focus:border-[#8B6250] text-[14.5px] text-[#322119] dark:text-white outline-none"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="Your full name"
                      />
                    ) : (
                      <p className={`text-[15px] font-medium ${profile.full_name ? 'text-[#322119] dark:text-zinc-100' : 'text-[#756A62]/60 italic'}`}>
                        {profile.full_name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Preferred Name / Alias
                    </label>
                    {editMode.personal ? (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-black/20 border border-[#E3D8CC] dark:border-white/15 focus:border-[#8B6250] text-[14.5px] text-[#322119] dark:text-white outline-none"
                        value={form.preferred_name}
                        onChange={e => setForm({ ...form, preferred_name: e.target.value })}
                        placeholder="What Mythri should call you"
                      />
                    ) : (
                      <p className={`text-[15px] font-medium ${profile.preferred_name ? 'text-[#322119] dark:text-zinc-100' : 'text-[#756A62]/60 italic'}`}>
                        {profile.preferred_name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Age
                    </label>
                    {editMode.personal ? (
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-black/20 border border-[#E3D8CC] dark:border-white/15 focus:border-[#8B6250] text-[14.5px] text-[#322119] dark:text-white outline-none"
                        value={form.age}
                        onChange={e => setForm({ ...form, age: e.target.value })}
                        placeholder="Your age"
                      />
                    ) : (
                      <p className={`text-[15px] font-medium ${profile.age ? 'text-[#322119] dark:text-zinc-100' : 'text-[#756A62]/60 italic'}`}>
                        {profile.age || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Profession
                    </label>
                    {editMode.personal ? (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-black/20 border border-[#E3D8CC] dark:border-white/15 focus:border-[#8B6250] text-[14.5px] text-[#322119] dark:text-white outline-none"
                        value={form.profession}
                        onChange={e => setForm({ ...form, profession: e.target.value })}
                        placeholder="Your occupation or focus"
                      />
                    ) : (
                      <p className={`text-[15px] font-medium ${profile.profession ? 'text-[#322119] dark:text-zinc-100' : 'text-[#756A62]/60 italic'}`}>
                        {profile.profession || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
                
                {editMode.personal && (
                  <div className="mt-6 flex justify-end">
                    <button
                      className="px-6 py-2.5 rounded-full bg-[#322119] dark:bg-white text-white dark:text-[#322119] text-[13px] font-medium hover:scale-105 active:scale-95 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                      onClick={() => handleSave('personal')}
                      disabled={saving === 'personal'}
                    >
                      {saving === 'personal' ? (
                        <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                      ) : (
                        'Save Personal Info'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Information Panel */}
              <div
                id="contact"
                className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                      Contact Information
                    </h3>
                    <p className="text-[11px] text-[#756A62] dark:text-[#A89D96] uppercase tracking-wider mt-0.5">
                      How we reach you
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Email Address
                    </label>
                    <span className="flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="text-[15px] font-medium text-[#322119] dark:text-zinc-200">
                    {profile.email}
                  </p>
                </div>
              </div>

              {/* Regional & Language Panel */}
              <div
                id="regional"
                className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                      Regional & Language
                    </h3>
                    <p className="text-[11px] text-[#756A62] dark:text-[#A89D96] uppercase tracking-wider mt-0.5">
                      Tailor your experience
                    </p>
                  </div>
                  <button
                    onClick={() => toggleEdit('regional')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#E3D8CC] dark:border-white/20 text-[12.5px] font-medium text-[#322119] dark:text-white hover:bg-[#F1E6D7]/60 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {editMode.regional ? 'close' : 'edit'}
                    </span>
                    <span>{editMode.regional ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Primary Language
                    </label>
                    {editMode.regional ? (
                      <div className="relative">
                        <select
                          className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-black/20 border border-[#E3D8CC] dark:border-white/15 focus:border-[#8B6250] text-[14.5px] text-[#322119] dark:text-white outline-none appearance-none cursor-pointer pr-10"
                          value={form.preferred_language}
                          onChange={e => setForm({ ...form, preferred_language: e.target.value })}
                        >
                          <option value="en-IN">English</option>
                          <option value="hi-IN">हिंदी (Hindi)</option>
                          <option value="te-IN">తెలుగు (Telugu)</option>
                          <option value="ta-IN">தமிழ் (Tamil)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8B6250]">
                          expand_more
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#F1E6D7] dark:bg-white/10 flex items-center justify-center text-[#8B6250] dark:text-zinc-200 text-xs font-bold">
                          {profile.preferred_language.split('-')[0].toUpperCase()}
                        </span>
                        <p className="text-[15px] font-medium text-[#322119] dark:text-zinc-100">
                          {profile.preferred_language === 'en-IN' ? 'English' : 
                           profile.preferred_language === 'hi-IN' ? 'हिंदी (Hindi)' :
                           profile.preferred_language === 'te-IN' ? 'తెలుగు (Telugu)' : 'தமிழ் (Tamil)'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5">
                      Timezone
                    </label>
                    <div className="flex items-center gap-2 text-[#756A62] dark:text-zinc-300">
                      <span className="material-symbols-outlined text-[18px] text-[#8B6250]">schedule</span>
                      <p className="text-[14.5px] font-medium text-[#322119] dark:text-zinc-200">
                        IST (UTC+05:30) • India Standard Time
                      </p>
                    </div>
                  </div>
                </div>

                {editMode.regional && (
                  <div className="mt-6 flex justify-end">
                    <button
                      className="px-6 py-2.5 rounded-full bg-[#322119] dark:bg-white text-white dark:text-[#322119] text-[13px] font-medium hover:scale-105 active:scale-95 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                      onClick={() => handleSave('regional')}
                      disabled={saving === 'regional'}
                    >
                      {saving === 'regional' ? (
                        <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                      ) : (
                        'Save Preferences'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Onboarding Insights Panel */}
              <div
                id="onboarding"
                className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]"
              >
                <div className="mb-6">
                  <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                    Onboarding Insights
                  </h3>
                  <p className="text-[11px] text-[#756A62] dark:text-[#A89D96] uppercase tracking-wider mt-0.5">
                    Your Sanctuary Blueprint
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-[#F1E6D7]/40 dark:bg-black/20 border border-[#E3D8CC]/80 dark:border-white/10">
                    <h4 className="text-[12.5px] font-semibold text-[#322119] dark:text-white mb-1.5">
                      Sanctuary Summary
                    </h4>
                    <p className="text-[13.5px] text-[#49362D] dark:text-zinc-300 leading-relaxed">
                      {profile.onboarding_summary || 'Your personalized summary will appear here once onboarding is complete.'}
                    </p>
                  </div>
                  
                  {profile.onboarding_goals && profile.onboarding_goals.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5 mb-2">
                        Primary Goals
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.onboarding_goals.map((goal, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-[#F1E6D7] text-[#322119] text-xs font-medium border border-[#E3D8CC]/80 dark:bg-white/10 dark:text-zinc-200"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.onboarding_reasons && profile.onboarding_reasons.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-[#756A62] dark:text-[#A89D96] pl-0.5 mb-2">
                        Motivations
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.onboarding_reasons.map((reason, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 text-[#8B6250] dark:text-[#CBAF91] text-xs font-medium border border-[#E3D8CC]/60 dark:border-white/10"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy & Security Panel */}
              <div
                id="privacy"
                className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[#322119] dark:text-[#FAF6EE]">
                      Privacy & Security
                    </h3>
                    <p className="text-[11px] text-[#756A62] dark:text-[#A89D96] uppercase tracking-wider mt-0.5">
                      Protect your sanctuary
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Memory & Privacy Section */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-[#E3D8CC]/80 dark:border-white/10">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#8B6250] text-[24px]">psychology</span>
                      <div>
                        <h4 className="text-[14.5px] font-semibold text-[#322119] dark:text-white">
                          Mythri's Memory
                        </h4>
                        <p className="text-[13px] text-[#756A62] dark:text-zinc-400 mt-1 leading-relaxed">
                          Mythri remembers your preferences and past conversations to provide a continuous, tailored sanctuary experience.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3.5 rounded-2xl border border-[#E3D8CC]/60 dark:border-white/10">
                    <div>
                      <p className="text-[14px] font-medium text-[#322119] dark:text-white">Account Password</p>
                      <p className="text-[12px] text-[#756A62] dark:text-zinc-400">Protected & Encrypted</p>
                    </div>
                    <p className="text-[15px] text-[#322119] dark:text-white tracking-[0.25em]">••••••••</p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3.5 rounded-2xl border border-[#E3D8CC]/60 dark:border-white/10">
                    <div>
                      <p className="text-[14px] font-medium text-[#322119] dark:text-white">Two-Factor Authentication</p>
                      <p className="text-[12px] text-[#756A62] dark:text-zinc-400">Extra layer of sanctuary security</p>
                    </div>
                    <span className="text-[10.5px] font-medium text-[#756A62] bg-[#F1E6D7] dark:bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                      Disabled
                    </span>
                  </div>
                </div>
              </div>

              {/* PWA / App Installation Panel */}
              <div className="rounded-3xl bg-white/85 dark:bg-[#1E1B22]/85 backdrop-blur-xl border border-[#E3D8CC]/80 dark:border-white/10 p-6 lg:p-8 shadow-[0_12px_36px_-6px_rgba(45,30,20,0.06)]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F1E6D7] dark:bg-white/10 flex items-center justify-center text-[#8B6250] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">install_mobile</span>
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold text-[#322119] dark:text-white">
                        {isStandalone || isInstalled ? 'Application Installed' : 'Install Mythri Sanctuary'}
                      </h4>
                      <p className="text-[12.5px] text-[#756A62] dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {isStandalone || isInstalled
                          ? 'You are running the official standalone Mythri Sanctuary app with offline caching enabled.'
                          : 'Install Mythri on your desktop or mobile device for quick launch and offline access.'}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isStandalone || isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#78B39B]/20 text-[#2C6B50] dark:text-[#78B39B] text-xs font-medium">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>Installed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => promptInstall()}
                        className="px-5 py-2.5 rounded-full bg-[#322119] dark:bg-white text-white dark:text-[#322119] text-xs font-medium hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Install App</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

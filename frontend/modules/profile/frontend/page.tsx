'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { getProfile, updateProfile, logout } from '@/core/api'
import ThemeToggle from '@/shared/components/ThemeToggle'
import { useTheme } from 'next-themes'

export default function ProfilePage() {
    const router = useRouter()
    const [mainMenuOpen, setMainMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    
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
        member_since: ''
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
    const { theme } = useTheme()

    useEffect(() => {
        setMounted(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('mb_token') : null
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
                member_since: data.member_since ? new Date(data.member_since).getFullYear().toString() : '2024'
            }
            setProfile(mapped)
            setForm(mapped)
        }).catch(err => {
            console.error("Failed to load profile", err)
            setError("Failed to load profile. Please refresh.")
        }).finally(() => {
            setLoading(false)
        })
    }, [router])

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault()
        await logout()
        localStorage.clear()
        sessionStorage.removeItem('mb_session_id')
        router.replace('/login')
    }

    const toggleEdit = (section: string) => {
        if (editMode[section]) {
            // Cancel edit - revert form to saved profile
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
                member_since: data.member_since ? new Date(data.member_since).getFullYear().toString() : '2024'
            }
            setProfile(mapped)
            setForm(mapped)
            setEditMode(prev => ({ ...prev, [section]: false }))
        } catch (err) {
            console.error("Save failed", err)
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

    if (!mounted) return null;

    return (
        <div className="flex-1 w-full h-full min-h-[100dvh] flex flex-col font-body-md text-on-background relative overflow-x-hidden overflow-y-auto">
            {/* Custom Animations & Micro-interactions */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                @keyframes float-slower {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(25px, -15px) scale(0.95); }
                }
                @keyframes particle-drift {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
                }
                @keyframes ring-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
                .animate-float-slower { animation: float-slower 20s ease-in-out infinite; }
                .animate-ring-spin { animation: ring-spin 20s linear infinite; }
                
                .glass-panel-premium {
                    background: rgba(255, 248, 245, 0.45);
                    backdrop-filter: blur(24px) saturate(140%);
                    -webkit-backdrop-filter: blur(24px) saturate(140%);
                    border: 1px solid rgba(255, 255, 255, 0.7);
                    box-shadow: 0 10px 40px rgba(60, 31, 51, 0.03);
                }
                .glass-panel-premium:hover {
                    background: rgba(255, 248, 245, 0.6);
                    box-shadow: 0 15px 50px rgba(60, 31, 51, 0.05);
                }
                .dark .glass-panel-premium {
                    background: rgba(18, 18, 18, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                }
                .dark .glass-panel-premium:hover {
                    background: rgba(30, 30, 30, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
                }
                .glass-input {
                    background: rgba(255, 255, 255, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .glass-input:focus {
                    background: rgba(255, 255, 255, 0.8);
                    border-color: var(--primary);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02), 0 0 0 3px rgba(var(--primary-rgb), 0.1);
                }
            `}} />

            {/* Enhanced Background with Mesh Gradients & Particles */}
            <div className="fixed inset-0 pointer-events-none z-0 dark:bg-black">
                <div className="absolute inset-0 bg-[#fff8f5] dark:bg-black"></div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-50 transition-all duration-1000 ${theme === 'dark' ? "bg-[url('/assets/Gemini_Generated_Image_psevl6psevl6psev-clean.png')]" : "bg-[url('/assets/background.png')]"}`}></div>
                <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-secondary-container/40 mix-blend-multiply filter blur-[120px] animate-float-slow dark:bg-secondary-container/20"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-primary-container/40 mix-blend-multiply filter blur-[140px] animate-float-slower dark:bg-primary-container/20"></div>
                
                {/* Subtle Floating Particles */}
                <div className="absolute top-[20%] left-[20%] w-2 h-2 rounded-full bg-primary/20" style={{ animation: 'particle-drift 8s infinite ease-in-out' }}></div>
                <div className="absolute top-[60%] left-[80%] w-3 h-3 rounded-full bg-secondary/20" style={{ animation: 'particle-drift 12s infinite ease-in-out 2s' }}></div>
                <div className="absolute top-[80%] left-[30%] w-1.5 h-1.5 rounded-full bg-primary/30" style={{ animation: 'particle-drift 10s infinite ease-in-out 4s' }}></div>
            </div>
            
            {/* TopAppBar */}
            <header className="fixed top-0 z-40 flex justify-between items-center w-full px-5 md:px-8 py-4 pointer-events-none transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-4 pointer-events-auto">
                    <Link href="/home" className="material-symbols-outlined text-primary bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-full transition-transform duration-150 hover:bg-white/80 hover:scale-[1.02] active:scale-[0.98] shadow-sm">home</Link>
                    <span className="text-headline-md font-headline-md font-medium text-primary tracking-wide">Mythri</span>
                </div>
                <div className="flex items-center gap-4 relative pointer-events-auto">
                    <ThemeToggle />
                    <button 
                        onClick={() => setMainMenuOpen(!mainMenuOpen)}
                        className="hidden md:flex w-12 h-12 items-center justify-center rounded-full glass-panel-premium text-primary transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] z-50 dark:hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-[24px]">grid_view</span>
                    </button>
                    
                    {/* Desktop Dropdown Menu */}
                    <nav className={`absolute right-0 top-[110%] w-56 bg-white/70 dark:bg-[#121212]/90 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-2xl rounded-3xl flex flex-col p-2 gap-1 origin-top-right transition-all duration-300 hidden md:flex ${mainMenuOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}>
                        <Link href="/home" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
                            <span className="material-symbols-outlined text-[20px]">home</span> Sanctuary
                        </Link>
                        <Link href="/text-chat" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
                            <span className="material-symbols-outlined text-[20px]">health_and_safety</span> Consultation
                        </Link>
                        <Link href="/history" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
                            <span className="material-symbols-outlined text-[20px]">history</span> Your Sessions
                        </Link>
                        <Link href="/profile" className="text-primary font-bold bg-white/80 dark:bg-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md transition-colors">
                            <span className="material-symbols-outlined text-[20px]">person</span> Profile
                        </Link>
                        <Link href="/feedback" className="text-on-surface-variant hover:bg-white/60 dark:hover:bg-white/10 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md">
                            <span className="material-symbols-outlined text-[20px]">feedback</span> Feedback
                        </Link>
                        <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
                        <button onClick={async () => { await logout(); localStorage.clear(); sessionStorage.removeItem('mb_session_id'); router.replace('/login'); }} className="text-error hover:bg-error/10 dark:hover:bg-error/20 transition-colors px-4 py-3 rounded-2xl flex items-center gap-3 font-label-md text-left w-full">
                            <span className="material-symbols-outlined text-[20px]">logout</span> Logout
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="relative z-10 w-full max-w-[1400px] mx-auto px-4 lg:px-8 pt-24 pb-28 md:pb-12 flex flex-col md:flex-row gap-6 lg:gap-10 min-h-[100dvh] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                
                {/* Left Sidebar: Profile Overview & Navigation */}
                <aside className="w-full md:w-[320px] lg:w-[360px] flex flex-col gap-6 shrink-0 pb-8 md:pb-0">
                    
                    {/* Premium User Card */}
                    <div className="w-full glass-panel-premium rounded-[2rem] p-8 flex flex-col items-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        
                        <div className="relative mb-6">
                            {/* Glass Ring Animation */}
                            <div className="absolute inset-[-12px] rounded-full border-2 border-dashed border-primary/20 animate-ring-spin pointer-events-none"></div>
                            <div className="absolute inset-[-4px] rounded-full border border-primary/40 pointer-events-none"></div>
                            
                            <div className="w-28 h-28 rounded-full bg-white/80 backdrop-blur-sm border-4 border-white shadow-xl flex items-center justify-center relative z-10 overflow-hidden">
                                <span className="material-symbols-outlined text-[64px] text-primary/80" style={{ fontVariationSettings: "'wght' 200" }}>person</span>
                            </div>
                            
                            <button className="absolute bottom-0 right-0 z-20 bg-primary text-white w-9 h-9 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center group-hover:bg-primary-dark" title="Update Photo">
                                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                            </button>
                        </div>
                        
                        <div className="text-center space-y-1 mb-6 relative z-10">
                            <h1 className="text-headline-md lg:text-headline-lg font-headline-md text-primary tracking-tight">
                                {profile.preferred_name || profile.username || 'Traveler'}
                            </h1>
                            <p className="text-body-md font-body-md text-primary/60 italic tracking-wide">
                                {profile.profession ? profile.profession : 'Explorer of the Mind'}
                            </p>
                        </div>

                        {/* Meaningful Metrics */}
                        <div className="w-full space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-xs text-on-surface-variant px-1">
                                <span className="font-label-md uppercase tracking-widest opacity-70">Sanctuary Setup</span>
                                <span className="font-medium text-primary">{profile.setup_percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${profile.setup_percentage}%` }}></div>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-on-surface-variant/70 font-medium">
                                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                Member since {profile.member_since}
                            </div>
                        </div>
                    </div>

                    {/* Elegant Vertical Navigation */}
                    <nav className="flex flex-col gap-2 w-full relative z-10">
                        <button 
                            onClick={() => scrollToSection('personal')}
                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-label-md transition-all duration-150 group
                                ${activeSection === 'personal' 
                                    ? 'glass-panel-premium text-primary shadow-md scale-[1.02]' 
                                    : 'hover:bg-white/40 text-on-surface-variant hover:text-primary hover:scale-[1.01]'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSection === 'personal' ? 'bg-primary/10' : 'group-hover:bg-primary/5'}`}>
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeSection === 'personal' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                                </div>
                                Personal Info
                            </div>
                            {activeSection === 'personal' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                        </button>

                        <button 
                            onClick={() => scrollToSection('contact')}
                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-label-md transition-all duration-150 group
                                ${activeSection === 'contact' 
                                    ? 'glass-panel-premium text-primary shadow-md scale-[1.02]' 
                                    : 'hover:bg-white/40 text-on-surface-variant hover:text-primary hover:scale-[1.01]'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSection === 'contact' ? 'bg-primary/10' : 'group-hover:bg-primary/5'}`}>
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeSection === 'contact' ? "'FILL' 1" : "'FILL' 0" }}>mail</span>
                                </div>
                                Contact
                            </div>
                            {activeSection === 'contact' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                        </button>

                        <button 
                            onClick={() => scrollToSection('regional')}
                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-label-md transition-all duration-150 group
                                ${activeSection === 'regional' 
                                    ? 'glass-panel-premium text-primary shadow-md scale-[1.02]' 
                                    : 'hover:bg-white/40 text-on-surface-variant hover:text-primary hover:scale-[1.01]'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSection === 'regional' ? 'bg-primary/10' : 'group-hover:bg-primary/5'}`}>
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeSection === 'regional' ? "'FILL' 1" : "'FILL' 0" }}>language</span>
                                </div>
                                Regional
                            </div>
                            {activeSection === 'regional' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                        </button>

                        <button 
                            onClick={() => scrollToSection('privacy')}
                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-label-md transition-all duration-150 group
                                ${activeSection === 'privacy' 
                                    ? 'glass-panel-premium text-primary shadow-md scale-[1.02]' 
                                    : 'hover:bg-white/40 text-on-surface-variant hover:text-primary hover:scale-[1.01]'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSection === 'privacy' ? 'bg-primary/10' : 'group-hover:bg-primary/5'}`}>
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeSection === 'privacy' ? "'FILL' 1" : "'FILL' 0" }}>security</span>
                                </div>
                                Privacy & Security
                            </div>
                            {activeSection === 'privacy' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                        </button>
                    </nav>
                </aside>

                {/* Right Content Area: Sections */}
                <section className="flex-1 space-y-6 md:space-y-8 pb-32 md:pb-12 scroll-smooth">
                    
                    {/* Page Header */}
                    <div className="px-2 mb-8 hidden md:block">
                        <h2 className="text-display-sm font-headline-md text-primary tracking-tight mb-2">Your Profile</h2>
                        <p className="text-body-lg text-on-surface-variant/80">Manage your personal sanctuary and preferences.</p>
                        {error && (
                            <div className="mt-4 py-2 px-4 bg-error-container/80 text-on-error-container rounded-xl text-sm font-medium animate-fade-in-up">
                                {error}
                            </div>
                        )}
                    </div>
                    
                    {loading && (
                        <div className="w-full flex items-center justify-center py-12">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
                        </div>
                    )}

                    {!loading && (
                        <>
                    {/* Personal Information Panel */}
                    <div id="personal" className="glass-panel-premium rounded-[2rem] p-6 lg:p-10 transition-all duration-300 hover:shadow-xl hover:-translate-y-[1px] hover:shadow-primary/5 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-headline-sm font-headline-md text-primary">Personal Information</h3>
                                <p className="text-xs font-label-md text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">The essence of you</p>
                            </div>
                            <button 
                                onClick={() => toggleEdit('personal')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel-premium text-sm font-medium text-primary hover:bg-white/80 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">{editMode.personal ? 'close' : 'edit'}</span>
                                {editMode.personal ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Full Name</label>
                                {editMode.personal ? (
                                    <input type="text" className="w-full px-4 py-3 rounded-xl glass-input text-base text-primary font-medium outline-none transition-all animate-fade-in" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Not provided" />
                                ) : (
                                    <p className={`text-lg font-headline-md px-1 animate-fade-in ${profile.full_name ? 'text-primary' : 'text-on-surface-variant/50 italic'}`}>{profile.full_name || 'Not provided'}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Preferred Name / Alias</label>
                                {editMode.personal ? (
                                    <input type="text" className="w-full px-4 py-3 rounded-xl glass-input text-base text-primary font-medium outline-none transition-all animate-fade-in" value={form.preferred_name} onChange={e => setForm({...form, preferred_name: e.target.value})} placeholder="Not provided" />
                                ) : (
                                    <p className={`text-lg font-headline-md px-1 animate-fade-in ${profile.preferred_name ? 'text-primary' : 'text-on-surface-variant/50 italic'}`}>{profile.preferred_name || 'Not provided'}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Age</label>
                                {editMode.personal ? (
                                    <input type="number" className="w-full px-4 py-3 rounded-xl glass-input text-base text-primary font-medium outline-none transition-all appearance-none animate-fade-in" value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="Not provided" />
                                ) : (
                                    <p className={`text-lg font-headline-md px-1 animate-fade-in ${profile.age ? 'text-primary' : 'text-on-surface-variant/50 italic'}`}>{profile.age || 'Not provided'}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Profession</label>
                                {editMode.personal ? (
                                    <input type="text" className="w-full px-4 py-3 rounded-xl glass-input text-base text-primary font-medium outline-none transition-all animate-fade-in" value={form.profession} onChange={e => setForm({...form, profession: e.target.value})} placeholder="Not provided" />
                                ) : (
                                    <p className={`text-lg font-headline-md px-1 animate-fade-in ${profile.profession ? 'text-primary' : 'text-on-surface-variant/50 italic'}`}>{profile.profession || 'Not provided'}</p>
                                )}
                            </div>
                        </div>
                        
                        {editMode.personal && (
                            <div className="mt-8 flex justify-end animate-fade-in-up">
                                <button className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center min-w-[160px]" onClick={() => handleSave('personal')} disabled={saving === 'personal'}>
                                    {saving === 'personal' ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Save Personal Info'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Contact Information Panel */}
                    <div id="contact" className="glass-panel-premium rounded-[2rem] p-6 lg:p-10 transition-all duration-300 hover:shadow-xl hover:-translate-y-[1px] hover:shadow-primary/5 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-secondary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-headline-sm font-headline-md text-primary">Contact Information</h3>
                                <p className="text-xs font-label-md text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">How we reach you</p>
                            </div>
                            <button 
                                onClick={() => toggleEdit('contact')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel-premium text-sm font-medium text-primary hover:bg-white/80 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">{editMode.contact ? 'close' : 'edit'}</span>
                                {editMode.contact ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Email Address</label>
                                    <span className="flex items-center gap-1 text-[10px] font-label-md text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[12px]">verified</span> Verified</span>
                                </div>
                                <p className="text-lg font-headline-md text-primary px-1 opacity-70 cursor-not-allowed" title="Email cannot be changed">{profile.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Regional & Language Panel */}
                    <div id="regional" className="glass-panel-premium rounded-[2rem] p-6 lg:p-10 transition-all duration-300 hover:shadow-xl hover:-translate-y-[1px] hover:shadow-primary/5 group relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-headline-sm font-headline-md text-primary">Regional & Language</h3>
                                <p className="text-xs font-label-md text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">Tailor your experience</p>
                            </div>
                            <button 
                                onClick={() => toggleEdit('regional')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel-premium text-sm font-medium text-primary hover:bg-white/80 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">{editMode.regional ? 'close' : 'edit'}</span>
                                {editMode.regional ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Primary Language</label>
                                {editMode.regional ? (
                                    <div className="relative animate-fade-in">
                                        <select className="w-full px-4 py-3 rounded-xl glass-input text-base text-primary font-medium outline-none transition-all appearance-none pr-10 cursor-pointer" value={form.preferred_language} onChange={e => setForm({...form, preferred_language: e.target.value})}>
                                            <option value="en-IN">English</option>
                                            <option value="hi-IN">Hindi</option>
                                            <option value="te-IN">Telugu</option>
                                            <option value="ta-IN">Tamil</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/50">expand_more</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 px-1 animate-fade-in">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{profile.preferred_language.split('-')[0].toUpperCase()}</span>
                                        <p className="text-lg font-headline-md text-primary">
                                            {profile.preferred_language === 'en-IN' ? 'English' : 
                                             profile.preferred_language === 'hi-IN' ? 'Hindi' :
                                             profile.preferred_language === 'te-IN' ? 'Telugu' : 'Tamil'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest opacity-80 pl-1">Timezone</label>
                                <div className="flex items-center gap-3 px-1 opacity-70">
                                    <span className="material-symbols-outlined text-primary/60">schedule</span>
                                    <p className="text-lg font-headline-md text-primary">IST (UTC+05:30) (System Default)</p>
                                </div>
                            </div>
                        </div>

                        {editMode.regional && (
                            <div className="mt-8 flex justify-end animate-fade-in-up">
                                <button className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white font-label-md shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center min-w-[160px]" onClick={() => handleSave('regional')} disabled={saving === 'regional'}>
                                    {saving === 'regional' ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Save Preferences'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Privacy & Security Panel (Visual Mock) */}
                    <div id="privacy" className="glass-panel-premium rounded-[2rem] p-6 lg:p-10 transition-all duration-300 hover:shadow-xl hover:-translate-y-[1px] hover:shadow-primary/5 group relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-headline-sm font-headline-md text-primary">Privacy & Security</h3>
                                <p className="text-xs font-label-md text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">Protect your sanctuary</p>
                            </div>
                            <button 
                                onClick={() => toggleEdit('privacy')}
                                className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel-premium text-sm font-medium text-primary hover:bg-white/80 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">{editMode.privacy ? 'close' : 'edit'}</span>
                                {editMode.privacy ? 'Cancel' : 'Manage'}
                            </button>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 rounded-2xl border border-outline-variant/20 hover:bg-white/30 transition-colors">
                                <div>
                                    <p className="text-base font-headline-md text-primary mb-1">Password</p>
                                    <p className="text-sm font-body-sm text-on-surface-variant">Last changed 3 months ago</p>
                                </div>
                                {editMode.privacy ? (
                                    <button className="px-5 py-2 rounded-xl bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors">Change Password</button>
                                ) : (
                                    <p className="text-lg font-headline-md text-primary tracking-[0.25em]">••••••••</p>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 rounded-2xl border border-outline-variant/20 hover:bg-white/30 transition-colors">
                                <div>
                                    <p className="text-base font-headline-md text-primary mb-1">Two-Factor Authentication</p>
                                    <p className="text-sm font-body-sm text-on-surface-variant">Add an extra layer of security</p>
                                </div>
                                {editMode.privacy ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-on-surface-variant">Disabled</span>
                                        <button className="w-12 h-6 bg-outline-variant/30 rounded-full relative transition-colors cursor-pointer hover:bg-outline-variant/50">
                                            <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm"></div>
                                        </button>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-label-md text-on-surface-variant bg-outline-variant/20 px-3 py-1 rounded-full uppercase tracking-wider">Disabled</span>
                                )}
                            </div>
                            
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 rounded-2xl border border-outline-variant/20 hover:bg-white/30 transition-colors">
                                <div>
                                    <p className="text-base font-headline-md text-primary mb-1">Login Devices</p>
                                    <p className="text-sm font-body-sm text-on-surface-variant">Manage active sessions</p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
                                    <span>1 Active</span>
                                    {editMode.privacy && (
                                        <button className="text-primary hover:underline ml-2 text-xs font-medium">Review</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                        </>
                    )}
                </section>
            </main>

            {/* BottomNavBar (Mobile Only) */}
            <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center bg-white/70 backdrop-blur-xl py-2 px-4 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.05)] border-t border-white/40">
                <Link href="/home" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 px-5 py-1">
                    <span className="material-symbols-outlined text-[24px]">home</span>
                    <span className="text-[10px] font-label-md mt-1">Sanctuary</span>
                </Link>
                <Link href="/history" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 px-5 py-1">
                    <span className="material-symbols-outlined text-[24px]">auto_stories</span>
                    <span className="text-[10px] font-label-md mt-1">History</span>
                </Link>
                <Link href="/text-chat" className="flex flex-col items-center justify-center text-on-surface-variant/60 w-16 transition-all duration-300 active:scale-90 active:opacity-70 px-5 py-1">
                    <span className="material-symbols-outlined text-[24px]">health_and_safety</span>
                    <span className="text-[10px] font-label-md mt-1">Chat</span>
                </Link>
                <Link href="/profile" className="flex flex-col items-center justify-center text-primary w-16 transition-all duration-300 active:scale-90 px-5 py-1">
                    <div className="bg-primary text-white p-2.5 rounded-full shadow-lg transform -translate-y-3 flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                    <span className="text-[10px] font-label-md font-bold -mt-2">Profile</span>
                </Link>
            </nav>
        </div>
    )
}

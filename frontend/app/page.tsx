import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/modules/landing/frontend/components/Navbar'
import { HeroSection } from '@/modules/landing/frontend/components/HeroSection'
import { IntroSection } from '@/modules/landing/frontend/components/IntroSection'
import { VoiceSection } from '@/modules/landing/frontend/components/VoiceSection'
import { MemorySection } from '@/modules/landing/frontend/components/MemorySection'
import { EmotionsSection } from '@/modules/landing/frontend/components/EmotionsSection'
import { PrivacySection } from '@/modules/landing/frontend/components/PrivacySection'
import { MultilingualSection } from '@/modules/landing/frontend/components/MultilingualSection'
import { WhoIsSection } from '@/modules/landing/frontend/components/WhoIsSection'
import { PhilosophySection } from '@/modules/landing/frontend/components/PhilosophySection'
import { FinalCTA } from '@/modules/landing/frontend/components/FinalCTA'
import { ScrollManager } from '@/modules/landing/frontend/components/ScrollManager'

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('mb_token')?.value
  if (token) {
    redirect('/home')
  }

  return (
    <main className="landing-main relative min-h-screen" style={{ background: '#fff8f5' }}>
      <ScrollManager />
      <Navbar />
      <div className="relative z-10">
        <HeroSection />
        <IntroSection />
        <VoiceSection />
        <MemorySection />
        <EmotionsSection />
        <PrivacySection />
        <MultilingualSection />
        <WhoIsSection />
        <PhilosophySection />
        <FinalCTA />
      </div>
    </main>
  )
}


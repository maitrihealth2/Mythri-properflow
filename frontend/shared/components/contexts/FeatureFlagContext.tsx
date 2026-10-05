'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchWithFailover } from '@/core/api'
import { useAuth } from './AuthContext'

interface FeatureFlagContextType {
  features: string[]
  hasFeature: (featureName: string) => boolean
  loading: boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  features: [],
  hasFeature: () => false,
  loading: true
})

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { token, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      setFeatures([])
      setLoading(false)
      return
    }

    const fetchFeatures = async () => {
      try {
        const res = await fetchWithFailover('/api/features/my-flags', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)

        if (res && res.ok) {
          const data = await res.json()
          setFeatures(data.features || [])
        } else {
          setFeatures([])
        }
      } catch (err) {
        console.warn("Feature flags unavailable:", err)
        setFeatures([])
      } finally {
        setLoading(false)
      }
    }
    fetchFeatures()
  }, [token, authLoading])

  const hasFeature = (featureName: string) => features.includes(featureName)

  return (
    <FeatureFlagContext.Provider value={{ features, hasFeature, loading }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export const useFeatureFlags = () => useContext(FeatureFlagContext)

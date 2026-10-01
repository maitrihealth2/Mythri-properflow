'use client'

import { useEffect } from 'react'

export function ScrollManager() {
  useEffect(() => {
    // Smooth scrolling for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (!link) return
      
      const href = link.getAttribute('href')
      
      if (href && href.startsWith('#')) {
        e.preventDefault()
        const targetId = href.substring(1)
        const targetElement = document.getElementById(targetId)
        
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop,
            behavior: 'smooth'
          })
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return null
}

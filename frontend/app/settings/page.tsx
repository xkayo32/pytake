'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Redirect to WhatsApp settings by default
export default function SettingsPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/settings/whatsapp')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
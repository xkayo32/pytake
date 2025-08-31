'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { SystemSettingsDashboard } from '@/components/settings/system-settings-dashboard'

export default function SystemSettingsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <SystemSettingsDashboard />
      </div>
    </AppLayout>
  )
}
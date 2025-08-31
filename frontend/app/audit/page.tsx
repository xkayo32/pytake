'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { AuditDashboard } from '@/components/audit/audit-dashboard'

export default function AuditPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <AuditDashboard />
      </div>
    </AppLayout>
  )
}
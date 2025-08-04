import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import AgentDashboard from './AgentDashboard'
import SupervisorDashboard from './SupervisorDashboard'
import AdminDashboard from './AdminDashboard'
import ViewerDashboard from './ViewerDashboard'

export default function DashboardPage() {
  const { userRole } = usePermissions()

  // Route to the appropriate dashboard based on user role
  switch (userRole) {
    case 'Admin':
      return <AdminDashboard />
    case 'Supervisor':
      return <SupervisorDashboard />
    case 'Agent':
      return <AgentDashboard />
    case 'Viewer':
      return <ViewerDashboard />
    default:
      return <AgentDashboard /> // Default fallback
  }
}
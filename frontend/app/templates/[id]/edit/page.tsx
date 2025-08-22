'use client'

import { useParams } from 'next/navigation'
import CreateTemplatePage from '../../create/page'

// For now, we'll reuse the create page component with pre-filled data
// In a real app, this would load the template data and pass it to a shared form component
export default function EditTemplatePage() {
  const params = useParams()
  const templateId = params.id as string

  // TODO: Load template data based on templateId
  // For now, we'll just render the create page
  return <CreateTemplatePage />
}
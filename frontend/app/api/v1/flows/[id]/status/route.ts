import { NextRequest, NextResponse } from 'next/server'

// Get API base URL, ensuring /api/v1 is included and not duplicated
const getAPIBaseURL = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  if (!baseUrl.endsWith('/api/v1')) {
    return baseUrl + '/api/v1'
  }
  return baseUrl
}

const API_BASE_URL = getAPIBaseURL()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const response = await fetch(`${API_BASE_URL}/api/v1/flows/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to update flow status' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Update flow status proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
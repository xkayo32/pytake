import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pytake.net'

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend
    const response = await fetch(`${API_URL}/api/v1/whatsapp/templates/manage`, {
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        })
      }
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${API_URL}/api/v1/whatsapp/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
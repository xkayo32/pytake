import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pytake.net'

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/v1/whatsapp/templates/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Error syncing templates:', error)
    return NextResponse.json(
      { error: 'Failed to sync templates' },
      { status: 500 }
    )
  }
}
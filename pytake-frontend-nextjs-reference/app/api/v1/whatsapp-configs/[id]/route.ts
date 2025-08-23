import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pytake.net'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${API_URL}/api/v1/whatsapp-configs/${params.id}`, {
      method: 'PUT',
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
    console.error('Error updating config:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${API_URL}/api/v1/whatsapp-configs/${params.id}`, {
      method: 'DELETE',
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
    console.error('Error deleting config:', error)
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    )
  }
}
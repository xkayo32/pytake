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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const response = await fetch(`${API_BASE_URL}/flows/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      console.error(`❌ Backend returned ${response.status} for GET /flows/${id}`)
      return NextResponse.json(
        { error: 'Failed to fetch flow' },
        { status: response.status }
      )
    }

    // Backend pode retornar {} ou resposta completa
    const text = await response.text()
    if (text && text !== '{}') {
      try {
        const data = JSON.parse(text)
        return NextResponse.json(data)
      } catch (e) {
        console.log('⚠️ Backend returned non-JSON response:', text)
        return NextResponse.json({})
      }
    } else {
      // Backend retornou {}, flow não encontrado
      console.log(`⚠️ Flow ${id} not found (empty response from backend)`)
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('❌ Get flow proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const response = await fetch(`${API_BASE_URL}/api/v1/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      // Log para debug
      console.error(`❌ Backend returned ${response.status} for PUT /api/v1/flows/${id}`)
      return NextResponse.json(
        { error: 'Failed to update flow' },
        { status: response.status }
      )
    }

    // Backend pode retornar {} ou resposta completa
    const text = await response.text()
    if (text && text !== '{}') {
      try {
        const data = JSON.parse(text)
        return NextResponse.json(data)
      } catch (e) {
        console.log('⚠️ Backend returned non-JSON response:', text)
        return NextResponse.json({})
      }
    } else {
      // Backend retornou {}, mas considera sucesso
      console.log('✅ Flow updated successfully (empty response from backend)')
      return NextResponse.json({})
    }
  } catch (error) {
    console.error('❌ Update flow proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const response = await fetch(`${API_BASE_URL}/api/v1/flows/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete flow' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Delete flow proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
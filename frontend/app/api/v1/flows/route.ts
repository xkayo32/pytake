import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Proxying flows request to backend...')
    
    const response = await fetch(`${API_BASE_URL}/api/v1/flows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      console.error('❌ Backend response error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch flows from backend' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Flows fetched from backend:', data.flows?.length, 'flows')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📤 Frontend proxy recebeu flow:', JSON.stringify(body, null, 2))
    
    const backendUrl = `${API_BASE_URL}/api/v1/flows`
    console.log('🔗 Backend URL:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    console.log('📡 Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Backend error:', response.status, errorText)
      console.error('❌ Request body was:', JSON.stringify(body, null, 2))
      return NextResponse.json(
        { error: 'Failed to create flow' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Flow criado com sucesso:', data.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Create flow proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    // Fazer proxy da requisição para o backend
    const response = await fetch(`${BACKEND_URL}/api/v1/flows`, {
      headers: {
        'Content-Type': 'application/json',
        // Passar headers de autenticação se existirem
        ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization')! }
          : {})
      }
    })

    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Backend error', status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Retornar os flows no formato esperado
    return NextResponse.json({ 
      flows: Array.isArray(data) ? data : (data.flows || []),
      success: true 
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/v1/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization')! }
          : {})
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend error', status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'

// Mock data for WhatsApp configuration
const mockConfig = {
  id: 1,
  phone_number_id: '',
  access_token: '',
  business_account_id: '',
  app_id: '',
  app_secret: '',
  webhook_verify_token: '',
  status: 'disconnected',
  last_test: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export async function GET() {
  // Return mock configuration
  return NextResponse.json(mockConfig)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Simulate saving configuration
    const savedConfig = {
      ...mockConfig,
      ...data,
      status: 'connected',
      updated_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: savedConfig,
      message: 'Configuração salva com sucesso (modo mock)'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao processar requisição' },
      { status: 400 }
    )
  }
}
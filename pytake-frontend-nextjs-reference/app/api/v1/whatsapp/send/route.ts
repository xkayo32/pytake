import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Simulate message sending
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({
      success: true,
      message_id: `msg_${Date.now()}`,
      status: 'sent',
      to: data.to,
      message: 'Mensagem enviada com sucesso (modo mock)'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Erro ao enviar mensagem (modo mock)' 
        } 
      },
      { status: 400 }
    )
  }
}
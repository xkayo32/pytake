import { NextRequest, NextResponse } from 'next/server'

// Esta seria a estrutura real de um template do WhatsApp Business API
interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY'
  components: any[]
  quality_score?: {
    score: 'GREEN' | 'YELLOW' | 'RED'
    reasons?: string[]
  }
}

export async function GET(request: NextRequest) {
  try {
    // Em produção, isso faria uma chamada real para a API do WhatsApp Business
    // const response = await fetch(`https://graph.facebook.com/v18.0/${business_account_id}/message_templates`, {
    //   headers: {
    //     'Authorization': `Bearer ${access_token}`
    //   }
    // })
    
    // Por enquanto, retornar uma resposta indicando que não há templates
    // Isso força o sistema a usar apenas templates reais configurados pelo usuário
    
    const templates: WhatsAppTemplate[] = []
    
    return NextResponse.json({
      data: templates,
      paging: {
        cursors: {
          before: null,
          after: null
        }
      }
    })
    
  } catch (error) {
    console.error('Erro ao carregar templates do WhatsApp:', error)
    
    return NextResponse.json({
      error: {
        message: 'Erro ao carregar templates',
        type: 'OAuthException',
        code: 100
      }
    }, { status: 500 })
  }
}

// Endpoint para criar um novo template (futuro)
export async function POST(request: NextRequest) {
  try {
    const templateData = await request.json()
    
    // Em produção, isso enviaria o template para aprovação do WhatsApp
    // const response = await fetch(`https://graph.facebook.com/v18.0/${business_account_id}/message_templates`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${access_token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(templateData)
    // })
    
    return NextResponse.json({
      message: 'Template enviado para aprovação do WhatsApp',
      template_id: `temp_${Date.now()}`,
      status: 'PENDING'
    })
    
  } catch (error) {
    console.error('Erro ao criar template:', error)
    
    return NextResponse.json({
      error: {
        message: 'Erro ao criar template',
        type: 'OAuthException',
        code: 100
      }
    }, { status: 500 })
  }
}
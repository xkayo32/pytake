import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Buscando números WhatsApp...')
    
    let phoneNumbers: any[] = []
    let configs: any[] = []
    
    // Buscar configurações do WhatsApp
    try {
      const configsResponse = await fetch(`${API_BASE_URL}/api/v1/whatsapp-configs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (configsResponse.ok) {
        configs = await configsResponse.json()
        console.log('📱 WhatsApp configs:', configs)
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar configs:', error)
    }
    
    // Buscar números do WhatsApp
    try {
      const phoneNumbersResponse = await fetch(`${API_BASE_URL}/api/v1/whatsapp/phone-numbers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (phoneNumbersResponse.ok) {
        phoneNumbers = await phoneNumbersResponse.json()
        console.log('✅ Números WhatsApp do banco:', phoneNumbers)
      }
    } catch (phoneError) {
      console.log('⚠️ Erro ao buscar phone-numbers:', phoneError)
    }
    
    // Combinar dados de números e configurações
    if (phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
      const formattedNumbers = phoneNumbers.map((num: any, index: number) => {
        // Procurar configuração correspondente
        const config = configs.find((c: any) => 
          c.phone_number_id === num.id || 
          c.phone_number_id === num.phone_number_id
        )
        
        return {
          id: num.id || `whatsapp-${index + 1}`,
          phone: num.display_phone_number || num.phone,
          number: num.display_phone_number || num.phone,
          name: config?.name || num.verified_name || `WhatsApp ${index + 1}`,
          label: config?.name || num.verified_name || num.display_phone_number,
          // Se tem configuração e está marcado como connected, está conectado
          status: config?.status === 'connected' || num.verified_name ? 'connected' : 'disconnected',
          verified: true, // Se tem verified_name, está verificado
          isVerified: true,
          businessName: num.verified_name || 'PyTake',
          business_name: num.verified_name || 'PyTake',
          quality_rating: num.quality_rating,
          platform_type: num.platform_type,
          webhook_configured: config?.webhook_verify_token ? true : false,
          business_account_id: config?.business_account_id || num.business_account_id,
          created_at: config?.created_at,
          updated_at: config?.updated_at,
          lastSeen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }
      })
      
      return NextResponse.json(formattedNumbers)
    }
    
    // Tentar buscar do endpoint whatsapp-configs
    try {
      const configsResponse = await fetch(`${API_BASE_URL}/api/v1/whatsapp-configs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (configsResponse.ok) {
        const configs = await configsResponse.json()
        console.log('📱 WhatsApp configs:', configs)
        
        if (configs && Array.isArray(configs) && configs.length > 0) {
          const formattedNumbers = configs.map((config: any, index: number) => ({
            id: config.id || `whatsapp-${index + 1}`,
            phone: config.phone_number || config.phone,
            number: config.phone_number || config.phone,
            name: config.name || `WhatsApp ${index + 1}`,
            label: config.label || config.name,
            status: config.is_default ? 'CONNECTED' : 'DISCONNECTED',
            verified: config.is_verified || false,
            isVerified: config.is_verified || false,
            businessName: config.business_name || 'PyTake',
            business_name: config.business_name || 'PyTake',
            lastSeen: config.updated_at || new Date().toISOString(),
            last_seen: config.updated_at || new Date().toISOString()
          }))
          
          return NextResponse.json(formattedNumbers)
        }
      }
    } catch (configError) {
      console.log('⚠️ Erro ao buscar whatsapp-configs:', configError)
    }

    // Se não conseguir buscar do banco, retornar array vazio
    // NUNCA retornar dados fake
    console.log('⚠️ Nenhum número WhatsApp encontrado no sistema')
    return NextResponse.json([])
  } catch (error) {
    console.error('❌ Erro ao buscar números WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar números WhatsApp' },
      { status: 500 }
    )
  }
}
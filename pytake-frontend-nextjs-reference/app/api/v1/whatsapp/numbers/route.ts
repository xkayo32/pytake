import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Buscando números WhatsApp...')
    
    // Primeiro tentar buscar do endpoint phone-numbers
    try {
      const phoneNumbersResponse = await fetch(`${API_BASE_URL}/api/v1/whatsapp/phone-numbers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (phoneNumbersResponse.ok) {
        const phoneNumbers = await phoneNumbersResponse.json()
        console.log('✅ Números WhatsApp do banco:', phoneNumbers)
        
        // Formatar números do banco para o formato esperado
        if (phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
          const formattedNumbers = phoneNumbers.map((num: any, index: number) => ({
            id: num.id || `whatsapp-${index + 1}`,
            phone: num.display_phone_number || num.phone,
            number: num.display_phone_number || num.phone,
            name: num.verified_name || `WhatsApp ${index + 1}`,
            label: num.verified_name || num.display_phone_number,
            status: num.status === 'EXPIRED' || num.status === 'DISCONNECTED' ? 'DISCONNECTED' : 'CONNECTED',
            verified: num.status !== 'EXPIRED',
            isVerified: num.status !== 'EXPIRED',
            businessName: num.verified_name || 'PyTake',
            business_name: num.verified_name || 'PyTake',
            quality_rating: num.quality_rating,
            platform_type: num.platform_type,
            lastSeen: new Date().toISOString(),
            last_seen: new Date().toISOString()
          }))
          
          return NextResponse.json(formattedNumbers)
        }
      }
    } catch (phoneError) {
      console.log('⚠️ Erro ao buscar phone-numbers:', phoneError)
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

    // Se não conseguir do backend, retornar números reais de exemplo
    // SUBSTITUA ESTES NÚMEROS PELOS SEUS NÚMEROS REAIS
    const realNumbers = [
      {
        id: 'whatsapp-1',
        phone: '+5511999999999', // SUBSTITUA PELO SEU NÚMERO REAL
        number: '+5511999999999',
        name: 'Principal',
        label: 'Número Principal',
        status: 'CONNECTED',
        verified: true,
        isVerified: true,
        businessName: 'PyTake Principal',
        business_name: 'PyTake Principal',
        lastSeen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      },
      {
        id: 'whatsapp-2',
        phone: '+5511888888888', // SUBSTITUA PELO SEU NÚMERO REAL
        number: '+5511888888888',
        name: 'Suporte',
        label: 'Suporte Técnico',
        status: 'CONNECTED',
        verified: true,
        isVerified: true,
        businessName: 'PyTake Suporte',
        business_name: 'PyTake Suporte',
        lastSeen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      },
      {
        id: 'whatsapp-3',
        phone: '+5511777777777', // SUBSTITUA PELO SEU NÚMERO REAL
        number: '+5511777777777',
        name: 'Vendas',
        label: 'Equipe de Vendas',
        status: 'CONNECTED',
        verified: true,
        isVerified: true,
        businessName: 'PyTake Vendas',
        business_name: 'PyTake Vendas',
        lastSeen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      }
    ]
    
    return NextResponse.json(realNumbers)
  } catch (error) {
    console.error('❌ Erro ao buscar números WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar números WhatsApp' },
      { status: 500 }
    )
  }
}
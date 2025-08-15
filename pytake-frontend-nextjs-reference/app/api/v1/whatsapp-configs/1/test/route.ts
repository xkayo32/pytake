import { NextResponse } from 'next/server'

export async function POST() {
  // Simulate connection test
  await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay
  
  return NextResponse.json({
    success: true,
    message: 'Conexão testada com sucesso (modo mock)',
    data: {
      phone_numbers: [
        {
          id: '1',
          display_phone_number: '+55 11 98765-4321',
          verified_name: 'PyTake Demo',
          status: 'APPROVED',
          quality_rating: 'GREEN'
        }
      ],
      business_info: {
        name: 'PyTake Business',
        verified: true,
        timezone: 'America/Sao_Paulo'
      }
    }
  })
}
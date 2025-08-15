import { NextResponse } from 'next/server'

// Mock phone numbers data
const mockPhoneNumbers = [
  {
    id: '1',
    display_phone_number: '+55 11 98765-4321',
    verified_name: 'PyTake Demo',
    status: 'APPROVED' as const,
    quality_rating: 'GREEN' as const,
    messaging_limit: 'TIER_1',
    max_daily_conversation: 1000
  }
]

export async function GET() {
  // Return mock phone numbers
  return NextResponse.json(mockPhoneNumbers)
}
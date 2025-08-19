import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Phone, 
  PhoneCall, 
  Plus,
  Check,
  X,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export interface WhatsAppNumber {
  id: string
  phone: string
  name: string
  status: 'connected' | 'disconnected' | 'pending'
  isVerified: boolean
  businessName?: string
  profilePicture?: string
  lastSeen?: string
}

interface WhatsAppNumberSelectorProps {
  selectedNumbers: string[]
  onNumbersChange: (numbers: string[]) => void
  title?: string
  description?: string
  allowMultiple?: boolean
  showAddNumber?: boolean
}

export function WhatsAppNumberSelector({
  selectedNumbers,
  onNumbersChange,
  title = "Selecionar Números WhatsApp",
  description = "Escolha em quais números este flow será ativado",
  allowMultiple = true,
  showAddNumber = false
}: WhatsAppNumberSelectorProps) {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newNumber, setNewNumber] = useState('')

  // Carregar números WhatsApp disponíveis
  useEffect(() => {
    loadWhatsAppNumbers()
  }, [])

  const loadWhatsAppNumbers = async () => {
    setLoading(true)
    try {
      // Tentar carregar da API primeiro
      const response = await fetch('/api/v1/whatsapp/numbers')
      if (response.ok) {
        const apiNumbers = await response.json()
        setNumbers(apiNumbers)
      } else {
        // Fallback para números mock/localStorage
        loadMockNumbers()
      }
    } catch (error) {
      console.error('Erro ao carregar números WhatsApp:', error)
      loadMockNumbers()
    } finally {
      setLoading(false)
    }
  }

  const loadMockNumbers = () => {
    // Tentar carregar do localStorage primeiro
    const savedNumbers = localStorage.getItem('whatsapp_numbers')
    if (savedNumbers) {
      setNumbers(JSON.parse(savedNumbers))
      return
    }

    // Números de exemplo se não houver salvos
    const mockNumbers: WhatsAppNumber[] = [
      {
        id: 'num-1',
        phone: '+5511999999999',
        name: 'Principal',
        status: 'connected',
        isVerified: true,
        businessName: 'Minha Empresa',
        lastSeen: new Date().toISOString()
      },
      {
        id: 'num-2', 
        phone: '+5511888888888',
        name: 'Suporte',
        status: 'connected',
        isVerified: true,
        businessName: 'Suporte Técnico',
        lastSeen: new Date().toISOString()
      },
      {
        id: 'num-3',
        phone: '+5511777777777', 
        name: 'Vendas',
        status: 'disconnected',
        isVerified: false,
        businessName: 'Equipe Vendas'
      }
    ]
    
    setNumbers(mockNumbers)
    localStorage.setItem('whatsapp_numbers', JSON.stringify(mockNumbers))
  }

  const handleNumberToggle = (numberId: string, checked: boolean) => {
    if (!allowMultiple) {
      // Modo single select
      onNumbersChange(checked ? [numberId] : [])
      return
    }

    // Modo multi select
    if (checked) {
      onNumbersChange([...selectedNumbers, numberId])
    } else {
      onNumbersChange(selectedNumbers.filter(id => id !== numberId))
    }
  }

  const handleAddNumber = () => {
    if (!newNumber.trim()) return

    const formattedNumber = newNumber.startsWith('+') ? newNumber : `+${newNumber}`
    const newWhatsAppNumber: WhatsAppNumber = {
      id: `num-${Date.now()}`,
      phone: formattedNumber,
      name: `Número ${numbers.length + 1}`,
      status: 'pending',
      isVerified: false
    }

    const updatedNumbers = [...numbers, newWhatsAppNumber]
    setNumbers(updatedNumbers)
    localStorage.setItem('whatsapp_numbers', JSON.stringify(updatedNumbers))
    
    setNewNumber('')
    setShowAddDialog(false)
  }

  const getStatusIcon = (status: WhatsAppNumber['status']) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusLabel = (status: WhatsAppNumber['status']) => {
    switch (status) {
      case 'connected': return 'Conectado'
      case 'disconnected': return 'Desconectado'
      case 'pending': return 'Conectando...'
      default: return 'Desconhecido'
    }
  }

  const getStatusColor = (status: WhatsAppNumber['status']) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200'
      case 'disconnected': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando números...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {showAddNumber && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Número
          </Button>
        )}
      </div>

      {/* Numbers List */}
      {numbers.length === 0 ? (
        <Card className="p-6 text-center">
          <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium mb-2">Nenhum número configurado</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione números WhatsApp para ativar seus flows
          </p>
          {showAddNumber && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Número
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {numbers.map((number) => {
            const isSelected = selectedNumbers.includes(number.id)
            const isDisabled = number.status === 'disconnected'
            
            return (
              <Card key={number.id} className={`p-4 transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : isDisabled 
                    ? 'opacity-60' 
                    : 'hover:shadow-md'
              }`}>
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    id={number.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleNumberToggle(number.id, checked as boolean)
                    }
                    disabled={isDisabled}
                  />

                  {/* Number Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={number.id} className="font-medium cursor-pointer">
                        {number.name}
                      </Label>
                      <Badge variant="outline" className={getStatusColor(number.status)}>
                        {getStatusIcon(number.status)}
                        <span className="ml-1">{getStatusLabel(number.status)}</span>
                      </Badge>
                      {number.isVerified && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                          <Check className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <PhoneCall className="h-3 w-3" />
                        <span>{number.phone}</span>
                      </div>
                      {number.businessName && (
                        <span className="font-medium">{number.businessName}</span>
                      )}
                      {number.lastSeen && number.status === 'connected' && (
                        <span>
                          Online há {Math.floor((Date.now() - new Date(number.lastSeen).getTime()) / 60000)}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {isSelected && !isDisabled && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Selection Summary */}
      {selectedNumbers.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {selectedNumbers.length} número{selectedNumbers.length > 1 ? 's' : ''} selecionado{selectedNumbers.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedNumbers.map(numberId => {
              const number = numbers.find(n => n.id === numberId)
              return number ? (
                <Badge key={numberId} variant="default" className="bg-primary/10 text-primary">
                  {number.name} ({number.phone})
                </Badge>
              ) : null
            })}
          </div>
        </Card>
      )}

      {/* Add Number Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Número WhatsApp</DialogTitle>
            <DialogDescription>
              Digite o número WhatsApp que deseja adicionar (com código do país)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="phone">Número WhatsApp</Label>
              <Input
                id="phone"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="+5511999999999"
                type="tel"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Inclua o código do país (ex: +55 para Brasil)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddNumber} disabled={!newNumber.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
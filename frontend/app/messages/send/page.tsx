'use client'

import { useState, useEffect } from 'react'
import { 
  Send, 
  MessageSquare, 
  User, 
  FileText,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppLayout } from '@/components/layout/app-layout'
import { notify } from '@/lib/utils'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Template {
  id: string
  name: string
  status: string
  category: string
  language: string
  body_text: string
  header_text?: string
  footer_text?: string
  variables: string[]
}

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
}

export default function SendMessagePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      
      // Load templates (only approved ones)
      const templatesRes = await fetch(`${apiUrl}/api/v1/whatsapp/templates/manage`, { headers })
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        // Filter only approved templates
        setTemplates(data.filter((t: Template) => t.status === 'APPROVED'))
      }
      
      // Load contacts
      const contactsRes = await fetch(`${apiUrl}/api/v1/contacts`, { headers })
      if (contactsRes.ok) {
        const data = await contactsRes.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      notify.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    setVariableValues({})
    
    // Extract variables from selected template
    const template = templates.find(t => t.id === templateId)
    if (template) {
      const vars: Record<string, string> = {}
      const regex = /\{\{(\d+)\}\}/g
      const allText = `${template.header_text || ''} ${template.body_text} ${template.footer_text || ''}`
      let match
      
      while ((match = regex.exec(allText)) !== null) {
        vars[match[1]] = ''
      }
      
      setVariableValues(vars)
    }
  }

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId)
    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      setPhoneNumber(contact.phone)
      // Auto-fill first variable with contact name if exists
      if (Object.keys(variableValues).includes('1')) {
        setVariableValues(prev => ({ ...prev, '1': contact.name }))
      }
    }
  }

  const handleVariableChange = (varNum: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [varNum]: value }))
  }

  const getPreviewText = () => {
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return ''
    
    let preview = ''
    
    // Header
    if (template.header_text) {
      let headerText = template.header_text
      Object.entries(variableValues).forEach(([num, value]) => {
        headerText = headerText.replace(`{{${num}}}`, value || `{{${num}}}`)
      })
      preview += `📋 ${headerText}\n\n`
    }
    
    // Body
    let bodyText = template.body_text
    Object.entries(variableValues).forEach(([num, value]) => {
      bodyText = bodyText.replace(`{{${num}}}`, value || `{{${num}}}`)
    })
    preview += bodyText
    
    // Footer
    if (template.footer_text) {
      preview += `\n\n📌 ${template.footer_text}`
    }
    
    return preview
  }

  const handleSend = async () => {
    try {
      // Validate
      if (!selectedTemplate) {
        notify.error('Selecione um template')
        return
      }
      
      if (!phoneNumber) {
        notify.error('Informe o número do WhatsApp')
        return
      }
      
      // Check if all variables are filled
      const missingVars = Object.entries(variableValues).filter(([_, value]) => !value)
      if (missingVars.length > 0) {
        notify.error('Preencha todas as variáveis do template')
        return
      }
      
      setSending(true)
      
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/send-template`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template_id: selectedTemplate,
          to_phone: phoneNumber,
          variables: variableValues
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        notify.success('Mensagem enviada com sucesso!')
        
        // Reset form
        setSelectedTemplate('')
        setSelectedContact('')
        setPhoneNumber('')
        setVariableValues({})
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      notify.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    )
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  return (
    <AppLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Enviar Mensagem com Template
          </h1>
          <p className="text-muted-foreground">
            Selecione um template aprovado e envie mensagens personalizadas
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Template
                </CardTitle>
                <CardDescription>
                  Selecione o template aprovado para enviar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Contact Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Destinatário
                </CardTitle>
                <CardDescription>
                  Selecione um contato ou digite o número
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Contato</Label>
                  <Select value={selectedContact} onValueChange={handleContactChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div>
                            <div>{contact.name}</div>
                            <div className="text-xs text-muted-foreground">{contact.phone}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="phone">Número do WhatsApp *</Label>
                  <Input
                    id="phone"
                    placeholder="5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: código do país + DDD + número
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Template Variables */}
            {selectedTemplate && Object.keys(variableValues).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Variáveis do Template
                  </CardTitle>
                  <CardDescription>
                    Preencha os valores das variáveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(variableValues).map(([num, value]) => (
                    <div key={num}>
                      <Label htmlFor={`var-${num}`}>
                        Variável {`{{${num}}}`} *
                      </Label>
                      <Input
                        id={`var-${num}`}
                        placeholder={`Valor para {{${num}}}`}
                        value={value}
                        onChange={(e) => handleVariableChange(num, e.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview da Mensagem
                </CardTitle>
                <CardDescription>
                  Visualize como a mensagem será enviada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                      <div className="whitespace-pre-wrap text-sm">
                        {getPreviewText()}
                      </div>
                    </div>
                    
                    {selectedTemplateData && (
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="outline">
                          {selectedTemplateData.language}
                        </Badge>
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Aprovado
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Selecione um template para visualizar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Button */}
            {selectedTemplate && phoneNumber && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleSend}
                    disabled={sending || Object.values(variableValues).some(v => !v)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Send className={`h-5 w-5 ${sending ? 'animate-pulse' : ''}`} />
                    {sending ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                  
                  {Object.values(variableValues).some(v => !v) && (
                    <p className="text-xs text-red-500 mt-2 text-center">
                      Preencha todas as variáveis antes de enviar
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
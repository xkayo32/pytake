import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Download, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { notify } from '@/lib/toast'

interface ImportedContact {
  name: string
  phone: string
  email?: string
  tags?: string
  valid?: boolean
  error?: string
}

interface ImportContactsProps {
  onImport: (contacts: ImportedContact[]) => void
}

export function ImportContacts({ onImport }: ImportContactsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportedContact[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validatePhone = (phone: string): boolean => {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '')
    // Verifica se tem entre 10 e 11 dígitos (telefone brasileiro)
    return cleaned.length >= 10 && cleaned.length <= 11
  }

  const formatPhone = (phone: string): string => {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '')
    
    // Adiciona o código do país se não tiver
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    
    // Adiciona o 9 se for celular sem ele
    if (cleaned.length === 12 && cleaned[2] !== '9') {
      cleaned = cleaned.slice(0, 4) + '9' + cleaned.slice(4)
    }
    
    return cleaned
  }

  const processCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    
    const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name'))
    const phoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('celular') || h.includes('whatsapp'))
    const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'))
    const tagsIndex = headers.findIndex(h => h.includes('tag') || h.includes('grupo') || h.includes('categoria'))

    if (phoneIndex === -1) {
      notify.error('Coluna de telefone não encontrada no arquivo')
      return []
    }

    const contacts: ImportedContact[] = []
    
    for (let i = 1; i < lines.length; i++) {
      setProgress(Math.round((i / lines.length) * 100))
      
      const values = lines[i].split(',').map(v => v.trim())
      const phone = values[phoneIndex]
      
      if (!phone) continue

      const contact: ImportedContact = {
        name: nameIndex !== -1 ? values[nameIndex] : `Contato ${i}`,
        phone: formatPhone(phone),
        email: emailIndex !== -1 ? values[emailIndex] : undefined,
        tags: tagsIndex !== -1 ? values[tagsIndex] : undefined,
        valid: validatePhone(phone),
        error: validatePhone(phone) ? undefined : 'Telefone inválido'
      }
      
      contacts.push(contact)
    }

    return contacts
  }

  const processExcel = async (arrayBuffer: ArrayBuffer) => {
    // Simulação - em produção, usar uma biblioteca como xlsx
    notify.info('Processamento de Excel será implementado em breve')
    return []
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsProcessing(true)
    setProgress(0)

    try {
      let contacts: ImportedContact[] = []

      if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text()
        contacts = processCSV(text)
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        const buffer = await selectedFile.arrayBuffer()
        contacts = await processExcel(buffer)
      } else {
        notify.error('Formato de arquivo não suportado. Use CSV ou Excel.')
        setIsProcessing(false)
        return
      }

      setPreview(contacts)
      setProgress(100)
      
      const validCount = contacts.filter(c => c.valid).length
      notify.success(`${validCount} contatos válidos encontrados`)
    } catch (error) {
      console.error('Error processing file:', error)
      notify.error('Erro ao processar arquivo')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    const validContacts = preview.filter(c => c.valid)
    if (validContacts.length === 0) {
      notify.error('Nenhum contato válido para importar')
      return
    }

    onImport(validContacts)
    notify.success(`${validContacts.length} contatos importados!`)
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFile(null)
    setPreview([])
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'Nome,Telefone,Email,Tags\nJoão Silva,11987654321,joao@email.com,Cliente VIP\nMaria Santos,21987654321,maria@email.com,Lead'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_contatos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Lista
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Lista de Contatos</DialogTitle>
          <DialogDescription>
            Importe contatos de um arquivo CSV ou Excel
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {!file ? (
            <>
              {/* Upload Area */}
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label className="text-lg font-medium">
                  Clique para selecionar ou arraste um arquivo
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Suporta arquivos CSV e Excel (.xlsx, .xls)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong>
                  <br />
                  • Coluna de telefone é obrigatória (Nome: telefone, phone, celular ou whatsapp)
                  <br />
                  • Colunas opcionais: nome, email, tags
                  <br />
                  • Telefones serão formatados automaticamente para WhatsApp
                </AlertDescription>
              </Alert>

              {/* Template Download */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template CSV
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <Label>Processando arquivo...</Label>
                  <Progress value={progress} />
                </div>
              )}

              {/* Preview Table */}
              {preview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Prévia dos Contatos</Label>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        Total: {preview.length}
                      </Badge>
                      <Badge variant="default">
                        Válidos: {preview.filter(c => c.valid).length}
                      </Badge>
                      <Badge variant="destructive">
                        Inválidos: {preview.filter(c => !c.valid).length}
                      </Badge>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.slice(0, 10).map((contact, index) => (
                          <TableRow key={index} className={contact.valid ? '' : 'opacity-50'}>
                            <TableCell>
                              {contact.valid ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{contact.name}</TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{contact.phone}</span>
                              {contact.error && (
                                <span className="text-xs text-red-500 block">{contact.error}</span>
                              )}
                            </TableCell>
                            <TableCell>{contact.email || '-'}</TableCell>
                            <TableCell>
                              {contact.tags && (
                                <Badge variant="outline" className="text-xs">
                                  {contact.tags}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {preview.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                        +{preview.length - 10} contatos adicionais
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport}
            disabled={preview.filter(c => c.valid).length === 0}
          >
            Importar {preview.filter(c => c.valid).length} Contatos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
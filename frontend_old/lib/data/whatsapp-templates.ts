// Mock de templates do WhatsApp Business API
// Em produção, isso viria da API

export interface WhatsAppButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  id?: string
  url?: string
  phone_number?: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  category: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    text?: string
    buttons?: WhatsAppButton[]
  }[]
  variables?: string[]
}

// Templates de exemplo (DESABILITADOS - usar apenas templates reais da API)
/* 
const WHATSAPP_TEMPLATES_MOCK: WhatsAppTemplate[] = [
  // Templates mockados foram removidos - usar apenas dados reais da API
]
*/

// Função para buscar templates
// Carregar templates reais do WhatsApp Business API
export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    // Primeiro tentar carregar do localStorage (cache)
    const cachedTemplates = localStorage.getItem('whatsapp_templates_cache')
    if (cachedTemplates) {
      const parsed = JSON.parse(cachedTemplates)
      // Verificar se cache não está muito antigo (5 minutos para desenvolvimento)
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.templates
      }
    }
    
    // Cache expirado ou não existe, buscar da API real de gerenciamento
    const response = await fetch('/api/v1/whatsapp/templates/manage')
    if (response.ok) {
      const templates = await response.json()
      
      // Filtrar apenas templates aprovados e formatar para o padrão esperado
      const formattedTemplates = templates
        .filter((t: any) => t.status === 'APPROVED' || t.status === 'approved')
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          language: t.language || 'pt_BR',
          category: t.category || 'UTILITY',
          status: 'APPROVED' as const,
          components: t.components || [],
          variables: t.variables || []
        }))
      
      // Salvar no cache
      cacheWhatsAppTemplates(formattedTemplates)
      
      return formattedTemplates
    }
  } catch (error) {
    console.error('Erro ao carregar templates:', error)
    
    // Em caso de erro, tentar usar cache mesmo que expirado
    try {
      const cachedTemplates = localStorage.getItem('whatsapp_templates_cache')
      if (cachedTemplates) {
        const parsed = JSON.parse(cachedTemplates)
        return parsed.templates
      }
    } catch (cacheError) {
      console.error('Erro ao carregar cache de fallback:', cacheError)
    }
  }
  
  // Se tudo falhar, retornar array vazio
  return []
}

// Versão síncrona para compatibilidade (usar apenas cache)
export function getWhatsAppTemplatesSync(): WhatsAppTemplate[] {
  try {
    const cachedTemplates = localStorage.getItem('whatsapp_templates_cache')
    if (cachedTemplates) {
      const parsed = JSON.parse(cachedTemplates)
      return parsed.templates || []
    }
  } catch (error) {
    console.error('Erro ao carregar templates do cache:', error)
  }
  
  return []
}

// Função para buscar template por nome
export function getTemplateByName(name: string): WhatsAppTemplate | undefined {
  const templates = getWhatsAppTemplatesSync()
  return templates.find(t => t.name === name)
}

// Função para obter botões de um template
export function getTemplateButtons(templateName: string): WhatsAppButton[] {
  const template = getTemplateByName(templateName)
  if (!template) {
    // Se não encontrar template, retornar botões padrão genéricos
    return [
      { type: 'QUICK_REPLY', text: 'Sim', id: 'yes' },
      { type: 'QUICK_REPLY', text: 'Não', id: 'no' },
      { type: 'QUICK_REPLY', text: 'Mais informações', id: 'more_info' }
    ]
  }
  
  const buttonsComponent = template.components.find(c => c.type === 'BUTTONS')
  return buttonsComponent?.buttons || []
}

// Função para salvar templates no cache (para uso quando receber da API)
export function cacheWhatsAppTemplates(templates: WhatsAppTemplate[]): void {
  try {
    localStorage.setItem('whatsapp_templates_cache', JSON.stringify({
      templates,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Erro ao salvar templates no cache:', error)
  }
}
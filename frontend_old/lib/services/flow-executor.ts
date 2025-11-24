import { Node, Edge } from 'reactflow'
import { api } from '@/lib/api'
import { replaceWithExamples, FLOW_VARIABLES } from '@/lib/data/flow-variables'

export interface ExecutionContext {
  flowId: string
  nodeId: string
  variables: Record<string, any>
  recipient?: string
  testMode?: boolean
}

export interface ExecutionResult {
  success: boolean
  nodeId: string
  message?: string
  error?: string
  data?: any
  nextNodes?: string[]
}

export interface FlowExecutionLog {
  timestamp: Date
  nodeId: string
  nodeName: string
  status: 'running' | 'success' | 'error' | 'skipped'
  message?: string
  data?: any
}

export class FlowExecutor {
  private nodes: Node[] = []
  private edges: Edge[] = []
  private executionLogs: FlowExecutionLog[] = []
  private variables: Record<string, any> = {}
  
  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes
    this.edges = edges
    this.initializeVariables()
  }
  
  // Inicializar variáveis com valores padrão
  private initializeVariables() {
    // Variáveis do sistema
    const now = new Date()
    this.variables['system.date'] = now.toLocaleDateString('pt-BR')
    this.variables['system.time'] = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    this.variables['system.day_of_week'] = now.toLocaleDateString('pt-BR', { weekday: 'long' })
    this.variables['system.company_name'] = 'PyTake Solutions'
    this.variables['system.branch'] = 'Matriz'
    this.variables['system.random'] = Math.floor(Math.random() * 100)
    
    // Variáveis de contato padrão (serão substituídas pelos dados reais)
    this.variables['contact.name'] = 'Cliente'
    this.variables['contact.first_name'] = 'Cliente'
    this.variables['contact.phone'] = ''
    this.variables['contact.email'] = ''
    this.variables['contact.city'] = ''
    this.variables['contact.tags'] = ''
  }
  
  // Substituir variáveis no texto
  private replaceVariables(text: string): string {
    let result = text
    
    // Substituir cada variável encontrada
    Object.entries(this.variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(pattern, value || '')
    })
    
    // Substituir variáveis não definidas por string vazia
    result = result.replace(/\{\{[^}]+\}\}/g, '')
    
    return result
  }
  
  // Encontrar nós iniciais (triggers)
  private findStartNodes(): Node[] {
    return this.nodes.filter(node => 
      node.data?.nodeType?.startsWith('trigger_')
    )
  }
  
  // Encontrar próximos nós conectados
  private findNextNodes(nodeId: string): Node[] {
    const outgoingEdges = this.edges.filter(edge => edge.source === nodeId)
    return outgoingEdges.map(edge => 
      this.nodes.find(node => node.id === edge.target)
    ).filter(Boolean) as Node[]
  }
  
  // Log de execução
  private log(nodeId: string, status: FlowExecutionLog['status'], message?: string, data?: any) {
    const node = this.nodes.find(n => n.id === nodeId)
    const nodeName = node?.data?.config?.customName || node?.data?.label || 'Unknown'
    
    const log: FlowExecutionLog = {
      timestamp: new Date(),
      nodeId,
      nodeName,
      status,
      message,
      data
    }
    
    this.executionLogs.push(log)
    console.log(`[Flow] ${status.toUpperCase()}: ${nodeName}`, message || '')
  }
  
  // Executar nó específico
  private async executeNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    const nodeType = node.data?.nodeType
    const config = node.data?.config || {}
    
    this.log(node.id, 'running', `Executando nó ${nodeType}`)
    
    try {
      switch (nodeType) {
        // ========== MENSAGENS ==========
        case 'msg_text':
          return await this.executeMsgText(node, config, context)
        
        case 'msg_image':
          return await this.executeMsgImage(node, config, context)
        
        case 'msg_template':
          return await this.executeMsgTemplate(node, config, context)
        
        // ========== CONDIÇÕES ==========
        case 'condition_if':
          return await this.executeCondition(node, config, context)
        
        case 'delay':
          return await this.executeDelay(node, config, context)
        
        // ========== TRIGGERS ==========
        case 'trigger_keyword':
        case 'trigger_webhook':
        case 'trigger_schedule':
          // Triggers são apenas pontos de entrada
          return {
            success: true,
            nodeId: node.id,
            message: 'Trigger ativado',
            nextNodes: this.findNextNodes(node.id).map(n => n.id)
          }
        
        default:
          return {
            success: false,
            nodeId: node.id,
            error: `Tipo de nó não implementado: ${nodeType}`
          }
      }
    } catch (error: any) {
      this.log(node.id, 'error', error.message)
      return {
        success: false,
        nodeId: node.id,
        error: error.message
      }
    }
  }
  
  // Executar mensagem de texto
  private async executeMsgText(node: Node, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    const message = this.replaceVariables(config.message || '')
    const recipient = context.recipient || this.variables['contact.phone']
    
    if (!message) {
      return {
        success: false,
        nodeId: node.id,
        error: 'Mensagem vazia'
      }
    }
    
    if (!recipient) {
      return {
        success: false,
        nodeId: node.id,
        error: 'Destinatário não especificado'
      }
    }
    
    // Modo de teste - não envia realmente
    if (context.testMode) {
      this.log(node.id, 'success', 'Mensagem simulada (modo teste)', { message, recipient })
      return {
        success: true,
        nodeId: node.id,
        message: `Mensagem enviada (teste): ${message.substring(0, 50)}...`,
        data: { message, recipient },
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    }
    
    // Enviar mensagem via API
    try {
      const response = await api.post('/whatsapp/send', {
        to: recipient,
        message: message,
        type: 'text'
      })
      
      this.log(node.id, 'success', 'Mensagem enviada', response.data)
      
      return {
        success: true,
        nodeId: node.id,
        message: `Mensagem enviada: ${message.substring(0, 50)}...`,
        data: response.data,
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    } catch (error: any) {
      return {
        success: false,
        nodeId: node.id,
        error: `Erro ao enviar mensagem: ${error.message}`
      }
    }
  }
  
  // Executar mensagem com imagem
  private async executeMsgImage(node: Node, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    const imageUrl = config.imageUrl
    const caption = this.replaceVariables(config.caption || '')
    const recipient = context.recipient || this.variables['contact.phone']
    
    if (!imageUrl) {
      return {
        success: false,
        nodeId: node.id,
        error: 'URL da imagem não especificada'
      }
    }
    
    if (!recipient) {
      return {
        success: false,
        nodeId: node.id,
        error: 'Destinatário não especificado'
      }
    }
    
    // Modo de teste
    if (context.testMode) {
      this.log(node.id, 'success', 'Imagem simulada (modo teste)', { imageUrl, caption, recipient })
      return {
        success: true,
        nodeId: node.id,
        message: `Imagem enviada (teste): ${imageUrl}`,
        data: { imageUrl, caption, recipient },
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    }
    
    // Enviar imagem via API
    try {
      const response = await api.post('/whatsapp/send', {
        to: recipient,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      })
      
      this.log(node.id, 'success', 'Imagem enviada', response.data)
      
      return {
        success: true,
        nodeId: node.id,
        message: `Imagem enviada: ${imageUrl}`,
        data: response.data,
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    } catch (error: any) {
      return {
        success: false,
        nodeId: node.id,
        error: `Erro ao enviar imagem: ${error.message}`
      }
    }
  }
  
  // Executar template WhatsApp
  private async executeMsgTemplate(node: Node, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    const templateName = config.templateName
    const language = config.language || 'pt_BR'
    const variables = config.variables || {}
    const recipient = context.recipient || this.variables['contact.phone']
    
    if (!templateName) {
      return {
        success: false,
        nodeId: node.id,
        error: 'Template não especificado'
      }
    }
    
    if (!recipient) {
      return {
        success: false,
        nodeId: node.id,
        error: 'Destinatário não especificado'
      }
    }
    
    // Processar variáveis do template
    const processedVariables: any = {}
    Object.entries(variables).forEach(([key, value]) => {
      processedVariables[key] = this.replaceVariables(String(value))
    })
    
    // Modo de teste
    if (context.testMode) {
      this.log(node.id, 'success', 'Template simulado (modo teste)', { 
        templateName, 
        language, 
        variables: processedVariables, 
        recipient 
      })
      
      return {
        success: true,
        nodeId: node.id,
        message: `Template enviado (teste): ${templateName}`,
        data: { templateName, language, variables: processedVariables, recipient },
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    }
    
    // Enviar template via API
    try {
      const response = await api.post('/whatsapp/send', {
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components: Object.keys(processedVariables).length > 0 ? [
            {
              type: 'body',
              parameters: Object.values(processedVariables).map(value => ({
                type: 'text',
                text: value
              }))
            }
          ] : undefined
        }
      })
      
      this.log(node.id, 'success', 'Template enviado', response.data)
      
      return {
        success: true,
        nodeId: node.id,
        message: `Template enviado: ${templateName}`,
        data: response.data,
        nextNodes: this.findNextNodes(node.id).map(n => n.id)
      }
    } catch (error: any) {
      return {
        success: false,
        nodeId: node.id,
        error: `Erro ao enviar template: ${error.message}`
      }
    }
  }
  
  // Executar condição
  private async executeCondition(node: Node, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    const condition = config.condition || 'true'
    
    // Avaliar condição (simplificado - em produção usar parser seguro)
    let result = false
    try {
      // Substituir variáveis na condição
      const processedCondition = this.replaceVariables(condition)
      // ATENÇÃO: eval é perigoso! Em produção usar parser seguro
      result = eval(processedCondition)
    } catch (error) {
      return {
        success: false,
        nodeId: node.id,
        error: `Erro ao avaliar condição: ${condition}`
      }
    }
    
    // Encontrar saídas true/false
    const edges = this.edges.filter(e => e.source === node.id)
    const trueEdge = edges.find(e => e.sourceHandle === 'true')
    const falseEdge = edges.find(e => e.sourceHandle === 'false')
    
    const nextNodeId = result ? trueEdge?.target : falseEdge?.target
    const nextNodes = nextNodeId ? [nextNodeId] : []
    
    this.log(node.id, 'success', `Condição avaliada: ${result}`, { condition, result })
    
    return {
      success: true,
      nodeId: node.id,
      message: `Condição: ${result ? 'Verdadeiro' : 'Falso'}`,
      data: { condition, result },
      nextNodes
    }
  }
  
  // Executar delay
  private async executeDelay(node: Node, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    const seconds = parseInt(config.seconds || '1')
    
    this.log(node.id, 'running', `Aguardando ${seconds} segundos...`)
    
    // Em modo teste, não esperar
    if (!context.testMode) {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000))
    }
    
    this.log(node.id, 'success', `Delay de ${seconds}s concluído`)
    
    return {
      success: true,
      nodeId: node.id,
      message: `Aguardou ${seconds} segundos`,
      nextNodes: this.findNextNodes(node.id).map(n => n.id)
    }
  }
  
  // Executar flow completo
  public async execute(context: Partial<ExecutionContext> = {}): Promise<{
    success: boolean
    logs: FlowExecutionLog[]
    error?: string
  }> {
    this.executionLogs = []
    
    // Configurar contexto
    const fullContext: ExecutionContext = {
      flowId: 'manual',
      nodeId: 'start',
      variables: {},
      testMode: true,
      ...context
    }
    
    // Atualizar variáveis com contexto
    Object.assign(this.variables, context.variables || {})
    
    try {
      // Encontrar nós iniciais
      const startNodes = this.findStartNodes()
      
      if (startNodes.length === 0) {
        throw new Error('Nenhum trigger encontrado no flow')
      }
      
      // Fila de nós para processar
      const queue: Node[] = [...startNodes]
      const processed = new Set<string>()
      
      // Processar nós em ordem
      while (queue.length > 0) {
        const node = queue.shift()!
        
        // Evitar loops
        if (processed.has(node.id)) {
          continue
        }
        
        processed.add(node.id)
        
        // Executar nó
        const result = await this.executeNode(node, fullContext)
        
        if (!result.success) {
          this.log(node.id, 'error', result.error)
          
          // Continuar mesmo com erro em modo teste
          if (!fullContext.testMode) {
            throw new Error(result.error)
          }
        }
        
        // Adicionar próximos nós à fila
        if (result.nextNodes) {
          const nextNodes = result.nextNodes
            .map(id => this.nodes.find(n => n.id === id))
            .filter(Boolean) as Node[]
          
          queue.push(...nextNodes)
        }
      }
      
      return {
        success: true,
        logs: this.executionLogs
      }
    } catch (error: any) {
      return {
        success: false,
        logs: this.executionLogs,
        error: error.message
      }
    }
  }
  
  // Obter logs de execução
  public getLogs(): FlowExecutionLog[] {
    return this.executionLogs
  }
  
  // Limpar logs
  public clearLogs() {
    this.executionLogs = []
  }
}
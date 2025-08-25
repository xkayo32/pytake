/**
 * Sistema de Execução de Flow Mock - PyTake
 * 
 * Engine funcional para executar diferentes tipos de nós com lógica real
 * Simula comportamento do backend com execução completa offline
 */

import { MockFlow, MockFlowNode, MockFlowEdge } from './flow-test-data'

export interface FlowVariable {
  name: string
  value: any
  type: string
}

export interface ExecutionMessage {
  id: string
  sender: 'user' | 'bot'
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'document' | 'buttons' | 'list'
  buttons?: Array<{ id: string; text: string; description?: string }>
  listItems?: Array<{ id: string; title: string; description: string }>
  nodeId?: string
  metadata?: Record<string, any>
}

export interface ExecutionLog {
  id: string
  timestamp: Date
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'running' | 'success' | 'error' | 'waiting' | 'skipped'
  message: string
  duration?: number
  data?: any
}

export interface FlowExecutionContext {
  flow: MockFlow
  variables: Map<string, any>
  messages: ExecutionMessage[]
  logs: ExecutionLog[]
  currentNodeId: string | null
  executionPath: string[]
  isWaitingForInput: boolean
  waitingInputType: 'text' | 'button' | 'list' | null
  waitingVariable?: string
}

export class FlowExecutionEngine {
  private context: FlowExecutionContext
  private onMessageCallback?: (message: ExecutionMessage) => void
  private onLogCallback?: (log: ExecutionLog) => void
  private onVariableUpdateCallback?: (variables: FlowVariable[]) => void
  private onWaitingCallback?: (isWaiting: boolean, inputType?: string) => void

  constructor(flow: MockFlow) {
    this.context = {
      flow,
      variables: new Map(),
      messages: [],
      logs: [],
      currentNodeId: null,
      executionPath: [],
      isWaitingForInput: false,
      waitingInputType: null
    }

    // Inicializar variáveis do flow
    if (flow.variables) {
      Object.entries(flow.variables).forEach(([key, value]) => {
        this.context.variables.set(key, value)
      })
    }
  }

  // === CALLBACK REGISTRATION ===
  onMessage(callback: (message: ExecutionMessage) => void) {
    this.onMessageCallback = callback
  }

  onLog(callback: (log: ExecutionLog) => void) {
    this.onLogCallback = callback
  }

  onVariableUpdate(callback: (variables: FlowVariable[]) => void) {
    this.onVariableUpdateCallback = callback
  }

  onWaitingForInput(callback: (isWaiting: boolean, inputType?: string) => void) {
    this.onWaitingCallback = callback
  }

  // === FLOW EXECUTION ===
  async startFlow(): Promise<void> {
    this.addLog('system', 'Sistema', 'system', 'running', 'Iniciando execução do flow...')
    
    // Encontrar nó trigger
    const triggerNode = this.context.flow.nodes.find(node => 
      node.type.startsWith('trigger_')
    )

    if (!triggerNode) {
      this.addLog('system', 'Sistema', 'system', 'error', 'Nenhum trigger encontrado no flow')
      return
    }

    await this.executeNode(triggerNode.id)
  }

  async executeNode(nodeId: string): Promise<void> {
    const node = this.findNodeById(nodeId)
    if (!node) {
      this.addLog('error', 'Erro', 'system', 'error', `Nó ${nodeId} não encontrado`)
      return
    }

    this.context.currentNodeId = nodeId
    this.context.executionPath.push(nodeId)
    
    const startTime = Date.now()
    this.addLog(nodeId, node.data.label, node.type, 'running', `Executando nó ${node.type}...`)

    try {
      let nextNodeId: string | null = null

      switch (node.type) {
        case 'trigger_keyword':
          nextNodeId = await this.handleTriggerKeyword(node)
          break
        case 'message':
          nextNodeId = await this.handleMessage(node)
          break
        case 'buttons':
          nextNodeId = await this.handleButtons(node)
          break
        case 'input':
          nextNodeId = await this.handleInput(node)
          break
        case 'interactive_list':
          nextNodeId = await this.handleInteractiveList(node)
          break
        case 'switch':
          nextNodeId = await this.handleSwitch(node)
          break
        case 'condition':
          nextNodeId = await this.handleCondition(node)
          break
        default:
          this.addLog(nodeId, node.data.label, node.type, 'skipped', `Tipo de nó ${node.type} não implementado`)
          nextNodeId = this.findNextNode(nodeId)
      }

      const duration = Date.now() - startTime
      this.addLog(nodeId, node.data.label, node.type, 'success', `Executado com sucesso`, duration)

      // Se não está esperando input e há próximo nó, execute
      if (!this.context.isWaitingForInput && nextNodeId) {
        await this.executeNode(nextNodeId)
      }

    } catch (error) {
      this.addLog(nodeId, node.data.label, node.type, 'error', `Erro na execução: ${error}`)
    }
  }

  // === NODE HANDLERS ===
  private async handleTriggerKeyword(node: MockFlowNode): Promise<string | null> {
    const keywords = node.data.keywords || []
    this.addLog(node.id, node.data.label, 'trigger_keyword', 'success', 
      `Trigger ativo para palavras: ${keywords.join(', ')}`)
    
    return this.findNextNode(node.id)
  }

  private async handleMessage(node: MockFlowNode): Promise<string | null> {
    const message = this.processVariables(node.data.message || 'Mensagem não definida')
    const delay = node.data.delay || 1000

    // Simular digitação
    await this.sleep(delay)

    const executionMessage: ExecutionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: 'bot',
      content: message,
      timestamp: new Date(),
      type: 'text',
      nodeId: node.id
    }

    this.context.messages.push(executionMessage)
    this.onMessageCallback?.(executionMessage)

    return this.findNextNode(node.id)
  }

  private async handleButtons(node: MockFlowNode): Promise<string | null> {
    const message = this.processVariables(node.data.message || 'Escolha uma opção:')
    const buttons = node.data.buttons || []

    const executionMessage: ExecutionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: 'bot',
      content: message,
      timestamp: new Date(),
      type: 'buttons',
      buttons: buttons.map((btn: any) => ({
        id: btn.id,
        text: btn.text,
        description: btn.description
      })),
      nodeId: node.id
    }

    this.context.messages.push(executionMessage)
    this.onMessageCallback?.(executionMessage)

    // Aguardar seleção do usuário
    this.setWaitingForInput('button')
    return null // Não continua automaticamente
  }

  private async handleInput(node: MockFlowNode): Promise<string | null> {
    const message = this.processVariables(node.data.message || 'Digite sua resposta:')
    const variable = node.data.variable
    const validation = node.data.validation || {}

    const executionMessage: ExecutionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: 'bot',
      content: message,
      timestamp: new Date(),
      type: 'text',
      nodeId: node.id,
      metadata: {
        expectingInput: true,
        variable: variable,
        validation: validation,
        placeholder: node.data.placeholder
      }
    }

    this.context.messages.push(executionMessage)
    this.onMessageCallback?.(executionMessage)

    // Aguardar input do usuário
    this.context.waitingVariable = variable
    this.setWaitingForInput('text')
    return null
  }

  private async handleInteractiveList(node: MockFlowNode): Promise<string | null> {
    const content = node.data.content || {}
    const message = `${content.header || 'Lista'}\n\n${content.body || 'Selecione uma opção:'}`
    
    // Converter seções em lista plana para exibição
    const listItems: Array<{ id: string; title: string; description: string }> = []
    if (content.sections) {
      content.sections.forEach((section: any) => {
        if (section.rows) {
          section.rows.forEach((row: any) => {
            listItems.push({
              id: row.id,
              title: row.title,
              description: row.description || ''
            })
          })
        }
      })
    }

    const executionMessage: ExecutionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: 'bot',
      content: this.processVariables(message),
      timestamp: new Date(),
      type: 'list',
      listItems: listItems,
      nodeId: node.id
    }

    this.context.messages.push(executionMessage)
    this.onMessageCallback?.(executionMessage)

    this.setWaitingForInput('list')
    return null
  }

  private async handleSwitch(node: MockFlowNode): Promise<string | null> {
    const variable = node.data.variable
    const cases = node.data.cases || {}
    const defaultCase = node.data.defaultCase

    const variableValue = this.context.variables.get(variable)
    
    this.addLog(node.id, node.data.label, 'switch', 'running', 
      `Avaliando switch: ${variable} = ${variableValue}`)

    // Encontrar caso correspondente
    const targetNodeId = cases[variableValue] || defaultCase
    
    if (targetNodeId) {
      this.addLog(node.id, node.data.label, 'switch', 'success', 
        `Switch redirecionando para: ${targetNodeId}`)
      return targetNodeId
    }

    this.addLog(node.id, node.data.label, 'switch', 'error', 
      'Nenhum caso correspondente encontrado no switch')
    return null
  }

  private async handleCondition(node: MockFlowNode): Promise<string | null> {
    const condition = node.data.condition
    const variable = node.data.variable
    const operator = node.data.operator
    const value = node.data.value

    const variableValue = this.context.variables.get(variable)
    let result = false

    switch (operator) {
      case 'equals':
        result = variableValue === value
        break
      case 'contains':
        result = String(variableValue).includes(String(value))
        break
      case 'starts_with':
        result = String(variableValue).startsWith(String(value))
        break
      case 'greater_than':
        result = Number(variableValue) > Number(value)
        break
      case 'less_than':
        result = Number(variableValue) < Number(value)
        break
    }

    this.addLog(node.id, node.data.label, 'condition', 'success', 
      `Condição ${variable} ${operator} ${value} = ${result}`)

    // Encontrar edge correspondente (true/false)
    const edges = this.context.flow.edges.filter(e => e.source === node.id)
    const targetEdge = edges.find(e => 
      (result && e.condition === 'true') || 
      (!result && e.condition === 'false')
    )

    return targetEdge?.target || null
  }

  // === USER INPUT HANDLING ===
  async handleUserInput(input: string): Promise<void> {
    if (!this.context.isWaitingForInput) {
      return
    }

    // Adicionar mensagem do usuário
    const userMessage: ExecutionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text'
    }

    this.context.messages.push(userMessage)
    this.onMessageCallback?.(userMessage)

    if (this.context.waitingInputType === 'text' && this.context.waitingVariable) {
      // Salvar input em variável
      this.setVariable(this.context.waitingVariable, input)
      this.context.waitingVariable = undefined
    }

    this.setWaitingForInput(null)

    // Continuar execução
    if (this.context.currentNodeId) {
      const nextNodeId = this.findNextNode(this.context.currentNodeId)
      if (nextNodeId) {
        await this.executeNode(nextNodeId)
      }
    }
  }

  async handleButtonClick(buttonId: string): Promise<void> {
    if (!this.context.isWaitingForInput || this.context.waitingInputType !== 'button') {
      return
    }

    // Encontrar o botão clicado para obter o texto
    const currentNode = this.findNodeById(this.context.currentNodeId!)
    const button = currentNode?.data.buttons?.find((btn: any) => btn.id === buttonId)
    
    if (button) {
      const userMessage: ExecutionMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sender: 'user',
        content: button.text,
        timestamp: new Date(),
        type: 'text',
        metadata: { buttonId }
      }

      this.context.messages.push(userMessage)
      this.onMessageCallback?.(userMessage)
    }

    this.setVariable('selected_option', buttonId)
    this.setWaitingForInput(null)

    // Encontrar próximo nó baseado na condição
    const nextNodeId = this.findNextNodeByCondition(this.context.currentNodeId!, buttonId)
    if (nextNodeId) {
      await this.executeNode(nextNodeId)
    }
  }

  async handleListSelection(itemId: string): Promise<void> {
    if (!this.context.isWaitingForInput || this.context.waitingInputType !== 'list') {
      return
    }

    // Encontrar item selecionado
    const currentNode = this.findNodeById(this.context.currentNodeId!)
    let selectedItem: any = null

    if (currentNode?.data.content?.sections) {
      for (const section of currentNode.data.content.sections) {
        if (section.rows) {
          selectedItem = section.rows.find((row: any) => row.id === itemId)
          if (selectedItem) break
        }
      }
    }

    if (selectedItem) {
      const userMessage: ExecutionMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sender: 'user',
        content: selectedItem.title,
        timestamp: new Date(),
        type: 'text',
        metadata: { listItemId: itemId }
      }

      this.context.messages.push(userMessage)
      this.onMessageCallback?.(userMessage)
    }

    this.setVariable('selected_option', itemId)
    this.setWaitingForInput(null)

    const nextNodeId = this.findNextNode(this.context.currentNodeId!)
    if (nextNodeId) {
      await this.executeNode(nextNodeId)
    }
  }

  // === HELPER METHODS ===
  private findNodeById(nodeId: string): MockFlowNode | undefined {
    return this.context.flow.nodes.find(node => node.id === nodeId)
  }

  private findNextNode(sourceNodeId: string): string | null {
    const edge = this.context.flow.edges.find(e => e.source === sourceNodeId)
    return edge?.target || null
  }

  private findNextNodeByCondition(sourceNodeId: string, condition: string): string | null {
    const edge = this.context.flow.edges.find(e => 
      e.source === sourceNodeId && e.condition === condition
    )
    return edge?.target || this.findNextNode(sourceNodeId)
  }

  private processVariables(text: string): string {
    let processed = text
    this.context.variables.forEach((value, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processed = processed.replace(regex, String(value))
    })
    return processed
  }

  private setVariable(name: string, value: any): void {
    this.context.variables.set(name, value)
    this.updateVariablesCallback()
    this.addLog('system', 'Sistema', 'variable', 'success', `Variável atualizada: ${name} = ${value}`)
  }

  private setWaitingForInput(inputType: 'text' | 'button' | 'list' | null): void {
    this.context.isWaitingForInput = inputType !== null
    this.context.waitingInputType = inputType
    this.onWaitingCallback?.(this.context.isWaitingForInput, inputType || undefined)
  }

  private updateVariablesCallback(): void {
    const variables: FlowVariable[] = []
    this.context.variables.forEach((value, name) => {
      variables.push({
        name,
        value,
        type: typeof value
      })
    })
    this.onVariableUpdateCallback?.(variables)
  }

  private addLog(nodeId: string, nodeName: string, nodeType: string, status: ExecutionLog['status'], message: string, duration?: number): void {
    const log: ExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      nodeId,
      nodeName,
      nodeType,
      status,
      message,
      duration
    }

    this.context.logs.push(log)
    this.onLogCallback?.(log)
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // === PUBLIC GETTERS ===
  get variables(): FlowVariable[] {
    const result: FlowVariable[] = []
    this.context.variables.forEach((value, name) => {
      result.push({ name, value, type: typeof value })
    })
    return result
  }

  get messages(): ExecutionMessage[] {
    return [...this.context.messages]
  }

  get logs(): ExecutionLog[] {
    return [...this.context.logs]
  }

  get executionPath(): string[] {
    return [...this.context.executionPath]
  }

  get currentNodeId(): string | null {
    return this.context.currentNodeId
  }

  get isWaitingForInput(): boolean {
    return this.context.isWaitingForInput
  }

  get waitingInputType(): string | null {
    return this.context.waitingInputType
  }
}
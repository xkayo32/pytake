import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges, Connection, Edge, Node, NodeChange, EdgeChange } from 'reactflow'
import { FlowNode, FlowEdge, Flow, NodeType } from '@/lib/types/flow'
import { getNodeConfig } from '@/lib/types/node-schemas'

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
  timestamp: number
}

interface FlowEditorStore {
  // Flow data
  flow: Flow | null
  nodes: Node[]
  edges: Edge[]
  
  // Undo/Redo state
  history: HistoryState[]
  currentHistoryIndex: number
  maxHistorySize: number
  
  // UI state
  selectedNode: string | null
  selectedEdge: string | null
  isLoading: boolean
  isDirty: boolean
  showProperties: boolean
  
  // Editor state
  nodeTypes: NodeType[]
  
  // Actions
  setFlow: (flow: Flow) => void
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  
  // Node management
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void
  updateNodeData: (nodeId: string, data: any) => void
  deleteNode: (nodeId: string) => void
  
  // Edge management
  deleteEdge: (edgeId: string) => void
  
  // Selection
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  setShowProperties: (show: boolean) => void
  
  // Flow management
  saveFlow: () => Promise<void>
  loadFlow: (flowId: string) => Promise<void>
  createNewFlow: () => void
  
  // Local storage
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => boolean
  clearLocalStorage: () => void
  
  // Validation
  validateFlow: () => { isValid: boolean; errors: string[] }
  
  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  saveToHistory: () => void
}

export const useFlowEditorStore = create<FlowEditorStore>((set, get) => ({
  // Initial state
  flow: null,
  nodes: [],
  edges: [],
  
  // Undo/Redo initial state
  history: [],
  currentHistoryIndex: -1,
  maxHistorySize: 50,
  
  selectedNode: null,
  selectedEdge: null,
  isLoading: false,
  isDirty: false,
  showProperties: false,
  nodeTypes: [],
  
  // Basic setters (with history)
  setFlow: (flow) => set({ flow, isDirty: false }),
  setNodes: (nodes) => {
    const state = get()
    set({ nodes, isDirty: true })
    // Save to history after setting nodes
    setTimeout(() => get().saveToHistory(), 0)
  },
  setEdges: (edges) => {
    const state = get()
    set({ edges, isDirty: true })
    // Save to history after setting edges
    setTimeout(() => get().saveToHistory(), 0)
  },
  
  // React Flow handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true
    })
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true
    })
  },
  
  onConnect: (connection) => {
    const { edges } = get()
    const newEdge = {
      id: `edge-${Date.now()}`,
      ...connection,
      type: 'smoothstep',
      animated: true,
    } as Edge
    
    set({
      edges: addEdge(newEdge, edges),
      isDirty: true
    })
  },
  
  // Node management
  addNode: (nodeType, position) => {
    const { nodes } = get()
    
    // Buscar configuração completa do nó
    const nodeConfig = getNodeConfig(nodeType.id)
    
    // Criar config inicial com valores padrão
    const initialConfig: Record<string, any> = {}
    if (nodeConfig) {
      Object.entries(nodeConfig.configSchema).forEach(([key, schema]) => {
        if (schema.defaultValue !== undefined) {
          initialConfig[key] = schema.defaultValue
        }
      })
    }
    
    // Determinar o tipo de nó correto
    let nodeTypeForReactFlow = nodeType.category
    
    // Usar tipos customizados para nós especiais
    if (nodeType.id === 'trigger_template_button') {
      nodeTypeForReactFlow = 'trigger_template_button'
      console.log('Creating TemplateButtonNode with type:', nodeTypeForReactFlow)
    } else if (nodeType.id === 'msg_negotiation_template') {
      nodeTypeForReactFlow = 'msg_negotiation_template'
    } else if (nodeType.id === 'msg_text') {
      nodeTypeForReactFlow = 'msg_text'
    } else if (nodeType.id === 'msg_image') {
      nodeTypeForReactFlow = 'msg_image'
    } else if (nodeType.id === 'msg_audio') {
      nodeTypeForReactFlow = 'msg_audio'
    } else if (nodeType.id === 'msg_video') {
      nodeTypeForReactFlow = 'msg_video'
    } else if (nodeType.id === 'msg_document') {
      nodeTypeForReactFlow = 'msg_document'
    } else if (nodeType.id === 'msg_template') {
      nodeTypeForReactFlow = 'msg_template'
    } else if (nodeType.id === 'ai_chatgpt') {
      nodeTypeForReactFlow = 'ai_chatgpt'
    } else if (nodeType.id === 'ai_claude') {
      nodeTypeForReactFlow = 'ai_claude'
    } else if (nodeType.id === 'ai_gemini') {
      nodeTypeForReactFlow = 'ai_gemini'
    } else if (nodeType.id === 'api_rest') {
      nodeTypeForReactFlow = 'api_rest'
    } else if (nodeType.id === 'condition_if') {
      nodeTypeForReactFlow = 'condition_if'
    } else if (nodeType.id === 'condition_switch') {
      nodeTypeForReactFlow = 'condition_switch'
    } else if (nodeType.id === 'flow_delay') {
      nodeTypeForReactFlow = 'flow_delay'
    } else if (nodeType.id === 'flow_goto') {
      nodeTypeForReactFlow = 'flow_goto'
    } else if (nodeType.id === 'flow_end') {
      nodeTypeForReactFlow = 'flow_end'
    } else if (nodeType.id === 'data_set') {
      nodeTypeForReactFlow = 'data_set'
    } else if (nodeType.id === 'data_get') {
      nodeTypeForReactFlow = 'data_get'
    } else if (nodeType.id === 'db_query') {
      nodeTypeForReactFlow = 'db_query'
    } else if (nodeType.id === 'db_insert') {
      nodeTypeForReactFlow = 'db_insert'
    } else if (nodeType.id === 'int_email') {
      nodeTypeForReactFlow = 'int_email'
    }
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeTypeForReactFlow,
      position,
      data: {
        label: nodeType.name,
        description: nodeConfig?.description || nodeType.description,
        icon: nodeType.icon,
        color: nodeType.color,
        nodeType: nodeType.id,
        config: initialConfig
      }
    }
    
    set({
      nodes: [...nodes, newNode],
      selectedNode: newNode.id,
      isDirty: true
    })
  },
  
  updateNodeData: (nodeId, data) => {
    const { nodes } = get()
    const targetNode = nodes.find(node => node.id === nodeId)
    if (targetNode) {
      console.log(`updateNodeData for ${nodeId}:`, {
        before: targetNode.data,
        updating: data,
        after: { ...targetNode.data, ...data }
      })
    }
    
    const updatedNodes = nodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...data } }
        : node
    )
    
    set({
      nodes: updatedNodes,
      isDirty: true
    })
  },
  
  deleteNode: (nodeId) => {
    const { nodes, edges } = get()
    const updatedNodes = nodes.filter(node => node.id !== nodeId)
    const updatedEdges = edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    )
    
    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      selectedNode: null,
      isDirty: true
    })
  },
  
  // Edge management
  deleteEdge: (edgeId) => {
    const { edges } = get()
    const updatedEdges = edges.filter(edge => edge.id !== edgeId)
    
    set({
      edges: updatedEdges,
      selectedEdge: null,
      isDirty: true
    })
  },
  
  // Selection
  selectNode: (nodeId) => {
    set({ 
      selectedNode: nodeId,
      selectedEdge: null
    })
  },
  
  selectEdge: (edgeId) => {
    set({ 
      selectedEdge: edgeId,
      selectedNode: null
    })
  },
  
  setShowProperties: (show) => {
    set({ showProperties: show })
  },
  
  // Flow management
  saveFlow: async () => {
    console.log('🔄 [DEBUG] saveFlow iniciado')
    const { flow, nodes, edges } = get()
    console.log('📊 [DEBUG] Estado atual:', { flow: flow?.id, nodes: nodes.length, edges: edges.length })
    if (!flow) {
      console.log('❌ [DEBUG] Flow é null, retornando')
      return
    }
    
    set({ isLoading: true })
    
    try {
      console.log('🔄 [DEBUG] Iniciando conversão de nós e edges')
      // Validar dados dos nós antes da conversão
      console.log('📋 [DEBUG] Nodes para conversão:', nodes)
      
      // Convert React Flow nodes/edges to our format
      const flowNodes: FlowNode[] = nodes.map(node => {
        // Validar estrutura do nó
        if (!node.data || !node.data.nodeType) {
          console.error('❌ [DEBUG] Nó com dados inválidos:', node)
          throw new Error(`Nó ${node.id} possui dados inválidos`)
        }
        
        return {
          id: node.id,
          type: node.data.nodeType,
          position: node.position,
          data: {
            label: node.data.label || 'Sem nome',
            description: node.data.description || '',
            config: node.data.config || {},
            icon: node.data.icon || 'Box',
            color: node.data.color || '#gray'
          }
        }
      })
      
      const flowEdges: FlowEdge[] = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        type: edge.type,
        data: edge.data
      }))
      
      // Validar flow antes da criação
      console.log('🔍 [DEBUG] Flow atual:', flow)
      
      const updatedFlow: Flow = {
        id: flow.id || `flow-${Date.now()}`,
        name: flow.name || 'Flow sem nome',
        description: flow.description || '',
        status: flow.status || 'draft',
        createdAt: flow.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: (flow.version || 0) + 1,
        nodes: flowNodes,
        edges: flowEdges,
        trigger: flow.trigger || {
          type: 'keyword',
          config: {}
        },
        apiId: 'v1' // Required by backend
      }
      
      // Salvar no backend via API
      console.log('Saving flow:', updatedFlow)
      
      try {
        console.log('🔄 [DEBUG] Tentando salvar no backend')
        console.log('🔄 Enviando flow para API:', JSON.stringify(updatedFlow, null, 2))
        
        const response = await fetch('/api/v1/flows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedFlow)
        })
        
        console.log('📡 Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Backend error response:', errorText)
          console.error('📤 Request data:', JSON.stringify(updatedFlow, null, 2))
          throw new Error(`Erro ao salvar flow no backend: ${response.status} - ${errorText}`)
        }
        
        const savedFlow = await response.json()
        
        // Também salvar no localStorage como backup
        const savedFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
        const existingIndex = savedFlows.findIndex((f: any) => f.id === savedFlow.id)
        
        if (existingIndex >= 0) {
          savedFlows[existingIndex] = savedFlow
        } else {
          savedFlows.push(savedFlow)
        }
        
        localStorage.setItem('saved_flows', JSON.stringify(savedFlows))
        
        set({ 
          flow: savedFlow,
          isDirty: false,
          isLoading: false
        })
      } catch (apiError) {
        console.error('Erro ao salvar no backend, salvando apenas localmente:', apiError)
        
        // Se falhar no backend, salvar apenas no localStorage
        const savedFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
        const existingIndex = savedFlows.findIndex((f: any) => f.id === updatedFlow.id)
        
        if (existingIndex >= 0) {
          savedFlows[existingIndex] = updatedFlow
        } else {
          savedFlows.push(updatedFlow)
        }
        
        localStorage.setItem('saved_flows', JSON.stringify(savedFlows))
        
        set({ 
          flow: updatedFlow,
          isDirty: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erro geral ao salvar flow:', error)
      console.error('❌ [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack')
      set({ isLoading: false })
      throw error // Re-throw para mostrar ao usuário
    }
  },
  
  loadFlow: async (flowId) => {
    set({ isLoading: true })
    
    try {
      // Mock flow data - in real app this would be an API call
      const mockFlow: Flow = {
        id: flowId,
        name: 'Flow Exemplo',
        description: 'Flow de demonstração',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        trigger: {
          type: 'keyword',
          config: {
            keywords: ['oi', 'olá']
          }
        },
        nodes: [
          {
            id: '1',
            type: 'trigger-keyword',
            position: { x: 100, y: 100 },
            data: {
              label: 'Palavra-chave',
              description: 'Gatilho por palavra-chave',
              config: { keywords: ['oi', 'olá'] },
              icon: 'MessageCircle',
              color: '#10B981'
            }
          },
          {
            id: '2',
            type: 'action-send-message',
            position: { x: 400, y: 100 },
            data: {
              label: 'Enviar Mensagem',
              description: 'Envia mensagem de boas-vindas',
              config: { message: 'Olá! Como posso ajudar?' },
              icon: 'Send',
              color: '#3B82F6'
            }
          }
        ],
        edges: [
          {
            id: 'e1-2',
            source: '1',
            target: '2'
          }
        ]
      }
      
      // Convert to React Flow format
      const reactFlowNodes: Node[] = mockFlow.nodes.map(node => ({
        id: node.id,
        type: node.type.split('-')[0], // 'trigger', 'action', etc.
        position: node.position,
        data: {
          ...node.data,
          nodeType: node.type
        }
      }))
      
      const reactFlowEdges: Edge[] = mockFlow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'smoothstep',
        animated: true,
        data: edge.data
      }))
      
      set({
        flow: mockFlow,
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
        isLoading: false,
        isDirty: false
      })
    } catch (error) {
      console.error('Error loading flow:', error)
      set({ isLoading: false })
    }
  },
  
  createNewFlow: () => {
    const newFlow: Flow = {
      id: `flow-${Date.now()}`,
      name: 'Novo Flow',
      description: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      apiId: 'v1',
      trigger: {
        type: 'keyword',
        config: {}
      },
      nodes: [],
      edges: []
    }
    
    set({
      flow: newFlow,
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      isDirty: false
    })
  },
  
  // Local storage
  saveToLocalStorage: () => {
    const { flow, nodes, edges } = get()
    const draftData = {
      flow,
      nodes,
      edges,
      timestamp: new Date().toISOString()
    }
    
    try {
      localStorage.setItem('pytake_flow_draft', JSON.stringify(draftData))
      console.log('Flow salvo como rascunho')
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
    }
  },
  
  loadFromLocalStorage: () => {
    try {
      const draftData = localStorage.getItem('pytake_flow_draft')
      if (draftData) {
        const parsed = JSON.parse(draftData)
        
        // Verificar se o rascunho não é muito antigo (24 horas)
        const timestamp = new Date(parsed.timestamp)
        const now = new Date()
        const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff < 24) {
          // Verificar e corrigir tipos de nós especiais
          const nodes = (parsed.nodes || []).map((node: any) => {
            // Garantir que nós especiais mantenham seu tipo
            if (node.data?.nodeType === 'trigger_template_button' && node.type !== 'trigger_template_button') {
              console.log('Fixing node type for trigger_template_button')
              return { ...node, type: 'trigger_template_button' }
            }
            if (node.data?.nodeType === 'msg_negotiation_template' && node.type !== 'msg_negotiation_template') {
              return { ...node, type: 'msg_negotiation_template' }
            }
            return node
          })
          
          set({
            flow: parsed.flow,
            nodes,
            edges: parsed.edges || [],
            isDirty: false
          })
          console.log('Rascunho carregado do localStorage')
          return true
        } else {
          // Rascunho muito antigo, limpar
          localStorage.removeItem('pytake_flow_draft')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error)
    }
    return false
  },
  
  clearLocalStorage: () => {
    localStorage.removeItem('pytake_flow_draft')
    console.log('Rascunho removido')
  },
  
  // Validation
  validateFlow: () => {
    const { nodes, edges } = get()
    const errors: string[] = []
    
    // Check if there's at least one trigger
    const triggerNodes = nodes.filter(node => 
      node.type === 'trigger' || 
      node.type === 'trigger_template_button' ||
      node.data?.nodeType?.startsWith('trigger_')
    )
    if (triggerNodes.length === 0) {
      errors.push('Flow deve ter pelo menos um gatilho (trigger)')
    }
    
    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>()
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })
    
    const disconnectedNodes = nodes.filter(node => 
      !connectedNodeIds.has(node.id) && nodes.length > 1
    )
    
    if (disconnectedNodes.length > 0) {
      errors.push(`${disconnectedNodes.length} nó(s) desconectado(s) encontrado(s)`)
    }
    
    // Check for required configs
    nodes.forEach(node => {
      const nodeData = node.data
      if (!nodeData.config || Object.keys(nodeData.config).length === 0) {
        errors.push(`Nó "${nodeData.label}" precisa ser configurado`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  // Undo/Redo implementation
  saveToHistory: () => {
    const { nodes, edges, history, currentHistoryIndex, maxHistorySize } = get()
    
    // Create new history state
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now()
    }
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, currentHistoryIndex + 1)
    
    // Add new state
    newHistory.push(newState)
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift()
    }
    
    set({
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1
    })
  },
  
  undo: () => {
    const { history, currentHistoryIndex } = get()
    
    if (currentHistoryIndex > 0) {
      const prevState = history[currentHistoryIndex - 1]
      set({
        nodes: JSON.parse(JSON.stringify(prevState.nodes)),
        edges: JSON.parse(JSON.stringify(prevState.edges)),
        currentHistoryIndex: currentHistoryIndex - 1,
        isDirty: true
      })
    }
  },
  
  redo: () => {
    const { history, currentHistoryIndex } = get()
    
    if (currentHistoryIndex < history.length - 1) {
      const nextState = history[currentHistoryIndex + 1]
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: JSON.parse(JSON.stringify(nextState.edges)),
        currentHistoryIndex: currentHistoryIndex + 1,
        isDirty: true
      })
    }
  },
  
  canUndo: () => {
    const { currentHistoryIndex } = get()
    return currentHistoryIndex > 0
  },
  
  canRedo: () => {
    const { history, currentHistoryIndex } = get()
    return currentHistoryIndex < history.length - 1
  }
}))

export default useFlowEditorStore
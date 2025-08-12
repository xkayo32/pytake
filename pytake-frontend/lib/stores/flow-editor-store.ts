import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges, Connection, Edge, Node, NodeChange, EdgeChange } from 'reactflow'
import { FlowNode, FlowEdge, Flow, NodeType } from '@/lib/types/flow'

interface FlowEditorStore {
  // Flow data
  flow: Flow | null
  nodes: Node[]
  edges: Edge[]
  
  // UI state
  selectedNode: string | null
  selectedEdge: string | null
  isLoading: boolean
  isDirty: boolean
  
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
  
  // Flow management
  saveFlow: () => Promise<void>
  loadFlow: (flowId: string) => Promise<void>
  createNewFlow: () => void
  
  // Validation
  validateFlow: () => { isValid: boolean; errors: string[] }
}

export const useFlowEditorStore = create<FlowEditorStore>((set, get) => ({
  // Initial state
  flow: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  isLoading: false,
  isDirty: false,
  nodeTypes: [],
  
  // Basic setters
  setFlow: (flow) => set({ flow, isDirty: false }),
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  
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
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeType.category,
      position,
      data: {
        label: nodeType.name,
        description: nodeType.description,
        icon: nodeType.icon,
        color: nodeType.color,
        nodeType: nodeType.id,
        config: {}
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
  
  // Flow management
  saveFlow: async () => {
    const { flow, nodes, edges } = get()
    if (!flow) return
    
    set({ isLoading: true })
    
    try {
      // Convert React Flow nodes/edges to our format
      const flowNodes: FlowNode[] = nodes.map(node => ({
        id: node.id,
        type: node.data.nodeType,
        position: node.position,
        data: {
          label: node.data.label,
          description: node.data.description,
          config: node.data.config,
          icon: node.data.icon,
          color: node.data.color
        }
      }))
      
      const flowEdges: FlowEdge[] = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        type: edge.type,
        data: edge.data
      }))
      
      const updatedFlow: Flow = {
        ...flow,
        nodes: flowNodes,
        edges: flowEdges,
        updatedAt: new Date().toISOString(),
        version: flow.version + 1
      }
      
      // Here would be the API call to save
      console.log('Saving flow:', updatedFlow)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set({ 
        flow: updatedFlow,
        isDirty: false,
        isLoading: false
      })
    } catch (error) {
      console.error('Error saving flow:', error)
      set({ isLoading: false })
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
  
  // Validation
  validateFlow: () => {
    const { nodes, edges } = get()
    const errors: string[] = []
    
    // Check if there's at least one trigger
    const triggerNodes = nodes.filter(node => node.type === 'trigger')
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
  }
}))

export default useFlowEditorStore
'use client'
// Force cache refresh - v3 - Fixed setIsDirty issue
import { useCallback, useEffect, useRef, DragEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'

import { NodePalette } from '@/components/flow-editor/node-palette-v2'
import { PropertiesPanel } from '@/components/flow-editor/properties-panel'
import { FlowLoader } from '@/components/flow-editor/flow-loader'
import { FlowExecutorModal } from '@/components/flow-editor/flow-executor-modal'
import { WhatsAppTemplateManager } from '@/components/flow-editor/whatsapp-template-manager'
import { WhatsAppNumberSelector } from '@/components/whatsapp/whatsapp-number-selector'
import { nodeTypes } from '@/components/flow-editor/nodes/custom-nodes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { useAuth } from '@/lib/hooks/useAuth'
import { NodeType } from '@/lib/types/flow'
import { 
  Save, 
  Play, 
  ArrowLeft, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Eye,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Power,
  PowerOff,
  Pause,
  Phone
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'

// Node types imported from custom-nodes

function FlowEditor() {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [showFlows, setShowFlows] = useState(false)
  const [showWhatsAppTemplates, setShowWhatsAppTemplates] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [flowStatus, setFlowStatus] = useState<'draft' | 'active' | 'inactive'>('draft')
  const [selectedWhatsAppNumbers, setSelectedWhatsAppNumbers] = useState<string[]>([])
  const [showWhatsAppSelector, setShowWhatsAppSelector] = useState(false)
  const {
    flow,
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isLoading,
    isDirty,
    showProperties,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    selectEdge,
    setShowProperties,
    saveFlow,
    createNewFlow,
    validateFlow,
    loadFromLocalStorage,
    saveToLocalStorage,
    clearLocalStorage,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    canUndo,
    canRedo
  } = useFlowEditorStore()

  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    // Primeiro, verificar se há um flow sendo editado no localStorage (prioridade para recuperação após refresh)
    const draftData = localStorage.getItem('pytake_flow_draft')
    let hasRecoveredFromRefresh = false
    
    if (draftData) {
      try {
        const parsed = JSON.parse(draftData)
        // Se estava editando um flow publicado/ativo recentemente (menos de 1 hora), recuperar automaticamente
        const timestamp = new Date(parsed.timestamp)
        const now = new Date()
        const minutesDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60)
        
        if (parsed.isEditingPublishedFlow && minutesDiff < 60) {
          console.log('🔄 Detectado refresh durante edição de flow publicado - recuperando automaticamente')
          
          // Corrigir nodes recuperados também
          const correctedNodes = (parsed.nodes || []).map((node: any) => {
            // Garantir que o node tenha nodeType no data para funcionar no painel de propriedades
            if (node.data && !node.data.nodeType && node.type) {
              console.log('🔧 Corrigindo nodeType para node recuperado:', node.id, node.type)
              node.data.nodeType = node.type
            }
            return node
          })
          
          setNodes(correctedNodes)
          setEdges(parsed.edges || [])
          useFlowEditorStore.setState({
            flow: parsed.flow,
            isDirty: true // Marcar como dirty pois estava sendo editado
          })
          hasRecoveredFromRefresh = true
        }
      } catch (error) {
        console.error('Erro ao verificar recovery de flow:', error)
      }
    }
    
    // Se já recuperou de um refresh, não carregar mais nada
    if (hasRecoveredFromRefresh) return
    
    // Verificar se há um flow salvo para carregar
    const flowToLoad = sessionStorage.getItem('load_flow')
    if (flowToLoad) {
      try {
        const flow = JSON.parse(flowToLoad)
        console.log('Loading saved flow from session:', flow)
        
        // Carregar nodes e edges do flow com correção de estrutura
        const correctedNodes = (flow.nodes || []).map((node: any) => {
          // Garantir que o node tenha nodeType no data para funcionar no painel de propriedades
          if (node.data && !node.data.nodeType && node.type) {
            console.log('🔧 Corrigindo nodeType para node:', node.id, node.type)
            node.data.nodeType = node.type
          }
          
          // Garantir que nós especiais mantenham seu tipo correto
          if (node.data?.nodeType === 'trigger_template_button' && node.type !== 'trigger_template_button') {
            console.log('🔧 Fixing node type for trigger_template_button')
            return { ...node, type: 'trigger_template_button' }
          }
          if (node.data?.nodeType === 'msg_negotiation_template' && node.type !== 'msg_negotiation_template') {
            return { ...node, type: 'msg_negotiation_template' }
          }
          if (node.data?.nodeType === 'msg_text' && node.type !== 'msg_text') {
            return { ...node, type: 'msg_text' }
          }
          if (node.data?.nodeType === 'msg_image' && node.type !== 'msg_image') {
            return { ...node, type: 'msg_image' }
          }
          if (node.data?.nodeType === 'msg_audio' && node.type !== 'msg_audio') {
            return { ...node, type: 'msg_audio' }
          }
          if (node.data?.nodeType === 'msg_video' && node.type !== 'msg_video') {
            return { ...node, type: 'msg_video' }
          }
          if (node.data?.nodeType === 'msg_document' && node.type !== 'msg_document') {
            return { ...node, type: 'msg_document' }
          }
          if (node.data?.nodeType === 'msg_template' && node.type !== 'msg_template') {
            return { ...node, type: 'msg_template' }
          }
          if (node.data?.nodeType === 'ai_chatgpt' && node.type !== 'ai_chatgpt') {
            return { ...node, type: 'ai_chatgpt' }
          }
          if (node.data?.nodeType === 'ai_claude' && node.type !== 'ai_claude') {
            return { ...node, type: 'ai_claude' }
          }
          if (node.data?.nodeType === 'ai_gemini' && node.type !== 'ai_gemini') {
            return { ...node, type: 'ai_gemini' }
          }
          if (node.data?.nodeType === 'api_rest' && node.type !== 'api_rest') {
            return { ...node, type: 'api_rest' }
          }
          if (node.data?.nodeType === 'condition_if' && node.type !== 'condition_if') {
            return { ...node, type: 'condition_if' }
          }
          if (node.data?.nodeType === 'condition_switch' && node.type !== 'condition_switch') {
            return { ...node, type: 'condition_switch' }
          }
          if (node.data?.nodeType === 'flow_delay' && node.type !== 'flow_delay') {
            return { ...node, type: 'flow_delay' }
          }
          if (node.data?.nodeType === 'flow_goto' && node.type !== 'flow_goto') {
            return { ...node, type: 'flow_goto' }
          }
          if (node.data?.nodeType === 'flow_end' && node.type !== 'flow_end') {
            return { ...node, type: 'flow_end' }
          }
          if (node.data?.nodeType === 'data_set' && node.type !== 'data_set') {
            return { ...node, type: 'data_set' }
          }
          if (node.data?.nodeType === 'data_get' && node.type !== 'data_get') {
            return { ...node, type: 'data_get' }
          }
          if (node.data?.nodeType === 'db_query' && node.type !== 'db_query') {
            return { ...node, type: 'db_query' }
          }
          if (node.data?.nodeType === 'db_insert' && node.type !== 'db_insert') {
            return { ...node, type: 'db_insert' }
          }
          if (node.data?.nodeType === 'int_email' && node.type !== 'int_email') {
            return { ...node, type: 'int_email' }
          }
          
          return node
        })
        
        setNodes(correctedNodes)
        setEdges(flow.edges || [])
        
        // Carregar o flow no store
        useFlowEditorStore.setState({ 
          flow: flow,
          isDirty: false 
        })
        
        // Salvar imediatamente no localStorage para permitir recuperação após refresh
        setTimeout(() => {
          saveToLocalStorage()
        }, 100)
        
        // NÃO remover do sessionStorage até que seja explicitamente salvo
        // sessionStorage.removeItem('load_flow') - Comentado para preservar dados
      } catch (error) {
        console.error('Error loading flow:', error)
        sessionStorage.removeItem('load_flow')
      }
      return // Não carregar mais nada se já carregou um flow
    }
    
    // Verificar se há um template para carregar
    const templateToLoad = sessionStorage.getItem('load_template')
    if (templateToLoad) {
      try {
        const template = JSON.parse(templateToLoad)
        console.log('Loading template from session:', template)
        
        // Carregar nodes e edges do template com correção de tipos
        const templateNodes = (template.flow.nodes || []).map((node: any) => {
          // Garantir que nós especiais mantenham seu tipo correto
          if (node.data?.nodeType === 'trigger_template_button' && node.type !== 'trigger_template_button') {
            console.log('Fixing node type for trigger_template_button')
            return { ...node, type: 'trigger_template_button' }
          }
          if (node.data?.nodeType === 'msg_negotiation_template' && node.type !== 'msg_negotiation_template') {
            return { ...node, type: 'msg_negotiation_template' }
          }
          if (node.data?.nodeType === 'msg_text' && node.type !== 'msg_text') {
            return { ...node, type: 'msg_text' }
          }
          if (node.data?.nodeType === 'msg_image' && node.type !== 'msg_image') {
            return { ...node, type: 'msg_image' }
          }
          if (node.data?.nodeType === 'msg_audio' && node.type !== 'msg_audio') {
            return { ...node, type: 'msg_audio' }
          }
          if (node.data?.nodeType === 'msg_video' && node.type !== 'msg_video') {
            return { ...node, type: 'msg_video' }
          }
          if (node.data?.nodeType === 'msg_document' && node.type !== 'msg_document') {
            return { ...node, type: 'msg_document' }
          }
          if (node.data?.nodeType === 'msg_template' && node.type !== 'msg_template') {
            return { ...node, type: 'msg_template' }
          }
          if (node.data?.nodeType === 'ai_chatgpt' && node.type !== 'ai_chatgpt') {
            return { ...node, type: 'ai_chatgpt' }
          }
          if (node.data?.nodeType === 'ai_claude' && node.type !== 'ai_claude') {
            return { ...node, type: 'ai_claude' }
          }
          if (node.data?.nodeType === 'ai_gemini' && node.type !== 'ai_gemini') {
            return { ...node, type: 'ai_gemini' }
          }
          if (node.data?.nodeType === 'api_rest' && node.type !== 'api_rest') {
            return { ...node, type: 'api_rest' }
          }
          if (node.data?.nodeType === 'condition_if' && node.type !== 'condition_if') {
            return { ...node, type: 'condition_if' }
          }
          if (node.data?.nodeType === 'condition_switch' && node.type !== 'condition_switch') {
            return { ...node, type: 'condition_switch' }
          }
          if (node.data?.nodeType === 'flow_delay' && node.type !== 'flow_delay') {
            return { ...node, type: 'flow_delay' }
          }
          if (node.data?.nodeType === 'flow_goto' && node.type !== 'flow_goto') {
            return { ...node, type: 'flow_goto' }
          }
          if (node.data?.nodeType === 'flow_end' && node.type !== 'flow_end') {
            return { ...node, type: 'flow_end' }
          }
          if (node.data?.nodeType === 'data_set' && node.type !== 'data_set') {
            return { ...node, type: 'data_set' }
          }
          if (node.data?.nodeType === 'data_get' && node.type !== 'data_get') {
            return { ...node, type: 'data_get' }
          }
          if (node.data?.nodeType === 'db_query' && node.type !== 'db_query') {
            return { ...node, type: 'db_query' }
          }
          if (node.data?.nodeType === 'db_insert' && node.type !== 'db_insert') {
            return { ...node, type: 'db_insert' }
          }
          if (node.data?.nodeType === 'int_email' && node.type !== 'int_email') {
            return { ...node, type: 'int_email' }
          }
          return node
        })
        
        setNodes(templateNodes)
        setEdges(template.flow.edges || [])
        
        // Criar novo flow com base no template
        const newFlow = {
          id: `flow-${Date.now()}`,
          name: `${template.name} (Cópia)`,
          description: template.description,
          status: 'draft' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          trigger: {
            type: 'keyword',
            config: {}
          },
          nodes: template.flow.nodes || [],
          edges: template.flow.edges || []
        }
        
        useFlowEditorStore.setState({ 
          flow: newFlow,
          isDirty: true 
        })
        
        // Limpar template do sessionStorage
        sessionStorage.removeItem('load_template')
      } catch (error) {
        console.error('Error loading template:', error)
        // Se falhar, carregar normalmente
        const hasDraft = loadFromLocalStorage()
        if (!hasDraft) {
          createNewFlow()
        }
      }
    } else {
      // Carregar do localStorage se existir
      const hasDraft = loadFromLocalStorage()
      if (!hasDraft) {
        createNewFlow()
      }
    }
  }, [])

  // Auto-save para localStorage a cada mudança
  useEffect(() => {
    if (isDirty && nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage()
        setLastSaved(new Date())
      }, 1000) // Salva após 1 segundo de inatividade
      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, isDirty, saveToLocalStorage])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!reactFlowBounds) return

      const nodeTypeData = event.dataTransfer.getData('application/reactflow')
      if (!nodeTypeData) return

      const nodeType: NodeType = JSON.parse(nodeTypeData)
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      addNode(nodeType, position)
    },
    [project, addNode]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    selectNode(node.id)
    setShowProperties(true)
  }, [selectNode, setShowProperties])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    selectEdge(edge.id)
  }, [selectEdge])

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectNode, selectEdge])

  const handleNodeDragStart = useCallback((nodeType: NodeType) => {
    // Node drag started from palette
  }, [])

  const handleBack = useCallback(() => {
    if (isDirty) {
      if (confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
        router.push('/flows')
      }
    } else {
      router.push('/flows')
    }
  }, [isDirty, router])

  const handleSave = useCallback(async () => {
    if (!flow) return
    
    const validation = validateFlow()
    if (!validation.isValid) {
      setNotification({ message: 'Corrija os erros antes de salvar', type: 'error' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    
    try {
      let flowId = flow.id
      let savedFlow
      
      // Verificar se é uma atualização ou criação
      if (flowId && !flowId.startsWith('flow-')) {
        // Flow já existe no backend - atualizar
        console.log('🔄 Atualizando flow existente:', flowId)
        
        const updateData = {
          ...flow,
          status: 'draft', // Sempre salvar como draft
          flow: { nodes, edges },
          updatedAt: new Date().toISOString()
        }
        
        const response = await fetch(`/api/v1/flows/${flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (!response.ok) {
          throw new Error('Erro ao atualizar flow')
        }
        
        savedFlow = await response.json()
      } else {
        // Verificar se já existe um flow com este nome no backend
        let existingFlow = null
        try {
          const flowsResponse = await fetch('/api/v1/flows')
          if (flowsResponse.ok) {
            const flowsData = await flowsResponse.json()
            const flows = flowsData.flows || flowsData || []
            existingFlow = flows.find((f: any) => f.name === flow.name)
          }
        } catch (error) {
          console.warn('Erro ao buscar flows existentes:', error)
        }
        
        if (existingFlow) {
          // Flow já existe - atualizar
          console.log('🔄 Flow encontrado no backend, atualizando:', existingFlow.id)
          flowId = existingFlow.id
          
          const updateData = {
            ...existingFlow,
            ...flow,
            id: existingFlow.id,
            status: 'draft',
            flow: { nodes, edges },
            updatedAt: new Date().toISOString()
          }
          
          const response = await fetch(`/api/v1/flows/${existingFlow.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
          })
          
          if (!response.ok) {
            throw new Error('Erro ao atualizar flow existente')
          }
          
          savedFlow = await response.json()
        } else {
          // Criar novo flow
          console.log('🔄 Criando novo flow no backend')
          
          const createData = {
            name: flow.name || 'Novo Flow',
            description: flow.description || '',
            status: 'draft',
            flow: { nodes, edges },
            trigger: flow.trigger || {
              type: 'keyword',
              config: {}
            }
          }
          
          const response = await fetch('/api/v1/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createData)
          })
          
          if (!response.ok) {
            throw new Error('Erro ao criar flow')
          }
          
          savedFlow = await response.json()
          flowId = savedFlow.id
        }
      }
      
      // Atualizar flow local com dados do backend
      useFlowEditorStore.setState({
        flow: {
          ...flow,
          id: flowId,
          status: 'draft',
          updatedAt: savedFlow.updatedAt || new Date().toISOString()
        },
        isDirty: false
      })
      
      clearLocalStorage() // Limpar rascunho após salvar com sucesso
      setNotification({ message: 'Flow salvo com sucesso', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
      
    } catch (error) {
      console.error('Erro ao salvar flow:', error)
      setNotification({ 
        message: error instanceof Error ? error.message : 'Erro ao salvar flow', 
        type: 'error' 
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }, [flow, validateFlow, nodes, edges, clearLocalStorage])

  const [showExecutor, setShowExecutor] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<any[]>([])
  
  const handleTest = useCallback(() => {
    setShowExecutor(true)
  }, [])
  
  const handleActivateFlow = useCallback(async () => {
    const validation = validateFlow()
    
    if (!validation.isValid) {
      setNotification({ message: 'Flow deve estar válido para ser ativado', type: 'error' })
      setTimeout(() => setNotification(null), 3000)
      return
    }
    
    if (selectedWhatsAppNumbers.length === 0) {
      // Abrir modal de seleção de números WhatsApp
      setShowWhatsAppSelector(true)
      return
    }
    
    try {
      let flowId = flow?.id
      
      // Se o flow não tem ID do backend, verificar se já existe um flow com esse nome/rascunho
      if (!flowId || flowId.startsWith('flow-')) {
        console.log('🔍 Verificando se flow já existe no backend...')
        
        // Primeiro, tentar buscar flows existentes para evitar duplicação
        let existingFlow = null
        try {
          const flowsResponse = await fetch('/api/v1/flows')
          if (flowsResponse.ok) {
            const flowsData = await flowsResponse.json()
            const flows = flowsData.flows || flowsData || []
            
            // Buscar flow com mesmo nome e que seja um rascunho
            existingFlow = flows.find((f: any) => 
              f.name === flow?.name && 
              (f.status === 'draft' || f.status === 'inactive')
            )
            
            if (existingFlow) {
              console.log('✅ Encontrado flow existente no backend:', existingFlow.id)
              flowId = existingFlow.id
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar flows existentes, prosseguindo com criação:', error)
        }
        
        if (!existingFlow) {
          console.log('🔄 Flow não existe no backend, criando primeiro...')
          
          const createFlowData = {
            name: flow?.name || 'Novo Flow',
            description: flow?.description || '',
            status: 'active', // Já criar como ativo
            whatsappNumbers: selectedWhatsAppNumbers,
            flow: { nodes, edges },
            trigger: flow?.trigger || {
              type: 'keyword',
              config: {}
            }
          }
          
          const createResponse = await fetch('/api/v1/flows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createFlowData)
          })
          
          if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error('❌ Erro ao criar flow:', errorText)
            throw new Error('Erro ao criar flow no backend')
          }
          
          const createdFlow = await createResponse.json()
          flowId = createdFlow.id
          console.log('✅ Flow criado no backend com ID:', flowId)
        }
        
        // Atualizar o flow local com o ID do backend
        useFlowEditorStore.setState({ 
          flow: { 
            ...flow, 
            id: flowId,
            status: 'active'
          }
        })
      } else {
        // Flow já existe no backend, apenas atualizar
        console.log('🔄 Atualizando flow existente no backend...')
        
        const updateFlowData = {
          ...flow,
          status: 'active',
          whatsappNumbers: selectedWhatsAppNumbers,
          flow: { nodes, edges }
        }
        
        const updateResponse = await fetch(`/api/v1/flows/${flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateFlowData)
        })
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error('❌ Erro ao atualizar flow:', errorText)
          throw new Error('Erro ao atualizar flow no backend')
        }
        
        console.log('✅ Flow atualizado no backend')
      }
      
      setFlowStatus('active')
      setNotification({ 
        message: `Flow ativado com sucesso em ${selectedWhatsAppNumbers.length} número(s)`, 
        type: 'success' 
      })
      setTimeout(() => setNotification(null), 3000)
      
    } catch (error) {
      console.error('Erro ao ativar flow:', error)
      setNotification({ 
        message: error instanceof Error ? error.message : 'Erro ao ativar flow', 
        type: 'error' 
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }, [flow, validateFlow, selectedWhatsAppNumbers, nodes, edges])
  
  const handleDeactivateFlow = useCallback(async () => {
    if (!flow?.id) return
    
    try {
      const flowData = {
        ...flow,
        status: 'inactive',
        flow: { nodes, edges }
      }
      
      const response = await fetch(`/api/v1/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      })
      
      if (response.ok) {
        setFlowStatus('inactive')
        setNotification({ message: 'Flow desativado', type: 'info' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        throw new Error('Erro ao desativar flow no backend')
      }
    } catch (error) {
      console.error('Erro ao desativar flow:', error)
      setNotification({ message: 'Erro ao desativar flow', type: 'error' })
      setTimeout(() => setNotification(null), 3000)
    }
  }, [flow, nodes, edges])

  const handleLoadFlow = useCallback((savedFlow: any) => {
    // Carregar flow salvo no editor
    console.log('Loading saved flow:', savedFlow)
    
    if (!savedFlow) {
      console.error('Flow is null or undefined')
      return
    }
    
    // Validar estrutura do flow
    const nodes = savedFlow.flow?.nodes || []
    const edges = savedFlow.flow?.edges || []
    
    console.log('Flow structure:', { nodes: nodes.length, edges: edges.length })
    
    // Converter nodes do flow para formato do ReactFlow com correção de tipos
    const flowNodes = nodes.map((node: any) => {
      // Garantir que nós especiais mantenham seu tipo correto
      let correctedNode = { ...node }
      
      if (node.data?.nodeType && node.type !== node.data.nodeType) {
        console.log(`Fixing node type from ${node.type} to ${node.data.nodeType}`)
        correctedNode.type = node.data.nodeType
      }
      
      return {
        ...correctedNode,
        data: {
          ...correctedNode.data,
          // Garantir que todos os nodes tenham os dados necessários
        }
      }
    })
    
    const flowEdges = edges
    
    // Atualizar o store com os dados do flow
    setNodes(flowNodes)
    setEdges(flowEdges)
    
    // Fechar painel de flows
    setShowFlows(false)
    
    // Criar novo flow baseado no flow salvo
    if (savedFlow.name && savedFlow) {
      const newFlow = {
        id: `flow-${Date.now()}`,
        name: `${savedFlow.name} (Cópia)`,
        description: savedFlow.description || '',
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        trigger: savedFlow.trigger || {
          type: 'keyword',
          config: {}
        },
        nodes: flowNodes,
        edges: flowEdges
      }
      
      useFlowEditorStore.setState({ 
        flow: newFlow,
        isDirty: true 
      })
    }
    
    console.log('Flow loaded successfully!')
  }, [setNodes, setEdges])

  const handlePreviewFlow = useCallback((flow: any) => {
    // Abrir preview do flow
    console.log('Previewing flow:', flow)
    // TODO: Implementar modal de preview
  }, [])

  // Adicionar handler para tecla Delete
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Verificar se não está digitando em um input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }

    // Delete ou Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      
      if (selectedNode) {
        // Confirmar deleção para nós importantes
        const node = nodes.find(n => n.id === selectedNode)
        if (node && node.type === 'trigger') {
          if (confirm(`Deseja realmente excluir o gatilho "${node.data.config?.customName || node.data.label}"?`)) {
            deleteNode(selectedNode)
            setShowProperties(false)
          }
        } else {
          const nodeName = node?.data.config?.customName || node?.data.label || 'nó'
          deleteNode(selectedNode)
          setShowProperties(false)
          setNotification({ message: `${nodeName} removido`, type: 'info' })
          setTimeout(() => setNotification(null), 2000)
        }
      } else if (selectedEdge) {
        deleteEdge(selectedEdge)
        setNotification({ message: 'Conexão removida', type: 'info' })
        setTimeout(() => setNotification(null), 2000)
      }
    }

    // Atalhos adicionais
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case 's': // Salvar
          event.preventDefault()
          handleSave()
          break
        case 'z': // Desfazer
          event.preventDefault()
          if (event.shiftKey) {
            // Ctrl+Shift+Z = Redo
            if (canRedo()) {
              redo()
              setNotification({ message: 'Ação refeita', type: 'info' })
              setTimeout(() => setNotification(null), 2000)
            }
          } else {
            // Ctrl+Z = Undo
            if (canUndo()) {
              undo()
              setNotification({ message: 'Ação desfeita', type: 'info' })
              setTimeout(() => setNotification(null), 2000)
            }
          }
          break
        case 'y': // Refazer (Ctrl+Y)
          event.preventDefault()
          if (canRedo()) {
            redo()
            setNotification({ message: 'Ação refeita', type: 'info' })
            setTimeout(() => setNotification(null), 2000)
          }
          break
      }
    }
  }, [selectedNode, selectedEdge, nodes, deleteNode, deleteEdge, setShowProperties, handleSave, undo, redo, canUndo, canRedo])

  const validation = validateFlow()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={`flex flex-col h-screen bg-background ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Ultra Compact Header */}
      <header className="border-b bg-background flex-shrink-0 h-10 flex items-center px-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="h-7 w-7 p-0"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            
            <Zap className="h-3 w-3 text-primary" />
            
            <Input
              placeholder="Nome do fluxo..."
              value={flow?.name || ''}
              onChange={(e) => {
                const newName = e.target.value
                console.log('Updating flow name to:', newName) // Debug
                if (flow) {
                  // Usar setState diretamente para manter isDirty como true
                  // Não usar setIsDirty que não existe!
                  useFlowEditorStore.setState({ 
                    flow: { ...flow, name: newName },
                    isDirty: true 
                  })
                }
              }}
              className="w-40 h-7 text-xs font-medium"
            />
            
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">{validation.errors.length}</span>
                </div>
              )}
              
              {isDirty && <div className="w-1 h-1 bg-orange-500 rounded-full" />}
              
              {lastSaved && (
                <span className="text-[10px] text-muted-foreground">
                  Rascunho salvo {new Date().getTime() - lastSaved.getTime() < 60000 
                    ? 'agora' 
                    : `há ${Math.floor((new Date().getTime() - lastSaved.getTime()) / 60000)}m`}
                </span>
              )}
              
              {notification && (
                <div className={`
                  px-2 py-1 rounded text-[10px] font-medium
                  ${notification.type === 'success' ? 'bg-green-100 text-green-700' : ''}
                  ${notification.type === 'error' ? 'bg-red-100 text-red-700' : ''}
                  ${notification.type === 'info' ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  {notification.message}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPalette(!showPalette)}
              className="h-7 w-7 p-0"
              title={showPalette ? "Ocultar Paleta" : "Mostrar Paleta"}
            >
              {showPalette ? (
                <PanelLeftClose className="h-3 w-3" />
              ) : (
                <PanelLeftOpen className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProperties(!showProperties)}
              className="h-7 w-7 p-0"
              title={showProperties ? "Ocultar Propriedades" : "Mostrar Propriedades"}
            >
              {showProperties ? (
                <PanelRightClose className="h-3 w-3" />
              ) : (
                <PanelRightOpen className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFlows(!showFlows)}
              className="h-7 px-2 text-xs"
              title="Meus Flows"
            >
              📋 Flows
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWhatsAppTemplates(true)}
              className="h-7 px-2 text-xs"
              title="Templates do WhatsApp"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              WhatsApp
            </Button>
            
            
            {/* Botões de Ativação/Desativação */}
            {flowStatus === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleActivateFlow}
                className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-50"
                title={`Ativar flow em produção${selectedWhatsAppNumbers.length > 0 ? ` (${selectedWhatsAppNumbers.length} número${selectedWhatsAppNumbers.length !== 1 ? 's' : ''})` : ''}`}
                disabled={!validation.isValid || nodes.length === 0}
              >
                <Power className="h-3 w-3 mr-1" />
                Ativar{selectedWhatsAppNumbers.length > 0 && ` (${selectedWhatsAppNumbers.length})`}
              </Button>
            )}
            
            {flowStatus === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeactivateFlow}
                  className="h-7 px-2 text-xs border-red-500 text-red-600 hover:bg-red-50"
                  title="Desativar flow"
                >
                  <PowerOff className="h-3 w-3 mr-1" />
                  Desativar
                </Button>
                <Badge variant="default" className="h-5 px-2 text-[10px] bg-green-100 text-green-700">
                  <div className="w-1 h-1 bg-green-500 rounded-full mr-1" />
                  Ativo
                </Badge>
              </>
            )}
            
            {flowStatus === 'inactive' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActivateFlow}
                  className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-50"
                  title="Reativar flow"
                  disabled={!validation.isValid}
                >
                  <Power className="h-3 w-3 mr-1" />
                  Ativar
                </Button>
                <Badge variant="outline" className="h-5 px-2 text-[10px] text-orange-600 border-orange-500">
                  <Pause className="h-2 w-2 mr-1" />
                  Pausado
                </Badge>
              </>
            )}
            
            <div className="w-px h-5 bg-border mx-1" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              disabled={!validation.isValid}
              className="h-7 px-2 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Test
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || !isDirty}
              className="h-7 px-2 text-xs"
              title="Salvar flow atual"
            >
              <Save className="h-3 w-3 mr-1" />
              Salvar
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Node Palette */}
        {showPalette && (
          <div className="w-64 border-r bg-background/95 backdrop-blur overflow-y-auto">
            <NodePalette onNodeDragStart={handleNodeDragStart} />
          </div>
        )}
        
        {/* Flows Panel */}
        {showFlows && (
          <div className="w-96 border-r bg-background/95 backdrop-blur overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Meus Flows</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFlows(false)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              <FlowLoader 
                onLoadFlow={handleLoadFlow}
                onPreviewFlow={handlePreviewFlow}
              />
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          className="flex-1 relative w-full h-full" 
          ref={reactFlowWrapper}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          style={{ minHeight: '400px' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            deleteKeyCode={null} // Desabilitar delete padrão do ReactFlow
            fitView
            attributionPosition="bottom-left"
            className="bg-slate-50 dark:bg-slate-950"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              className="[&>*]:!stroke-slate-300 dark:[&>*]:!stroke-slate-700"
            />
            <Controls 
              position="bottom-right"
              className="!bg-background !border !border-border !shadow-sm"
            />
            <MiniMap 
              position="top-right"
              className="!bg-background !border !border-border !shadow-sm"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#22c55e'
                  case 'action': return '#3b82f6'
                  case 'condition': return '#f59e0b'
                  case 'data': return '#8b5cf6'
                  default: return '#94a3b8'
                }
              }}
              pannable
              zoomable
            />
            
            {/* Validation Panel */}
            {!validation.isValid && validation.errors.length > 0 && (
              <Panel position="top-left" className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2 max-w-xs">
                <div className="text-xs space-y-1">
                  {validation.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-600">{error}</span>
                    </div>
                  ))}
                  {validation.errors.length > 3 && (
                    <div className="text-red-600 text-xs">
                      +{validation.errors.length - 3} more errors
                    </div>
                  )}
                </div>
              </Panel>
            )}
            
            {/* Atalhos Panel */}
            <Panel position="bottom-left" className="bg-background/80 backdrop-blur border rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className="font-medium mb-1">Atalhos:</div>
                <div>🗑 Delete - Remover nó/conexão</div>
                <div>⌘+S - Salvar flow</div>
                <div className={canUndo() ? 'text-blue-600' : 'opacity-50'}>⌘+Z - Desfazer</div>
                <div className={canRedo() ? 'text-blue-600' : 'opacity-50'}>⌘+Y - Refazer</div>
                <div>🔁 Clique - Selecionar</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Collapsible Properties Panel */}
        {showProperties && (
          <div className="w-80 border-l bg-background/95 backdrop-blur overflow-y-auto">
            <PropertiesPanel />
          </div>
        )}
      </div>
      
      {/* Flow Executor Modal */}
      <FlowExecutorModal
        open={showExecutor}
        onClose={() => setShowExecutor(false)}
        onLogsUpdate={(logs) => setExecutionLogs(logs)}
      />
      
      
      <WhatsAppTemplateManager
        isOpen={showWhatsAppTemplates}
        onClose={() => setShowWhatsAppTemplates(false)}
      />
      
      {/* WhatsApp Number Selection Modal */}
      <Dialog open={showWhatsAppSelector} onOpenChange={setShowWhatsAppSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Ativar Flow
            </DialogTitle>
            <DialogDescription>
              Selecione em quais números WhatsApp este flow será ativado. O flow será executado automaticamente quando receber mensagens nos números selecionados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto py-4">
            <WhatsAppNumberSelector
              selectedNumbers={selectedWhatsAppNumbers}
              onNumbersChange={setSelectedWhatsAppNumbers}
              title="Números WhatsApp Disponíveis"
              description="Escolha os números onde o flow será executado"
              allowMultiple={true}
              showAddNumber={false}
            />
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowWhatsAppSelector(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                setShowWhatsAppSelector(false)
                // Tentar ativar novamente após seleção
                handleActivateFlow()
              }}
              disabled={selectedWhatsAppNumbers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Power className="h-4 w-4 mr-2" />
              Ativar Flow ({selectedWhatsAppNumbers.length} número{selectedWhatsAppNumbers.length !== 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CreateFlowPage() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  )
}
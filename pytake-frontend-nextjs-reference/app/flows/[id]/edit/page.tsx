'use client'

import { useCallback, useEffect, useRef, DragEvent, KeyboardEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { FlowSaveModal } from '@/components/flow-editor/flow-save-modal'
import { WhatsAppTemplateManager } from '@/components/flow-editor/whatsapp-template-manager'
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
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare
} from 'lucide-react'
import { useState } from 'react'

function FlowEditorContent() {
  const router = useRouter()
  const params = useParams()
  const flowId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const {
    flow,
    nodes,
    edges,
    selectedNode,
    isDirty,
    isLoading: storeLoading,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    showProperties,
    setShowProperties,
    saveToLocalStorage,
    loadFromLocalStorage,
    createNewFlow,
    setFlow,
    setNodes,
    setEdges,
    updateNodeData
  } = useFlowEditorStore()

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExecutorModal, setShowExecutorModal] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [fullScreen, setFullScreen] = useState(false)
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Carregar flow específico por ID
  useEffect(() => {
    const loadFlow = async () => {
      if (!flowId) return
      
      setIsLoading(true)
      setLoadError(null)
      
      try {
        console.log('🔄 Carregando flow para edição:', flowId)
        
        // Primeiro, tentar carregar do backend
        const response = await fetch(`/api/v1/flows/${flowId}`)
        
        if (response.ok) {
          const flowData = await response.json()
          console.log('✅ Flow carregado do backend:', flowData)
          
          // Corrigir estrutura dos nós para o editor
          const correctedNodes = (flowData.nodes || []).map((node: any) => {
            // Garantir que o node tenha nodeType no data para funcionar no painel de propriedades
            if (node.data && !node.data.nodeType && node.type) {
              console.log('🔧 Corrigindo nodeType para node:', node.id, node.type)
              node.data.nodeType = node.type
            }
            return node
          })
          
          // Carregar no store
          setFlow(flowData)
          setNodes(correctedNodes)
          setEdges(flowData.edges || [])
          
          // Salvar no localStorage para permitir recuperação
          setTimeout(() => {
            saveToLocalStorage()
          }, 100)
          
        } else if (response.status === 404) {
          // Flow não encontrado no backend, tentar localStorage
          console.log('⚠️ Flow não encontrado no backend, verificando localStorage')
          
          const savedFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
          const localFlow = savedFlows.find((f: any) => f.id === flowId)
          
          if (localFlow) {
            console.log('✅ Flow encontrado no localStorage:', localFlow)
            
            // Corrigir estrutura dos nós
            const correctedNodes = (localFlow.nodes || []).map((node: any) => {
              if (node.data && !node.data.nodeType && node.type) {
                node.data.nodeType = node.type
              }
              return node
            })
            
            setFlow(localFlow)
            setNodes(correctedNodes)
            setEdges(localFlow.edges || [])
            
          } else {
            throw new Error('Flow não encontrado')
          }
        } else {
          throw new Error(`Erro ao carregar flow: ${response.status}`)
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar flow:', error)
        setLoadError(error instanceof Error ? error.message : 'Erro desconhecido')
      } finally {
        setIsLoading(false)
      }
    }

    loadFlow()
  }, [flowId, setFlow, setNodes, setEdges, saveToLocalStorage])

  // Auto-save para localStorage a cada mudança
  useEffect(() => {
    if (isDirty && nodes.length > 0 && !isLoading) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage()
        setLastSaved(new Date())
      }, 1000) // Salva após 1 segundo de inatividade
      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, isDirty, saveToLocalStorage, isLoading])

  const handleNodeDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const nodeTypeData = event.dataTransfer.getData('application/node-type')
    if (!nodeTypeData) return

    try {
      const nodeType: NodeType = JSON.parse(nodeTypeData)
      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect()
      
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      }

      addNode(nodeType, position)
    } catch (error) {
      console.error('Error parsing node type:', error)
    }
  }, [addNode])

  const handleNodeDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault()
            setShowSaveModal(true)
            break
          case 'r':
            event.preventDefault()
            setShowExecutorModal(true)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress as any)
    return () => document.removeEventListener('keydown', handleKeyPress as any)
  }, [])

  // Função para atualizar nome do flow
  const handleFlowNameChange = (newName: string) => {
    if (flow) {
      const updatedFlow = { ...flow, name: newName }
      setFlow(updatedFlow)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">
          {authLoading ? 'Verificando autenticação...' : 'Carregando flow...'}
        </span>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar flow</h2>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button onClick={() => router.push('/flows')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para flows
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col ${fullScreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/flows')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <Input
                  className="font-semibold border-none bg-transparent p-0 h-auto text-base focus-visible:ring-0"
                  value={flow?.name || 'Editando Flow'}
                  onChange={(e) => handleFlowNameChange(e.target.value)}
                  placeholder="Nome do flow"
                />
                <p className="text-xs text-muted-foreground">
                  {isDirty ? 'Não salvo' : lastSaved ? `Salvo ${lastSaved.toLocaleTimeString()}` : 'Carregado'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badges */}
            <div className="flex items-center gap-2">
              {flow?.status && (
                <Badge variant={flow.status === 'active' ? 'default' : 'secondary'}>
                  {flow.status === 'active' ? 'Ativo' : 
                   flow.status === 'draft' ? 'Rascunho' : 
                   flow.status === 'inactive' ? 'Inativo' : flow.status}
                </Badge>
              )}
              {isDirty && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não salvo
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExecutorModal(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              Testar
            </Button>
            
            <Button
              size="sm"
              onClick={() => setShowSaveModal(true)}
              disabled={!isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        {showPalette && (
          <div className="w-80 border-r bg-muted/30 flex-shrink-0">
            <NodePalette />
          </div>
        )}

        {/* Flow Editor */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={handleNodeDrop}
            onDragOver={handleNodeDragOver}
            onNodeClick={(_, node) => {
              selectNode(node.id)
              setShowProperties(true)
            }}
            onPaneClick={() => selectNode(null)}
            fitView
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap />
            
            {/* Control Panel */}
            <Panel position="top-right" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPalette(!showPalette)}
              >
                {showPalette ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProperties(!showProperties)}
              >
                {showProperties ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullScreen(!fullScreen)}
              >
                {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {showProperties && selectedNode && (
          <div className="w-80 border-l bg-muted/30 flex-shrink-0">
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      <FlowSaveModal 
        isOpen={showSaveModal} 
        onClose={() => setShowSaveModal(false)}
        mode="edit"
      />
      
      <FlowExecutorModal
        isOpen={showExecutorModal}
        onClose={() => setShowExecutorModal(false)}
      />
      
      <FlowLoader
        isOpen={showLoader}
        onClose={() => setShowLoader(false)}
      />
      
      <WhatsAppTemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
      />
    </div>
  )
}

export default function FlowEditPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorContent />
    </ReactFlowProvider>
  )
}
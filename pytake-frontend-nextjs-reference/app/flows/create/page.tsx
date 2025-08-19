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
import { TemplateLoader } from '@/components/flow-editor/template-loader'
import { FlowExecutorModal } from '@/components/flow-editor/flow-executor-modal'
import { TemplateSaveModal } from '@/components/flow-editor/template-save-modal'
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
  PanelRightOpen
} from 'lucide-react'
import { useState } from 'react'

// Node types imported from custom-nodes

function FlowEditor() {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
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
    deleteEdge
  } = useFlowEditorStore()

  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    // Verificar se há um flow salvo para carregar
    const flowToLoad = sessionStorage.getItem('load_flow')
    if (flowToLoad) {
      try {
        const flow = JSON.parse(flowToLoad)
        console.log('Loading saved flow from session:', flow)
        
        // Carregar nodes e edges do flow
        setNodes(flow.nodes || [])
        setEdges(flow.edges || [])
        
        // Carregar o flow no store
        useFlowEditorStore.setState({ 
          flow: flow,
          isDirty: false 
        })
        
        // Limpar flow do sessionStorage
        sessionStorage.removeItem('load_flow')
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
        
        // Carregar nodes e edges do template
        setNodes(template.flow.nodes || [])
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
    await saveFlow()
    clearLocalStorage() // Limpar rascunho após salvar com sucesso
  }, [saveFlow, clearLocalStorage])

  const [showExecutor, setShowExecutor] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<any[]>([])
  
  const handleTest = useCallback(() => {
    setShowExecutor(true)
  }, [])

  const handleLoadTemplate = useCallback((template: any) => {
    // Carregar template no editor
    console.log('Loading template:', template)
    
    // Converter nodes do template para format do ReactFlow
    const templateNodes = template.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        // Garantir que todos os nodes tenham os dados necessários
      }
    }))
    
    const templateEdges = template.edges || []
    
    // Atualizar o store com os dados do template
    setNodes(templateNodes)
    setEdges(templateEdges)
    
    // Fechar painel de templates
    setShowTemplates(false)
    
    // TODO: Atualizar nome do flow no store
    console.log('Template loaded successfully!')
  }, [setNodes, setEdges])

  const handlePreviewTemplate = useCallback((template: any) => {
    // Abrir preview do template
    console.log('Previewing template:', template)
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
        case 'z': // Desfazer (futuro)
          event.preventDefault()
          console.log('Undo - não implementado ainda')
          break
        case 'y': // Refazer (futuro)
          event.preventDefault()
          console.log('Redo - não implementado ainda')
          break
      }
    }
  }, [selectedNode, selectedEdge, nodes, deleteNode, deleteEdge, setShowProperties, handleSave])

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
              onClick={() => setShowTemplates(!showTemplates)}
              className="h-7 px-2 text-xs"
              title="Templates"
            >
              📋 Templates
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveTemplate(true)}
              className="h-7 px-2 text-xs"
              title="Salvar como Template"
              disabled={nodes.length === 0}
            >
              <Package className="h-3 w-3 mr-1" />
              Salvar Template
            </Button>
            
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
            >
              <Save className="h-3 w-3 mr-1" />
              Salvar Flow
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
        
        {/* Templates Panel */}
        {showTemplates && (
          <div className="w-96 border-r bg-background/95 backdrop-blur overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Templates</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              <TemplateLoader 
                onLoadTemplate={handleLoadTemplate}
                onPreviewTemplate={handlePreviewTemplate}
              />
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          className="flex-1 relative" 
          ref={reactFlowWrapper}
          onKeyDown={handleKeyDown}
          tabIndex={0}
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
                <div>🔁 Clique - Selecionar</div>
                <div>⚙️ Duplo clique - Editar</div>
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
      
      {/* Template Save Modal */}
      <TemplateSaveModal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        onSave={(templateData) => {
          setNotification({ 
            message: `Template "${templateData.name}" salvo com sucesso!`, 
            type: 'success' 
          })
          setTimeout(() => setNotification(null), 3000)
        }}
      />
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
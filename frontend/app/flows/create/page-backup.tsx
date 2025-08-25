'use client'

import { useCallback, useEffect, useRef, DragEvent } from 'react'
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

import { AppLayout } from '@/components/layout/app-layout'
import { NodePalette } from '@/components/flow-editor/node-palette'
import { PropertiesPanel } from '@/components/flow-editor/properties-panel'
import { TriggerNode, ActionNode, ConditionNode, DataNode } from '@/components/flow-editor/nodes/base-node'
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
  Eye
} from 'lucide-react'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  data: DataNode,
}

function FlowEditor() {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  
  const {
    flow,
    nodes,
    edges,
    selectedNode,
    isLoading,
    isDirty,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    selectEdge,
    saveFlow,
    createNewFlow,
    validateFlow
  } = useFlowEditorStore()

  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    // Create a new flow on component mount
    createNewFlow()
  }, [createNewFlow])

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

  const handleNodeDragStart = (nodeType: NodeType) => {
    // This is handled by the NodePalette component
    console.log('Node drag started:', nodeType.name)
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    selectNode(node.id)
  }, [selectNode])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    selectEdge(edge.id)
  }, [selectEdge])

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectNode, selectEdge])

  const handleSave = async () => {
    await saveFlow()
  }

  const handleTest = () => {
    // TODO: Implement flow testing
    console.log('Testing flow...')
  }

  const handleBack = () => {
    if (isDirty) {
      if (confirm('Você tem alterações não salvas. Deseja continuar?')) {
        router.push('/flows')
      }
    } else {
      router.push('/flows')
    }
  }

  const validation = validateFlow()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">
                    {flow?.name || 'Novo Flow'}
                  </h1>
                  <div className="flex items-center gap-2">
                    {validation.isValid ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Válido</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>{validation.errors.length} erro{validation.errors.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    
                    {isDirty && (
                      <Badge variant="secondary" className="text-xs">
                        Não salvo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome do flow..."
                value={flow?.name || ''}
                onChange={(e) => {
                  // TODO: Update flow name
                }}
                className="w-48"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={!validation.isValid}
              >
                <Eye className="h-4 w-4 mr-2" />
                Testar
              </Button>
              
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading || !isDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </header>

        {/* Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* Node Palette */}
          <NodePalette onNodeDragStart={handleNodeDragStart} />

          {/* Canvas */}
          <div className="flex-1 relative" ref={reactFlowWrapper}>
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
              fitView
              attributionPosition="bottom-left"
              className="bg-slate-50 dark:bg-background"
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1}
                className="opacity-50"
              />
              <Controls 
                position="bottom-right"
                className="bg-background border shadow-lg"
              />
              <MiniMap 
                position="bottom-left"
                className="bg-background border shadow-lg"
                nodeColor={(node) => node.data.color || '#94a3b8'}
                maskColor="rgba(0,0,0,0.1)"
              />

              {/* Validation Errors Panel */}
              {!validation.isValid && (
                <Panel position="top-center">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">
                        Erros de Validação
                      </span>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-red-600 rounded-full" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              )}

              {/* Empty State */}
              {nodes.length === 0 && (
                <Panel position="top-center">
                  <div className="bg-background border border-border rounded-lg p-6 shadow-lg max-w-md text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">Crie seu primeiro flow</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Arraste componentes da barra lateral para o canvas e conecte-os para criar um fluxo de automação.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full opacity-50"></div>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full opacity-50"></div>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full opacity-50"></div>
                      </div>
                      <span>Comece arrastando um "Gatilho"</span>
                    </div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* Properties Panel */}
          <PropertiesPanel />
        </div>
      </div>
    </AppLayout>
  )
}

export default function CreateFlowPage() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  )
}
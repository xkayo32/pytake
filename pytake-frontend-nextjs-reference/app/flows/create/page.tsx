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

import { NodePalette } from '@/components/flow-editor/node-palette-v2'
import { PropertiesPanel } from '@/components/flow-editor/properties-panel'
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
  Minimize2
} from 'lucide-react'
import { useState } from 'react'

// Node types imported from custom-nodes

function FlowEditor() {
  const router = useRouter()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [showProperties, setShowProperties] = useState(true)
  
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
  }, [saveFlow])

  const handleTest = useCallback(() => {
    // TODO: Implement flow testing
    console.log('Testing flow...')
  }, [])

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
              placeholder="Flow name..."
              value={flow?.name || ''}
              onChange={(e) => {
                // TODO: Update flow name
              }}
              className="w-32 h-7 text-xs"
            />
            
            <div className="flex items-center gap-1">
              {validation.isValid ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">{validation.errors.length}</span>
                </div>
              )}
              
              {isDirty && <div className="w-1 h-1 bg-orange-500 rounded-full" />}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPalette(!showPalette)}
              className="h-7 w-7 p-0"
              title="Toggle Palette"
            >
              <Settings className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProperties(!showProperties)}
              className="h-7 w-7 p-0"
              title="Toggle Properties"
            >
              <Settings className="h-3 w-3 rotate-90" />
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
              Save
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
          </ReactFlow>
        </div>

        {/* Collapsible Properties Panel */}
        {showProperties && selectedNode && (
          <div className="w-64 border-l bg-background/95 backdrop-blur overflow-y-auto">
            <PropertiesPanel />
          </div>
        )}
      </div>
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
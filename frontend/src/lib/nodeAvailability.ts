/**
 * Node Availability Helper
 *
 * Manages chatbot node availability based on WhatsApp connection type.
 */

export type ConnectionType = 'official' | 'qrcode';
export type NodeStatus = 'available' | 'experimental' | 'unavailable';

export interface NodeMetadata {
  available: boolean;
  status: NodeStatus;
  warning: string | null;
  connection_type: ConnectionType;
}

export interface NodeAvailabilityInfo {
  available_node_types: string[];
  node_metadata: Record<string, NodeMetadata>;
}

/**
 * Check if a node type is available for a connection type
 */
export function isNodeAvailable(
  nodeType: string,
  availabilityInfo: NodeAvailabilityInfo | null
): boolean {
  if (!availabilityInfo) return true; // Assume available if no info

  return availabilityInfo.available_node_types.includes(nodeType);
}

/**
 * Get node status (available, experimental, unavailable)
 */
export function getNodeStatus(
  nodeType: string,
  availabilityInfo: NodeAvailabilityInfo | null
): NodeStatus {
  if (!availabilityInfo) return 'available';

  const metadata = availabilityInfo.node_metadata[nodeType];
  return metadata?.status || 'available';
}

/**
 * Get warning message for a node type
 */
export function getNodeWarning(
  nodeType: string,
  availabilityInfo: NodeAvailabilityInfo | null
): string | null {
  if (!availabilityInfo) return null;

  const metadata = availabilityInfo.node_metadata[nodeType];
  return metadata?.warning || null;
}

/**
 * Get badge label for node status
 */
export function getNodeBadgeLabel(status: NodeStatus): string | null {
  switch (status) {
    case 'experimental':
      return 'Experimental';
    case 'unavailable':
      return 'Indisponível';
    default:
      return null;
  }
}

/**
 * Get badge color for node status (Tailwind classes)
 */
export function getNodeBadgeColor(status: NodeStatus): string {
  switch (status) {
    case 'experimental':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'unavailable':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-green-100 text-green-800 border-green-300';
  }
}

/**
 * Filter available nodes from a list
 */
export function filterAvailableNodes(
  nodeTypes: string[],
  availabilityInfo: NodeAvailabilityInfo | null
): string[] {
  if (!availabilityInfo) return nodeTypes;

  return nodeTypes.filter(nodeType =>
    isNodeAvailable(nodeType, availabilityInfo)
  );
}

/**
 * Get all unavailable node types
 */
export function getUnavailableNodes(
  availabilityInfo: NodeAvailabilityInfo | null
): string[] {
  if (!availabilityInfo) return [];

  return Object.entries(availabilityInfo.node_metadata)
    .filter(([_, metadata]) => !metadata.available)
    .map(([nodeType, _]) => nodeType);
}

/**
 * Get all experimental node types
 */
export function getExperimentalNodes(
  availabilityInfo: NodeAvailabilityInfo | null
): string[] {
  if (!availabilityInfo) return [];

  return Object.entries(availabilityInfo.node_metadata)
    .filter(([_, metadata]) => metadata.status === 'experimental')
    .map(([nodeType, _]) => nodeType);
}

/**
 * Format node type for display
 */
export function formatNodeType(nodeType: string): string {
  const typeMap: Record<string, string> = {
    start: 'Start',
    message: 'Message',
    question: 'Question',
    condition: 'Condition',
    end: 'End',
    handoff: 'Handoff',
    delay: 'Delay',
    jump: 'Jump',
    action: 'Action',
    api_call: 'API Call',
    ai_prompt: 'AI Prompt',
    database_query: 'Database Query',
    script: 'Script',
    whatsapp_template: 'WhatsApp Template',
    interactive_buttons: 'Interactive Buttons',
    interactive_list: 'Interactive List',
  };

  return typeMap[nodeType] || nodeType;
}

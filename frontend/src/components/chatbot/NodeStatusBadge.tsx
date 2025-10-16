import React from 'react';
import {
  getNodeBadgeLabel,
  getNodeBadgeColor,
  type NodeStatus,
} from '@/lib/nodeAvailability';

interface NodeStatusBadgeProps {
  status: NodeStatus;
  className?: string;
}

/**
 * Badge component to display node availability status
 */
export function NodeStatusBadge({ status, className = '' }: NodeStatusBadgeProps) {
  const label = getNodeBadgeLabel(status);

  if (!label) return null; // Don't show badge for available nodes

  const colorClass = getNodeBadgeColor(status);

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
        ${colorClass}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

export default NodeStatusBadge;

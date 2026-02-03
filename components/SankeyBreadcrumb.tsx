// components/SankeyBreadcrumb.tsx
// Breadcrumb navigation for hierarchical Sankey drill-down

import React from 'react';
import { ConsumerNode } from '../lib/consumerHierarchy';

interface SankeyBreadcrumbProps {
  path: ConsumerNode[];
  onNavigate: (nodeId: string | null) => void;
}

export default function SankeyBreadcrumb({ path, onNavigate }: SankeyBreadcrumbProps) {
  if (path.length <= 1) {
    return null; // Don't show breadcrumb at root level
  }

  return (
    <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        aria-label="Zurück zur Hauptansicht"
      >
        🏠 Übersicht
      </button>
      
      {path.slice(1).map((node, index) => {
        const isLast = index === path.length - 2;
        
        return (
          <React.Fragment key={node.id}>
            <span className="text-gray-400">›</span>
            {isLast ? (
              <span className="text-gray-700 font-semibold">{node.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(node.id)}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {node.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
      
      {path.length > 2 && (
        <button
          onClick={() => {
            // Go back one level
            const parentId = path[path.length - 2]?.id || null;
            onNavigate(parentId === 'building' ? null : parentId);
          }}
          className="ml-3 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-700"
          aria-label="Eine Ebene zurück"
        >
          ← Zurück
        </button>
      )}
    </div>
  );
}

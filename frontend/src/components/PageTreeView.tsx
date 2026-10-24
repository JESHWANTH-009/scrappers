import React, { useState } from 'react';
import { PageNode } from '../types';
import { ChevronRight, ChevronDown, FileText, Folder, Globe, Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface PageTreeViewProps {
  roots: PageNode[];
  onSelectPage?: (node: PageNode) => void;
}

const TreeNode: React.FC<{
  node: PageNode;
  level: number;
  onSelectPage?: (node: PageNode) => void;
}> = ({ node, level, onSelectPage }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/60 text-xs transition-colors group cursor-pointer"
        style={{ paddingLeft: `${Math.max(8, level * 20)}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {/* Expand/Collapse chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 h-3.5" />
        )}

        {/* Node Icon */}
        {hasChildren ? (
          <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        )}

        {/* Title & URL */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-medium text-slate-200 truncate">
            {node.title || node.url}
          </span>
          {node.path && (
            <span className="text-[11px] font-mono text-slate-400 truncate hidden md:inline">
              ({node.path})
            </span>
          )}
        </div>

        {/* Status */}
        <StatusBadge status={node.status} size="sm" />

        {/* Action button */}
        {node.path && onSelectPage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPage(node);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-indigo-400 hover:text-indigo-300 transition-opacity"
            title="Preview Markdown"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="border-l border-slate-800 ml-4">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.url + idx}
              node={child}
              level={level + 1}
              onSelectPage={onSelectPage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PageTreeView: React.FC<PageTreeViewProps> = ({ roots, onSelectPage }) => {
  if (!roots || roots.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No hierarchy nodes available for this crawl.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {roots.map((root, idx) => (
        <TreeNode
          key={root.url + idx}
          node={root}
          level={0}
          onSelectPage={onSelectPage}
        />
      ))}
    </div>
  );
};

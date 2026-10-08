'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TreeNode as TreeNodeType } from '../lib/types';

/**
 * Recursively renders one node of a recipe composition tree. A node is
 * either a raw ingredient (leaf) or a sub-recipe (branch that renders its
 * own children the same way) — the component calls itself with no depth
 * limit, mirroring the unbounded nesting in the data model.
 */
export function TreeNode({ node, depth = 0 }: { node: TreeNodeType; depth?: number }) {
  // Root starts expanded; nested sub-recipes start collapsed so a deeply
  // nested tree never renders more than the user has chosen to see.
  const [expanded, setExpanded] = useState(depth === 0);

  const indentStyle = { paddingLeft: `${depth * 18}px` };

  if (node.kind === 'ingredient') {
    return (
      <div
        style={indentStyle}
        className="flex items-center justify-between gap-3 border-l border-amber-100 py-1 pl-3 text-sm"
      >
        <span className="flex items-center gap-2 text-neutral-700">
          <span className="text-neutral-400">●</span>
          {node.name}
        </span>
        <span className="font-mono text-xs text-neutral-500">
          {node.quantity}
          {node.unitCode}
        </span>
      </div>
    );
  }

  // kind === 'recipe'
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div style={depth > 0 ? indentStyle : undefined} className={depth > 0 ? 'border-l border-amber-100' : ''}>
      <div className="flex items-center justify-between gap-3 py-1 pl-3">
        <button
          type="button"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-neutral-900 disabled:cursor-default"
          disabled={!hasChildren}
        >
          <span className="inline-block w-3 text-neutral-400">
            {hasChildren ? (expanded ? '▼' : '▶') : '○'}
          </span>
          {depth === 0 ? (
            <span>{node.name}</span>
          ) : (
            <Link href={`/recipes/${node.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {node.name}
            </Link>
          )}
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-blue-700">
            recipe
          </span>
          {node.truncatedCycle && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-normal text-red-700">
              circular reference — stopped
            </span>
          )}
        </button>
        <span className="flex items-center gap-2 font-mono text-xs text-neutral-500">
          {node.quantity != null && <span>x{node.quantity}</span>}
          {node.servings != null && <span>serves {node.servings}</span>}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.componentId ?? child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

import type { RenderObjectNode } from '@nexus/form-engine';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { useNexusContext } from '../contexts/NexusContext';
import { renderTreeNode } from '../utils/renderTreeNode';

interface NexusObjectProps {
  node: RenderObjectNode;
}

/**
 * NexusObject — 数据对象容器（可折叠）
 *
 * 点击 title 折叠/展开 children。
 * 折叠时仅以 display:none 隐藏 children，并不销毁（字段状态与订阅保持存活）。
 */
export function NexusObject({ node }: NexusObjectProps) {
  const { config } = useNexusContext();
  const [collapsed, setCollapsed] = useState(false);
  const column = config.column ?? 1;
  const gridStyle: CSSProperties =
    column > 1
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${column}, 1fr)`,
          gap: '0 16px',
        }
      : {};

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <div data-nexus-object={node.dataPath} style={{ marginBottom: 16 }}>
      {node.title && (
        <button
          type='button'
          onClick={toggleCollapsed}
          style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: 8,
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <svg
            width='12'
            height='12'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 0.2s ease',
              verticalAlign: 'middle',
            }}
            aria-hidden='true'
          >
            <polyline points='9 18 15 12 9 6' />
          </svg>{' '}
          {node.title}
        </button>
      )}
      {/* 折叠时隐藏但不卸载 children，保持字段状态与校验订阅 */}
      <div style={{ display: collapsed ? 'none' : undefined, ...gridStyle }}>
        {node.children.map((child, index) => renderTreeNode(child, index))}
      </div>
    </div>
  );
}

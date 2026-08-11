import type { RenderTreeNode } from '@nexus/form-engine';
import type { ReactElement } from 'react';

import { NexusField } from '../components/NexusField';
import { NexusLayout } from '../components/NexusLayout';
import { NexusObject } from '../components/NexusObject';

/**
 * renderTreeNode — 递归渲染
 */
export function renderTreeNode(
  node: RenderTreeNode,
  index: number,
): ReactElement {
  if (node.type === 'field') {
    return (
      <NexusField
        key={node.layoutKey || node.dataPath}
        dataPath={node.dataPath}
        layoutKey={node.layoutKey}
        node={node}
      />
    );
  }
  if (node.type === 'object') {
    return (
      <NexusObject key={`object-${node.layoutKey}-${index}`} node={node} />
    );
  }
  return <NexusLayout key={`layout-${node.type}-${index}`} node={node} />;
}

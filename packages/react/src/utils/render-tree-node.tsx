import type { RenderTreeNode } from '@xbeeant/form-engine';
import type { ReactElement } from 'react';

import { NexusBranch } from '../components/nexus-branch';
import { NexusField } from '../components/nexus-field';
import { NexusLayout } from '../components/nexus-layout';
import { NexusObject } from '../components/nexus-object';

/**
 * renderTreeNode — 递归渲染渲染树节点
 *
 * 根据节点类型分发到对应渲染器：
 * - field → NexusField（数据字段）
 * - object → NexusObject（可折叠数据对象容器）
 * - branch → NexusBranch（条件分支容器，oneOf/anyOf）
 * - 其余 → NexusLayout（布局容器：card/tabs/flex/grid 等）
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
      />
    );
  }
  if (node.type === 'object') {
    return (
      <NexusObject key={`object-${node.layoutKey}-${index}`} node={node} />
    );
  }
  if (node.type === 'branch') {
    return (
      <NexusBranch key={`branch-${node.layoutKey}-${index}`} node={node} />
    );
  }
  return <NexusLayout key={`layout-${node.type}-${index}`} node={node} />;
}

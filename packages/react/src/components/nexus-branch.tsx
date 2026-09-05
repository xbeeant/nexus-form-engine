import type { RenderBranchNode } from '@xbeeant/form-engine';
import type { CSSProperties } from 'react';
import { useContext, useSyncExternalStore } from 'react';

import { FieldInheritContext } from '../contexts/field-inherit-context';
import { GridContext } from '../contexts/grid-context';
import { useNexusContext } from '../contexts/nexus-context';
import { renderTreeNode } from '../utils/render-tree-node';
import { resolveColSpan } from '../utils/resolve-col-span';

interface NexusBranchProps {
  node: RenderBranchNode;
}

/**
 * NexusBranch — 条件分支容器渲染器（oneOf / anyOf）
 *
 * 分支容器 Key 不进入数据路径（布局透明），各分支字段在渲染树中
 * 静态分组（node.branches: RenderTreeNode[][]，解析期构建），本组件
 * 按分支容器的激活索引（meta.oneOf.activeIndex 订阅变化）选择渲染
 * 哪个分支的分组子节点。
 *
 * 渲染行为：
 * - 订阅容器状态路径（engine.subscribeField(node.dataPath)）+ getFieldVersion，
 *   分支切换时（meta.oneOf.activeIndex 变化 / 容器 visible 变化）精准重渲染
 * - 渲染 node.branches[activeIndex]：切换分支只是切换「渲染哪个子分组」，
 *   不重建渲染树（RenderBranchNode.branches 静态持有，引擎只翻转子字段
 *   visible 与 activeIndex，结构不变）
 * - 容器自身 disabled/readOnly/hidden 经 FieldInheritContext 下发给子树，
 *   与 NexusObject 语义一致（父级已激活的状态不可被子级覆盖）
 */
export function NexusBranch({ node }: NexusBranchProps) {
  const { engine } = useNexusContext();
  const parentInherit = useContext(FieldInheritContext);

  // 按容器路径精准订阅：分支切换（activeIndex）与容器状态（visible/disabled/readOnly）变化时重渲染
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(node.dataPath, onStoreChange),
    () => engine.getFieldVersion(node.dataPath),
    () => engine.getFieldVersion(node.dataPath),
  );

  const state = engine.getFieldState(node.dataPath);
  const activeIndex = state?.meta.oneOf?.activeIndex ?? 0;
  const activeChildren = node.branches[activeIndex] ?? [];

  // 合并继承属性：父级已激活的状态不可被当前容器覆盖（对齐 NexusObject）
  const inherit = {
    disabled:
      parentInherit.disabled ?? (state?.disabled === true ? true : undefined),
    readOnly:
      parentInherit.readOnly ?? (state?.readOnly === true ? true : undefined),
    visible:
      parentInherit.visible === false || state?.visible === false
        ? false
        : undefined,
  };
  const hidden = inherit.visible === false;

  const gridCtx = useContext(GridContext);
  const effectiveColSpan = resolveColSpan(node.props.colSpan, gridCtx);
  const wrapperStyle: CSSProperties = {
    ...(effectiveColSpan ? { gridColumn: `span ${effectiveColSpan}` } : {}),
    ...(node.props.width ? { width: node.props.width, flexShrink: 0 } : {}),
  };

  return (
    <FieldInheritContext.Provider value={inherit}>
      <div
        data-nexus-branch={node.layoutKey}
        data-nexus-branch-active={activeIndex}
        className={`${hidden ? 'hidden' : ''}`}
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        {activeChildren.map((child, index) => renderTreeNode(child, index))}
      </div>
    </FieldInheritContext.Provider>
  );
}

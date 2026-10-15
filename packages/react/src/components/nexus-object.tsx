import type { NexusNodeProps, RenderObjectNode } from '@xbeeant/form-engine';
import { Collapse } from 'antd';
import type { CSSProperties } from 'react';
import { useContext, useSyncExternalStore } from 'react';

import { FieldInheritContext } from '../contexts/field-inherit-context';
import { GRID_TOTAL, GridContext } from '../contexts/grid-context';
import { useNexusContext } from '../contexts/nexus-context';
import { renderTreeNode } from '../utils/render-tree-node';
import { resolveGridSpan } from '../utils/resolve-grid-span';

/**
 * NexusObject — 数据对象容器（可折叠，支持 disabled/hidden/readOnly 属性配置）
 *
 * 点击 title 折叠/展开 children。
 * 折叠时仅以 display:none 隐藏 children，并不销毁（字段状态与订阅保持存活）。
 *
 * 属性继承：容器自身（Schema 布尔值 / 表达式 / setFieldState）配置的
 * disabled / readOnly / hidden 会经 FieldInheritContext 下发给子树，
 * 子树中的字段继承对应状态（disabled/readOnly 仅父级激活时生效）。
 */
export function NexusObject({ node }: NexusNodeProps<RenderObjectNode>) {
  const { engine, config } = useNexusContext();
  const parentInherit = useContext(FieldInheritContext);
  // 按路径精准订阅：自身 disabled/readOnly/hidden 变化时重渲染并下发新上下文
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(node.dataPath, onStoreChange),
    () => engine.getFieldVersion(node.dataPath),
    () => engine.getFieldVersion(node.dataPath),
  );
  const state = engine.getFieldState(node.dataPath);
  const gridCtx = useContext(GridContext);
  const effectiveSpan = resolveGridSpan(
    state?.meta.width || '100%',
    state?.meta.colSpan,
    gridCtx,
  );
  const wrapperStyle: CSSProperties = {
    ...(state?.meta.width && effectiveSpan === undefined
      ? { width: state.meta.width, flexShrink: 0 }
      : {}),
    ...(effectiveSpan ? { gridColumn: `span ${effectiveSpan}` } : {}),
  };
  // 对象内容统一置于 24 栅格：子字段按 width（占比）/ colSpan 换算跨度，
  // 未设置时按表单级 column 均分默认占位（span = round(24/column)）
  const objectColumn = Math.max(1, config.column ?? 1);
  // 内容容器必须是真正的 24 栅格容器：GridContext 下发后子字段会把 width
  // 换算为 gridColumn span 并抑制字面 width，若此处不是 grid 容器则两者
  // 同时失效（width 完全不生效）。与表单顶层 form grid 保持同一套栅格语义。
  const objectGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_TOTAL}, minmax(0, 1fr))`,
    gap: '0 16px',
  };

  // 合并继承属性：父级已激活的状态不可被当前容器覆盖；
  // disabled/readOnly 仅携带 true（父级关闭状态不压制子级显式启用）
  const inherit = {
    disabled:
      parentInherit.disabled ?? (state?.disabled === true ? true : undefined),
    readOnly:
      parentInherit.readOnly ?? (state?.readOnly === true ? true : undefined),
    hidden:
      parentInherit.hidden === true || state?.hidden === true
        ? true
        : undefined,
  };
  const hidden = engine.isHidden(node.dataPath, state);

  const panelKey = node.dataPath ?? '';
  const panelTitle = node.title || '';
  const children = node.children.map((child, index) =>
    renderTreeNode(child, index),
  );

  return (
    <FieldInheritContext.Provider value={inherit}>
      <div
        data-nexus-object={node.dataPath}
        className={`mb-2 ${hidden ? 'hidden' : ''}`}
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        <Collapse
          defaultActiveKey={[panelKey]}
          style={{ marginBottom: 0 }}
          items={[
            {
              key: panelKey,
              label: panelTitle,
              children: (
                <GridContext.Provider value={{ column: objectColumn }}>
                  <div className='p-1' style={objectGridStyle}>
                    {children}
                  </div>
                </GridContext.Provider>
              ),
            },
          ]}
        />
      </div>
    </FieldInheritContext.Provider>
  );
}

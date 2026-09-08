import type { RenderObjectNode } from '@xbeeant/form-engine';
import type { CSSProperties } from 'react';
import { useContext, useState, useSyncExternalStore } from 'react';

import { FieldInheritContext } from '../contexts/field-inherit-context';
import { GRID_TOTAL, GridContext } from '../contexts/grid-context';
import { useNexusContext } from '../contexts/nexus-context';
import { renderTreeNode } from '../utils/render-tree-node';
import { resolveGridSpan } from '../utils/resolve-grid-span';

interface NexusObjectProps {
  node: RenderObjectNode;
}

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
export function NexusObject({ node }: NexusObjectProps) {
  const { engine, config } = useNexusContext();
  const parentInherit = useContext(FieldInheritContext);
  // 按路径精准订阅：自身 disabled/readOnly/visible 变化时重渲染并下发新上下文
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(node.dataPath, onStoreChange),
    () => engine.getFieldVersion(node.dataPath),
    () => engine.getFieldVersion(node.dataPath),
  );
  const state = engine.getFieldState(node.dataPath);
  const [collapsed, setCollapsed] = useState(false);
  // 对象容器自身在父 24 栅格中的跨度：width（占比）/ colSpan 换算 gridColumn，
  // 与 NexusField / NexusBranch 一致；非栅格（Flex/inline）场景 width 字面生效
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
  const gridStyle: CSSProperties = {
    display: collapsed ? 'none' : 'grid',
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
    visible:
      parentInherit.visible === false || state?.visible === false
        ? false
        : undefined,
  };
  const hidden = inherit.visible === false;

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <FieldInheritContext.Provider value={inherit}>
      <div
        data-nexus-object={node.dataPath}
        className={`border mb-2 border-solid border-gray-300 ${hidden ? 'hidden' : ''}`}
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        {node.title && (
          <div
            onClick={toggleCollapsed}
            className={`flex justify-between p-2 gap-1 ${collapsed ? '' : 'border-b border-solid border-gray-300'} cursor-pointer select-none bg-transparent font-bold`}
          >
            {node.title}
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={`align-middle transition-transform duration-200 ease-in-out`}
              aria-hidden='true'
            >
              {collapsed ? (
                <polyline points='6 9 12 15 18 9' />
              ) : (
                <polyline points='9 18 15 12 9 6' />
              )}
            </svg>
          </div>
        )}
        {/* 折叠时隐藏但不卸载 children，保持字段状态与校验订阅 */}
        <GridContext.Provider value={{ column: objectColumn }}>
          <div style={gridStyle} className='p-1'>
            {node.children.map((child, index) => renderTreeNode(child, index))}
          </div>
        </GridContext.Provider>
      </div>
    </FieldInheritContext.Provider>
  );
}

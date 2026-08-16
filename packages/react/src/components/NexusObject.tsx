import type { RenderObjectNode } from '@nexus/form-engine';
import type { CSSProperties } from 'react';
import { useContext, useState, useSyncExternalStore } from 'react';

import { FieldInheritContext } from '../contexts/FieldInheritContext';
import { useNexusContext } from '../contexts/NexusContext';
import { renderTreeNode } from '../utils/renderTreeNode';

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
  const isGrid = (config.column ?? 1) > 1;
  const gridStyle: CSSProperties = isGrid
    ? { gridTemplateColumns: `repeat(${config.column}, 1fr)` }
    : {};

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
        className={`mb-4 ${hidden ? 'hidden' : ''}`}
      >
        {node.title && (
          <div
            onClick={toggleCollapsed}
            className='flex gap-1 mb-2 cursor-pointer select-none border-none bg-transparent p-0 font-bold'
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
              className={`align-middle transition-transform duration-200 ease-in-out ${collapsed ? 'rotate-0' : 'rotate-90'}`}
              aria-hidden='true'
            >
              <polyline points='9 18 15 12 9 6' />
            </svg>
            {node.title}
          </div>
        )}
        {/* 折叠时隐藏但不卸载 children，保持字段状态与校验订阅 */}
        <div
          className={`${isGrid ? 'grid gap-x-4' : ''} ${collapsed ? 'hidden' : ''}`}
          style={Object.keys(gridStyle).length > 0 ? gridStyle : undefined}
        >
          {node.children.map((child, index) => renderTreeNode(child, index))}
        </div>
      </div>
    </FieldInheritContext.Provider>
  );
}

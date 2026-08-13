import type { RenderLayoutNode } from '@nexus/form-engine';
import type { CSSProperties } from 'react';
import { useContext, useMemo } from 'react';

import { GridContext } from '../contexts/GridContext';
import {
  LayoutConfigContext,
  type LayoutConfigContextValue,
} from '../contexts/LayoutConfigContext';
import { useNexusContext } from '../contexts/NexusContext';
import { renderTreeNode } from '../utils/renderTreeNode';
import { resolveColSpan } from '../utils/resolveColSpan';

interface NexusLayoutProps {
  node: RenderLayoutNode;
}

/**
 * NexusLayout — 布局容器渲染器
 */
export function NexusLayout({ node }: NexusLayoutProps) {
  const { engine } = useNexusContext();

  const LayoutComponent = engine.getLayout(node.type);

  const children = node.children.map((child, index) =>
    renderTreeNode(child, index),
  );

  // 布局容器在父 Grid/Flex 中的跨列/宽度（与 NexusField wrapper 一致）
  const gridCtx = useContext(GridContext);
  const effectiveColSpan = resolveColSpan(node.props.colSpan, gridCtx);
  const wrapperStyle: CSSProperties = {
    ...(effectiveColSpan ? { gridColumn: `span ${effectiveColSpan}` } : {}),
    ...(node.props.width ? { width: node.props.width, flexShrink: 0 } : {}),
  };

  const layoutConfigValue = useMemo<LayoutConfigContextValue>(
    () => ({ removeHidden: node.props.removeHidden }),
    [node.props.removeHidden],
  );

  if (!LayoutComponent) {
    return (
      <LayoutConfigContext.Provider value={layoutConfigValue}>
        <div
          data-nexus-layout={node.type}
          className='mb-4'
          style={
            Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined
          }
        >
          {node.title && <div className='mb-2 font-bold'>{node.title}</div>}
          {children}
        </div>
      </LayoutConfigContext.Provider>
    );
  }

  // 剥离布局配置属性（displayType / labelWidth / colSpan / width 是布局配置，
  // 不应透传到布局组件的 DOM 元素，否则触发 React unknown prop 警告）
  const {
    displayType: _dt,
    labelWidth: _lw,
    colSpan: _csp,
    width: _w,
    ...layoutProps
  } = node.props;

  return (
    <LayoutConfigContext.Provider value={layoutConfigValue}>
      <div
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        <LayoutComponent {...layoutProps} node={node} title={node.title}>
          {children}
        </LayoutComponent>
      </div>
    </LayoutConfigContext.Provider>
  );
}

import type { RenderLayoutNode } from '@xbeeant/form-engine';
import type { CSSProperties } from 'react';
import { useContext, useMemo } from 'react';

import { GridContext } from '../contexts/grid-context';
import {
  LayoutConfigContext,
  type LayoutConfigContextValue,
} from '../contexts/layout-config-context';
import { useNexusContext } from '../contexts/nexus-context';
import { renderTreeNode } from '../utils/render-tree-node';
import { resolveGridSpan } from '../utils/resolve-grid-span';

interface NexusLayoutProps {
  node: RenderLayoutNode;
}

// 透传布局：不产生 DOM 边界，子项沿用父级栅格上下文（不做 null 重置）
// - grid：自身重新下发 24 栅格上下文（{ column }）
// - tabPane / step / collapsePanel / void / passThrough：直接返回片段透传 children
const TRANSPARENT_GRID_LAYOUTS = new Set([
  'grid',
  'tabPane',
  'step',
  'collapsePanel',
  'void',
  'passThrough',
]);

/**
 * NexusLayout — 布局容器渲染器
 *
 * 布局容器（card/tabs/flex/space...）自身是父 24 栅格的栅格项（按
 * 自身 width/colSpan 占位）；容器内的子节点默认**不**继承容器的栅格
 * 语义——除 grid 布局会重新下发自己的 24 栅格外，其余容器（flex/card/
 * space/tabs 等）子项在此重置为 null，使子字段 width 按字面百分比生效
 * （inline-block/flex 流式排布），避免 form 级 GridContext 泄漏导致
 * gridColumn span 在非栅格容器中失效、字面 width 被抑制。
 */
export function NexusLayout({ node }: NexusLayoutProps) {
  const { engine } = useNexusContext();

  const LayoutComponent = engine.getLayout(node.type);

  // 透传布局不打乱栅格上下文；其余容器子项重置为 null（退出 24 栅格跨度计算）
  const isTransparentGrid = TRANSPARENT_GRID_LAYOUTS.has(node.type);
  const children = node.children.map((child, index) =>
    isTransparentGrid ? (
      renderTreeNode(child, index)
    ) : (
      <GridContext.Provider key={index} value={null}>
        {renderTreeNode(child, index)}
      </GridContext.Provider>
    ),
  );

  // 布局容器在父 24 栅格中的跨列/宽度（与 NexusField wrapper 一致）
  const gridCtx = useContext(GridContext);
  // width（占比：百分比/0~1 数值）在栅格内换算为 gridColumn span，
  // 非栅格（Flex/inline）场景字面生效（flexShrink:0 防压缩）
  const effectiveSpan = resolveGridSpan(
    node.props.width,
    node.props.colSpan,
    gridCtx,
  );
  const wrapperStyle: CSSProperties = {
    ...(node.props.width && effectiveSpan === undefined
      ? { width: node.props.width, flexShrink: 0 }
      : {}),
    ...(effectiveSpan ? { gridColumn: `span ${effectiveSpan}` } : {}),
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
        data-nexus-layout={node.type}
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        <LayoutComponent {...layoutProps} node={node} title={node.title}>
          {children}
        </LayoutComponent>
      </div>
    </LayoutConfigContext.Provider>
  );
}

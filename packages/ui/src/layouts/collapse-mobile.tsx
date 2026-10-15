import type { NexusEngine } from '@xbeeant/form-engine';
import { NexusContext } from '@xbeeant/form-engine-react';
import { Collapse, type CollapsePanelProps } from 'antd-mobile';
import type { PropsWithChildren, ReactNode } from 'react';
import { useCallback, useContext, useRef, useSyncExternalStore } from 'react';
import type { WidgetProps } from '../widgets';

// collapsePanel 是布局节点（type: 'collapsePanel'）：Key 不进入数据路径，
// 其 UI 状态（hidden/disabled）存于自身 containerOnly FieldState，
// 状态路径由布局 Key 合成（dataPath），可被 hidden 表达式 / reactions / setFieldState 动态翻转。
interface CollapsePanelNode {
  dataPath?: string;
  title?: string;
  props?: Record<string, unknown>;
  meta?: { schema?: { hidden?: unknown } };
}

/**
 * 判定单个面板当前是否隐藏
 */
function isPanelHidden(panel: CollapsePanelNode, engine?: NexusEngine) {
  const state = panel.dataPath
    ? engine?.getFieldState(panel.dataPath)
    : undefined;
  if (state) {
    return state.hidden;
  }
  return panel.meta?.schema?.hidden === true;
}

/**
 * usePanelHiddenFlags — 订阅所有 collapsePanel 的实时显隐状态
 */
function usePanelHiddenFlags(panels: CollapsePanelNode[]): boolean[] {
  const ctx = useContext(NexusContext);
  const engine = ctx?.engine;

  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const pathsKey = panels.map((panel) => panel.dataPath ?? '').join('\u0000');

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathsKey 是面板集合内容键，变化时必须重订阅；面板数据经 ref 读取
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!engine) {
        return () => {};
      }
      const unsubscribes = panelsRef.current
        .map((panel) => panel.dataPath)
        .filter((path): path is string => !!path)
        .map((path) => engine.subscribeField(path, onStoreChange));
      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe();
        }
      };
    },
    [engine, pathsKey],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathsKey 决定版本号快照的构成；面板数据经 ref 读取
  const getSnapshot = useCallback(
    () =>
      panelsRef.current
        .map((panel) =>
          panel.dataPath && engine ? engine.getFieldVersion(panel.dataPath) : 0,
        )
        .join(','),
    [engine, pathsKey],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return panels.map((panel) => isPanelHidden(panel, engine));
}

export const collapseMobileLayout = ({
  node,
  children,
  ...props
}: PropsWithChildren<WidgetProps>) => {
  const panels =
    ((node as { children?: CollapsePanelNode[] } | undefined)
      ?.children as unknown as CollapsePanelNode[]) ?? [];
  // 各面板实时显隐（响应式：联动翻转后自动重渲染）
  const hiddenFlags = usePanelHiddenFlags(panels);
  // 支持从 schema 节点 props 传入 defaultActiveKey，未指定时默认展开第一个
  const defaultActiveKey = props.defaultActiveKey ?? ['0'];
  const panelsProps = (children ?? []) as ReactNode[];

  // 隐藏面板不进入 items（其 children 由子布局自行渲染为占位符，此处不再占位）
  const items: CollapsePanelProps[] = panels
    .map((panel, index) => ({ panel, index }))
    .filter(({ index }) => !hiddenFlags[index])
    .map(({ panel, index }) => {
      const { title, ...otherProps } = panel.props || {};
      return {
        key: String(index),
        title: panel.title || `面板 ${index + 1}`,
        children: panelsProps[index],
        ...otherProps,
      };
    });

  // 全部面板隐藏（且确实声明了面板）时整个 Collapse 不显示，避免留下容器空壳
  if (items.length === 0) {
    return null;
  }

  return (
    <Collapse defaultActiveKey={defaultActiveKey as any}>
      {items.map((item) => (
        <Collapse.Panel {...item} key={item.key}>
          {item.children}
        </Collapse.Panel>
      ))}
    </Collapse>
  );
};

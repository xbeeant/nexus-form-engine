import type { NexusEngine } from '@xbeeant/form-engine';
import { NexusContext } from '@xbeeant/form-engine-react';
import { Collapse, type CollapseProps } from 'antd';
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
} from 'react';

import type { WidgetProps } from '../widgets';

// collapsePanel 是布局节点（type: 'collapsePanel'）：Key 不进入数据路径，
// 其 UI 状态（hidden/disabled）存于自身 containerOnly FieldState，
// 状态路径由布局 Key 合成（dataPath），可被 hidden 表达式 / reactions / setFieldState 动态翻转。
interface CollapsePanelNode {
  /** 面板 UI 状态路径（合成容器状态路径，非数据路径） */
  dataPath?: string;
  title?: string;
  props?: Record<string, unknown>;
  /** 原始 Schema 节点（无引擎上下文时回退静态 hidden 判定） */
  meta?: { schema?: { hidden?: unknown } };
}

/**
 * 判定单个面板当前是否隐藏
 *
 * 优先读取引擎中该面板的实时 FieldState.hidden（覆盖表达式联动 / reactions /
 * setFieldState 动态翻转）；脱离 NexusFormProvider 单独渲染布局（无引擎）时
 * 回退静态 Schema 判定，保证布局组件可独立使用。
 */
function isPanelHidden(panel: CollapsePanelNode, engine?: NexusEngine) {
  const state = panel.dataPath
    ? engine?.getFieldState(panel.dataPath)
    : undefined;
  // 优先引擎实时状态（表达式联动 / reactions 覆盖后的值）；
  // 面板静态 hidden: true 时引擎 FieldState.hidden 可能为默认 false，
  // 此时回退静态 Schema 判定保证正确隐藏
  if (state) {
    return state.hidden || panel.meta?.schema?.hidden === true;
  }
  return panel.meta?.schema?.hidden === true;
}

/**
 * usePanelHiddenFlags — 订阅所有 collapsePanel 的实时显隐状态
 *
 * 折叠面板的 hidden 可能被联动动态翻转（如 `hidden: "{{ formData.type !== 'a' }}"`），
 * 父 Collapse 必须感知任一面板的 hidden 变化，否则会出现「面板已隐藏但 Collapse 空壳仍在」
 * 或「全部面板隐藏后容器仍占位」的问题。
 *
 * 用单个 useSyncExternalStore 聚合订阅（快照 = 各面板版本号拼接）：
 * 面板数量在 setSchema 后可变化，若按面板逐个调用 Hook 会导致 Hook 顺序错乱；
 * 聚合订阅只占一个 Hook 槽位，面板集合变化时仅在 pathsKey 变更时重订阅。
 */
function usePanelHiddenFlags(panels: CollapsePanelNode[]): boolean[] {
  const ctx = useContext(NexusContext);
  const engine = ctx?.engine;

  // 订阅回调内读取最新面板集合（避免闭包捕获旧数组）
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

export const collapseLayout = ({
  node,
  children,
  ...props
}: PropsWithChildren<WidgetProps<CollapseProps>>) => {
  const panels =
    ((node as { children?: CollapsePanelNode[] } | undefined)
      ?.children as unknown as CollapsePanelNode[]) ?? [];
  // 各面板实时显隐（响应式：联动翻转后自动重渲染）
  const hiddenFlags = usePanelHiddenFlags(panels);
  // 支持从 schema 节点 props 传入 defaultActiveKey，未指定时默认展开第一个
  const defaultActiveKey = props.defaultActiveKey ?? ['0'];
  const panelsProps = (children ?? []) as ReactNode[];

  // 隐藏面板不进入 items（其 children 由子布局自行渲染为占位符，此处不再占位）
  const items = panels
    .map((panel, index) => ({ panel, index }))
    .filter(({ index }) => !hiddenFlags[index])
    .map(({ panel, index }) => ({
      key: String(index),
      label: panel.title || `面板 ${index + 1}`,
      children: panelsProps[index],
      ...panel.props,
    }));

  // 全部面板隐藏（且确实声明了面板）时整个 Collapse 不显示，避免留下容器空壳
  // - 有 collapse 节点但面板数组为空：说明面板全被 hidden 过滤，返回 null
  // - 无 collapse 节点（node 为 undefined）：渲染空壳（兼容独立布局渲染）
  if (node && panels.length === 0) {
    return null;
  }

  return (
    <Collapse
      defaultActiveKey={defaultActiveKey as CollapseProps['defaultActiveKey']}
      style={{ marginBottom: 16 }}
      items={items}
    />
  );
};

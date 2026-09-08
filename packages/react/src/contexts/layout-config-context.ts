import { createContext } from 'react';

export interface LayoutConfigContextValue {
  /**
   * 为 true 时，隐藏字段完全从 DOM 树移除（可能引起栅格塌陷）；
   * 默认 false：隐藏字段渲染 display:none 占位符以保持布局
   */
  removeHidden?: boolean;
  /**
   * 嵌入方（如可视化设计器画布）自行承担字段的「布局项包装」时置为 true：
   * NexusField 不再在内部包装层应用 width / colSpan（gridColumn）等布局项样式，
   * 改由嵌入方外层容器承接（设计器中为节点卡片），避免布局样式被重复消费
   * （如卡片 44% 宽 + 内层 44% 宽导致的二次收缩）。
   * 默认 false：运行时表单行为不变。
   */
  suppressFieldItemLayout?: boolean;
}
export const LayoutConfigContext = createContext<LayoutConfigContextValue>({});

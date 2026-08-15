// ── 布局组件导出文件 ───────────────────────────────────────────────────────────
// 此文件集中导出所有 Ant Design UI 布局组件
// 布局组件用于组织表单字段、构建复杂的表单结构和响应式布局

import type { WidgetProps } from '../widgets';

// ── 导出所有布局组件 ───────────────────────────────────────────────────────────
export { cardLayout } from './card';
export { collapseLayout } from './collapse';
export { dividerLayout } from './divider';
export { flexLayout } from './flex';
export { gridLayout } from './grid';
export { spaceLayout } from './space';
export {
  collapsePanelLayout, // 折叠面板布局
  stepLayout, // 步骤布局
  tabPaneLayout, // 标签页布局
  voidLayout, // 空白布局
} from './passThrough';
export { stepsLayout } from './steps';
export { tabsLayout } from './tabs';

// ── 布局组件映射表 ─────────────────────────────────────────────────────────────
// antdLayouts 对象将布局名称映射到对应的布局组件实现
// 引擎会通过此映射表找到对应的布局组件来渲染表单字段

import type { ReactNode } from 'react';
import { cardLayout } from './card';
import { collapseLayout } from './collapse';
import { dividerLayout } from './divider';
import { flexLayout } from './flex';
import { gridLayout } from './grid';
import { spaceLayout } from './space';
import {
  collapsePanelLayout,
  stepLayout,
  tabPaneLayout,
  voidLayout,
} from './passThrough';
import { stepsLayout } from './steps';
import { tabsLayout } from './tabs';

// 布局名称到组件函数的映射表
// 支持 engine.registerLayouts() 注册布局组件
export const antdLayouts: Record<
  string,
  (props: WidgetProps<any>) => ReactNode
> = {
  card: cardLayout, // 卡片布局 - 用于分组和卡片化展示
  grid: gridLayout, // 网格布局 - 基于栅格系统的响应式布局
  flex: flexLayout, // 弹性布局 - 基于 Flexbox 的布局
  divider: dividerLayout, // 分割线布局 - 添加视觉分割
  void: voidLayout, // 空白布局 - 无渲染内容的布局占位
  tabs: tabsLayout, // 标签页布局 - 分组显示多个标签页
  tabPane: tabPaneLayout, // 标签页内容布局 - 标签页内部容器
  collapse: collapseLayout, // 折叠面板布局 - 可折叠的分组区域
  collapsePanel: collapsePanelLayout, // 折叠面板项布局 - 折叠面板中的单项
  steps: stepsLayout, // 步骤条布局 - 分步表单布局
  step: stepLayout, // 步骤布局 - 步骤条中的步骤项
  space: spaceLayout, // 间距布局 - 横向/纵向排列子元素
};

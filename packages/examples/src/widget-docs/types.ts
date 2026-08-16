// ============================================================================
// widget-docs — 组件文档类型定义
// antd 风格：每个 widget 一页，页内多个示例实例（Demo）+ 属性介绍表（PropsTable）
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';

/** 文档分组 */
export type DocGroup =
  | '基础输入'
  | '选择类'
  | '复杂选择'
  | '日期时间'
  | '文件图片'
  | '列表'
  | '联动'
  | '布局';

/** 单个示例实例（对应 antd 文档中的一个 demo 卡片） */
export interface WidgetDemo {
  /** 示例标题 */
  title: string;
  /** 示例描述：介绍本实例演示的属性/场景 */
  description?: string;
  /** 示例表单 Schema */
  schema: NexusSchema;
  /** 初始值（可选） */
  initialValues?: Record<string, unknown>;
}

/** 属性介绍行（用于 widgetSchemas 缺失时的 fallback 表格） */
export interface PropRow {
  name: string;
  description: string;
  type: string;
  defaultValue?: string;
}

/** 单个 widget 的完整文档 */
export interface WidgetDoc {
  /** widget 注册名（与 antdWidgets / widgetSchemas 的 key 对齐） */
  id: string;
  /** 分组 */
  group: DocGroup;
  /** 中文名 */
  title: string;
  /** 英文名 */
  english: string;
  /** 组件简介（页面顶部） */
  description: string;
  /** 示例实例列表（一个或多个） */
  demos: WidgetDemo[];
  /** 属性表中需隐藏的 key（如引擎注入的复杂 props） */
  excludeProps?: string[];
  /** widgetSchemas 无描述符时的手写属性表（布局节点等） */
  fallbackProps?: PropRow[];
}

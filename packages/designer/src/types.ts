// ============================================================================
// @nexus/form-engine-designer — 设计器类型定义
// ============================================================================

/** 设计器模式：设计 / 预览 / Schema */
export type DesignerMode = 'design' | 'preview' | 'schema';

/**
 * 路径段：通过 property key 序列在 schema 树中定位一个节点
 * 例如 ['card1', 'username'] 表示 schema.properties.card1.properties.username
 */
export type SchemaPath = string[];

/** 组件目录项 */
export interface CatalogItem {
  label: string;
  /** emoji 图标 */
  icon: string;
  category: 'widget' | 'layout';
  /** 数据字段 widget 名（category === 'widget' 时必填） */
  widget?: string;
  /** 布局容器类型（category === 'layout' 时必填） */
  layoutType?: string;
  /** 创建一个新的 SchemaNode（每次返回新对象） */
  createNode: () => Record<string, unknown>;
}

/**
 * 外部字段定义：由使用方传入，可在设计器左侧「字段列表」中展示并拖入画布
 * - id：作为表单项的 key（不可修改）
 * - name：作为表单项的 title（不可修改）
 * - widget：使用的 widget 名
 */
export interface FieldDef {
  id: string;
  name: string;
  widget: string;
}

import type { SchemaNode } from '@nexus/form-engine';

// ============================================================================
// 属性面板各分组的字段定义（扁平结构，由 PropertyPanel 包裹进 collapse 分组）
// ============================================================================

// ── 通用属性 ──────────────────────────────────────────────────────────────
export const commonPropertyFields: Record<string, SchemaNode> = {
  title: {
    widget: 'input',
    type: 'string',
    title: '标题（title）',
  },
  description: {
    widget: 'textarea',
    type: 'string',
    title: '描述（description）',
  },
  placeholder: {
    widget: 'input',
    type: 'string',
    title: '占位提示（placeholder）',
  },
  default: {
    widget: 'input',
    type: 'string',
    title: '默认值（default）',
  },
  extra: {
    widget: 'input',
    type: 'string',
    title: '额外说明（extra）',
  },
  // ── 状态控制 ────────────────────────────────────────────────────────────
  disabled: {
    widget: 'propertyExpr',
    type: 'string',
    title: '禁用（disabled）',
  },
  readOnly: {
    widget: 'propertyExpr',
    type: 'string',
    title: '只读（readOnly）',
  },
  hidden: {
    widget: 'propertyExpr',
    type: 'string',
    title: '隐藏（hidden）',
  },
  checked: {
    widget: 'propertyExpr',
    type: 'string',
    title: '勾选（checked）',
  },
};

// ── 校验配置 ──────────────────────────────────────────────────────────────
export const validationPropertyFields: Record<string, SchemaNode> = {
  required: {
    widget: 'propertyExpr',
    type: 'string',
    title: '必填（required）',
  },
  validate: {
    widget: 'propertyValidate',
    type: 'string',
    title: '跨字段校验（validate）',
  },
};

// ── 依赖配置 ──────────────────────────────────────────────────────────────
export const dependencyPropertyFields: Record<string, SchemaNode> = {
  bind: {
    widget: 'propertyBind',
    type: 'string',
    title: '数据绑定（bind）',
  },
  dependencies: {
    widget: 'propertyDependencies',
    type: 'string',
    title: '依赖字段（dependencies）',
  },
};

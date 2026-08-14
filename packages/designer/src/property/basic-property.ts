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
  readOnlyWidget: {
    widget: 'input',
    type: 'string',
    title: '只读渲染组件（readOnlyWidget）',
    placeholder: '如 html，未配置时沿用只读文本渲染',
  },
  hidden: {
    widget: 'propertyExpr',
    type: 'string',
    title: '隐藏（hidden）',
  },
  // ── 布局尺寸（x-render 对齐）──────────────────────────────────────────
  width: {
    widget: 'input',
    type: 'string',
    title: '单元素宽度（width）',
    placeholder: '如 20%',
  },
  colSpan: {
    widget: 'number',
    type: 'number',
    title: '栅格跨度（colSpan）',
    placeholder: 'grid 列数的整数倍',
  },
};

// ── 校验配置 ──────────────────────────────────────────────────────────────
// 字段级约束（pattern/min/max）由 SchemaParser 自动转换为 ValidationRule；
// 完整的 rules 数组可通过「Schema」标签页直接编辑 JSON。
export const validationPropertyFields: Record<string, SchemaNode> = {
  required: {
    widget: 'propertyExpr',
    type: 'string',
    title: '必填（required）',
  },
  pattern: {
    widget: 'input',
    type: 'string',
    title: '正则校验（pattern）',
    placeholder: '如 ^1[3-9]\\d{9}$',
  },
  min: {
    widget: 'number',
    type: 'number',
    title: '最小值/最小长度（min）',
    placeholder: 'number→数值 / string→长度 / array→项数',
  },
  max: {
    widget: 'number',
    type: 'number',
    title: '最大值/最大长度（max）',
    placeholder: 'number→数值 / string→长度 / array→项数',
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

// ── 联动配置 ──────────────────────────────────────────────────────────────
export const reactionPropertyFields: Record<string, SchemaNode> = {
  reactions: {
    widget: 'propertyReactions',
    type: 'string',
    title: '联动规则（reactions）',
  },
};

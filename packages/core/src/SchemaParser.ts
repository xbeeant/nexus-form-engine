// ============================================================================
// SchemaParser — 将 NexusSchema 解析为「数据字段 Map」+「渲染树」
// 核心职责：布局节点 Key 不进入数据路径
// ============================================================================

import { DependencyGraph } from './DependencyGraph';
import type {
  DataArraySchema,
  DataFieldSchema,
  DataObjectSchema,
  FieldState,
  LayoutBaseProps,
  LayoutType,
  NexusSchema,
  Reaction,
  ReactionStatePatch,
  RenderFieldNode,
  RenderLayoutNode,
  RenderObjectNode,
  RenderTreeNode,
  SchemaNode,
  ValidateSchema,
  ValidationRule,
  WidgetDescriptors,
  WidgetValidationDescriptor,
} from './types/schema';
import {
  getNestedValue,
  isDataArray,
  isDataField,
  isDataObject,
  isLayoutNode,
  setNestedValue,
} from './utils/schema-helper';

// ────────────────────────────────────────────────────────────────────────────
// 解析结果
// ────────────────────────────────────────────────────────────────────────────

export interface ParseResult {
  /** 所有数据字段的状态 Map（key = 数据路径） */
  fieldStates: Map<string, FieldState>;
  /** 渲染树（供 Renderer 消费） */
  renderTree: RenderTreeNode[];
  /** 依赖图：提供 getDependents(source) → Set<target> 查询 */
  dependencyGraph: DependencyGraph;
  /** 含 validate 表达式规则、依赖了其他字段的字段路径集合（用于实时重校验） */
  validateExprFields: Set<string>;
}

// ────────────────────────────────────────────────────────────────────────────
// 布局属性提取（排除数据相关字段）
// ────────────────────────────────────────────────────────────────────────────

// 需要排除的数据字段属性。注意：width / colSpan / displayType / labelWidth / column
// 是布局容器与字段共通属性，不列入排除集，因此会自动被 layoutProps 保留。
const DATA_KEYS = new Set([
  'type',
  'properties',
  'items',
  'widget',
  'title',
  'required',
  'rules',
  'reactions',
  'bind',
  'validate',
  'default',
  'enum',
  'enumNames',
  'placeholder',
  'description',
  'className',
  'style',
  'disabled',
  'readOnly',
  'hidden',
  'order',
  'extra',
  'format',
  'props',
  'min',
  'max',
  'pattern',
  'whitespace',
]);

/**
 * 可自动转 _autoExpr reaction 的状态字段（正负两向别名）
 * 负向（hidden）：条件成立 → 隐藏；
 */
const REACTION_EXPR_FIELDS = [
  'required',
  'disabled',
  'readOnly',
  'hidden',
] as const;

function extractLayoutProps(
  node: Record<string, unknown>,
): LayoutBaseProps & Record<string, unknown> {
  const layoutProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!DATA_KEYS.has(key)) {
      layoutProps[key] = value;
    }
  }
  // 将 node.props 中的 UI 组件属性合并到 layoutProps 中，
  // 使布局面板（如 collapsePanel）的 props 能透传到布局组件
  if (node.props && typeof node.props === 'object') {
    Object.assign(layoutProps, node.props);
  }
  return layoutProps as LayoutBaseProps & Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// 默认值生成
// ────────────────────────────────────────────────────────────────────────────

function getDefaultValue(node: DataFieldSchema): unknown {
  if (node.default !== undefined) {
    return node.default;
  }
  switch (node.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return undefined;
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 主解析器
// （模块级导出函数；SchemaParser 命名空间对象由 index.ts 以
//  `import * as SchemaParser` 形式提供，保持 `SchemaParser.xxx` 调用兼容）
// ────────────────────────────────────────────────────────────────────────────
/**
 * 解析完整 Schema，输出数据字段 Map + 渲染树 + 依赖图
 *
 * 步骤：
 * 1. 递归收集数据字段和渲染树
 * 2. 构建依赖图
 * 3. 收集 reactions 依赖关系
 *
 * @param schema - 表单 Schema 定义
 * @param initialValues - 可选的初始表单数据
 * @param widgetMetas - 组件元数据
 * @returns 解析结果
 */
export function parse(
  schema: NexusSchema,
  initialValues?: Record<string, unknown>,
  widgetMetas?: WidgetDescriptors,
): ParseResult {
  const fieldStates = new Map<string, FieldState>();
  const renderTree: RenderTreeNode[] = [];

  // 第一步：递归收集数据字段和渲染树
  walkProperties(
    schema.properties,
    '', // parentDataPath：顶层为空
    fieldStates,
    renderTree,
    initialValues,
    undefined,
    widgetMetas,
  );

  // 第二步：解析 reactions 依赖路径的作用域
  // 支持嵌套字段用相对路径引用同级字段（如 address.city 依赖 "province" → "address.province"）
  resolveReactionScopes(fieldStates);

  // 第三步：从字段的 reactions 静态构建依赖图
  // （reactions 边 + validate 表达式 formData.xxx 依赖边）
  const { dependencyGraph, validateExprFields } =
    buildDependencyGraph(fieldStates);

  return { fieldStates, renderTree, dependencyGraph, validateExprFields };
}

// ────────────────────────────────────────────────────────────────────────
// 递归遍历 properties
// ────────────────────────────────────────────────────────────────────────

function walkProperties(
  properties: Record<string, SchemaNode>,
  parentDataPath: string,
  fieldStates: Map<string, FieldState>,
  renderTree: RenderTreeNode[],
  initialValues?: Record<string, unknown>,
  parentObjectState?: {
    visible?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
  },
  widgetMetas?: WidgetDescriptors,
): void {
  for (const [key, node] of Object.entries(properties)) {
    // ⚡ isDataArray 必须在 isDataField 之前判断：
    // 因为 { type: 'array', widget: 'list', items: {...} } 同时满足 isDataField（有 widget）
    // 和 isDataArray（type=array 且有 items），需要优先识别为 DataArray
    if (isDataArray(node)) {
      // ── 数据数组（Key 进入路径）──
      processDataArray(
        key,
        node,
        parentDataPath,
        fieldStates,
        renderTree,
        initialValues,
        parentObjectState,
        widgetMetas,
      );
    } else if (isDataField(node)) {
      // ── 数据字段（叶子节点）──
      processDataField(
        key,
        node,
        parentDataPath,
        fieldStates,
        renderTree,
        initialValues,
        parentObjectState,
        widgetMetas,
      );
    } else if (isDataObject(node)) {
      // ── 数据对象（嵌套，Key 进入路径）──
      processDataObject(
        key,
        node,
        parentDataPath,
        fieldStates,
        renderTree,
        initialValues,
        widgetMetas,
      );
    } else if (isLayoutNode(node)) {
      // ── 布局节点（Key 不进入路径，透传 parentDataPath）──
      processLayoutNode(
        key,
        node,
        parentDataPath, // ⚡ 关键：透传，不拼接 key
        fieldStates,
        renderTree,
        initialValues,
        widgetMetas,
      );
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// validate → rules 转换
// ────────────────────────────────────────────────────────────────────────

/**
 * 将 ValidateSchema 转换为 ValidationRule[]
 *
 * 每个 key-value 对生成一个表达式校验规则
 * key 为依赖别名，value 为返回 boolean 的表达式
 *
 * @param validate - ValidateSchema 对象
 * @param title - 字段标题，用于错误消息
 * @returns ValidationRule 数组
 */
export function validateToRules(
  validate: ValidateSchema,
  title: string,
): ValidationRule[] {
  return Object.entries(validate).map(([key, expr]) => ({
    validator: `bind:${key}`,
    message: `${title} 校验未通过`,
    trigger: 'change',
    _validateExpr: expr,
    _validateKey: key,
  }));
}

// ────────────────────────────────────────────────────────────────────────
// 表达式字段 → reactions 转换
// ────────────────────────────────────────────────────────────────────────

/**
 * 从表达式中提取 formData.xxx.yyy 形式的依赖路径
 *
 * 使用正则表达式匹配所有 formData. 开头的路径
 * 返回去重后的路径列表（去掉 formData. 前缀）
 *
 * @param expr - 表达式字符串
 * @returns 依赖路径数组（不含 formData. 前缀）
 */
export function extractDepsFromExpression(expr: string): string[] {
  const deps = new Set<string>();
  const regex =
    /formData\.([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g;
  let match = regex.exec(expr);
  while (match !== null) {
    deps.add(match[1]);
    match = regex.exec(expr);
  }
  return Array.from(deps);
}

/**
 * 检查 required/disabled/readOnly/hidden
 * 是否为表达式，如果是则生成 Reaction[] 并写回 node.reactions
 * 静态布尔值不处理
 *
 * 步骤：
 * 1. 合并显式声明的 dependencies
 * 2. 检查各状态字段是否为表达式
 * 3. 提取表达式中的依赖路径
 * 4. 移除之前自动生成的表达式 reaction（避免重复累积）
 * 5. 添加新的 reaction
 *
 * @param node - Schema 节点
 */
export function collectExpressionReactions(node: {
  required?: unknown;
  disabled?: unknown;
  readOnly?: unknown;
  hidden?: unknown;
  dependencies?: string[];
  reactions?: Reaction[];
}): void {
  const state: ReactionStatePatch = {};
  const allDeps = new Set<string>();
  let hasExpr = false;

  // 合并显式声明的 dependencies
  if (node.dependencies) {
    for (const dep of node.dependencies) {
      allDeps.add(dep);
    }
  }

  for (const field of REACTION_EXPR_FIELDS) {
    const val = node[field];
    if (typeof val === 'string') {
      (state as Record<string, unknown>)[field] = val;
      hasExpr = true;
      for (const dep of extractDepsFromExpression(val)) {
        allDeps.add(dep);
      }
    }
  }

  // 没有表达式且没有显式依赖时不生成 reaction
  if (!hasExpr && allDeps.size === 0) {
    return;
  }

  // 移除之前自动生成的表达式 reaction（避免 init 多次调用时重复累积）
  node.reactions = (node.reactions || []).filter((r) => r._autoExpr !== true);

  node.reactions.push({
    dependencies: Array.from(allDeps),
    // 有表达式时通过 state patch 应用；仅有 dependencies 时 state 为空对象
    // （空 state patch 不会修改字段状态，但 dependValues 仍会传递给 widget）
    fulfill: { state },
    _autoExpr: true,
  });
}

// ────────────────────────────────────────────────────────────────────────
// 字段级约束 → ValidationRule 转换（x-render / JSON Schema 对齐）
// ────────────────────────────────────────────────────────────────────────

/**
 * 将字段节点上的约束声明自动转换为 ValidationRule
 *
 * 对齐 x-render 与 JSON Schema 协议：约束直接写在字段节点上（而非 rules 数组），
 * 解析时自动转换并追加到 rules：
 * - min / max：按字段 type 语义校验（number→数值、string→长度、array→项数）
 * - pattern：正则校验
 * - whitespace：仅空白视为空
 * - format: 'email' | 'url'：自动附加对应格式校验
 *
 * 去重规则：用户已在 rules 中显式声明的约束（含 min/max/pattern/len/enum/whitespace）
 * 不再重复生成，避免叠加双错误消息。
 *
 * @param node - 字段 Schema 节点
 * @param key - 字段 key（用于类型推断）
 * @returns 追加的 ValidationRule 数组（不含用户已有 rules）
 */
export function constraintsToRules(node: {
  type?: string;
  format?: string;
  min?: number;
  max?: number;
  pattern?: string;
  whitespace?: boolean;
}): ValidationRule[] {
  const rules: ValidationRule[] = [];

  // min/max：字段节点上的直接声明（x-render 风格）
  if (node.min !== undefined) {
    rules.push({ min: node.min });
  }
  if (node.max !== undefined) {
    rules.push({ max: node.max });
  }

  if (node.pattern !== undefined) {
    rules.push({ pattern: node.pattern });
  }

  if (node.whitespace === true) {
    rules.push({ whitespace: true });
  }

  // format 内置格式校验（保守策略：仅 email/url 自动附加，避免 date/time 等误伤存量数据）
  if (node.format === 'email' || node.format === 'url') {
    rules.push({ type: node.format });
  }

  return rules;
}

/**
 * 检查用户 rules 是否已显式声明某个约束键（避免重复生成）
 *
 * @param rules - 用户声明的规则数组
 * @param key - 约束键（min/max/pattern/len/enum/whitespace）
 * @returns 已声明返回 true
 */
function hasDeclaredConstraint(rules: ValidationRule[], key: string): boolean {
  return rules.some(
    (rule) => (rule as Record<string, unknown>)[key] !== undefined,
  );
}

/**
 * 判断规则是否为「纯必填规则」（仅 required，无其他约束）
 *
 * 纯必填规则由实时校验的「必填专项」统一处理，
 * 无需在内置规则循环中重复校验（避免重复错误消息）。
 *
 * @param rule - 校验规则
 * @returns 是纯必填规则返回 true
 */
export function isPureRequiredRule(rule: ValidationRule): boolean {
  return (
    rule.required === true &&
    rule.pattern === undefined &&
    rule.min === undefined &&
    rule.max === undefined &&
    rule.len === undefined &&
    rule.enum === undefined &&
    rule.whitespace !== true &&
    rule.type === undefined &&
    rule.validator === undefined &&
    rule._validateExpr === undefined
  );
}

/**
 * 将字段节点约束转换为 rules 追加到已有规则数组（按键逐项去重）
 *
 * 用户已在 rules 中显式声明的约束键不重复生成：
 * 如用户写了 { min: 3 }, 则节点上的 min/minimum/minLength/minItems 均不再生成，
 * 但 max/pattern 等未声明的键仍正常追加。
 *
 * @param node - 字段 Schema 节点
 * @param rules - 目标规则数组（原地追加）
 */
function appendConstraintRules(
  node: Record<string, unknown>,
  rules: ValidationRule[],
): void {
  const generated = constraintsToRules(node);
  for (const rule of generated) {
    const keys: string[] = [];
    if (rule.min !== undefined) {
      keys.push('min');
    }
    if (rule.max !== undefined) {
      keys.push('max');
    }
    if (rule.pattern !== undefined) {
      keys.push('pattern');
    }
    if (rule.whitespace === true) {
      keys.push('whitespace');
    }
    if (rule.type === 'email' || rule.type === 'url') {
      keys.push('format');
    }
    const duplicated = keys.some((k) => {
      if (k === 'format') {
        return rules.some((r) => r.type === (node.format as string));
      }
      return hasDeclaredConstraint(rules, k);
    });
    if (!duplicated) {
      rules.push(rule);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// Widget 声明级校验/联动合并（widgetMeta → 字段状态）
// ────────────────────────────────────────────────────────────────────────

/**
 * 解析字段实际使用的 widget 名称（显式声明或按 type/format 推断）
 *
 * @param node - 字段 Schema 节点
 * @returns widget 名称
 */
function resolveWidgetName(node: {
  widget?: string;
  type?: string;
  format?: string;
}): string {
  return node.widget || inferWidgetFromSchema(node);
}

/**
 * 合并 widget 声明级默认校验规则到字段规则数组
 *
 * 优先级：Schema 显式声明的规则 > widget 默认规则。
 * widget 规则中与已存在规则拥有相同约束键（min/max/pattern/enum/validator 等）的
 * 被跳过（补缺），避免与用户 Schema 冲突产生双错误消息。
 *
 * @param rules - 字段规则数组（已含 schema 规则，原地追加）
 * @param widgetRules - widget 声明级规则
 */
function mergeWidgetRules(
  rules: ValidationRule[],
  widgetRules: ValidationRule[],
): void {
  for (const rule of widgetRules) {
    const keys: string[] = [];
    if (rule.required !== undefined) {
      keys.push('required');
    }
    if (rule.min !== undefined) {
      keys.push('min');
    }
    if (rule.max !== undefined) {
      keys.push('max');
    }
    if (rule.len !== undefined) {
      keys.push('len');
    }
    if (rule.pattern !== undefined) {
      keys.push('pattern');
    }
    if (rule.whitespace === true) {
      keys.push('whitespace');
    }
    if (rule.enum && rule.enum.length > 0) {
      keys.push('enum');
    }
    if (rule.validator !== undefined) {
      keys.push('validator');
    }
    if (rule._validateExpr !== undefined) {
      keys.push('_validateExpr');
    }
    if (rule.type === 'email' || rule.type === 'url') {
      keys.push('format');
    }
    const duplicated = keys.some((k) => hasDeclaredConstraint(rules, k));
    if (!duplicated) {
      rules.push(rule);
    }
  }
}

/**
 * 合并 widget 声明级联动规则到字段 reactions
 *
 * 规则数组在后续 resolveReactionScopes / buildDependencyGraph 中统一处理：
 * - 相对路径依赖按目标字段作用域解析
 * - 依赖边进入依赖图，字段变化时 O(k) 触发联动与实时重校验
 *
 * @param reactions - 字段 reactions 数组（含 schema reactions，原地追加）
 * @param widgetReactions - widget 声明级 reactions
 */
function mergeWidgetReactions(
  reactions: Reaction[],
  widgetReactions: Reaction[],
): void {
  for (const reaction of widgetReactions) {
    reactions.push(reaction);
  }
}

/**
 * 合并 widget 声明级默认 props 与 schema props
 *
 * widget 默认 props 作为基础，schema props 覆盖同键值（字段级优先）。
 *
 * @param widgetProps - widget 声明级默认 props
 * @param schemaProps - schema 节点 props
 * @returns 合并后的 props
 */
function mergeWidgetProps(
  widgetProps: Record<string, unknown> | undefined,
  schemaProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(widgetProps ?? {}), ...(schemaProps ?? {}) };
}

/**
 * 获取 widget 名称对应的声明描述（无 widgetMetas 或未注册时返回 undefined）
 *
 * @param widgetName - 字段实际使用的 widget 名称
 * @param widgetMetas - 引擎注册时快照的 widget 描述映射表
 * @returns WidgetValidationDescriptor | undefined
 */
function getWidgetDescriptor(
  widgetName: string,
  widgetMetas?: WidgetDescriptors,
): WidgetValidationDescriptor | undefined {
  return widgetMetas?.[widgetName];
}

// ────────────────────────────────────────────────────────────────────────
// 处理数据字段
// ────────────────────────────────────────────────────────────────────────

/**
 * 当 schema 未指定 widget 时，从 type / format 推断 widget 名（对齐 x-render）
 *
 * @param node - Schema 节点
 * @returns 推断出的 widget 名称
 */
function inferWidgetFromSchema(node: {
  type?: string;
  format?: string;
}): string {
  switch (node.type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'switch';
    default:
      if (node.format === 'date' || node.format === 'date-time') {
        return 'date';
      }
      if (node.format === 'textarea') {
        return 'textarea';
      }
      return 'input';
  }
}

function processDataField(
  key: string,
  node: DataFieldSchema,
  parentDataPath: string,
  fieldStates: Map<string, FieldState>,
  renderTree: RenderTreeNode[],
  initialValues?: Record<string, unknown>,
  parentObjectState?: {
    visible?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
  },
  widgetMetas?: WidgetDescriptors,
): void {
  const dataPath = parentDataPath ? `${parentDataPath}.${key}` : key;

  // widget 名称（显式声明或按 type/format 推断）与其声明级校验/联动描述
  const widgetName = resolveWidgetName(node);
  const widgetMeta = getWidgetDescriptor(widgetName, widgetMetas);

  // 解析初始值：根据 bind 类型决定从何处读取
  // - bind: false — 不参与数据收集，使用 default 或类型默认值
  // - bind: string — 从 bind 路径读取，回退到字段原始路径
  // - bind: string[] — 从多个路径读取并组装成数组，全 undefined 时回退
  // - 无 bind — 从字段原始路径读取
  let initialValue: unknown;
  if (node.bind === false) {
    initialValue = node.default ?? getDefaultValue(node);
  } else if (typeof node.bind === 'string' && node.bind.length > 0) {
    initialValue =
      getNestedValue(initialValues, node.bind) ??
      getNestedValue(initialValues, dataPath) ??
      node.default ??
      getDefaultValue(node);
  } else if (Array.isArray(node.bind)) {
    const arrValue = node.bind.map(
      (b) => getNestedValue(initialValues, b) ?? undefined,
    );
    const allUndefined = arrValue.every((v) => v === undefined);
    initialValue = allUndefined
      ? (getNestedValue(initialValues, dataPath) ??
        node.default ??
        getDefaultValue(node))
      : arrValue;
  } else {
    initialValue =
      getNestedValue(initialValues, dataPath) ??
      node.default ??
      getDefaultValue(node);
  }

  const rules: ValidationRule[] = [...(node.rules || [])];
  // required 为布尔值时才添加静态校验规则（表达式由 reaction 动态控制）
  if (node.required === true) {
    rules.unshift({
      required: true,
    });
  }

  // 字段级约束自动转规则（min/max/pattern/format/JSON Schema 别名，对齐 x-render）
  appendConstraintRules(node as unknown as Record<string, unknown>, rules);

  // 合并 validate 表达式校验规则
  if (node.validate) {
    rules.push(...validateToRules(node.validate, node.title || key));
  }

  // 合并 widget 声明级默认校验规则（schema 已声明同键规则时补缺跳过）
  if (widgetMeta?.rules) {
    mergeWidgetRules(rules, widgetMeta.rules);
  }

  // required/disabled/readOnly/hidden 为表达式时，自动转 reactions
  collectExpressionReactions(node);

  // 合并 widget 声明级默认联动规则（随后统一进依赖图，实现状态联动）
  const reactions: Reaction[] = [...((node.reactions as Reaction[]) || [])];
  if (widgetMeta?.reactions) {
    mergeWidgetReactions(reactions, widgetMeta.reactions);
  }

  // 合并父对象状态（父对象状态优先级更高）
  const visible =
    parentObjectState?.visible !== undefined
      ? parentObjectState.visible
      : typeof node.hidden === 'boolean'
        ? !node.hidden
        : true;
  const disabled =
    parentObjectState?.disabled !== undefined
      ? parentObjectState.disabled
      : typeof node.disabled === 'boolean'
        ? node.disabled
        : false;
  const readOnly =
    parentObjectState?.readOnly !== undefined
      ? parentObjectState.readOnly
      : typeof node.readOnly === 'boolean'
        ? node.readOnly
        : false;

  const state: FieldState = {
    path: dataPath,
    value: initialValue,
    initialValue,
    touched: false,
    dirty: false,
    visible,
    disabled,
    readOnly,
    required: typeof node.required === 'boolean' ? node.required : false,
    loading: false,
    errors: [],
    props: mergeWidgetProps(widgetMeta?.props, node.props),
    reactions,
    meta: {
      title: node.title || key,
      widget: widgetName,
      readOnlyWidget: node.readOnlyWidget,
      type: node.type,
      rules,
      description: node.description,
      placeholder: node.placeholder,
      enum: node.enum,
      enumNames: node.enumNames,
      format: node.format,
      min: node.min,
      max: node.max,
      extra: node.extra,
      width: node.width,
      order: node.order,
      colSpan: node.colSpan,
      displayType: node.displayType,
      label: node.label ?? true,
      labelWidth: node.labelWidth,
      column: node.column,
      bind: node.bind,
    },
  };

  fieldStates.set(dataPath, state);
  renderTree.push({
    type: 'field',
    dataPath,
    layoutKey: key,
  } satisfies RenderFieldNode);
}

// ────────────────────────────────────────────────────────────────────────
// 处理数据对象
// ────────────────────────────────────────────────────────────────────────

function processDataObject(
  key: string,
  node: DataObjectSchema,
  parentDataPath: string,
  fieldStates: Map<string, FieldState>,
  renderTree: RenderTreeNode[],
  initialValues?: Record<string, unknown>,
  widgetMetas?: WidgetDescriptors,
): void {
  // 数据对象的 Key 进入路径
  const objectPath = parentDataPath ? `${parentDataPath}.${key}` : key;
  const children: RenderTreeNode[] = [];

  // 获取对象级别状态（从显式配置或默认值）
  // 优先使用显式配置的布尔值，表达式会通过 reactions 动态处理
  const visible = typeof node.hidden === 'boolean' ? !node.hidden : true;
  const disabled = typeof node.disabled === 'boolean' ? node.disabled : false;
  const readOnly = typeof node.readOnly === 'boolean' ? node.readOnly : false;

  // 合并对象 default 与用户 initialValues：default 作为基础，initialValues 优先
  // 使子字段能从对象 default 中读取各自默认值
  let mergedInitialValues = initialValues;
  const objectDefault =
    node.default &&
    typeof node.default === 'object' &&
    !Array.isArray(node.default)
      ? (node.default as Record<string, unknown>)
      : undefined;
  if (objectDefault) {
    mergedInitialValues = { ...(initialValues ?? {}) };
    const userInitial = getNestedValue(initialValues, objectPath);
    const combined: Record<string, unknown> = {
      ...objectDefault,
      ...(userInitial && typeof userInitial === 'object'
        ? (userInitial as Record<string, unknown>)
        : {}),
    };
    setNestedValue(mergedInitialValues, objectPath, combined);
  }

  // 子字段不继承容器状态：容器的 disabled/readOnly/hidden 存于容器自身 FieldState
  // （meta.containerOnly），由 Renderer 层经 FieldInheritContext 在渲染时下发合并，
  // 保证容器状态经 setFieldState / 表达式联动动态变化时子树能实时跟随。
  walkProperties(
    node.properties,
    objectPath,
    fieldStates,
    children,
    mergedInitialValues,
    undefined,
    widgetMetas,
  );

  // required/disabled/readOnly/hidden 为表达式时，自动转 reactions
  // （对象容器自身的 _autoExpr reaction 作用于容器状态，UI 层再下发给子组件）
  collectExpressionReactions(node);

  // 数据对象容器状态：仅承载 UI 状态（visible/disabled/readOnly + reactions），
  // 不持有值（value 恒为 undefined），不参与数据收集（meta.containerOnly 标记）。
  // 其 disabled/readOnly/hidden 由 Renderer 经 context 下发给子树中的字段继承。
  fieldStates.set(objectPath, {
    path: objectPath,
    value: undefined,
    initialValue: undefined,
    touched: false,
    dirty: false,
    visible: typeof node.hidden === 'boolean' ? !node.hidden : true,
    disabled: typeof node.disabled === 'boolean' ? node.disabled : false,
    readOnly: typeof node.readOnly === 'boolean' ? node.readOnly : false,
    required: typeof node.required === 'boolean' ? node.required : false,
    loading: false,
    errors: [],
    props: node.props || {},
    reactions: (node.reactions as Reaction[] | undefined) || [],
    meta: {
      title: node.title || key,
      widget: '',
      type: 'object',
      rules: [],
      description: node.description,
      extra: node.extra,
      width: node.width,
      order: node.order,
      colSpan: node.colSpan,
      containerOnly: true,
    },
  } satisfies FieldState);

  // 数据对象本身不是字段（无 widget），渲染为容器节点包裹子节点
  renderTree.push({
    type: 'object',
    dataPath: objectPath,
    layoutKey: key,
    title: node.title,
    children,
    visible,
    disabled,
    readOnly,
  } satisfies RenderObjectNode);
}

// ────────────────────────────────────────────────────────────────────────
// 处理数据数组
// ────────────────────────────────────────────────────────────────────────

function processDataArray(
  key: string,
  node: DataArraySchema,
  parentDataPath: string,
  fieldStates: Map<string, FieldState>,
  renderTree: RenderTreeNode[],
  initialValues?: Record<string, unknown>,
  parentObjectState?: {
    visible?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
  },
  widgetMetas?: WidgetDescriptors,
): void {
  const arrayPath = parentDataPath ? `${parentDataPath}.${key}` : key;
  const initialValue =
    getNestedValue(initialValues, arrayPath) ?? node.default ?? [];

  // widget 名称（数组缺省 'array'）与其声明级校验/联动描述
  const widgetName = node.widget || 'array';
  const widgetMeta = getWidgetDescriptor(widgetName, widgetMetas);

  const rules: ValidationRule[] = [...(node.rules || [])];
  if (node.required === true) {
    rules.unshift({
      required: true,
    });
  }

  // 数组长度约束自动转规则（min/max）
  appendConstraintRules(node as unknown as Record<string, unknown>, rules);

  if (node.validate) {
    rules.push(...validateToRules(node.validate, node.title || key));
  }

  // 合并 widget 声明级默认校验规则（schema 已声明同键规则时补缺跳过）
  if (widgetMeta?.rules) {
    mergeWidgetRules(rules, widgetMeta.rules);
  }

  collectExpressionReactions(node);

  // 合并 widget 声明级默认联动规则（随后统一进依赖图，实现状态联动）
  const reactions: Reaction[] = [...((node.reactions as Reaction[]) || [])];
  if (widgetMeta?.reactions) {
    mergeWidgetReactions(reactions, widgetMeta.reactions);
  }

  // 合并父对象状态（父对象状态优先级更高）
  const visible =
    parentObjectState?.visible !== undefined
      ? parentObjectState.visible
      : typeof node.hidden === 'boolean'
        ? !node.hidden
        : true;
  const disabled =
    parentObjectState?.disabled !== undefined
      ? parentObjectState.disabled
      : typeof node.disabled === 'boolean'
        ? node.disabled
        : false;
  const readOnly =
    parentObjectState?.readOnly !== undefined
      ? parentObjectState.readOnly
      : typeof node.readOnly === 'boolean'
        ? node.readOnly
        : false;

  const state: FieldState = {
    path: arrayPath,
    value: initialValue,
    initialValue,
    touched: false,
    dirty: false,
    visible,
    disabled,
    readOnly,
    required: typeof node.required === 'boolean' ? node.required : false,
    loading: false,
    errors: [],
    props: mergeWidgetProps(widgetMeta?.props, node.props),
    reactions,
    meta: {
      title: node.title || key,
      widget: widgetName,
      type: node.type,
      rules,
      description: node.description,
      min: node.min,
      max: node.max,
      extra: node.extra,
      width: node.width,
      order: node.order,
      colSpan: node.colSpan,
      displayType: node.displayType,
      labelWidth: node.labelWidth,
      column: node.column,
      items: node.items,
    },
  };

  fieldStates.set(arrayPath, state);
  renderTree.push({
    type: 'field',
    dataPath: arrayPath,
    layoutKey: key,
  } satisfies RenderFieldNode);

  // 数组项子字段进入 fieldStates（如 "items[0].name"），
  // 使数组项内的校验 / 订阅 / 状态访问可用（不参与 formData 收集）
  processArrayItems(
    arrayPath,
    node,
    Array.isArray(initialValue) ? (initialValue as unknown[]) : [],
    fieldStates,
    widgetMetas,
  );
}

// ────────────────────────────────────────────────────────────────────────
// 处理布局节点（⚡ Key 不进入数据路径）
// ────────────────────────────────────────────────────────────────────────

function processLayoutNode(
  _key: string, // 布局节点的 key 被丢弃，不进入数据路径
  node: SchemaNode & {
    type: LayoutType;
    properties: Record<string, SchemaNode>;
  },
  parentDataPath: string, // ⚡ 直接使用父路径，不拼接当前 key
  fieldStates: Map<string, FieldState>,
  renderTree: RenderTreeNode[],
  initialValues?: Record<string, unknown>,
  widgetMetas?: WidgetDescriptors,
): void {
  const children: RenderTreeNode[] = [];

  walkProperties(
    node.properties,
    parentDataPath, // ⚡ 透传：布局节点的 key 被丢弃
    fieldStates,
    children,
    initialValues,
    undefined,
    widgetMetas,
  );

  renderTree.push({
    type: node.type,
    title: node.title,
    props: extractLayoutProps(node as unknown as Record<string, unknown>),
    children,
  } satisfies RenderLayoutNode);
}

// ────────────────────────────────────────────────────────────────────────
// 构建依赖图（静态构建，严禁运行时动态扫描）
// ────────────────────────────────────────────────────────────────────────

/**
 * 解析字段 reactions 中依赖路径的作用域
 *
 * 嵌套字段（如 "address.city"）的 reaction 依赖允许以相对路径引用同级字段，
 * 如 `dependencies: ["province"]` → 解析为 "address.province"。
 * 解析规则（从最内层作用域向上逐级尝试，首个存在的字段路径胜出）：
 * - 作用域相对路径：target 的父级/祖先级 + dep（如 "address" + "province"）
 * - 根级绝对路径：dep 本身就是已有字段路径（如 "profile.name"）
 *
 * 注意：`_autoExpr` 自动生成的 reaction（来自 hidden/required/disabled 表达式）
 * 其依赖从 `formData.xxx` 提取，语义上就是根级绝对路径，不做作用域解析。
 *
 * @param fieldStates - 解析后的字段状态 Map（原地改写各 state.reactions）
 */
function resolveReactionScopes(fieldStates: Map<string, FieldState>): void {
  for (const [path, state] of fieldStates) {
    if (!state.reactions || state.reactions.length === 0) {
      continue;
    }

    const resolved = state.reactions.map((reaction) => {
      if (reaction._autoExpr === true || !reaction.dependencies) {
        return reaction;
      }
      return {
        ...reaction,
        dependencies: reaction.dependencies.map((dep) =>
          resolveDependencyPath(dep, path, fieldStates),
        ),
      };
    });

    // 引用替换：避免与 Schema 共享的 reactions 数组产生别名副作用
    state.reactions = resolved;
  }
}

/**
 * 将单个依赖路径解析为绝对字段路径
 *
 * 从 target 的最内层作用域逐级向上尝试 `作用域前缀 + dep`，
 * 首个在 fieldStates 中存在的路径即为解析结果；全部未命中则保持原值。
 *
 * @param dep - 依赖路径（如 "province" 或 "profile.name"）
 * @param targetPath - 目标字段路径（如 "address.city"）
 * @param fieldStates - 完整字段状态 Map（用于判断路径是否存在）
 * @returns 解析后的绝对字段路径
 */
function resolveDependencyPath(
  dep: string,
  targetPath: string,
  fieldStates: Map<string, FieldState>,
): string {
  // 特殊上下文变量（$deps/$self/$form/$index 等）不做作用域解析
  if (dep.startsWith('$')) {
    return dep;
  }

  const segments = targetPath.split('.');
  for (let i = segments.length - 1; i >= 0; i--) {
    const base = segments.slice(0, i).join('.');
    const candidate = base ? `${base}.${dep}` : dep;
    if (fieldStates.has(candidate)) {
      return candidate;
    }
  }

  // 全部未命中：保持原值（可能是尚未注册的路径，留给运行时容错）
  return dep;
}

/**
 * 从字段的 reactions 中静态提取依赖边，构建 DependencyGraph
 *
 * 每个依赖边：target → source（target 的 reaction 依赖 source）
 * collectExpressionReactions 已在 walkProperties 阶段把
 * required/disabled/readOnly/hidden 表达式转成 _autoExpr reaction，
 * 因此此处构建的依赖图已包含表达式自动依赖
 *
 * 同时提取 validate 表达式（_validateExpr）中 formData.xxx 的依赖边，
 * 使跨字段校验表达式依赖进入依赖图：依赖字段变化时能触发目标字段实时重校验
 *
 * @param fieldStates - 解析后的字段状态 Map
 * @returns 依赖图实例与含 validate 表达式的字段集合
 */
function buildDependencyGraph(fieldStates: Map<string, FieldState>): {
  dependencyGraph: DependencyGraph;
  validateExprFields: Set<string>;
} {
  const graph = new DependencyGraph();
  const validateExprFields = new Set<string>();

  for (const [path, state] of fieldStates) {
    if (state.reactions) {
      for (const reaction of state.reactions) {
        if (reaction.dependencies) {
          graph.addDependencies(path, reaction.dependencies);
        }
      }
    }

    // validate 表达式依赖：规则中携带 _validateExpr 的字段，提取 formData.xxx 依赖
    for (const rule of state.meta.rules) {
      const expr = rule._validateExpr;
      if (typeof expr === 'string') {
        validateExprFields.add(path);
        for (const dep of extractDepsFromExpression(expr)) {
          graph.addDependency(path, dep);
        }
      }
    }
  }

  return { dependencyGraph: graph, validateExprFields };
}

// ────────────────────────────────────────────────────────────────────────
// 数组项子字段状态（items.properties → list[0].name）
// ────────────────────────────────────────────────────────────────────────

/**
 * 为数组项的每个子字段创建独立 FieldState（如 "items[0].name"）
 *
 * 数组项子字段进入 fieldStates 后，校验（validate / validateFieldRealtime）、
 * 状态订阅（subscribeField / getFieldState）均可按路径使用。
 * 注意：itemOf 标记的字段不参与 formData 收集（数组整体由数组字段序列化）。
 *
 * @param path - 数组项子字段的完整路径（如 "items[0].name"）
 * @param key - 子字段 key（用于缺省 title）
 * @param node - 子字段 Schema 定义
 * @param value - 当前值
 * @param arrayPath - 所属数组的路径（如 "items"）
 * @returns 数组项子字段的 FieldState
 */
export function createArrayItemState(
  path: string,
  key: string,
  node: DataFieldSchema,
  value: unknown,
  arrayPath: string,
  widgetMetas?: WidgetDescriptors,
): FieldState {
  const rules: ValidationRule[] = [...(node.rules || [])];
  if (node.required === true) {
    rules.unshift({
      required: true,
    });
  }

  // 数组项子字段的约束同样自动转规则（对齐 processDataField）
  appendConstraintRules(node as unknown as Record<string, unknown>, rules);

  // widget 名称（显式声明或按 type/format 推断）与其声明级校验/联动描述
  const widgetName = resolveWidgetName(node);
  const widgetMeta = getWidgetDescriptor(widgetName, widgetMetas);

  // 合并 widget 声明级默认校验规则（schema 已声明同键规则时补缺跳过）
  if (widgetMeta?.rules) {
    mergeWidgetRules(rules, widgetMeta.rules);
  }

  // required/disabled/readOnly/hidden 为表达式时，自动转 reactions
  // （$index 等上下文变量依赖各数组项自身路径，解析后天然按项生效）
  collectExpressionReactions(node);

  // 合并 widget 声明级默认联动规则
  const reactions: Reaction[] = [...((node.reactions as Reaction[]) || [])];
  if (widgetMeta?.reactions) {
    mergeWidgetReactions(reactions, widgetMeta.reactions);
  }

  return {
    path,
    value,
    initialValue: value,
    touched: false,
    dirty: false,
    visible: typeof node.hidden === 'boolean' ? !node.hidden : true,
    disabled: typeof node.disabled === 'boolean' ? node.disabled : false,
    readOnly: typeof node.readOnly === 'boolean' ? node.readOnly : false,
    required: typeof node.required === 'boolean' ? node.required : false,
    loading: false,
    errors: [],
    props: mergeWidgetProps(widgetMeta?.props, node.props),
    reactions,
    meta: {
      title: node.title || key,
      widget: widgetName,
      type: node.type,
      rules,
      description: node.description,
      placeholder: node.placeholder,
      enum: node.enum,
      enumNames: node.enumNames,
      format: node.format,
      min: node.min,
      max: node.max,
      extra: node.extra,
      itemOf: arrayPath,
    },
  };
}

/**
 * 依据数组当前值，为 items 子字段构建独立 FieldState
 *
 * @param arrayPath - 数组字段路径
 * @param node - 数组节点 Schema
 * @param arr - 数组当前值
 * @param fieldStates - 字段状态 Map（原地写入）
 */
function processArrayItems(
  arrayPath: string,
  node: DataArraySchema,
  arr: unknown[],
  fieldStates: Map<string, FieldState>,
  widgetMetas?: WidgetDescriptors,
): void {
  const items = node.items;
  if (!items) {
    return;
  }

  arr.forEach((item, index) => {
    const itemPath = `${arrayPath}[${index}]`;
    if (items.type === 'object' && items.properties) {
      const obj = (item ?? {}) as Record<string, unknown>;
      for (const [itemKey, itemNode] of Object.entries(items.properties)) {
        const sub = itemNode as DataFieldSchema;
        fieldStates.set(
          `${itemPath}.${itemKey}`,
          createArrayItemState(
            `${itemPath}.${itemKey}`,
            itemKey,
            sub,
            obj[itemKey],
            arrayPath,
            widgetMetas,
          ),
        );
      }
    } else {
      // 简单类型项：整个 item 即一个字段
      fieldStates.set(
        itemPath,
        createArrayItemState(
          itemPath,
          node.title || arrayPath,
          items as DataFieldSchema,
          item,
          arrayPath,
          widgetMetas,
        ),
      );
    }
  });
}

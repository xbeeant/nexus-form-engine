// ============================================================================
// @nexus/form-engine — 完整类型定义
// 包含所有表单引擎相关的类型、接口和联合类型
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// 1. 基础类型
// ────────────────────────────────────────────────────────────────────────────

import type { NexusEngine } from '../Engine.ts';

/** 表达式字符串，用 {{ }} 包裹 */
export type Expression = string;

/**
 * 支持静态值或动态表达式
 * - 静态值：直接使用
 * - 动态表达式：{{ }} 包裹的字符串，在运行时求值
 */
export type ExpressionOr<T> = T | Expression;

/**
 * 支持的布局容器类型
 * 用于组织表单内容的布局结构
 */
export type LayoutContainerType =
  | 'card'
  | 'tabs'
  | 'grid'
  | 'flex'
  | 'steps'
  | 'collapse'
  | 'divider'
  | 'void';

/**
 * 支持的布局面板类型
 * 布局容器内部的独立面板
 */
export type LayoutPaneType = 'tabPane' | 'step' | 'collapsePanel';

/**
 * 所有布局类型合集
 */
export type LayoutType = LayoutContainerType | LayoutPaneType;

/**
 * 支持的数据基础类型
 */
export type DataPrimitiveType = 'string' | 'number' | 'boolean' | 'integer';

/**
 * 所有数据类型
 */
export type DataType = DataPrimitiveType | 'object' | 'array';

// ────────────────────────────────────────────────────────────────────────────
// 2. 校验规则
// ────────────────────────────────────────────────────────────────────────────

/**
 * 表达式校验规则
 * - type: 字段类型校验（string/number/boolean/integer/float/array/object/date/url/email/pattern）
 * - required: 是否必填
 * - pattern: 正则表达式校验
 * - min: 最小值/长度
 * - max: 最大值/长度
 * - validator: 自定义校验函数名（对应注册的 validator）
 * - message: 错误提示消息
 * - trigger: 触发时机（change/blur/submit）
 */
export interface ValidationRule {
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'integer'
    | 'float'
    | 'array'
    | 'object'
    | 'date'
    | 'url'
    | 'email'
    | 'pattern';
  required?: boolean;
  pattern?: string | RegExp;
  min?: number;
  max?: number;
  /** 自定义校验函数名（对应注册的 validator） */
  validator?: string;
  message: string;
  trigger?: 'change' | 'blur' | 'submit';
  /** 内部标记：validate 表达式生成的校验规则（由 SchemaParser 添加） */
  _validateExpr?: string;
  /** 内部标记：_validateExpr 对应的 key */
  _validateKey?: string;
  /** 内部标记：动态必填规则（由 SchemaParser 添加） */
  _dynamicRequired?: boolean;
  /** 内部标记：自动生成的 reaction 标记（由 SchemaParser 添加） */
  _autoExpr?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. 联动协议 (Reactions)
// ────────────────────────────────────────────────────────────────────────────

export interface ReactionContext {
  $deps: unknown[];
  $self: FieldState;
  formData: Record<string, unknown>;
  $index?: number;
  rootValue: Record<string, unknown>;
  $form: ReadonlyFormEngine;
}

export interface ReactionStatePatch {
  visible?: ExpressionOr<boolean>;
  hidden?: ExpressionOr<boolean>;
  disabled?: ExpressionOr<boolean>;
  readOnly?: ExpressionOr<boolean>;
  required?: ExpressionOr<boolean>;
  loading?: ExpressionOr<boolean>;
  title?: ExpressionOr<string>;
  description?: ExpressionOr<string>;
  props?: Record<string, ExpressionOr<unknown>>;
}

export interface ReactionSchemaPatch {
  [dotPath: string]: ExpressionOr<unknown>;
}

/**
 * 联动协议 (Reactions)
 * 用于实现表单字段的联动效果
 * - dependencies: 依赖的字段列表
 * - when: 条件表达式，满足时执行 fulfill，否则执行 otherwise
 * - fulfill: 满足条件时的状态/Schema补丁
 * - otherwise: 不满足条件时的状态/Schema补丁
 */
export interface Reaction {
  dependencies: string[];
  when?: Expression;
  fulfill?: {
    state?: ReactionStatePatch;
    schema?: ReactionSchemaPatch;
  };
  otherwise?: {
    state?: ReactionStatePatch;
    schema?: ReactionSchemaPatch;
  };
  /** 内部标记：自动生成的 reaction（由 SchemaParser 从表达式字段转换而来） */
  _autoExpr?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// 4.1 数据绑定协议 (Bind) — 数据结构转换
// ────────────────────────────────────────────────────────────────────────────

/**
 * 数据绑定/路径映射协议 (Bind)
 *
 * 用于将字段的提交值映射到与表单结构不同的数据路径，使提交数据符合服务端要求。
 *
 * 类型：
 * - `string`：将字段值绑定到指定路径，如 `bind: "user.name"`
 * - `string[]`：字段值为数组时，按顺序拆分到多个路径，如 `bind: ["a.b", "c.d"]`
 *   （字段值 `[v1, v2]` → `a.b = v1, c.d = v2`）
 * - `false`：该字段不参与数据收集（纯 UI 字段，不提交）
 *
 * 注意：
 * - `setValues` / `getValues` / `onFinish` 输入输出的是**转换后**的数据格式
 * - 字段内部状态使用表单原始路径格式
 * - 最好不要跨层级转换，转换前后数据最好保持在同一层级
 *
 * 用法：
 *   bind: "user.name"            // 字段值映射到 user.name
 *   bind: ["a.b", "c.d"]         // 字段值 [v1, v2] 分别映射到 a.b、c.d
 *   bind: false                  // 字段不参与数据收集
 */
export type BindSchema = string | string[] | false;

/**
 * x-render validate 表达式校验
 * key 为依赖字段的别名（如 _self、password2），value 为表达式返回 boolean
 */
export interface ValidateSchema {
  [key: string]: ExpressionOr<boolean>;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. 数据节点定义
// ────────────────────────────────────────────────────────────────────────────

/**
 * 字段格式字符串，主要用于日期/时间类 widget 的显示格式
 * 如 'YYYY-MM-DD'、'HH:mm:ss' 等
 */
export type FieldFormat = string;

/**
 * 基础 Schema 节点
 * 所有数据节点和布局节点的公共属性
 */
export interface BaseSchemaNode {
  /** 组件类型，用于渲染该字段/布局 */
  widget: string;
  /** 字段标题 */
  title?: string;
  /** 字段描述 */
  description?: string;
  /** 必填，支持布尔值或表达式（如 {{ formData.xxx == 'yyy' }}） */
  required?: ExpressionOr<boolean>;
  /** 校验规则列表 */
  rules?: ValidationRule[];
  /** 联动规则列表 */
  reactions?: Reaction[];
  /** x-render bind：数据绑定/路径映射（string | string[] | false） */
  bind?: BindSchema;
  /** x-render validate：跨字段校验表达式 */
  validate?: ValidateSchema;
  /**
   * 显式声明依赖字段路径（x-render 对齐）
   * 当依赖值变化时触发该字段重新求值（表达式联动）和 widget 重新渲染
   * 与 {{ }} 表达式自动提取的依赖合并，不冲突
   */
  dependencies?: string[];
  /** 默认值 */
  default?: unknown;
  /**
   * UI 组件属性扩展
   * 当基础字段不够描述组件的展示时，使用 props 字段作为扩展。
   * props 的具体属性可以查询 antd 的对应组件文档。
   * 所有 props 中的属性都会直接透传给组件。
   */
  props?: Record<string, unknown>;
  /** CSS 类名 */
  className?: string;
  /** 内联样式 */
  style?: Record<string, string | number>;
  /** 禁用，支持布尔值或表达式 */
  disabled?: ExpressionOr<boolean>;
  /** 只读，支持布尔值或表达式 */
  readOnly?: ExpressionOr<boolean>;
  /** 隐藏，支持布尔值或表达式 */
  hidden?: ExpressionOr<boolean>;
  /** 单元素展示宽度，如 '20%'（x-render 对齐） */
  width?: string;
  /** 排序权重，越小越靠前（x-render 对齐） */
  order?: number;
  /** 额外说明信息，展示在元素下方（x-render 对齐） */
  extra?: string;
  /**
   * 在父 Grid 布局中横跨多少列（gridColumn: span N）
   */
  colSpan?: number;
  /** 字段级布局方向，覆盖表单级 displayType */
  displayType?: 'row' | 'column' | 'inline';
  /** 字段级 label 宽度，覆盖表单级 labelWidth */
  labelWidth?: number | string;
  /** 字段级列数，覆盖表单级 column（用于 grid 布局） */
  column?: number;
}

/**
 * 数据字段 Schema
 * 叶子节点，表示表单中的一个输入字段
 */
export interface DataFieldSchema extends BaseSchemaNode {
  /** 数据类型 */
  type?: DataPrimitiveType;
  /**
   * 枚举值列表（x-render / JSON Schema 对齐）
   * 与 enumNames 配合使用：enum 为值数组，enumNames 为文案数组
   */
  enum?: Array<string | number>;
  /** 枚举值对应的文案，与 enum 一一对应（x-render 对齐） */
  enumNames?: Array<string>;
  /** 输入框占位符 */
  placeholder?: string;
  /** 辅助判断 widget 的格式（x-render 对齐） */
  format?: FieldFormat;
  /** 最小值/最小长度/最小项数（x-render 对齐） */
  min?: number;
  /** 最大值/最大长度/最大项数（x-render 对齐） */
  max?: number;
}

/**
 * 数据对象 Schema
 * 嵌套的数据容器，Key 会进入数据路径
 */
export interface DataObjectSchema extends BaseSchemaNode {
  type: 'object';
  /** 对象属性定义 */
  properties: Record<string, SchemaNode>;
}

/**
 * 数据数组 Schema
 * 数组类型字段，Key 会进入数据路径
 */
export interface DataArraySchema extends BaseSchemaNode {
  type: 'array';
  /** 数组项定义 */
  items: DataFieldSchema | DataObjectSchema;
  /** 最小数组长度 */
  min?: number;
  /** 最大数组长度 */
  max?: number;
}

/**
 * 所有数据节点的联合类型
 */
export type DataNode = DataFieldSchema | DataObjectSchema | DataArraySchema;

// ────────────────────────────────────────────────────────────────────────────
// 5. 布局节点定义
// ────────────────────────────────────────────────────────────────────────────

/**
 * 布局基础属性
 * 所有布局节点的公共属性
 */
export interface LayoutBaseProps {
  /** 组件类型，用于渲染该布局 */
  widget: string;
  /** 布局列数（Grid 布局） */
  column?: number;
  /** 间距（Flex/Grid 布局） */
  gap?: number;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 占据的列数（Grid 布局） */
  span?: number;
  /** 布局容器内子元素的布局方向，覆盖表单级 displayType */
  displayType?: 'row' | 'column' | 'inline';
  /** 布局容器标题的 label 宽度，覆盖表单级 labelWidth */
  labelWidth?: number | string;
  /** Flex 布局主轴方向 */
  direction?: 'row' | 'column';
  /** Flex 交叉轴对齐 */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  /** Flex 主轴对齐 */
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  /** Flex 是否换行 */
  wrap?: boolean;
  /**
   * 在父 Grid 布局中横跨多少列（gridColumn: span N）
   * tailwind 风格：colSpan 相对父 Grid 的 column 数
   * （例：3 列 grid 中 colSpan: 2 = 占 2/3 宽）
   */
  colSpan?: number;
  /** 在父 Flex 布局中的宽度（百分比或固定值） */
  width?: number | string;
  /**
   * 是否移除隐藏字段占位符
   * 为 true 时，隐藏字段将完全从 DOM 树中移除（可能引起栅格塌陷）
   * 为 false（默认），隐藏字段渲染 display: none 占位符以保持布局
   */
  removeHidden?: boolean;
  /**
   * UI 组件属性扩展
   * 当基础字段不够描述组件的展示时，使用 props 字段作为扩展。
   * props 的具体属性可以查询 antd 的对应组件文档。
   * 所有 props 中的属性都会直接透传给组件。
   */
  props?: Record<string, any>;
}

/**
 * 布局容器 Schema
 * 用于组织内容的布局结构
 */
export interface LayoutContainerSchema extends LayoutBaseProps {
  type: LayoutContainerType;
  /** 布局容器标题 */
  title?: string;
  /** 布局内容（子节点） */
  properties: Record<string, SchemaNode>;
}

/**
 * 布局面板 Schema
 * 布局容器内部的独立面板
 */
export interface LayoutPaneSchema extends LayoutBaseProps {
  type: LayoutPaneType;
  /** 面板标题 */
  title?: string;
  /** 面板内容（子节点） */
  properties: Record<string, SchemaNode>;
}

/**
 * 所有布局节点的联合类型
 */
export type LayoutNode = LayoutContainerSchema | LayoutPaneSchema;

// ────────────────────────────────────────────────────────────────────────────
// 6. Schema 联合类型
// ────────────────────────────────────────────────────────────────────────────

/**
 * 所有 Schema 节点的联合类型
 * 包括数据节点和数据布局节点
 */
export type SchemaNode = DataNode | LayoutNode;

// ────────────────────────────────────────────────────────────────────────────
// 6.1 Widget Props 注册表（Module Augmentation）
// ────────────────────────────────────────────────────────────────────────────

/**
 * Widget Props 注册表接口
 *
 * 该接口默认为空，UI 包通过 `declare module` 进行扩充。
 * 例如 @nexus/form-engine-ui 会声明：
 *
 * ```ts
 * declare module '@nexus/form-engine' {
 *   interface WidgetPropsMap {
 *     input: InputWidgetProps;
 *     select: SelectWidgetProps;
 *     // ...
 *   }
 * }
 * ```
 *
 * 扩充后，TypeScript 将对 schema 中的 `props` 字段提供 widget 级别的类型检查。
 */
export interface WidgetPropsMap {}

/**
 * 获取指定 widget 的 props 类型
 * 若 widget 已在 WidgetPropsMap 中注册，返回对应类型；否则回退到 Record<string, unknown>
 */
export type WidgetSpecificProps<W extends string> =
  W extends keyof WidgetPropsMap ? WidgetPropsMap[W] : Record<string, unknown>;

/**
 * 强类型的字段 Schema 辅助类型
 *
 * 用于在编写 Schema 时获得 widget 级别的 props 自动补全和类型检查：
 *
 * ```ts
 * const username: TypedFieldSchema<'input'> = {
 *   widget: 'input',
 *   title: '用户名',
 *   type: 'string',
 *   props: { maxLength: 20, showCount: true },  // ✅ InputWidgetProps 自动补全
 * };
 * ```
 */
export type TypedFieldSchema<W extends string> = Omit<
  DataFieldSchema,
  'widget' | 'props'
> & {
  widget: W;
  props?: WidgetSpecificProps<W>;
};

/**
 * 强类型的 Schema 节点辅助类型
 *
 * 用于声明 widget 特定的 SchemaNode（字段或布局节点）：
 *
 * ```ts
 * const node: TypedSchemaNode<'select'> = {
 *   type: 'string',
 *   widget: 'select',
 *   title: '城市',
 *   props: { mode: 'multiple', showSearch: true },
 * };
 * ```
 */
export type TypedSchemaNode<W extends string> =
  | TypedFieldSchema<W>
  | (Omit<DataObjectSchema, 'props'> & { props?: WidgetSpecificProps<W> })
  | (Omit<DataArraySchema, 'props'> & { props?: WidgetSpecificProps<W> })
  | (Omit<LayoutContainerSchema, 'props'> & { props?: WidgetSpecificProps<W> })
  | (Omit<LayoutPaneSchema, 'props'> & { props?: WidgetSpecificProps<W> });

/**
 * NexusSchema - 表单配置 Schema
 * 根 Schema 定义，描述整个表单的结构和配置
 */
export interface NexusSchema {
  type: 'object';
  /** 表单属性定义 */
  properties: Record<string, SchemaNode>;
  /** 表单布局方向（x-render 对齐，写在 schema 顶层） */
  displayType?: 'row' | 'column' | 'inline';
  /** label 宽度，数字单位 px，也可 '20%'/'2rem'（x-render 对齐） */
  labelWidth?: number | string;
  /** 是否显示冒号 */
  colon?: boolean;
  /** 是否显示 label（默认 true） */
  label?: boolean;
  /** 整个表单只读，所有字段以文本展示（x-render 对齐） */
  readOnly?: boolean;
  /** 表单每行显示多少列（x-render 对齐） */
  column?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// 7. 字段运行时状态
// ────────────────────────────────────────────────────────────────────────────

/**
 * 字段运行时状态
 * 表单引擎在运行时维护的字段状态
 */
export interface FieldState {
  /** 字段的数据路径 */
  path: string;
  /** 当前字段值 */
  value: unknown;
  /** 初始值（用于重置） */
  initialValue: unknown;
  /** 是否可见 */
  visible: boolean;
  /** 是否禁用 */
  disabled: boolean;
  /** 是否只读 */
  readOnly: boolean;
  /** 是否必填 */
  required: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 校验错误消息列表 */
  errors: string[];
  /** UI 组件属性扩展 */
  props: Record<string, unknown>;
  /** 该字段参与的 reactions（用于 dependValues 计算） */
  reactions?: Reaction[];
  /** 字段元数据（标题、widget、类型、规则等） */
  meta: {
    title: string;
    widget: string;
    type?: DataType;
    rules: ValidationRule[];
    description?: string;
    placeholder?: string;
    enum?: Array<string | number>;
    enumNames?: Array<string>;
    format?: FieldFormat;
    min?: number;
    max?: number;
    extra?: string;
    width?: string;
    order?: number;
    /** 在父 Grid 布局中横跨多少列（tailwind 风格） */
    colSpan?: number;
    displayType?: 'row' | 'column' | 'inline';
    labelWidth?: number | string;
    column?: number;
    /** 数据绑定配置（路径映射：string | string[] | false） */
    bind?: BindSchema;
    /** 数组节点的 items 定义（DataArraySchema.items），供 list/simpleList/tableList widget 渲染每一项 */
    items?: DataFieldSchema | DataObjectSchema;
    /**
     * 数组项子字段标记：值为所属数组的路径（如 "items"）
     * 存在时该字段是数组项的子字段（如 "items[0].name"），
     * 不参与 formData 收集（数组整体由数组字段负责序列化）
     */
    itemOf?: string;
  };
}

/**
 * 字段状态补丁
 * 用于局部更新字段状态，排除 path 和 meta 属性
 */
export type FieldStatePatch = Partial<Omit<FieldState, 'path' | 'meta'>>;

// ────────────────────────────────────────────────────────────────────────────
// 8. 渲染树（Core → Renderer）
// ────────────────────────────────────────────────────────────────────────────

/**
 * 渲染树节点 - 字段
 * 描述表单中的一个输入字段
 */
export interface RenderFieldNode {
  /** 节点类型 */
  type: 'field';
  /** 字段数据路径 */
  dataPath: string;
  /** 布局 key */
  layoutKey: string;
  /** UI组件库的属性定义 **/
  props?: Record<string, unknown>;
}

/**
 * 渲染树节点 - 数据对象容器
 * 数据对象容器：Key 进入数据路径，但本身无 widget
 */
export interface RenderObjectNode {
  /** 节点类型 */
  type: 'object';
  /** 数据对象路径 */
  dataPath: string;
  /** 布局 key */
  layoutKey: string;
  /** 对象标题 */
  title?: string;
  /** 子节点列表 */
  children: RenderTreeNode[];
}

/**
 * 渲染树节点 - 布局容器
 * 布局容器，包含子节点的容器组件
 */
export interface RenderLayoutNode {
  /** 布局类型 */
  type: LayoutType;
  /** 布局标题 */
  title?: string;
  /** 布局属性（继承自 LayoutBaseProps） */
  props: LayoutBaseProps & Record<string, unknown>;
  /** 子节点列表 */
  children: RenderTreeNode[];
}

/**
 * 所有渲染树节点的联合类型
 */
export type RenderTreeNode =
  | RenderFieldNode
  | RenderLayoutNode
  | RenderObjectNode;

// ────────────────────────────────────────────────────────────────────────────
// 9. 插件系统
// ────────────────────────────────────────────────────────────────────────────

/**
 * UI 无关的组件类型
 *
 * Core 层禁止依赖任何 UI 框架（React/Vue/DOM）。
 * Widget / Layout 组件由 Renderer 层注入，Core 只负责按名称注册与分发。
 */
export type NexusComponent<P = any> = (props: P) => any;

/**
 * 引擎生命周期钩子
 * 插件可以注册这些钩子，在表单引擎的不同阶段执行自定义逻辑
 */
export interface EngineHooks {
  /** 引擎初始化完成时调用 */
  onInit?: (engine: NexusEngine) => void | Promise<void>;
  /** 字段值变更前调用，返回 false 可阻止更新 */
  onBeforeFieldValueChange?: (
    path: string,
    newValue: unknown,
    oldValue: unknown,
  ) => boolean | undefined;
  /** 字段值变更后调用 */
  onFieldValueChange?: (path: string, value: unknown) => void;
  /**
   * 字段实时（同步）校验完成后调用
   * 异步校验器插件通过该钩子接管防抖/超时/并行的异步校验调度
   */
  onValidateField?: (path: string) => void;
  /**
   * 数组字段操作处理钩子
   * 返回非 undefined 表示插件已处理该操作；无插件处理时 engine.arrayOperation 返回 undefined 并告警
   */
  onArrayOperation?: (
    options: ArrayOperationOptions,
    engine: NexusEngine,
  ) => Array<unknown> | undefined;
  /** 开始校验前调用 */
  onBeforeValidate?: (paths?: string[]) => void;
  /** 校验完成后调用 */
  onValidate?: (results: Map<string, string[]>) => void;
  /** 表单提交时调用 */
  onSubmit?: (
    formData: Record<string, unknown>,
  ) => boolean | undefined | Promise<boolean | undefined>;
}

/**
 * 自定义校验函数签名
 * @param value - 待校验的值
 * @param rule - 校验规则对象
 * @param formData - 整个表单数据
 * @param fieldPath - 字段路径
 * @returns 错误消息字符串，校验通过返回 null
 */
export type NexusFormValidator = (
  value: unknown,
  rule: ValidationRule,
  formData: Record<string, unknown>,
  fieldPath: string,
) => string | null | Promise<string | null>;

/**
 * 表单插件
 * 用于扩展表单引擎的功能，包括自定义校验器、组件、布局和生命周期钩子
 */
export interface NexusPlugin {
  /** 插件名称 */
  name: string;
  /** 生命周期钩子 */
  hooks?: EngineHooks;
  /** 自定义校验器注册表，key 为校验器名称 */
  validators?: Record<string, NexusFormValidator>;
  /** 自定义组件注册表，key 为组件名称 */
  widgets?: Record<string, NexusComponent>;
  /** 自定义布局注册表，key 为布局名称 */
  layouts?: Record<string, NexusComponent>;
}

// ────────────────────────────────────────────────────────────────────────────
// 10. 引擎接口
// ────────────────────────────────────────────────────────────────────────────

/**
 * 表单引擎只读接口
 * 提供对表单数据的只读访问，不包含写操作
 */
export interface ReadonlyFormEngine {
  /** 获取指定字段的值 */
  getFieldValue(path: string): unknown;
  /** 获取指定字段的完整状态 */
  getFieldState(path: string): FieldState | undefined;
  /** 获取表单数据（不含 hidden 字段） */
  getFormData(): Record<string, unknown>;
  /** 获取所有字段状态 */
  getAllFieldStates(): Map<string, FieldState>;
}

/**
 * 表单引擎完整接口
 * 包含读写操作的所有方法
 */
export interface FormEngine extends ReadonlyFormEngine {
  /** 初始化表单引擎 */
  init(schema: NexusSchema, initialValues?: Record<string, unknown>): void;
  /** 替换 Schema（保留已有数据） */
  setSchema(schema: NexusSchema): void;
  /** 按路径更新 Schema 节点 */
  setSchemaByPath(path: string, patch: Record<string, unknown>): void;
  /** 获取当前 Schema */
  getSchema(): NexusSchema | null;
  /** 设置单个字段值 */
  setFieldValue(path: string, value: unknown): void;
  /** 批量设置字段值（根据 bind 反向解析） */
  setFieldValues(values: Record<string, unknown>): void;
  /** 局部更新字段状态 */
  setFieldState(path: string, patch: FieldStatePatch): void;
  /** 获取表单数据 */
  getFormData(): Record<string, unknown>;
  /** 获取隐藏字段的值 */
  getHiddenValues(): Record<string, unknown>;
  /** 执行完整校验 */
  validate(paths?: string[]): Promise<Map<string, string[]>>;
  /** 重置表单 */
  reset(): void;
  /** 获取单个字段的错误 */
  getFieldError(path: string): string[];
  /** 获取所有有错误的字段 */
  getFieldsError(): Map<string, string[]>;
  /** 手动设置字段错误 */
  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void;
  /** 移除指定字段的错误 */
  removeErrorField(path: string): void;
  /** 订阅字段状态变化 */
  subscribe(path: string, callback: (state: FieldState) => void): () => void;
  /**
   * 订阅单个字段的版本变化（供 useSyncExternalStore 等按路径精准订阅）
   * 回调不携带参数，通过 getFieldVersion(path) 读取快照
   */
  subscribeField(path: string, callback: () => void): () => void;
  /** 获取单个字段的版本号（字段状态每次变更 +1，未初始化返回 0） */
  getFieldVersion(path: string): number;
  /** 订阅全局表单数据变化 */
  subscribeAll(
    callback: (formData: Record<string, unknown>) => void,
  ): () => void;
  /** 注册插件 */
  use(plugin: NexusPlugin): void;
  /** 注册自定义组件 */
  registerWidgets(widgets: Record<string, NexusComponent>): void;
  /** 注册自定义布局 */
  registerLayouts(layouts: Record<string, NexusComponent>): void;
  /** 获取渲染树 */
  getRenderTree(): RenderTreeNode[];
  /** 销毁引擎实例 */
  destroy(): void;

  // =========================================================================
  // 数组字段操作（P1）
  // =========================================================================

  /**
   * 执行数组字段操作（push/pop/remove/update/insert/move）
   *
   * 操作类型：
   * - push: 添加到数组末尾
   * - pop: 移除最后一项
   * - remove: 移除指定索引项
   * - update: 更新指定索引项
   * - insert: 在指定位置插入
   * - move: 移动数组项到新位置
   *
   * @param options - 操作配置
   * @returns 操作后的新数组（触发notifyAll）
   */
  arrayOperation(options: ArrayOperationOptions): Array<unknown> | undefined;
}

/**
 * 数组字段操作配置
 */
export interface ArrayOperationOptions {
  /** 数组字段路径 */
  path: string;
  /** 操作类型 */
  operation: 'push' | 'pop' | 'remove' | 'update' | 'insert' | 'move';
  /** 数组值（push/insert/update时需要） */
  value?: unknown;
  /** 索引（remove/update/insert/move时需要） */
  index?: number;
  /** 插入位置索引（insert/move时需要） */
  afterIndex?: number;
  /** 移动到指定位置（move时需要） */
  toIndex?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// 11. Form 实例接口（Form Controller）
// ────────────────────────────────────────────────────────────────────────────

/**
 * Form 实例接口（Form Controller）
 * 由 useForm() 创建，暴露表单操作方法
 * 不依赖 Engine 内部实现，保持松耦合
 */
export interface NexusFormInstance {
  /** 触发表单提交（校验 + onFinish），提交数据不包含 hidden 字段 */
  submit(): Promise<void>;
  /** 重置表单到初始值 */
  resetFields(): void;
  /** 手动设置字段错误 */
  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void;
  /** 批量设置字段值（传入转换后格式的数据，根据 bind 反向解析） */
  setValues(values: Record<string, unknown>): void;
  /** 按路径设置单个字段值 */
  setValueByPath(path: string, value: unknown): void;
  /** 按路径更新 Schema 节点属性 */
  setSchemaByPath(path: string, patch: Record<string, unknown>): void;
  /** 替换整个 Schema */
  setSchema(schema: NexusSchema): void;
  /**
   * 获取表单数据（不含 hidden 字段）
   * - 无参数：返回所有可见字段数据
   * - 传入路径数组：返回指定路径的数据
   */
  getValues(paths?: string[]): Record<string, unknown>;
  /** 获取隐藏字段的值 */
  getHiddenValues(): Record<string, unknown>;
  /** 获取所有字段值（含 hidden） */
  getAllValues(): Record<string, unknown>;
  /** 按路径获取单个字段值 */
  getValueByPath(path: string): unknown;
  /** 获取当前 Schema */
  getSchema(): NexusSchema | null;
  /** 移除指定字段的错误 */
  removeErrorField(path: string): void;
  /** 滚动到指定字段 */
  scrollToPath(path: string): void;
  /** 获取单个字段的错误 */
  getFieldError(path: string): string[];
  /** 获取所有有错误的字段 */
  getFieldsError(): Map<string, string[]>;
  /** 校验字段（可指定路径） */
  validateFields(paths?: string[]): Promise<Map<string, string[]>>;
  /** 获取单个字段的状态 */
  getFieldState(path: string): FieldState | undefined;
  /**
   * 注册字段校验逻辑
   * @param path 字段路径
   * @param validator 校验函数，返回错误消息数组
   */
  registerValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void;
}

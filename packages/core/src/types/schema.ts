// ============================================================================
// @xbeeant/form-engine — 完整类型定义
// 包含所有表单引擎相关的类型、接口和联合类型
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// 1. 基础类型
// ────────────────────────────────────────────────────────────────────────────

import type { NexusEngine } from '../engine.ts';
import type { FormRegistry } from '../form-registry';

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
  | 'space'
  | 'steps'
  | 'collapse'
  | 'divider'
  | 'void'
  | 'passThrough';

/**
 * 支持的布局面板类型
 * 布局容器内部的独立面板
 */
export type LayoutPaneType = 'tabPane' | 'step' | 'collapsePanel';

/**
 * 所有布局类型的合集
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
 * 字段触发时机（对齐 async-validator / x-render）
 * - change: 值变更时实时校验（默认）
 * - blur: 失焦时校验（通过 engine.validateField(path, { trigger: 'blur' }) 触发）
 * - submit: 仅在 validate()（提交/手动全量）时校验
 */
export type ValidationTrigger = 'change' | 'blur' | 'submit';

/**
 * 校验规则支持的类型（对齐 async-validator）
 * 除基础类型外，type 可直接作为内置格式校验（email/url/date/regexp/ip/integer 等）
 */
export type RuleType =
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
  | 'pattern'
  | 'regexp'
  | 'ip'
  | 'hex'
  | 'time'
  | 'datetime'
  | 'iso8601';

/**
 * 表达式校验规则
 * - type: 字段类型校验（string/number/boolean/integer/float/array/object/date/url/email/pattern）
 * - required: 是否必填
 * - pattern: 正则表达式校验
 * - min: 最小值/长度（number→数值、string→长度、array→项数）
 * - max: 最大值/长度（同上）
 * - len: 精确长度（string/array）
 * - enum: 值必须在枚举列表内（对齐 async-validator / JSON Schema）
 * - whitespace: 仅空白字符串视为空（对 string 生效）
 * - validator: 自定义校验函数（支持 string 函数名或 Function 类型）
 * - message: 错误提示消息（支持 {min}/{max}/{len}/{title} 占位符；省略时使用默认消息）
 * - trigger: 触发时机（change/blur/submit）
 */
export interface ValidationRule {
  type?: RuleType;
  required?: boolean;
  pattern?: string | RegExp;
  min?: number;
  max?: number;
  /** 精确长度（string 字符数 / array 项数） */
  len?: number;
  /** 值必须在枚举列表内（值为空时跳过） */
  enum?: Array<string | number>;
  /** 仅空白字符串视为空（对齐 async-validator whitespace 规则） */
  whitespace?: boolean;
  /** 自定义校验函数（string 函数名或 Function 类型） */
  validator?: string | NexusFormValidator;
  /**
   * 错误提示消息（可选）
   * - 省略时按规则类型使用默认消息（可通过 NexusEngine options.messages 覆盖）
   * - 支持占位符插值：{min} {max} {len} {title}（对齐 async-validator 的 {field} 模板）
   */
  message?: string;
  trigger?: ValidationTrigger;
  /** 内部标记：validate 表达式生成的校验规则（由 SchemaParser 添加） */
  _validateExpr?: ExpressionOr<boolean>;
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

/**
 * 函数式 reaction 的执行上下文（formily `x-reactions` as function 对齐）
 *
 * 当声明式 `fulfill/otherwise` 补丁不足以表达联动逻辑时，`Reaction.run` 函数
 * 接收此上下文，直接用一等函数操作字段值 / 状态 —— 声明式模型的逃逸舱。
 *
 * `dependencies` 仍需显式声明（构建依赖图 / 触发重跑用），与声明式 reaction 一致。
 */
export interface ReactionFnContext {
  /** 目标字段自身的状态（可读可写） */
  state: FieldState;
  /** 依赖字段的值（按 dependencies 顺序，等同 $deps） */
  deps: unknown[];
  /** 完整表单数据（只读快照） */
  formData: Record<string, unknown>;
  /** 读取任意字段值 */
  getValue: (path: string) => unknown;
  /** 设置任意字段值（含实时重校验与沿依赖图传播） */
  setValue: (path: string, value: unknown) => void;
  /** 设置任意字段状态补丁（visible/disabled/required/value 等） */
  setState: (path: string, patch: FieldStatePatch) => void;
  /** 底层引擎实例（高级操作，如 reloadRemoteData / validate） */
  form: ReadonlyFormEngine & {
    setFieldValue(path: string, value: unknown): void;
    setFieldState(path: string, patch: FieldStatePatch): void;
  };
}

/**
 * 字段级事件钩子的执行上下文（P2-D，formily / rjsf 字段钩子对齐）
 *
 * 字段 Schema 可声明 `onChange` / `onBlur` / `onFocus` 一等函数钩子，
 * 在对应事件发生时调用。钩子接收本上下文，可直接操作字段值与表单状态。
 *
 * 与函数式 reaction（`run`）的区别：钩子不是联动模型，不参与依赖图，
 * 仅在事件本身触发（值变化 / 失焦 / 聚焦），用于日志、埋点、副作用等。
 */
export interface FieldHookContext {
  /** 事件对应字段的数据路径 */
  dataPath: string;
  /** 事件发生时的字段值（onChange 为新值；onBlur/onFocus 为当前值） */
  value: unknown;
  /** 变更前旧值（仅 onChange；onBlur/onFocus 为 undefined） */
  oldValue?: unknown;
  /** 完整表单数据（只读快照） */
  formData: Record<string, unknown>;
  /** 读取任意字段值 */
  getValue: (path: string) => unknown;
  /** 设置任意字段值（含实时重校验与沿依赖图传播） */
  setValue: (path: string, value: unknown) => void;
  /** 设置任意字段状态补丁 */
  setState: (path: string, patch: FieldStatePatch) => void;
  /** 底层引擎实例 */
  form: ReadonlyFormEngine & {
    setFieldValue(path: string, value: unknown): void;
    setFieldState(path: string, patch: FieldStatePatch): void;
  };
}

/**
 * 字段级事件钩子集合（P2-D，formily / rjsf 对齐）
 *
 * 声明在字段 Schema 上，由渲染层（React NexusField）在对应事件触发时调用。
 * 仅接收一等函数（不可序列化，属预期取舍，与 Reaction.run 一致）。
 *
 * ```ts
 * const field = {
 *   type: 'string',
 *   widget: 'input',
 *   onChange: ({ dataPath, value, setValue }) => {
 *     console.log('changed', dataPath, value);
 *     if (value === 'admin') setValue('role', 'root'); // 联动副作用
 *   },
 *   onBlur: ({ value }) => reportBlur(value),
 * };
 * ```
 */
export interface FieldHooks {
  /** 值变化时触发（commit 后；可经 setValue 产生联动副作用） */
  onChange?: (ctx: FieldHookContext) => void;
  /** 字段失焦时触发（仅校验触发点；不参与依赖图） */
  onBlur?: (ctx: FieldHookContext) => void;
  /** 字段聚焦时触发 */
  onFocus?: (ctx: FieldHookContext) => void;
}

export interface ReactionStatePatch {
  /**
   * 计算字段值（formily x-reactions state.value 对齐）
   * 支持表达式：如 `value: "{{ $deps[0] * 2 }}"`（数量 × 单价 = 总额）
   * 赋值后会触发该字段重校验并沿依赖图继续传播
   */
  value?: ExpressionOr<unknown>;
  visible?: ExpressionOr<boolean>;
  hidden?: ExpressionOr<boolean>;
  /**
   * 显示状态（formily `display` 三态对齐）
   * - 'none'：不渲染但仍收集提交（值保留）
   * - 'hidden'：不渲染且不收集（等同 hidden:true）
   */
  display?: ExpressionOr<'visible' | 'none' | 'hidden'>;
  disabled?: ExpressionOr<boolean>;
  readOnly?: ExpressionOr<boolean>;
  required?: ExpressionOr<boolean>;
  loading?: ExpressionOr<boolean>;
  title?: ExpressionOr<string>;
  description?: ExpressionOr<string>;
  /** 字段标题旁的气泡提示（动态设置，对齐 title/description） */
  tooltip?: ExpressionOr<string>;
  /**
   * 动态选项值列表（P2-C 依赖驱动的动态 enum）
   * 支持表达式：如 `enum: "{{ $deps[0] === 'CN' ? ['北京','上海'] : ['NY','LA'] }}"`
   * 解析结果写入 meta.enum（渲染层据此构建下拉选项）
   */
  enum?: ExpressionOr<Array<string | number>>;
  /** 动态选项文案，与 enum 一一对应（支持表达式） */
  enumNames?: ExpressionOr<Array<string>>;
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
  /**
   * 函数式联动（formily `x-reactions` as function 对齐）
   *
   * 存在时以命令式函数替代声明式 fulfill/otherwise 执行（逃逸舱）：
   * 适合声明式状态/Schema 补丁无法直白表达的逻辑（复杂计算、跨字段联动、
   * 依赖其他字段做分支等）。
   *
   * ```ts
   * reactions: [{
   *   dependencies: ['type'],
   *   run: ({ state, deps, setState, setValue }) => {
   *     const type = deps[0];
   *     setState('remark', {
   *       visible: type === 'other',
   *       required: type === 'other',
   *     });
   *   },
   * }],
   * ```
   *
   * 注意：run 使 schema 不再是纯 JSON（函数不可序列化），属预期取舍（formily 同）。
   * dependencies 仍需声明（参与依赖图构建与重跑触发）。
   */
  run?: (ctx: ReactionFnContext) => void;
  /**
   * 跨表单联动：源表单的 formId
   *
   * 存在时该 reaction 的 `dependencies` 指向**源表单**中的字段路径，
   * 由源表单对应字段的值变化触发（通过 FormRegistry 建立订阅），
   * 目标字段始终为本表单（reaction 所在字段）。
   *
   * 上下文语义：
   * - `$deps`：源表单依赖字段的值（按 dependencies 顺序）
   * - `formData` / `rootValue`：**本表单**的数据（可同时引用本表单字段做联合条件）
   * - `$self`：本表单目标字段状态
   *
   * 注意：跨表单 reaction 不进入本表单依赖图（依赖边属于源表单引擎），
   * 为单向联动；反向联动请在源表单配置 `crossForm` reaction 或调用 `linkForm`。
   */
  crossForm?: string;
  /** 内部标记：自动生成的 reaction（由 SchemaParser 从表达式字段转换而来） */
  _autoExpr?: boolean;
  /**
   * 内部标记：由 SchemaParser 为 oneOf/anyOf 条件分支容器生成的分支切换 reaction
   * dependencies 指向分支选择字段，其值变化时引擎重算激活分支
   */
  _oneOfBranch?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// 4.0 Widget 级校验规则与状态联动（注册在 widget 上，而非仅写在 Schema）
// ────────────────────────────────────────────────────────────────────────────

/**
 * Widget 声明级校验 / 联动描述
 *
 * 允许把校验规则与状态联动「注册在 widget 定义上」，而不必全部写进每条 Schema。
 * 某个字段使用该 widget 时，这些规则/联动自动合并进字段状态：
 * - rules：组件默认校验规则。Schema 已显式声明的同键规则优先，widget 规则只补缺，
 *   避免与用户 Schema 冲突产生双错误消息。
 * - reactions：组件默认联动（与 `{{ }}`/dependencies 相同的联动协议），
 *   如「确认密码」字段注册依赖 password 的重校验 / required 联动。
 * - props：组件默认属性，Schema props 覆盖同键值（widget 默认 → schema 覆盖）。
 *
 * 通过给 widget 函数挂载 `widgetMeta` 字段声明（NexusComponent & widgetMeta），
 * 引擎在 registerWidgets/registerLayouts/插件注入时快照该描述，
 * SchemaParser 解析字段时合并进 FieldState.meta.rules / state.reactions / props。
 *
 * @example
 * ```ts
 * export const confirmPasswordWidget = withFormItem((props) => <Input {...props} />);
 * confirmPasswordWidget.widgetMeta = {
 *   rules: [{
 *     _validateExpr: "{{ formData.password === $self.value }}",
 *     trigger: 'change',
 *   }],
 *   reactions: [{ dependencies: ['password'], fulfill: { state: {} } }],
 * };
 * ```
 */
export interface WidgetValidationDescriptor {
  /** 组件默认校验规则（schema 显式声明的同键规则优先，widget 规则仅补缺） */
  rules?: ValidationRule[];
  /** 组件默认联动规则（与 schema reactions 合并执行，参与依赖图构建） */
  reactions?: Reaction[];
  /** 组件默认 props（schema props 覆盖同键值） */
  props?: Record<string, unknown>;
}

/** widget 名称 → 声明描述 的映射表（由引擎注册时快照） */
export type WidgetDescriptors = Record<string, WidgetValidationDescriptor>;

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
 * 附带编辑器 / 点击动作配置（x-render `sideEffects` + `onClickAction` 对齐）
 *
 * 声明字段旁渲染一个「编辑」入口，点击弹出对应编辑器编辑字段值。
 * 编辑器本身是可复用的 widget 组件（注册为 `editor` 类型），接收 value/onChange。
 *
 * 两种形态：
 * - 简单形态：`sideEffects: 'textarea'`（使用同名已注册编辑器，其余配置取默认）
 * - 完整形态：`sideEffects: { editor: 'html', title: '编辑内容', mode: 'drawer', props: {...} }`
 */
export type SideEffectsConfig =
  | string
  | {
      /**
       * 编辑器 widget 名称（默认 'textarea'）
       * 渲染层从引擎注册的编辑器中查找：`editorRegistry[editor]`，
       * 未注册时回退内置 textarea 编辑器。
       */
      editor?: string;
      /** 编辑器按钮/标题文案（默认「编辑」） */
      title?: string;
      /** 打开方式（默认 modal） */
      mode?: 'modal' | 'drawer';
      /** 透传给编辑器的 props（与字段 props 合并，字段 props 优先） */
      props?: Record<string, unknown>;
    };

/**
 * 基础 Schema 节点
 * 所有数据节点和布局节点的公共属性
 */
export interface BaseSchemaNode {
  /**
   * 组件类型，用于渲染该字段/布局
   * 可选：省略时 Parser 按 type/format 推断（inferWidgetFromSchema）
   */
  widget?: string;
  /**
   * 只读时切换使用的渲染 widget（x-render readOnlyWidget 对齐）
   * 字段 readOnly 生效时使用该 widget 渲染（以其自有形态展示，不降级为只读纯文本），
   * 未配置时沿用现有只读渲染方式（ReadOnlyDisplay 纯文本）。
   */
  readOnlyWidget?: string;
  /**
   * 附带编辑器 / 点击动作（x-render `onClickAction` 对齐）
   *
   * 字段旁渲染一个「编辑」入口，点击弹出对应编辑器（Modal/Drawer）编辑字段值。
   * 适合富文本、JSON、长文本等主控件不适合直接编辑的场景。
   *
   * - 简单形态：`sideEffects: 'textarea'`（使用同名已注册编辑器的默认配置）
   * - 完整形态：`sideEffects: { editor: 'html', title: '编辑内容', mode: 'modal', props: {...} }`
   */
  sideEffects?: SideEffectsConfig;
  /** 字段标题 */
  title?: string;
  /** 字段描述 */
  description?: string;
  /**
   * 字段标题旁的气泡提示（antd ProForm / Formily x-decorator 对齐）
   * 静态字符串直接展示；表达式（{{ ... }}）请通过 reactions 的 fulfill.state.tooltip 动态设置
   */
  tooltip?: ExpressionOr<string>;
  /** 必填，支持布尔值或表达式（如 {{ formData.xxx == 'yyy' }}） */
  required?: ExpressionOr<boolean>;
  /** 校验规则列表 */
  rules?: ValidationRule[];
  /** 联动规则列表 */
  reactions?: Reaction[];
  /** 字段级事件钩子（onChange / onBlur / onFocus，formily / rjsf 字段钩子对齐） */
  hooks?: FieldHooks;
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
  /**
   * 显示状态（formily `display` 三态对齐）
   * - 'none'：不渲染（无占位符），但仍参与数据收集与提交（值保留）
   * - 'hidden'：不渲染且不参与数据收集（等同 hidden: true）
   * 可声明为表达式（{{ }}）或经 reactions `fulfill.state.display` 联动
   */
  display?: ExpressionOr<'visible' | 'none' | 'hidden'>;
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
  /** 字段级是否显示 label（默认 true，覆盖表单级 label） */
  label?: boolean;
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
  /**
   * 数据类型
   * 'array' 表示数组值字段（单控件多值，如 checkboxes/multiSelect/dateRange/file 等），
   * 与 DataArraySchema（list 类，需 items）区分：无 items 的 array 按数据字段处理
   */
  type?: DataPrimitiveType | 'array';
  /**
   * 枚举值列表（x-render / JSON Schema 对齐）
   * 与 enumNames 配合使用：enum 为值数组，enumNames 为文案数组
   * 声明为 `{{ }}` 表达式时启用「依赖驱动的动态 enum」（P2-C）：
   * 经依赖图的 reaction 按 `$deps` 动态重算选项，如
   * `enum: "{{ $deps[0] === 'CN' ? ['北京','上海'] : ['New York','LA'] }}"`。
   */
  enum?: ExpressionOr<Array<string | number>>;
  /** 枚举值对应的文案，与 enum 一一对应（x-render 对齐）；同样支持 `{{ }}` 表达式 */
  enumNames?: ExpressionOr<Array<string>>;
  /** 输入框占位符 */
  placeholder?: string;
  /** 辅助判断 widget 的格式（x-render 对齐）；format 为 email/url 时自动附加格式校验 */
  format?: FieldFormat;
  /** 正则校验（JSON Schema pattern 对齐，自动转 ValidationRule） */
  pattern?: string;
  /** 最小值/最小长度/最小项数（x-render 对齐，自动转 ValidationRule） */
  min?: number;
  /** 最大值/最大长度/最大项数（x-render 对齐，自动转 ValidationRule） */
  max?: number;
  /** JSON Schema 兼容：仅空白视为空（自动转 ValidationRule） */
  whitespace?: boolean;
  /**
   * 远程数据源配置（远程数据组件扩展属性，如 remoteSelect）
   * 由组件库（@xbeeant/form-engine-ui）消费，Core 仅透传到 props 供控件读取
   */
  remoteData?: Record<string, unknown>;
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
  /**
   * 组件类型，用于渲染该布局
   * 可选：省略时 Parser 按 type 推断布局容器类型
   */
  widget?: string;
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

// ────────────────────────────────────────────────────────────────────────────
// 5.1 条件分支容器（oneOf / anyOf）— 布局透明，Key 不进数据路径
// ────────────────────────────────────────────────────────────────────────────

/**
 * oneOf / anyOf 的单个分支定义
 *
 * 分支通过 properties 声明子字段。分支数据语义（对齐引擎「布局透明」红线）：
 * - 分支容器 Key **不进入** formData 数据路径，仅活动分支的 properties 字段收集数据
 * - 切换分支只影响「哪个分支渲染」，不改变数据 Key 结构（selected/plan 等 Key 不落数据）
 */
export interface OneOfBranchOption {
  /** 分支标题（展示用，如「信用卡」/「银行卡」） */
  title?: string;
  /** 分支描述 */
  description?: string;
  /** 分支子字段定义 */
  properties: Record<string, SchemaNode>;
}

/**
 * 条件分支容器 Schema（oneOf / anyOf）
 *
 * 为 anyOf 定义每个分支的条件（对齐 JSON Schema `anyOf` 语义）；
 * `anyOf` 未配置 `conditions` 时等价于 currentOption（当前激活分支字段渲染分支属性）。
 *
 * 语义：
 * - 任意时刻至多一个分支激活，渲染其 properties 子字段
 * - 容器 Key 不进入 formData 路径（布局透明），仅活动分支字段收集数据
 * - 切换分支时，引擎将该分支的属性与**上一分支**对齐：重复字段保留值，
 *   消失字段的重叠值清除 —— 保证数据合法性（实际字段随分支切换对齐）
 */
export interface BranchSchema {
  /**
   * 分支容器的渲染 trait：
   * - 期望 `oneOf` 为「当前激活分支」语义（配合字段级 `currentOption`）
   * - 期望 `anyOf` 为「条件分支」语义（配合 `conditions`）
   */
  type: string;
  /** oneOf / anyOf 分支列表 */
  branches: OneOfBranchOption[];
  /** 当前激活分支索引（仅 oneOf 语义下使用） */
  activeIndex?: number;
  /** anyOf 分支选择字段（源字段），分支按其 for/against 条件激活 */
  dependencies?: string[];
  /** anyOf 分支条件：分支索引 → 条件表达式 */
  conditions?: Record<number, string>;
  /** 单元素宽度（x-render 对齐，作用于容器包装层） */
  width?: string;
}

/**
 * 条件分支容器的运行时元数据（挂在 FieldState.meta 上）
 *
 * 除标准 UI 状态（visible/disabled/readOnly/loading）外，分支容器额外维护：
 * - 当前激活分支索引（meta.oneOf.activeIndex）
 * - 分支定义（meta.oneOf.branches）
 * - 字段→所属分支成员关系（meta.oneOf.fieldBranches）
 */
export interface OneOfMeta {
  /** 当前激活分支索引 */
  activeIndex: number;
  /** oneOf / anyOf 分支定义 */
  branches: OneOfBranchOption[];
  /**
   * 字段数据路径 → 包含它的分支索引列表
   *
   * 分支容器布局透明（Key 不进路径），各分支字段共享同一父路径，
   * 因此跨分支同名键会在 fieldStates 中合并为同一字段。该表记录每个字段
   * 出现在哪些分支，供引擎切换分支时判定：
   * - visible = 活动分支是否包含该字段
   * - 若字段同时属于旧分支与新分支（membership 含两者）→ 共享字段，保留值
   * - 若字段仅属旧分支 → 离开分支，清除值
   */
  fieldBranches?: Record<string, number[]>;
}

/**
 * 所有布局节点的联合类型
 */
export type LayoutNode =
  | LayoutContainerSchema
  | LayoutPaneSchema
  | BranchSchema;

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
 * 例如 @xbeeant/form-engine-ui 会声明：
 *
 * ```ts
 * declare module '@xbeeant/form-engine' {
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
  /** 表单语言标识（如 'zh-CN' / 'en-US'，UI 层消费） */
  locale?: string;
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
  /**
   * 是否被触碰过（值发生过写入即 true，对齐 rc-field-form touched）
   * 供 UI 展示「已修改」标记、提交时区分未改动字段
   */
  touched: boolean;
  /**
   * 是否脏（当前值 ≠ 初始值，深比较，对齐 rc-field-form dirty）
   * reset() 后归零
   */
  dirty: boolean;
  /** 是否可见 */
  visible: boolean;
  /**
   * 显示状态（formily `display` 三态对齐）
   * - 'visible'（默认）：正常渲染，参与数据收集
   * - 'none'：不渲染（连占位符都不输出），但**仍参与数据收集与校验**（值保留在 formData）
   * - 'hidden'：不渲染，**不参与数据收集**（从 formData 移除，等价位与 visible=false）
   */
  display: 'visible' | 'none' | 'hidden';
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
    /** 只读时切换渲染的 widget（x-render readOnlyWidget 对齐） */
    readOnlyWidget?: string;
    type?: DataType;
    rules: ValidationRule[];
    description?: string;
    /** 标题旁的气泡提示（antd Form.Item tooltip） */
    tooltip?: string;
    placeholder?: string;
    /** 枚举值列表（x-render 对齐）；可为 `{{ }}` 表达式经 dynamic-enum reaction 动态解析 */
    enum?: ExpressionOr<Array<string | number>>;
    /** 枚举值对应的文案，与 enum 一一对应（x-render 对齐） */
    enumNames?: ExpressionOr<Array<string>>;
    format?: FieldFormat;
    min?: number;
    max?: number;
    extra?: string;
    width?: string;
    order?: number;
    /** 在父 Grid 布局中横跨多少列（tailwind 风格） */
    colSpan?: number;
    displayType?: 'row' | 'column' | 'inline';
    /** 是否显示 label（默认 true，字段级覆盖表单级） */
    label?: boolean;
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
    /**
     * 数据对象容器标记：仅有 UI 状态（visible/disabled/readOnly + reactions），
     * 无值（value 恒为 undefined），不参与任何数据收集。
     * 其禁用/只读/隐藏状态由 Renderer 层经 context 下发给子组件。
     */
    containerOnly?: boolean;

    /**
     * 原始 Schema 节点（供 widget 组件读取完整声明）
     * @deprecated
     */
    schema?: SchemaNode;

    /**
     * 条件分支容器（oneOf / anyOf）元数据：激活分支索引 + 分支定义
     * 存在时该字段是分支容器（meta.containerOnly 语义类似），
     * meta.oneOf.branches 供 Renderer 渲染活动分支字段。
     */
    oneOf?: OneOfMeta;

    /**
     * 所属条件分支的索引（oneOf/anyOf 分支的属性字段携带）
     * 存在时该字段是某分支的属性字段：
     * - 分支容器切换时引擎据此设置各分支字段的 visible 标志
     * - 非活动分支字段 visible=false，不参与数据收集与校验
     */
    branchOf?: number;

    /**
     * 附带编辑器 / 点击动作配置（x-render `sideEffects` / `onClickAction` 对齐）
     * 存在时字段旁渲染「编辑」入口，点击弹出对应编辑器编辑字段值
     */
    sideEffects?: SideEffectsConfig;

    /**
     * 字段级事件钩子（P2-D，formily / rjsf 字段钩子对齐）
     * 渲染层在对应事件触发时调用，接收 FieldHookContext
     */
    hooks?: FieldHooks;
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
 * 数据对象容器：Key 进入数据路径，但本身无 widget，
 * 其 disabled/hidden/readOnly 状态存于自身 FieldState（meta.containerOnly），
 * 由 Renderer 层经 context 下发给子树中的字段继承
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
  /** 是否可见 */
  visible?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
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
 * 渲染树节点 - 条件分支容器（oneOf / anyOf）
 *
 * 分支容器本身承载 UI 状态（visible/disabled/readOnly + activeIndex，存于容器 FieldState），
 * `branches` 按分支索引分组保存各分支的渲染子节点 —— 所有分支的字段都已在 Parser
 * 阶段预解析进 fieldStates（非活动分支字段 visible=false），因此：
 * - 切换分支只更新容器 FieldState.activeIndex + 各分支字段的 visible 标志，
 *   不会触发渲染树重建（Rendere 据此 O(1) 重渲染活动分支）。
 * - 容器 Key 不进入数据路径（布局透明），仅活动分支的字段收集数据。
 */
export interface RenderBranchNode {
  /** 节点类型 */
  type: 'branch';
  /** 分支容器的布局 key（不进入数据路径） */
  layoutKey: string;
  /** 分支容器自身的状态路径（containerOnly FieldState 所在路径，订阅用） */
  dataPath: string;
  /** 布局属性（width / colSpan / displayType 等） */
  props: LayoutBaseProps & Record<string, unknown>;
  /** 各分支的渲染子节点：分支索引 → 该分支子字段渲染节点 */
  branches: RenderTreeNode[][];
}

/**
 * 所有渲染树节点的联合类型
 */
export type RenderTreeNode =
  | RenderFieldNode
  | RenderLayoutNode
  | RenderObjectNode
  | RenderBranchNode;

// ────────────────────────────────────────────────────────────────────────────
// 9. 插件系统
// ────────────────────────────────────────────────────────────────────────────

/**
 * UI 无关的组件类型
 *
 * Core 层禁止依赖任何 UI 框架（React/Vue/DOM）。
 * Widget / Layout 组件由 Renderer 层注入，Core 只负责按名称注册与分发。
 *
 * 组件函数可额外挂载 `widgetMeta`，用于声明「组件级校验规则 / 联动 / 默认 props」，
 * 在引擎注册时被快照，SchemaParser 解析字段时合并（见 WidgetValidationDescriptor）。
 */
export type NexusComponent<P = any> = ((props: P) => any) & {
  /** 组件声明级校验 / 联动 / 默认 props 描述（可选） */
  widgetMeta?: WidgetValidationDescriptor;
};

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
   *
   * @param path - 字段路径
   * @param engine - 发起校验的引擎（字段所属引擎，一引擎一份 schema/状态）
   */
  onValidateField?: (path: string, engine: NexusEngine) => void;
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
  /**
   * 编辑器组件注册表，key 为编辑器名称（`sideEffects.editor` 引用，x-render `editor` 对齐）
   * 编辑器是接收 value/onChange 的一等组件，由渲染层在字段失去主编辑能力时挂载。
   */
  editors?: Record<string, NexusComponent>;
  /** 字段包裹组件（渲染层默认包裹所有 widget，label === false 时跳过包裹） */
  fieldWrapper?: NexusComponent;
}

// ────────────────────────────────────────────────────────────────────────────
// 9.5 引擎选项 & 校验默认消息
// ────────────────────────────────────────────────────────────────────────────

/**
 * 默认校验消息模板（async-validator / x-render 对齐）
 *
 * 消息解析优先级：rule.message > messages[type] 模板 > 内置默认
 * 模板支持 {title} {min} {max} {len} 占位符：
 * - required: 必填错误
 * - min: 最小值/长度/项数错误（按字段 type 自动区分语义）
 * - max / len / pattern / enum / whitespace / format: 对应规则错误
 */
export interface DefaultRuleMessages {
  required: string;
  min: string;
  max: string;
  len: string;
  pattern: string;
  enum: string;
  whitespace: string;
  format: string;
}

/**
 * 引擎构造选项
 * ```
 * const engine = new NexusEngine({ messages: { required: '{title} 不能为空' } });
 * ```
 */
export interface NexusEngineOptions {
  /** 校验默认消息模板覆盖（仅覆盖传入的 key） */
  messages?: Partial<DefaultRuleMessages>;
  /**
   * 表单语言标识（如 'zh-CN' / 'en-US'）
   *
   * 引擎仅透传存储，由 UI 层（antd ConfigProvider / 内置文案）消费；
   * 校验消息语言通过 `messages` 覆盖实现。
   */
  locale?: string;
  /**
   * 表单实例唯一标识
   *
   * 配置后引擎在 init() 时自动注册到表单注册表（默认 defaultFormRegistry），
   * 使其他表单可通过 `crossForm` reaction / `linkForm` 建立跨表单联动。
   */
  formId?: string;
  /**
   * 表单注册表实例
   *
   * 缺省使用 defaultFormRegistry（页面级单例）；
   * 测试/隔离场景可传入 createFormRegistry() 创建的独立实例。
   */
  registry?: FormRegistry;
}

/**
 * 编程式跨表单值联动配置（engine.linkForm）
 */
export interface CrossFormLinkOptions {
  /**
   * 值转换函数：源表单字段值 → 本表单目标字段值
   * 缺省直接透传源值（相当于双向绑定的单向同步）
   */
  transform?: (value: unknown) => unknown;
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
  /** 查询分支容器的当前激活分支索引（oneOf/anyOf） */
  getOneOfActiveIndex(containerPath: string): number | undefined;
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
  /** 主动切换分支容器的激活分支（oneOf/anyOf） */
  setOneOfActiveIndex(containerPath: string, index: number): boolean;
  /** 获取表单数据 */
  getFormData(): Record<string, unknown>;
  /** 获取隐藏字段的值 */
  getHiddenValues(): Record<string, unknown>;
  /** 执行完整校验（validateFirst: 首个字段校验失败即短路，formily 对齐） */
  validate(
    paths?: string[],
    options?: { validateFirst?: boolean },
  ): Promise<Map<string, string[]>>;
  /** 重置表单 */
  reset(): void;
  /** 获取单个字段的错误 */
  getFieldError(path: string): string[];
  /** 获取所有有错误的字段 */
  getFieldsError(): Map<string, string[]>;
  /**
   * 校验单个字段（同步，trigger 维度）
   *
   * - trigger 缺省 'change'：与 setFieldValue 实时校验等价
   * - trigger: 'blur'：执行 blur 规则 + 无 trigger 规则（失焦校验）
   * - trigger: 'submit' 规则请使用 validate([path])（全量校验）
   */
  validateField(path: string, options?: { trigger?: ValidationTrigger }): void;
  /** 字段是否被触碰过（发生过值写入） */
  isFieldTouched(path: string): boolean;
  /** 字段是否脏（当前值 ≠ 初始值，深比较） */
  isFieldDirty(path: string): boolean;
  /**
   * 获取远程选项数据的版本号（x-render reloadRemoteData 对齐）
   * 字段调用 reloadRemoteData 后 +1；widget 可作为 useRemoteOptions 的重取信号
   */
  getRemoteDataVersion(path: string): number;
  /**
   * 重载远程选项数据（x-render reloadRemoteData 对齐）
   * - 传入 path：仅重载该字段的远程数据
   * - 不传：重载全部远程数据字段
   * 会 bump 目标字段版本触发组件重渲染，widget 据此重新请求
   */
  reloadRemoteData(path?: string): void;
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
  /**
   * 注册编辑器组件（x-render `editor` 对齐）
   * 编辑器是接收 value/onChange 的一等组件，供 `sideEffects` 字段的编辑入口使用
   */
  registerEditors(editors: Record<string, NexusComponent>): void;
  /** 获取已注册的编辑器组件 */
  getEditor(name: string): NexusComponent | undefined;
  /**
   * 注册字段包裹组件（UI 无关，Renderer 层注入）
   * 渲染层默认用它包裹所有 widget，包裹组件自身决定是否跳过（如 label === false）
   */
  registerFieldWrapper(wrapper: NexusComponent): void;
  /** 获取已注册的字段包裹组件 */
  getFieldWrapper(): NexusComponent | undefined;
  /** 获取渲染树 */
  getRenderTree(): RenderTreeNode[];
  /** 销毁引擎实例 */
  destroy(): void;

  // =========================================================================
  // 跨表单联动（多表单实例）
  // =========================================================================

  /** 获取本表单实例的唯一标识 */
  getFormId(): string | undefined;
  /** 设置表单实例标识并注册到注册表 */
  setFormId(formId: string): void;
  /** 获取表单注册表实例 */
  getRegistry(): FormRegistry;
  /**
   * 编程式跨表单值联动：源表单字段变化时同步到本表单目标字段
   * @param source - 源表单引擎实例或注册表中的 formId
   * @param sourcePath - 源表单字段路径
   * @param targetPath - 本表单目标字段路径
   * @param options - 可选（transform 值转换函数）
   * @returns 取消联动函数
   */
  linkForm(
    source: NexusEngine | string,
    sourcePath: string,
    targetPath: string,
    options?: CrossFormLinkOptions,
  ): () => void;

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
  operation: 'push' | 'pop' | 'remove' | 'update' | 'insert' | 'move' | 'copy';
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
  /**
   * 触发表单提交（校验 + onFinish），提交数据不包含 hidden 字段
   * @param options - validateFirst: 首个字段校验失败即短路（formily 对齐）
   * @param options - omitNil: 提交前递归移除空值（undefined/null/''，ProForm omitNil 对齐）
   */
  submit(options?: {
    validateFirst?: boolean;
    omitNil?: boolean;
  }): Promise<void>;
  /**
   * 是否正在提交中（校验 + onFinish 全流程，formily submitting 对齐）
   * 供 UI 展示提交 loading 状态
   */
  getSubmitting(): boolean;
  /**
   * 订阅提交状态变化（返回取消订阅函数）
   * 配合 useSyncExternalStore 使用：subscribe + getSubmitting 快照
   */
  onSubmittingChange(callback: () => void): () => void;
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
   * - omitNil: 递归移除空值（undefined/null/''，ProForm omitNil 对齐）
   */
  getValues(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown>;
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
  /** 校验字段（可指定路径；validateFirst: 首个失败字段即短路） */
  validateFields(
    paths?: string[],
    options?: { validateFirst?: boolean },
  ): Promise<Map<string, string[]>>;
  /** 获取单个字段的状态 */
  getFieldState(path: string): FieldState | undefined;
  /**
   * 重载远程选项数据（x-render reloadRemoteData 对齐）
   * 传入 path 仅重载该字段；缺省重载全部远程数据字段
   */
  reloadRemoteData(path?: string): void;
  /**
   * 注册字段校验逻辑
   * @param path 字段路径（如 'username'）
   * @param validator 校验函数，返回错误消息数组
   */
  registerValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void;
  /**
   * 注销字段校验逻辑（按函数引用移除）
   * 与 registerValidator 配对使用；widget 组件卸载时清理，避免校验器累积
   */
  unregisterValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void;
  /**
   * 实时重校验指定字段（同步，触发 trigger='change'/无 trigger 的规则与已注册校验器）
   * 供 widget 组件内部状态变化（非字段值变化）时主动刷新错误态
   */
  revalidateField(path: string): void;
}

// ============================================================================
// NexusEngine — 表单引擎核心实现
// 纯 TypeScript，无任何 UI 依赖
// 负责管理表单字段状态、数据绑定、联动逻辑、校验、订阅通知等
// ============================================================================

import { DependencyGraph } from './DependencyGraph';
import {
  createExpressionSandbox,
  type ExpressionSandbox,
} from './ExpressionSandbox';
import * as SchemaParser from './SchemaParser';
import type {
  ArrayOperationOptions,
  DataFieldSchema,
  DefaultRuleMessages,
  FieldState,
  FieldStatePatch,
  FormEngine as IFormEngine,
  NexusComponent,
  NexusEngineOptions,
  NexusFormValidator,
  NexusPlugin,
  NexusSchema,
  Reaction,
  ReactionContext,
  ReactionSchemaPatch,
  ReactionStatePatch,
  RenderTreeNode,
  SchemaNode,
  ValidationRule,
  ValidationTrigger,
  WidgetDescriptors,
} from './types/schema';
import {
  getNestedValue,
  isDeepEqual,
  isEmptyValue,
  isThenable,
  setNestedValue,
  toBoolean,
} from './utils/schema-helper';

/**
 * 订阅监听器类型：无参数的普通回调函数
 */
type Listener = () => void;

/**
 * 内置默认校验消息模板
 * 优先级：rule.message > engine options.messages[key] > 内置默认
 */
const DEFAULT_MESSAGES: DefaultRuleMessages = {
  required: '{title} 为必填项',
  min: '{title} 不能小于 {min}',
  max: '{title} 不能大于 {max}',
  len: '{title} 长度应为 {len}',
  pattern: '{title} 格式不正确',
  enum: '{title} 不在可选范围内',
  whitespace: '{title} 不能为空白',
  format: '{title} 格式不正确',
};

/** 消息模板占位符插值 */
function interpolateMessage(
  template: string,
  params: Record<string, string | undefined>,
): string {
  return template.replace(/\{(title|min|max|len|field)\}/g, (_, key: string) =>
    params[key] !== undefined ? (params[key] as string) : `{${key}}`,
  );
}

/**
 * NexusEngine — 表单引擎核心类
 *
 * 负责管理表单字段状态、数据绑定、联动逻辑、校验、订阅通知等
 * 实现了 IFormEngine 接口
 *
 * 核心职责：
 * - 管理 FieldState 映射表
 * - 解析 Schema 生成渲染树和依赖图
 * - 处理数据绑定和路径映射
 * - 执行联动逻辑（reactions）
 * - 同步和异步校验
 * - 订阅通知系统
 * - 插件系统扩展
 */
export class NexusEngine implements IFormEngine {
  // ── 内部状态 ──

  /** 所有字段的状态映射表，key 为字段路径(如 "profile.name") */
  private fieldStates: Map<string, FieldState> = new Map();
  /** 渲染树节点数组，描述表单的 UI 层级结构 */
  private renderTree: RenderTreeNode[] = [];
  /** 显式依赖图：source → Set<target>（source 变化时哪些字段需要联动） */
  private dependencyGraph: DependencyGraph = new DependencyGraph();
  /** 当前加载的表单 Schema 定义 */
  private schema: NexusSchema | null = null;
  /** init 时传入的初始值快照（reset 时按此重建 schema 级初始状态） */
  private initialValues?: Record<string, unknown>;
  /** 含 validate 表达式规则的字段路径集合（依赖变化时需实时重校验） */
  private validateExprFields: Set<string> = new Set();

  // ── 字段级版本（供 useSyncExternalStore 按路径精准订阅）──

  /** 字段路径 → 版本号，字段状态每次变更 +1 */
  private fieldVersions: Map<string, number> = new Map();

  // ── 表达式沙箱 ──

  /** 表达式安全求值沙箱（黑名单 + 上下文白名单过滤） */
  private expressionSandbox: ExpressionSandbox = createExpressionSandbox();

  // ── 订阅系统 ──

  /** 按字段路径分组的监听器集合 */
  private fieldListeners: Map<string, Set<Listener>> = new Map();
  /** 全局监听器集合（表单任何变化都会触发） */
  private globalListeners: Set<Listener> = new Set();
  /** 值变更回调（由 FormController 注册，用于触发 watch） */
  private onFieldValueChangeCallback:
    | ((path: string, value: unknown) => void)
    | null = null;

  // ── 插件系统 ──

  /** 已注册的插件列表 */
  private plugins: NexusPlugin[] = [];
  /** 自定义校验器注册表，key 为校验器名称 */
  private customValidators: Map<string, NexusFormValidator> = new Map();
  /** 自定义组件注册表，key 为组件名称（UI 无关，Renderer 层注入） */
  private widgetRegistry: Map<string, NexusComponent> = new Map();
  /** 自定义布局组件注册表，key 为布局名称（UI 无关，Renderer 层注入） */
  private layoutRegistry: Map<string, NexusComponent> = new Map();
  /**
   * 组件声明级校验/联动描述快照（widget 名称 → WidgetValidationDescriptor）
   * registerWidgets/registerLayouts/插件注入时从 widget.widgetMeta 快照，
   * SchemaParser 解析字段时合并进 FieldState（规则/联动/默认 props）
   */
  private widgetMetas: WidgetDescriptors = {};
  /** 外部注册的字段校验器（由 FormController 注册），按字段路径分组 */
  private fieldValidators: Map<
    string,
    Array<
      (
        value: unknown,
        formData: Record<string, unknown>,
      ) => string[] | Promise<string[]>
    >
  > = new Map();

  // ── 版本计数器（用于 useSyncExternalStore 快照比对）──
  /** 每次状态变更时递增，React 通过比对版本号判断是否需要重渲染 */
  private version = 0;

  // ── 校验默认消息模板（rule.message > messages[key] > 内置默认）──

  private messageTemplates: Partial<DefaultRuleMessages>;

  /**
   * 创建引擎实例
   *
   * @param options - 可选配置
   * @param options.messages - 校验默认消息模板覆盖
   */
  constructor(options?: NexusEngineOptions) {
    this.messageTemplates = options?.messages ?? {};
  }

  // =========================================================================
  // 初始化
  // =========================================================================

  /**
   * 初始化表单引擎
   *
   * 步骤：
   * 1. 保存 Schema 和初始值
   * 2. 解析 Schema，生成字段状态和渲染树
   * 3. 构建依赖图
   * 4. 收集 reactions 依赖关系
   * 5. 执行初始 reactions
   * 6. 通知所有订阅者
   * 7. 触发插件 onInit 钩子
   *
   * @param schema - 表单 Schema 定义
   * @param initialValues - 可选的初始表单数据
   */
  init(schema: NexusSchema, initialValues?: Record<string, unknown>): void {
    this.schema = schema;
    // 浅拷贝保存初始值快照：reset() 时恢复 schema 级初始状态（含 hidden/disabled/props 默认值）
    this.initialValues = initialValues ? { ...initialValues } : undefined;
    this.fieldStates.clear();
    // 注意：不清空 fieldListeners / globalListeners
    // React 的 useSyncExternalStore 会在组件卸载或依赖变化时自动清理订阅
    // 清空监听器会导致 bump() + notifyAll() 无法通知到 React，造成 UI 不更新

    // 解析 Schema，生成字段状态和渲染树
    const result = SchemaParser.parse(
      schema,
      this.initialValues,
      this.widgetMetas,
    );
    this.fieldStates = result.fieldStates;
    this.renderTree = result.renderTree;
    this.dependencyGraph = result.dependencyGraph;
    this.validateExprFields = result.validateExprFields;

    // 为所有字段递增字段级版本（init / reset 后触发按路径订阅的组件重渲染）
    for (const path of this.fieldStates.keys()) {
      this.bumpFieldVersion(path);
    }

    // 执行初始 reactions（应用联动规则的初始状态）
    this.runAllReactions();

    // 通知所有插件：初始化完成
    for (const plugin of this.plugins) {
      plugin.hooks?.onInit?.(this);
    }

    // 递增版本号并通知所有订阅者
    this.bump();
    this.notifyAll();
  }

  /**
   * 替换当前 Schema（保留已有的表单数据）
   *
   * 使用方法：
   * - 保存当前数据
   * - 调用 setSchema 替换 Schema
   * - 自动使用保存的数据作为新的 initialValues
   *
   * @param schema - 新的表单 Schema 定义
   */
  setSchema(schema: NexusSchema): void {
    const currentData = this.getFormData();
    this.init(schema, currentData);
  }

  // =========================================================================
  // 字段值操作
  // =========================================================================

  /**
   * 设置单个字段的值
   *
   * 触发流程：
   * 1. 插件拦截：onBeforeFieldValueChange（返回 false 可阻止更新）
   * 2. 更新值
   * 3. 实时校验：同步校验（schema rules + 同步外部校验器）
   * 4. 执行联动：触发依赖该字段的 reactions
   * 5. 插件通知：onFieldValueChange
   * 6. 外部 watch 回调
   * 7. 通知订阅者
   *
   * @param path - 字段路径
   * @param value - 新值
   */
  setFieldValue(path: string, value: unknown): void {
    const state = this.fieldStates.get(path);
    if (!state) {
      console.warn(`[NexusEngine] Field not found: ${path}`);
      return;
    }

    this.applyFieldValue(path, state, value);

    // 版本必须先递增，再通知订阅者；
    // 否则 useSyncExternalStore 在 onStoreChange 时读到旧版本会跳过重渲染
    this.bump();
    this.notifyField(path);
    this.notifyAll();
  }

  /**
   * 批量设置字段值（根据 bind 配置反向解析到各字段）
   *
   * 与 setFieldValue 行为一致：逐字段执行插件钩子、实时校验与联动，
   * 仅在收尾时统一 bump + 通知，避免多次全局通知。
   *
   * @param values - 转换后的数据对象，键为数据路径
   */
  setFieldValues(values: Record<string, unknown>): void {
    // values 是转换后的数据格式，根据 bind 反向解析到字段
    const changedPaths: string[] = [];

    for (const [path, state] of this.fieldStates) {
      // 数据对象容器不接收值（仅承载 UI 状态，子字段各自独立接收）
      if (state.meta.containerOnly) {
        continue;
      }
      const bind = state.meta.bind;
      let newValue: unknown;

      if (bind === false) {
        // bind: false — 不参与数据收集，不从 values 读取
        continue;
      } else if (typeof bind === 'string') {
        // bind: string — 从 bind 路径读取
        newValue = getNestedValue(values, bind);
      } else if (Array.isArray(bind)) {
        // bind: string[] — 从多个路径读取并组装成数组
        newValue = bind.map((b) => getNestedValue(values, b));
      } else {
        // 无 bind — 从字段原始路径读取
        newValue = getNestedValue(values, path);
      }

      if (newValue !== undefined) {
        this.applyFieldValue(path, state, newValue);
        changedPaths.push(path);
      }
    }

    if (changedPaths.length === 0) {
      return;
    }

    // 批量通知订阅者
    this.bump();
    for (const path of changedPaths) {
      this.notifyField(path);
    }
    this.notifyAll();
  }

  /**
   * 应用单个字段值变更的公共逻辑（setFieldValue / setFieldValues 共用）
   *
   * 步骤：
   * 1. 插件拦截：onBeforeFieldValueChange（返回 false 可阻止更新）
   * 2. 更新值，并同步数组项子字段状态
   * 3. 实时校验（同步规则 + 同步外部校验器）
   * 4. 执行联动：触发依赖该字段的 reactions
   * 5. 插件通知：onFieldValueChange
   * 6. 外部 watch 回调
   *
   * 注意：本方法不负责 bump / notify（由调用方统一收尾）
   *
   * @param path - 字段路径
   * @param state - 字段状态对象
   * @param value - 新值
   */
  private applyFieldValue(
    path: string,
    state: FieldState,
    value: unknown,
  ): void {
    // 数据对象容器仅承载 UI 状态，不能写入值（子字段各自独立写入）
    if (state.meta.containerOnly) {
      console.warn(
        `[NexusEngine] Cannot set value on container-only path: ${path}（请写入子字段路径）`,
      );
      return;
    }

    const oldValue = state.value;

    // 插件拦截：onBeforeFieldValueChange（返回 false 可阻止更新）
    for (const plugin of this.plugins) {
      const result = plugin.hooks?.onBeforeFieldValueChange?.(
        path,
        value,
        oldValue,
      );
      if (result === false) {
        return;
      }
    }

    state.value = value;

    // 触碰与脏标记（对齐 rc-field-form：值写入 → touched；值 ≠ 初始值 → dirty）
    state.touched = true;
    state.dirty = !isDeepEqual(value, state.initialValue);

    // 数组字段：同步数组项子字段状态（list[0].name 等）
    this.syncArrayItemStates(path);

    // 实时校验：同步校验（schema rules + 同步外部校验器）
    this.validateFieldRealtime(path, state);

    // 触发依赖该字段的 reactions（可能修改其他字段状态）
    this.runReactionsForSource(path);

    // 插件通知：值已变更
    for (const plugin of this.plugins) {
      plugin.hooks?.onFieldValueChange?.(path, value);
    }

    // 外部 watch 回调
    if (this.onFieldValueChangeCallback) {
      this.onFieldValueChangeCallback(path, value);
    }
  }

  /**
   * 获取单个字段的当前值
   *
   * @param path - 字段路径
   * @returns 字段值，不存在则返回 undefined
   */
  getFieldValue(path: string): unknown {
    return this.fieldStates.get(path)?.value;
  }

  /**
   * 获取表单数据
   *
   * 根据字段配置的 bind 属性转换数据格式：
   * - bind: false — 不参与数据收集（隐藏字段）
   * - bind: string — 数据写入到指定路径
   * - bind: string[] — 字段值数组按顺序写入多个路径
   * - 无 bind — 数据写入到字段原始路径
   *
   * @param paths 可选路径数组，指定只返回哪些字段的数据
   * - 无参数：返回所有可见字段数据（不含 hidden 字段）
   * - 传入路径：只返回指定路径的可见字段数据
   */
  getFormData(paths?: string[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const pathSet = paths ? new Set(paths) : null;

    for (const [path, state] of this.fieldStates) {
      // 数组项子字段不单独收集（数组整体由数组字段序列化）
      if (state.meta.itemOf) {
        continue;
      }
      // 数据对象容器不参与数据收集（仅承载 UI 状态）
      if (state.meta.containerOnly) {
        continue;
      }
      // 只收集可见字段（隐藏字段由 getHiddenValues 处理）
      if (!state.visible) {
        continue;
      }
      // 祖先对象容器隐藏 → 整个子树视为隐藏
      if (this.isContainerHidden(path)) {
        continue;
      }
      // 指定路径时只收集匹配的字段
      if (pathSet && !pathSet.has(path)) {
        continue;
      }
      this.applyBindToData(data, path, state);
    }

    return data;
  }

  /**
   * 根据字段的 bind 配置，将字段值写入数据对象
   *
   * 步骤：
   * 1. 获取字段的 bind 配置
   * 2. 根据配置类型执行不同的写入逻辑
   * 3. 返回更新后的数据对象
   *
   * @param data - 数据对象（输出参数）
   * @param path - 字段路径
   * @param state - 字段状态对象
   */
  private applyBindToData(
    data: Record<string, unknown>,
    path: string,
    state: FieldState,
  ): void {
    const bind = state.meta.bind;
    const value = state.value;

    if (bind === false) {
      // bind: false — 不参与数据收集
      return;
    }

    if (typeof bind === 'string') {
      // bind: string — 写入 bind 路径
      setNestedValue(data, bind, value);
      return;
    }

    if (Array.isArray(bind)) {
      // bind: string[] — 字段值数组按顺序写入多个路径
      const arr = Array.isArray(value) ? value : [];
      for (let i = 0; i < bind.length; i++) {
        setNestedValue(data, bind[i], arr[i]);
      }
      return;
    }

    // 无 bind — 写入字段原始路径
    setNestedValue(data, path, value);
  }

  /**
   * 判断字段是否存在隐藏的对象容器祖先
   *
   * 数据对象容器隐藏（visible: false）时，其整棵子树视为隐藏，
   * 子字段不参与 getFormData 收集、并入 getHiddenValues。
   *
   * @param path - 字段路径（如 "user.name"）
   * @returns 存在隐藏的祖先对象容器返回 true
   */
  private isContainerHidden(path: string): boolean {
    const segments = path.split('.');
    for (let i = segments.length - 1; i >= 1; i--) {
      const ancestor = segments.slice(0, i).join('.');
      const state = this.fieldStates.get(ancestor);
      if (state?.meta.containerOnly && !state.visible) {
        return true;
      }
    }
    return false;
  }

  // =========================================================================
  // 字段状态操作
  // =========================================================================

  // =========================================================================
  // 字段状态操作
  // =========================================================================

  /**
   * 获取指定字段的完整状态对象
   *
   * @param path - 字段路径
   * @returns 字段状态，不存在则返回 undefined
   */
  getFieldState(path: string): FieldState | undefined {
    return this.fieldStates.get(path);
  }

  /**
   * 获取所有字段状态的副本（避免外部直接修改内部 Map）
   *
   * @returns 所有字段状态的 Map 副本
   */
  getAllFieldStates(): Map<string, FieldState> {
    return new Map(this.fieldStates);
  }

  /**
   * 局部更新字段状态（合并补丁）
   *
   * 可更新的属性：
   * - value: 字段值
   * - visible: 可见性
   * - disabled: 禁用状态
   * - required: 必填状态（同时同步校验规则）
   * - loading: 加载状态
   * - errors: 错误消息
   * - props: 组件属性
   *
   * @param path - 字段路径
   * @param patch - 状态补丁对象，只更新传入的属性
   */
  setFieldState(path: string, patch: FieldStatePatch): void {
    const state = this.fieldStates.get(path);
    if (!state) {
      console.warn(`[NexusEngine] Field not found: ${path}`);
      return;
    }

    if (patch.value !== undefined) {
      // 数据对象容器仅承载 UI 状态，不能写入值
      if (state.meta.containerOnly) {
        console.warn(
          `[NexusEngine] Cannot set value on container-only path: ${path}（请写入子字段路径）`,
        );
      } else {
        state.value = patch.value;
        // 触碰与脏标记与 applyFieldValue 保持一致
        state.touched = true;
        state.dirty = !isDeepEqual(patch.value, state.initialValue);
        // 数组字段值变更需重建项子字段状态
        this.syncArrayItemStates(path);
      }
    }
    if (patch.visible !== undefined) {
      state.visible = patch.visible;
    }
    if (patch.disabled !== undefined) {
      state.disabled = patch.disabled;
    }
    if (patch.readOnly !== undefined) {
      state.readOnly = patch.readOnly;
    }
    if (patch.required !== undefined) {
      state.required = patch.required;
      // 同步必填校验规则到 meta.rules
      this.syncRequiredRule(state);
    }
    if (patch.loading !== undefined) {
      state.loading = patch.loading;
    }
    if (patch.errors !== undefined) {
      state.errors = patch.errors;
    }
    if (patch.props !== undefined) {
      // 合并 props，不覆盖未传入的属性
      state.props = { ...state.props, ...patch.props };
    }

    this.bump();
    this.notifyField(path);
    this.notifyAll();
  }

  // =========================================================================
  // 校验
  // =========================================================================

  // =========================================================================
  // 校验
  // =========================================================================

  /**
   * 实时同步校验（schema rules + 同步外部校验器）
   *
   * 在字段值变更时立即执行，仅处理同步校验逻辑
   * - 必填校验
   * - 内置规则校验（min/max/len/pattern/enum/whitespace/格式）
   * - 表达式校验（validate 字段定义）
   * - 同步外部校验器
   *
   * trigger 语义（对齐 async-validator / x-render）：
   * - 无 trigger 或与传入 trigger 匹配的规则参与本次校验
   * - 默认实时 trigger 为 'change'；'blur' 规则由 validateField(path, { trigger: 'blur' }) 触发
   * - 'submit' 规则的校验由 validate()（提交/全量）承载
   *
   * 异步校验（Promise 返回值 / 防抖 / 超时）由 AsyncValidatorPlugin
   * 通过 onValidateField 钩子接管，Core 不承载调度逻辑
   *
   * @param path - 字段路径
   * @param state - 字段状态对象
   * @param trigger - 本次校验的触发时机（默认 'change'）
   */
  private validateFieldRealtime(
    path: string,
    state: FieldState,
    trigger: ValidationTrigger = 'change',
  ): void {
    if (!state.visible) {
      return;
    }

    const errors: string[] = [];

    // 0. 必填校验（required 为 true 且值为空时立即显示）
    if (state.required && isEmptyValue(state.value)) {
      errors.push(this.getRequiredMessage(state));
    }

    // 1. 校验 schema rules（required、min、max、pattern 等）
    for (const rule of state.meta.rules) {
      // trigger 过滤：无 trigger 的规则全 trigger 生效；指定 trigger 时精准匹配
      if (rule.trigger && rule.trigger !== trigger) {
        continue;
      }

      // 纯必填规则（无其他约束）已在上面处理，避免重复添加错误消息
      if (SchemaParser.isPureRequiredRule(rule)) {
        continue;
      }

      // 内置规则校验（min/max/len/pattern/enum/whitespace/格式）
      const error = this._validateBuiltinRule(state.value, rule, state);
      if (error) {
        errors.push(error);
      }

      // 表达式校验（validate 字段定义的表达式）
      const validateExpr = rule._validateExpr;
      if (typeof validateExpr === 'string') {
        const formData = this.getFormData();
        const exprResult = this.evaluateExpression(validateExpr, {
          $deps: [],
          $self: state,
          formData,
          rootValue: formData,
          $form: this,
        });
        if (exprResult === false) {
          errors.push(this.resolveRuleMessage(state, rule));
        }
      }

      // 自定义校验器（rule.validator）：
      // - string 函数名：按注册表查同名校验器，同步返回 string 时立即生效
      // - 内联函数：直接调用，同步返回 string 时立即生效
      // Promise 返回值的异步校验由 AsyncValidatorPlugin 通过 onValidateField 钩子接管
      const ruleValidator = this.resolveRuleValidator(rule);
      if (ruleValidator) {
        const formData = this.getFormData();
        const result = ruleValidator(
          state.value,
          rule,
          formData,
          path,
        ) as unknown;
        if (typeof result === 'string') {
          errors.push(result);
        } else if (Array.isArray(result)) {
          errors.push(...(result as string[]));
        }
      }
    }

    // 2. 外部同步校验器（registerValidator）
    // Promise 返回值的异步校验由 AsyncValidatorPlugin 通过 onValidateField 钩子接管：
    // 同步路径只处理同步结果（string[]），thenable 结果交由插件防抖调度后写回，
    // 与 schema 规则的默认 'change' trigger 保持一致的触发时机
    const validators = this.fieldValidators.get(path);
    if (validators && validators.length > 0) {
      const formData = this.getFormData();
      for (const validator of validators) {
        try {
          const result = validator(state.value, formData);
          if (isThenable(result)) {
            // 异步校验：不在此处应用结果，交给 AsyncValidatorPlugin 调度
            continue;
          }
          if (Array.isArray(result)) {
            errors.push(...result);
          }
        } catch {
          // 校验器抛错，跳过
        }
      }
    }

    state.errors = errors;

    // 3. 通知插件执行后续校验（如异步校验器插件的防抖调度）
    for (const plugin of this.plugins) {
      plugin.hooks?.onValidateField?.(path);
    }
  }

  /**
   * 校验单个字段（同步，trigger 维度）
   *
   * 用途（对齐 async-validator 的 blur/change 触发语义）：
   * - 组件 onBlur 时调用 validateField(path, { trigger: 'blur' }) 执行 blur 规则
   * - 组件 onChange 实时校验由 setFieldValue 内部自动触发（无需手动调用）
   *
   * @param path - 字段路径
   * @param options - 触发时机（默认 'change'）
   */
  validateField(path: string, options?: { trigger?: ValidationTrigger }): void {
    const state = this.fieldStates.get(path);
    if (!state) {
      console.warn(`[NexusEngine] Field not found: ${path}`);
      return;
    }
    this.validateFieldRealtime(path, state, options?.trigger ?? 'change');
    // 版本必须先递增，再通知订阅者；否则 useSyncExternalStore 读到旧版本会跳过重渲染
    this.bump();
    this.notifyField(path);
    this.notifyAll();
  }

  /**
   * 解析规则上的自定义校验器（rule.validator）
   *
   * 支持两种形式：
   * - string 函数名：从 customValidators 注册表查同名校验器（插件/引擎注入）
   * - 内联函数：直接作为校验器返回（widget 声明式 rules 或 TS 构建 Schema 时可用）
   *
   * @param rule - 校验规则
   * @returns 解析到的校验器函数；未注册/不存在时返回 undefined
   */
  private resolveRuleValidator(
    rule: ValidationRule,
  ): NexusFormValidator | undefined {
    const validator = rule.validator;
    if (typeof validator === 'function') {
      return validator;
    }
    if (typeof validator === 'string') {
      return this.customValidators.get(validator);
    }
    return undefined;
  }

  /**
   * 解析校验规则的最终错误消息
   *
   * 优先级：rule.message > engine options.messages[key] > 内置默认模板
   * 支持 {title} {min} {max} {len} {field} 占位符插值（对齐 async-validator 消息模板）
   *
   * @param state - 字段状态（提供 title 与规则）
   * @param rule - 校验规则（message 可选）
   * @returns 解析后的消息字符串
   */
  private resolveRuleMessage(state: FieldState, rule: ValidationRule): string {
    const title = state.meta.title;
    let key: keyof DefaultRuleMessages;
    if (rule.required) {
      key = 'required';
    } else if (rule.len !== undefined) {
      key = 'len';
    } else if (rule.min !== undefined) {
      key = 'min';
    } else if (rule.max !== undefined) {
      key = 'max';
    } else if (rule.whitespace === true) {
      key = 'whitespace';
    } else if (rule.pattern) {
      key = 'pattern';
    } else if (rule.enum && rule.enum.length > 0) {
      key = 'enum';
    } else {
      key = 'format';
    }

    const template =
      rule.message ?? this.messageTemplates[key] ?? DEFAULT_MESSAGES[key];

    return interpolateMessage(template, {
      title,
      field: title,
      min: rule.min !== undefined ? String(rule.min) : undefined,
      max: rule.max !== undefined ? String(rule.max) : undefined,
      len: rule.len !== undefined ? String(rule.len) : undefined,
    });
  }

  /**
   * 获取必填错误消息（rule.message > messages.required > 内置默认）
   *
   * @param state - 字段状态
   * @returns 必填错误消息
   */
  private getRequiredMessage(state: FieldState): string {
    const title = state.meta.title;
    const template =
      this.messageTemplates.required ?? DEFAULT_MESSAGES.required;
    return interpolateMessage(template, { title, field: title });
  }

  /**
   * 内置规则校验（required / min / max / len / pattern / enum / whitespace / 格式）
   *
   * 供 validateRuleSync / validateRule 共用，避免重复实现
   *
   * 类型自适应语义（对齐 async-validator）：
   * - required: 必填校验
   * - min / max: 数值大小 / 字符串长度 / 数组项数
   * - len: 字符串精确长度 / 数组精确项数
   * - pattern: 正则表达式校验
   * - enum: 值必须在枚举内（空值跳过）
   * - whitespace: 仅空白字符串视为空
   * - type: 'email' / 'url'：内置格式校验
   *
   * @param value - 字段当前值
   * @param rule - 校验规则对象
   * @param state - 字段状态（用于默认消息解析）
   * @returns 错误消息字符串，校验通过返回 null
   */
  private _validateBuiltinRule(
    value: unknown,
    rule: ValidationRule,
    state: FieldState,
  ): string | null {
    // 必填校验
    if (rule.required && isEmptyValue(value)) {
      return this.resolveRuleMessage(state, rule);
    }

    // 如果值为空且非必填，跳过后续 min/max/pattern 等校验
    if (isEmptyValue(value)) {
      return null;
    }

    // whitespace 规则：仅空白字符串视为空
    if (rule.whitespace === true) {
      if (typeof value === 'string' && value.trim() === '') {
        return this.resolveRuleMessage(state, rule);
      }
    }

    // 最小值校验（支持数组长度、字符串长度、数值大小）
    if (rule.min !== undefined) {
      if (rule.type === 'array' || Array.isArray(value)) {
        if (Array.isArray(value) && value.length < rule.min) {
          return this.resolveRuleMessage(state, rule);
        }
      } else if (typeof value === 'string') {
        if (value.length < rule.min) {
          return this.resolveRuleMessage(state, rule);
        }
      } else if (typeof value === 'number') {
        if (value < rule.min) {
          return this.resolveRuleMessage(state, rule);
        }
      }
    }

    // 最大值校验（支持数组长度、字符串长度、数值大小）
    if (rule.max !== undefined) {
      if (rule.type === 'array' || Array.isArray(value)) {
        if (Array.isArray(value) && value.length > rule.max) {
          return this.resolveRuleMessage(state, rule);
        }
      } else if (typeof value === 'string') {
        if (value.length > rule.max) {
          return this.resolveRuleMessage(state, rule);
        }
      } else if (typeof value === 'number') {
        if (value > rule.max) {
          return this.resolveRuleMessage(state, rule);
        }
      }
    }

    // len：精确长度校验（字符串字符数 / 数组项数）
    if (rule.len !== undefined) {
      if (Array.isArray(value) && value.length !== rule.len) {
        return this.resolveRuleMessage(state, rule);
      }
      if (typeof value === 'string' && value.length !== rule.len) {
        return this.resolveRuleMessage(state, rule);
      }
    }

    // enum：值必须在枚举列表内
    if (rule.enum && rule.enum.length > 0) {
      if (!rule.enum.includes(value as string | number)) {
        return this.resolveRuleMessage(state, rule);
      }
    }

    // 正则表达式校验
    if (rule.pattern) {
      const pattern =
        rule.pattern instanceof RegExp
          ? rule.pattern
          : new RegExp(rule.pattern);
      if (!pattern.test(String(value))) {
        return this.resolveRuleMessage(state, rule);
      }
    }

    // 内置格式校验（rule.type 作为格式检查，对齐 async-validator）
    if (
      rule.type === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    ) {
      return this.resolveRuleMessage(state, rule);
    }
    if (
      rule.type === 'url' &&
      !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(String(value))
    ) {
      return this.resolveRuleMessage(state, rule);
    }

    return null;
  }

  /**
   * 执行完整表单校验（用于提交时，对齐 async-validator / x-render 提交语义）
   *
   * 提交时校验**所有**规则（无论 trigger 是 change/blur/submit），
   * 避免跳过用户未触碰过的字段；trigger 仅决定「实时/失焦」何时预校验。
   *
   * 支持的校验类型：
   * - 内置规则校验
   * - 自定义 validator
   * - 表达式校验（validate 产生的 _validateExpr）
   *
   * @param paths - 可选，指定需要校验的字段路径列表
   * @returns 校验结果 Map，key 为字段路径，value 为错误消息数组
   */
  async validate(paths?: string[]): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();
    const targetPaths = paths || Array.from(this.fieldStates.keys());

    // 插件通知：校验前回调
    for (const plugin of this.plugins) {
      plugin.hooks?.onBeforeValidate?.(paths);
    }

    for (const path of targetPaths) {
      const state = this.fieldStates.get(path);
      if (!state?.visible) {
        continue;
      }

      const errors: string[] = [];
      // 字段内复用同一份 formData，避免重复构建
      const formData = this.getFormData();

      // 一次遍历 rules：同时处理内置规则、自定义 validator、表达式 validate
      for (const rule of state.meta.rules) {
        // 提交 = 全量校验：不按 trigger 过滤（change/blur/submit 规则全部生效）

        // 纯必填规则：统一走必填专项（resolveRuleMessage 解析默认消息）
        // 注意：此处不可简单跳过——validate 与实时路径一样需要 required 消息。
        // 已由 state.required / 规则 required 双保险，见下方 required 分支

        // 1) 内置规则校验（含必填）
        const builtinError = this._validateBuiltinRule(
          state.value,
          rule,
          state,
        );
        if (builtinError) {
          errors.push(builtinError);
        }

        // 2) 注册的自定义 validator（string 函数名或内联函数，统一解析）
        const ruleValidator = this.resolveRuleValidator(rule);
        if (ruleValidator) {
          const error = await ruleValidator(state.value, rule, formData, path);
          if (error) {
            errors.push(error);
          }
        }

        // 3) 表达式校验（validate 产生的 _validateExpr）
        const validateExpr = (rule as unknown as Record<string, unknown>)
          ._validateExpr;
        if (typeof validateExpr === 'string') {
          const exprResult = this.evaluateExpression(validateExpr, {
            $deps: [],
            $self: state,
            formData,
            rootValue: formData,
            $form: this,
          });
          if (exprResult === false) {
            errors.push(this.resolveRuleMessage(state, rule));
          }
        }
      }

      // 外部注册的字段校验器（registerValidator）
      const validators = this.fieldValidators.get(path);
      if (validators && validators.length > 0) {
        for (const validator of validators) {
          const extraErrors = await validator(state.value, formData);
          if (extraErrors && extraErrors.length > 0) {
            errors.push(...extraErrors);
          }
        }
      }

      if (errors.length > 0) {
        results.set(path, errors);
        state.errors = errors;
      } else {
        // 清除之前残留的错误（如联动规则使字段重新通过校验）
        state.errors = [];
      }

      // 按路径通知：精准订阅（subscribeField）的组件才能感知错误状态刷新
      this.notifyField(path);
    }

    // 插件通知：校验完成回调
    for (const plugin of this.plugins) {
      plugin.hooks?.onValidate?.(results);
    }

    this.bump();
    this.notifyAll();
    return results;
  }

  // =========================================================================
  // 重置
  // =========================================================================

  /**
   * 重置表单到初始状态
   *
   * 依据 Schema 重建 schema 级初始状态（而非写死默认值）：
   * - 重新解析 Schema，恢复 hidden/disabled/readOnly/required/props 的静态默认值
   * - 恢复 initialValue
   * - 重新执行联动规则，恢复初始联动状态
   */
  reset(): void {
    if (this.schema) {
      // 重新解析 schema：恢复字段状态、依赖图、渲染树与初始联动
      // init 内部已执行 bump + notifyAll，且保留已有监听器（不会丢失 React 订阅）
      this.init(this.schema, this.initialValues);
      return;
    }

    // Schema 不可用时的兜底：按字段 initialValue 手工重置
    for (const [, state] of this.fieldStates) {
      state.value = state.initialValue;
      state.errors = [];
      state.visible = true;
      state.disabled = false;
      state.loading = false;
      state.props = {};
    }

    // 重新执行联动，恢复初始联动状态
    this.runAllReactions();
    this.bump();
    this.notifyAll();
  }

  // =========================================================================
  // Schema & 错误操作
  // =========================================================================

  // =========================================================================
  // Schema & 错误操作
  // =========================================================================

  /**
   * 获取当前 Schema 定义
   *
   * @returns 当前 Schema 或 null（未初始化时）
   */
  getSchema(): NexusSchema | null {
    return this.schema;
  }

  /**
   * 获取所有字段值（含 hidden 字段）
   *
   * 与 getFormData 的区别：不跳过隐藏字段
   *
   * @returns 所有字段的数据对象
   */
  getAllFormData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [path, state] of this.fieldStates) {
      // 数组项子字段不单独收集（数组整体由数组字段序列化）
      if (state.meta.itemOf) {
        continue;
      }
      // 数据对象容器不参与数据收集（仅承载 UI 状态）
      if (state.meta.containerOnly) {
        continue;
      }
      this.applyBindToData(data, path, state);
    }
    return data;
  }

  /**
   * 获取隐藏字段的值
   *
   * 只返回 hidden 属性为 true 的字段值
   *
   * @returns 仅包含隐藏字段的数据对象
   */
  getHiddenValues(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [path, state] of this.fieldStates) {
      // 数组项子字段不单独收集（数组整体由数组字段序列化）
      if (state.meta.itemOf) {
        continue;
      }
      // 数据对象容器不参与数据收集（仅承载 UI 状态）
      if (state.meta.containerOnly) {
        continue;
      }
      // 自身隐藏或祖先对象容器隐藏 → 均视为隐藏字段
      if (!state.visible || this.isContainerHidden(path)) {
        this.applyBindToData(data, path, state);
      }
    }
    return data;
  }

  /**
   * 按路径更新 Schema 节点的部分属性
   *
   * 步骤：
   * 1. 查找目标路径
   * 2. 递归找到对应的 Schema 节点
   * 3. 合并 patch
   * 4. 重新解析 schema 以刷新 fieldStates / renderTree
   *
   * @param path - 数据路径（如 "profile.website"）
   * @param patch - 要合并的 schema 片段
   */
  setSchemaByPath(path: string, patch: Record<string, unknown>): void {
    if (!this.schema) {
      console.warn('[NexusEngine] Schema not initialized');
      return;
    }

    const segments = path.split('.');
    const updated = this.patchSchemaNode(
      this.schema.properties,
      segments,
      0,
      patch,
    );
    if (updated) {
      // 重新解析 schema 以刷新 fieldStates / renderTree
      const currentData = this.getFormData();
      this.init(this.schema, currentData);
    }
  }

  /**
   * 递归查找并更新 Schema 树中的目标节点
   *
   * @param properties - 当前层级的属性定义
   * @param segments - 路径分段数组
   * @param depth - 当前递归深度
   * @param patch - 要合并的补丁
   * @returns 是否成功找到并更新了节点
   */
  private patchSchemaNode(
    properties: Record<string, SchemaNode>,
    segments: string[],
    depth: number,
    patch: Record<string, unknown>,
  ): boolean {
    if (depth >= segments.length) {
      return false;
    }
    const key = segments[depth];
    const node = properties[key];
    if (!node) {
      return false;
    }

    if (depth === segments.length - 1) {
      // 到达目标节点，合并 patch
      Object.assign(node, patch);
      return true;
    }

    // 递归进入子节点
    if ('properties' in node && node.properties) {
      return this.patchSchemaNode(
        node.properties as Record<string, SchemaNode>,
        segments,
        depth + 1,
        patch,
      );
    }
    return false;
  }

  /**
   * 获取单个字段的错误消息
   *
   * @param path - 字段路径
   * @returns 错误消息数组
   */
  getFieldError(path: string): string[] {
    return this.fieldStates.get(path)?.errors ?? [];
  }

  /**
   * 字段是否被触碰过（发生过值写入，对齐 rc-field-form touched）
   *
   * @param path - 字段路径
   * @returns 未触碰或字段不存在时返回 false
   */
  isFieldTouched(path: string): boolean {
    return this.fieldStates.get(path)?.touched ?? false;
  }

  /**
   * 字段是否脏（当前值 ≠ 初始值，深比较，对齐 rc-field-form dirty）
   *
   * 用于 UI 展示「已修改」标记、提交时区分未改动字段
   *
   * @param path - 字段路径
   * @returns 未变更或字段不存在时返回 false
   */
  isFieldDirty(path: string): boolean {
    return this.fieldStates.get(path)?.dirty ?? false;
  }

  /**
   * 获取所有有错误的字段
   *
   * @returns 错误 Map，key 为字段路径，value 为错误消息数组
   */
  getFieldsError(): Map<string, string[]> {
    const errors = new Map<string, string[]>();
    for (const [path, state] of this.fieldStates) {
      if (state.errors.length > 0) {
        errors.set(path, [...state.errors]);
      }
    }
    return errors;
  }

  /**
   * 手动设置字段错误
   *
   * @param errors - 错误数组，每项包含路径和错误消息列表
   */
  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void {
    for (const { path, errors: errs } of errors) {
      const state = this.fieldStates.get(path);
      if (state) {
        state.errors = [...errs];
        this.notifyField(path);
      }
    }
    this.bump();
    this.notifyAll();
  }

  /**
   * 移除指定字段的错误消息
   *
   * @param path - 字段路径
   */
  removeErrorField(path: string): void {
    const state = this.fieldStates.get(path);
    if (state) {
      state.errors = [];
      this.notifyField(path);
      this.bump();
      this.notifyAll();
    }
  }

  /**
   * 获取依赖指定字段的所有字段集合
   *
   * 依赖图结构：source -> Set<dependents>
   * 例如：province -> Set[address.province, address.city]
   *
   * @param path - 字段路径
   * @returns 依赖该字段的其他字段集合（防御性拷贝）
   */
  getDependents(path: string): Set<string> {
    return this.dependencyGraph.getDependents(path);
  }

  // =========================================================================
  // 订阅系统
  // =========================================================================

  // =========================================================================
  // 订阅系统
  // =========================================================================

  /**
   * 订阅单个字段的状态变化
   *
   * 当字段状态变化时，自动获取最新状态并调用回调
   *
   * @param path - 字段路径
   * @param callback - 状态变化回调，接收最新的 FieldState
   * @returns 取消订阅的函数
   */
  subscribe(path: string, callback: (state: FieldState) => void): () => void {
    if (!this.fieldListeners.has(path)) {
      this.fieldListeners.set(path, new Set());
    }

    // 包装回调，自动获取最新状态
    const wrappedCallback = () => {
      const state = this.fieldStates.get(path);
      if (state) {
        callback(state);
      }
    };
    this.fieldListeners.get(path)?.add(wrappedCallback);

    return () => {
      this.fieldListeners.get(path)?.delete(wrappedCallback);
    };
  }

  /**
   * 订阅单个字段的版本变化（供 useSyncExternalStore 按路径精准订阅）
   *
   * 与 subscribe 的区别：回调不携带参数，快照通过 getFieldVersion(path) 读取，
   * 便于 React 只对目标字段做版本比对，避免全局重渲染
   *
   * @param path - 字段路径
   * @param callback - 版本变化回调（无参数）
   * @returns 取消订阅的函数
   */
  subscribeField(path: string, callback: () => void): () => void {
    if (!this.fieldListeners.has(path)) {
      this.fieldListeners.set(path, new Set());
    }
    this.fieldListeners.get(path)?.add(callback);
    return () => {
      this.fieldListeners.get(path)?.delete(callback);
    };
  }

  /**
   * 获取单个字段的版本号（字段状态每次变更 +1，未初始化返回 0）
   *
   * @param path - 字段路径
   * @returns 字段版本号
   */
  getFieldVersion(path: string): number {
    return this.fieldVersions.get(path) ?? 0;
  }

  /**
   * 订阅全局表单数据变化
   *
   * 当表单数据变化时（任何字段变化），自动获取最新数据并调用回调
   *
   * @param callback - 数据变化回调，接收最新的表单数据
   * @returns 取消订阅的函数
   */
  subscribeAll(
    callback: (formData: Record<string, unknown>) => void,
  ): () => void {
    const wrappedCallback = () => callback(this.getFormData());
    this.globalListeners.add(wrappedCallback);

    return () => {
      this.globalListeners.delete(wrappedCallback);
    };
  }

  /**
   * 供 useSyncExternalStore 使用的 subscribe 方法
   *
   * React 通过此方法注册 store 变更回调
   *
   * @param onStoreChange - 变更回调函数
   * @returns 取消订阅的函数
   */
  subscribeStore = (onStoreChange: () => void): (() => void) => {
    this.globalListeners.add(onStoreChange);
    return () => {
      this.globalListeners.delete(onStoreChange);
    };
  };

  /**
   * 供 useSyncExternalStore 使用的 getSnapshot 方法
   *
   * 返回当前版本号，React 通过比对判断是否需要重渲染
   *
   * @returns 当前版本号
   */
  getSnapshot = (): number => {
    return this.version;
  };

  // =========================================================================
  // 渲染树
  // =========================================================================

  // =========================================================================
  // 渲染树
  // =========================================================================

  /**
   * 获取当前渲染树
   *
   * 渲染树描述了表单的完整 UI 层级结构
   * 由 SchemaParser 生成，供 Renderer 消费
   *
   * @returns 渲染树节点数组
   */
  getRenderTree(): RenderTreeNode[] {
    return this.renderTree;
  }

  // =========================================================================
  // 插件 & 注册
  // =========================================================================

  // =========================================================================
  // 插件 & 注册
  // =========================================================================

  /**
   * 注册插件
   *
   * 插件可以提供自定义校验器、组件、布局，以及生命周期钩子
   *
   * @param plugin - 插件实例
   */
  use(plugin: NexusPlugin): void {
    this.plugins.push(plugin);

    // 注册插件提供的校验器
    if (plugin.validators) {
      for (const [name, validator] of Object.entries(plugin.validators)) {
        this.customValidators.set(name, validator);
      }
    }

    // 注册插件提供的自定义组件
    if (plugin.widgets) {
      for (const [name, widget] of Object.entries(plugin.widgets)) {
        this.widgetRegistry.set(name, widget);
        // 快照组件声明元数据（校验规则/联动/默认 props）
        if (widget?.widgetMeta) {
          this.widgetMetas[name] = widget.widgetMeta;
        }
      }
    }

    // 注册插件提供的布局组件
    if (plugin.layouts) {
      for (const [name, layout] of Object.entries(plugin.layouts)) {
        this.layoutRegistry.set(name, layout);
        if (layout?.widgetMeta) {
          this.widgetMetas[name] = layout.widgetMeta;
        }
      }
    }
  }

  /**
   * 是否已注册指定名称的插件（供上层按名称幂等注入）
   *
   * @param name - 插件名称
   */
  hasPlugin(name: string): boolean {
    return this.plugins.some((p) => p.name === name);
  }

  /** 注册值变更回调（由 FormController 使用，用于 watch 功能） */
  registerOnFieldValueChange(
    callback: (path: string, value: unknown) => void,
  ): void {
    this.onFieldValueChangeCallback = callback;
  }

  /**
   * 注册外部字段校验器（由 FormController.registerValidator 调用）
   *
   * 对同一字段重复注册同一函数引用时去重，避免组件/插件在多次挂载中
   * 重复注册导致错误消息累积。
   */
  registerFieldValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void {
    const list = this.fieldValidators.get(path) ?? [];
    // 同一字段重复注册同一函数引用时去重，避免组件/插件重复注册累积错误
    if (!list.some((fn) => fn === validator)) {
      list.push(validator);
      this.fieldValidators.set(path, list);
    }
  }

  /**
   * 注销字段校验器（按函数引用移除）
   *
   * 供组件卸载 / 校验器重建时清理，避免校验器随组件反复挂载而累积。
   * 与 registerFieldValidator 配合：widget 组件内 useFieldValidator 的 effect
   * cleanup 即调用本方法。
   *
   * @param path - 字段路径
   * @param validator - 已注册的校验函数引用
   */
  unregisterFieldValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void {
    const list = this.fieldValidators.get(path);
    if (!list) {
      return;
    }
    const next = list.filter((fn) => fn !== validator);
    if (next.length > 0) {
      this.fieldValidators.set(path, next);
    } else {
      this.fieldValidators.delete(path);
    }
  }

  /**
   * 获取字段级校验器注册表（供异步校验器插件读取）
   *
   * @returns 字段路径 → 校验器列表
   */
  getFieldValidators(): Map<
    string,
    Array<
      (
        value: unknown,
        formData: Record<string, unknown>,
      ) => string[] | Promise<string[]>
    >
  > {
    return this.fieldValidators;
  }

  /**
   * 批量注册自定义组件（UI 无关，Renderer 层注入）
   *
   * @param widgets - 组件映射表，key 为组件名称
   */
  registerWidgets(widgets: Record<string, NexusComponent>): void {
    for (const [name, widget] of Object.entries(widgets)) {
      this.widgetRegistry.set(name, widget);
      // 快照组件声明元数据（校验规则/联动/默认 props）
      if (widget?.widgetMeta) {
        this.widgetMetas[name] = widget.widgetMeta;
      }
    }
  }

  /**
   * 批量注册布局组件（UI 无关，Renderer 层注入）
   *
   * @param layouts - 布局映射表，key 为布局名称
   */
  registerLayouts(layouts: Record<string, NexusComponent>): void {
    for (const [name, layout] of Object.entries(layouts)) {
      this.layoutRegistry.set(name, layout);
      if (layout?.widgetMeta) {
        this.widgetMetas[name] = layout.widgetMeta;
      }
    }
  }

  /**
   * 根据名称获取注册的自定义组件
   *
   * @param name - 组件名称
   * @returns 组件函数或 undefined
   */
  getWidget(name: string): NexusComponent | undefined {
    return this.widgetRegistry.get(name);
  }

  /**
   * 根据名称获取注册的布局组件
   *
   * @param name - 布局名称
   * @returns 布局函数或 undefined
   */
  getLayout(name: string): NexusComponent | undefined {
    return this.layoutRegistry.get(name);
  }

  // =========================================================================
  // 销毁
  // =========================================================================

  // =========================================================================
  // 销毁
  // =========================================================================

  /**
   * 销毁引擎实例，清理所有内部状态和订阅
   */
  destroy(): void {
    this.fieldStates.clear();
    this.fieldVersions.clear();
    this.fieldListeners.clear();
    this.globalListeners.clear();
    this.dependencyGraph.clear();
    this.validateExprFields.clear();
    this.renderTree = [];
    this.schema = null;
    this.initialValues = undefined;
    this.plugins = [];
    this.customValidators.clear();
    this.widgetRegistry.clear();
    this.layoutRegistry.clear();
    this.widgetMetas = {};
    this.fieldValidators.clear();
  }

  // =========================================================================
  // 数组字段操作
  // =========================================================================

  /**
   * 执行数组字段操作（push/pop/remove/update/insert/move）
   *
   * 操作逻辑由插件通过 `onArrayOperation` 钩子承载（如 ArrayOperationsPlugin），
   * Core 不硬编码数组变换逻辑。
   *
   * @param options - 操作配置
   * @returns 操作后的新数组；无插件处理时返回 undefined 并告警
   */
  arrayOperation(options: ArrayOperationOptions): Array<unknown> | undefined {
    // 委托给插件：插件返回非 undefined 表示已处理
    for (const plugin of this.plugins) {
      const result = plugin.hooks?.onArrayOperation?.(options, this);
      if (result !== undefined) {
        return result;
      }
    }

    console.warn(
      `[NexusEngine] No plugin handles arrayOperation '${options.operation}' ` +
        `for path '${options.path}'. Register the ArrayOperationsPlugin via engine.use().`,
    );
    return undefined;
  }

  // =========================================================================
  // 内部：Reactions 执行
  // =========================================================================

  // =========================================================================
  // 内部：Reactions 执行
  // =========================================================================

  /**
   * 执行所有字段的初始 reactions
   *
   * 在 init 和 reset 时调用，建立初始联动状态。
   * 直接遍历 fieldStates（reactions 已在解析时完成作用域解析并挂载到 state.reactions），
   * 避免再次递归扫描 Schema 树。
   */
  private runAllReactions(): void {
    // 复用单份 formData 快照（与 runReactionsForSource 一致，AGENTS.md §3.1），
    // 避免每个 reaction 都重新构建一次 formData，O(n) 表达式字段的 init 可降 10x+
    const formData = this.getFormData();
    for (const [path, state] of this.fieldStates) {
      if (state.reactions) {
        for (const reaction of state.reactions) {
          this.executeReaction(path, reaction, formData);
        }
      }
    }
  }

  /**
   * 执行指定源字段变更所触发的 reactions
   *
   * 通过依赖图查找所有依赖该字段的目标字段（O(k) 查询），
   * reactions 索引直接取 fieldStates 中已解析的 state.reactions（O(1)），
   * 不再递归扫描 Schema 树。
   *
   * 同时处理跨字段 validate 表达式依赖：依赖字段变化时对目标字段做实时重校验。
   *
   * @param sourcePath - 变更的源字段路径
   */
  private runReactionsForSource(sourcePath: string): void {
    const dependents = this.dependencyGraph.getDependents(sourcePath);
    if (dependents.size === 0) {
      return;
    }

    // 单次批量执行复用同一份 formData 快照，避免对每个 dependent 重复构建
    const formData = this.getFormData();

    for (const targetPath of dependents) {
      const state = this.fieldStates.get(targetPath);
      if (!state) {
        continue;
      }

      // 执行依赖了 sourcePath 的 reactions
      const reactions = state.reactions;
      if (reactions) {
        for (const reaction of reactions) {
          if (!reaction.dependencies.includes(sourcePath)) {
            continue;
          }
          this.executeReaction(targetPath, reaction, formData);
        }
      }

      // 跨字段 validate 表达式依赖：依赖字段变化时实时重校验目标字段
      if (this.validateExprFields.has(targetPath)) {
        this.validateFieldRealtime(targetPath, state);
        // 错误变化需按路径通知，否则精准订阅的组件无法感知重校验结果
        this.notifyField(targetPath);
      }
    }
  }

  /**
   * 执行单个 reaction 规则
   *
   * 步骤：
   * 1. 收集依赖字段的值
   * 2. 检查 when 条件
   * 3. 如果 when 不满足，执行 otherwise（state + schema 补丁）
   * 4. 如果 when 满足，执行 fulfill（state + schema 补丁）
   *
   * @param targetPath - 目标字段路径
   * @param reaction - reaction 规则对象
   * @param formData - 可选的 formData 快照（批量执行时复用，避免重复构建）
   */
  private executeReaction(
    targetPath: string,
    reaction: Reaction,
    formData?: Record<string, unknown>,
  ): void {
    const dependValues = reaction.dependencies.map((dep) =>
      this.getFieldValue(dep),
    );
    const targetState = this.fieldStates.get(targetPath);
    if (!targetState) {
      return;
    }

    // 单次 reaction 执行中复用同一份 formData，避免多次遍历 Map
    const data = formData ?? this.getFormData();

    // 检查 when 条件
    if (reaction.when) {
      const whenResult = this.evaluateExpression(reaction.when, {
        $deps: dependValues,
        $self: targetState,
        formData: data,
        rootValue: data,
        $form: this,
        $index: this.extractIndexFromPath(targetPath),
      });
      if (!whenResult) {
        // when 不满足，执行 otherwise
        if (reaction.otherwise?.state) {
          this.applyStatePatch(
            targetPath,
            reaction.otherwise.state,
            dependValues,
            data,
          );
        }
        if (reaction.otherwise?.schema) {
          this.applySchemaPatch(
            targetPath,
            reaction.otherwise.schema,
            dependValues,
            data,
          );
        }
        return;
      }
    }

    // 执行 fulfill
    if (reaction.fulfill?.state) {
      this.applyStatePatch(
        targetPath,
        reaction.fulfill.state,
        dependValues,
        data,
      );
    }
    if (reaction.fulfill?.schema) {
      this.applySchemaPatch(
        targetPath,
        reaction.fulfill.schema,
        dependValues,
        data,
      );
    }
  }

  /**
   * 从数组项路径中提取 $index（如 "items[0].name" → 0）
   *
   * @param path - 字段路径
   * @returns 数组项索引；非数组项返回 undefined
   */
  private extractIndexFromPath(path: string): number | undefined {
    const match = path.match(/\[(\d+)\]/);
    return match ? Number(match[1]) : undefined;
  }

  /**
   * 应用状态补丁到指定字段
   *
   * 该方法使用提供的上下文（包括依赖值、当前字段状态和表单数据）来解析每个补丁属性。
   * 相应地更新字段的可见性、交互性、验证约束、元数据和自定义属性。
   *
   * @param path - 点分隔的路径，用于标识目标字段状态
   * @param patch - 包含要应用的状态更新的补丁对象
   * @param dependValues - 用于解析补丁中条件表达式的依赖值数组
   * @param formData - 可选的表单数据，用于表达式解析。如果未提供，则内部回退获取
   */
  private applyStatePatch(
    path: string,
    patch: ReactionStatePatch,
    dependValues: unknown[],
    formData?: Record<string, unknown>,
  ): void {
    const state = this.fieldStates.get(path);
    if (!state) {
      return;
    }

    // 调用方通常已提供 formData；缺失时再补一次
    const data = formData ?? this.getFormData();
    const context: ReactionContext = {
      $deps: dependValues,
      $self: state,
      formData: data,
      rootValue: data,
      $form: this,
      $index: this.extractIndexFromPath(path),
    };

    // 计算字段值（formily x-reactions state.value 对齐）：
    // 赋值 → 重建数组项子字段 → 实时重校验 → 沿依赖图继续传播
    if (patch.value !== undefined) {
      const resolved = this.resolveValue(patch.value, context);
      state.value = resolved;
      state.touched = true;
      state.dirty = !isDeepEqual(resolved, state.initialValue);
      this.syncArrayItemStates(path);
      this.validateFieldRealtime(path, state);
      this.runReactionsForSource(path);
    }
    // 处理可见性（visible 优先于 hidden）
    if (patch.visible !== undefined) {
      state.visible = toBoolean(this.resolveValue(patch.visible, context));
    }
    if (patch.hidden !== undefined) {
      const hidden = toBoolean(this.resolveValue(patch.hidden, context));
      state.visible = !hidden;
    }
    // 处理禁用状态
    if (patch.disabled !== undefined) {
      state.disabled = toBoolean(this.resolveValue(patch.disabled, context));
    }

    // 处理只读状态
    if (patch.readOnly !== undefined) {
      state.readOnly = toBoolean(this.resolveValue(patch.readOnly, context));
    }
    // 处理必填状态（同时同步校验规则）
    if (patch.required !== undefined) {
      state.required = toBoolean(this.resolveValue(patch.required, context));
      this.syncRequiredRule(state);
    }
    // 处理加载状态
    if (patch.loading !== undefined) {
      state.loading = toBoolean(this.resolveValue(patch.loading, context));
    }
    // 处理字段标题
    if (patch.title !== undefined) {
      state.meta.title = this.resolveValue(patch.title, context) as string;
    }
    // 处理自定义属性
    if (patch.props) {
      for (const [key, expr] of Object.entries(patch.props)) {
        state.props[key] = this.resolveValue(expr, context);
      }
    }

    this.notifyField(path);
  }

  /**
   * 应用 Schema 补丁到指定字段（reactions 的 fulfill.schema / otherwise.schema）
   *
   * Schema 补丁是「点路径 → 表达式/值」映射，运行时动态覆盖目标字段的
   * 状态与 props（不持久化回 Schema 定义）：
   * - visible / hidden / disabled / readOnly / required / loading：字段状态
   * - title / description：字段元数据
   * - props.xxx：组件属性（支持多级，如 props.options）
   * - 其他顶层键：写入 props，避免 schema 结构漂移
   *
   * @param path - 点分隔的路径，用于标识目标字段状态
   * @param patch - Schema 补丁对象（键为点路径）
   * @param dependValues - 用于解析补丁中条件表达式的依赖值数组
   * @param formData - 可选的表单数据，用于表达式解析。如果未提供，则内部回退获取
   */
  private applySchemaPatch(
    path: string,
    patch: ReactionSchemaPatch,
    dependValues: unknown[],
    formData?: Record<string, unknown>,
  ): void {
    const state = this.fieldStates.get(path);
    if (!state) {
      return;
    }

    const data = formData ?? this.getFormData();
    const context: ReactionContext = {
      $deps: dependValues,
      $self: state,
      formData: data,
      rootValue: data,
      $form: this,
      $index: this.extractIndexFromPath(path),
    };

    for (const [dotPath, valueOrExpr] of Object.entries(patch)) {
      const resolved = this.resolveValue(valueOrExpr, context);
      const segments = dotPath.split('.');
      const head = segments[0];

      switch (head) {
        case 'visible':
          state.visible = toBoolean(resolved);
          break;
        case 'hidden':
          state.visible = !toBoolean(resolved);
          break;
        case 'disabled':
          state.disabled = toBoolean(resolved);
          break;
        case 'readOnly':
          state.readOnly = toBoolean(resolved);
          break;
        case 'required':
          state.required = toBoolean(resolved);
          this.syncRequiredRule(state);
          break;
        case 'loading':
          state.loading = toBoolean(resolved);
          break;
        case 'title':
          state.meta.title = String(resolved);
          break;
        case 'description':
          state.meta.description =
            resolved === undefined || resolved === null
              ? undefined
              : String(resolved);
          break;
        case 'props': {
          // props.xxx → state.props.xxx（支持多级点路径）
          if (segments.length > 1) {
            let target: Record<string, unknown> = state.props;
            for (let i = 1; i < segments.length - 1; i++) {
              const k = segments[i];
              const next = target[k];
              if (
                next === null ||
                typeof next !== 'object' ||
                Array.isArray(next)
              ) {
                target[k] = {};
              }
              target = target[k] as Record<string, unknown>;
            }
            target[segments[segments.length - 1]] = resolved;
          }
          break;
        }
        default:
          // 其他键（如 format / enum / placeholder）写入 props，动态作用于 UI
          state.props[head] = resolved;
          break;
      }
    }

    this.notifyField(path);
  }

  /**
   * 数组字段值变更后，重建数组项子字段状态（list[0].name 等）
   *
   * 数组长度变化或项内容变化时，移除旧的项子字段状态，依据当前数组值重建，
   * 保证校验 / 订阅 / 状态访问始终指向最新数组数据。
   *
   * @param arrayPath - 数组字段路径
   */
  private syncArrayItemStates(arrayPath: string): void {
    const state = this.fieldStates.get(arrayPath);
    if (!state) {
      return;
    }
    const items = state.meta.items;
    if (!items) {
      return;
    }

    // 移除该数组旧的项子字段状态（防止长度变化后残留）
    const prefix = `${arrayPath}[`;
    const stale: string[] = [];
    for (const key of this.fieldStates.keys()) {
      if (key.startsWith(prefix)) {
        stale.push(key);
      }
    }
    for (const key of stale) {
      this.fieldStates.delete(key);
    }

    // 依据当前数组值重建项子字段状态
    const arr = Array.isArray(state.value) ? state.value : [];
    if (items.type === 'object' && items.properties) {
      arr.forEach((item, index) => {
        const itemPath = `${arrayPath}[${index}]`;
        const obj = (item ?? {}) as Record<string, unknown>;
        for (const [itemKey, itemNode] of Object.entries(items.properties)) {
          const sub = itemNode as DataFieldSchema;
          this.fieldStates.set(
            `${itemPath}.${itemKey}`,
            SchemaParser.createArrayItemState(
              `${itemPath}.${itemKey}`,
              itemKey,
              sub,
              obj[itemKey],
              arrayPath,
            ),
          );
        }
      });
    } else {
      arr.forEach((item, index) => {
        const itemPath = `${arrayPath}[${index}]`;
        this.fieldStates.set(
          itemPath,
          SchemaParser.createArrayItemState(
            itemPath,
            (items as DataFieldSchema).title || arrayPath,
            items as DataFieldSchema,
            item,
            arrayPath,
          ),
        );
      });
    }

    // 通知被重建的项子字段订阅者（同步其版本号）
    for (const key of this.fieldStates.keys()) {
      if (key.startsWith(prefix)) {
        this.notifyField(key);
      }
    }
  }

  /**
   * 根据字段当前的必填状态同步必填校验规则
   *
   * 管理校验规则数组中的动态必填规则，以及字段错误中对应的错误消息。
   * 如果字段为必填且不存在静态或动态必填规则，则添加带生成消息的动态必填规则到规则数组开头。
   * 如果字段非必填且存在动态必填规则，则移除该规则。
   * 同时更新错误数组，立即反映必填验证状态。
   *
   * @param state - 包含元数据、校验规则、值和当前错误的字段状态
   */
  private syncRequiredRule(state: FieldState): void {
    // 数据对象容器无校验规则，必填状态不参与规则同步
    if (state.meta.containerOnly) {
      return;
    }
    const rules = state.meta.rules;
    // 查找动态必填规则（由本方法添加的规则）
    const dynIdx = rules.findIndex((r) => r._dynamicRequired === true);
    // 检查是否存在静态必填规则（schema 中定义的 required: true）
    const hasStaticRequired = rules.some(
      (r) => r.required === true && r._dynamicRequired !== true,
    );
    // 字段为必填且没有静态必填规则且没有动态必填规则 → 添加动态规则
    if (state.required && !hasStaticRequired && dynIdx === -1) {
      rules.unshift({
        required: true,
        _dynamicRequired: true,
      });
    } else if (!state.required && dynIdx !== -1) {
      // 字段非必填且存在动态规则 → 移除该规则
      rules.splice(dynIdx, 1);
    }

    // 实时必填校验：required 变化时立即显示/清除错误
    const requiredError = this.getRequiredMessage(state);
    const hasErr = state.errors.includes(requiredError);
    if (state.required && isEmptyValue(state.value) && !hasErr) {
      // 字段必填且值为空但错误列表中还没有该错误 → 添加
      state.errors = [...state.errors, requiredError];
    } else if ((!state.required || !isEmptyValue(state.value)) && hasErr) {
      // 字段非必填或值不为空且错误列表中有该错误 → 移除
      state.errors = state.errors.filter((e) => e !== requiredError);
    }
  }

  /**
   * 解析值或表达式
   *
   * 如果值是字符串且以 '{{' 开头，则作为表达式进行求值；否则直接返回原值
   *
   * @param valueOrExpr - 要解析的值或表达式
   * @param context - 表达式求值的上下文对象
   * @returns 解析后的值
   */
  private resolveValue(
    valueOrExpr: unknown,
    context: ReactionContext,
  ): unknown {
    if (typeof valueOrExpr !== 'string') {
      return valueOrExpr;
    }
    if (!valueOrExpr.startsWith('{{')) {
      return valueOrExpr;
    }
    return this.evaluateExpression(valueOrExpr, context);
  }

  /**
   * 安全求值表达式
   *
   * 从 {{ }} 中提取表达式，交给 ExpressionSandbox 求值：
   * - 标识符黑名单（eval/window/document/constructor 等）
   * - 上下文白名单（仅 $deps/$self/$form/$index/formData/rootValue）
   * - 错误隔离（单个表达式失败不影响其他表达式）
   *
   * @param expression - 包含表达式的字符串（如 "{{ formData.name === 'admin' }}"）
   * @param context - 表达式求值的上下文对象
   * @returns 表达式求值结果，失败时返回 undefined
   */
  private evaluateExpression(
    expression: string,
    context: ReactionContext,
  ): unknown {
    // 提取 {{ }} 中的表达式；非模板字符串原样返回
    const match = expression.match(/^\{\{(.+)\}\}$/s);
    if (!match) {
      return expression;
    }
    return this.expressionSandbox.evaluate(match[1].trim(), context);
  }

  // =========================================================================
  // 内部：通知
  // =========================================================================

  // =========================================================================
  // 内部：通知
  // =========================================================================

  /**
   * 递增指定字段的版本号
   *
   * @param path - 字段路径
   */
  private bumpFieldVersion(path: string): void {
    this.fieldVersions.set(path, (this.fieldVersions.get(path) ?? 0) + 1);
  }

  /**
   * 通知指定字段的所有已注册监听器
   *
   * 先递增字段版本号，再触发监听器：
   * 保证 useSyncExternalStore 在 onStoreChange 中通过 getFieldVersion(path)
   * 读到最新版本，不会因旧版本快照跳过重渲染。
   *
   * @param path - 要通知的字段路径标识
   */
  private notifyField(path: string): void {
    this.bumpFieldVersion(path);
    const listeners = this.fieldListeners.get(path);
    if (listeners) {
      for (const listener of listeners) {
        listener();
      }
    }
  }

  /**
   * 通知所有全局监听器（表单任意变化时触发）
   */
  private notifyAll(): void {
    for (const listener of this.globalListeners) {
      listener();
    }
  }

  /**
   * 递增版本计数器
   *
   * 用于 useSyncExternalStore 的快照比对
   */
  private bump(): void {
    this.version++;
  }
}

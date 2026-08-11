// ============================================================================
// NexusField - React 渲染层
// ============================================================================
// 本文件实现了表单的React渲染引擎，负责：
// - 消费Engine的RenderTree + FieldState数据
// - 根据schema渲染表单字段
// - 使用useSyncExternalStore实现精准订阅
// - 提供FormController作为API层
// ============================================================================

import type {
  FieldState,
  NexusFormInstance,
  NexusSchema,
  RenderLayoutNode,
  RenderObjectNode,
  RenderTreeNode,
} from '@nexus/form-engine';
import { NexusEngine } from '@nexus/form-engine';
import {
  type CSSProperties,
  createContext,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type SubmitEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

// ────────────────────────────────────────────────────────────────────────────
// Form 布局配置
// ────────────────────────────────────────────────────────────────────────────

export interface NexusFormConfig {
  /** label 列配置（由 ui 层 Form.Item 消费） */
  labelCol?: Record<string, unknown>;
  /** label 宽度（px 或 %），快捷方式 — 映射到 labelCol.style.width */
  labelWidth?: number | string;
  /** 是否显示冒号 */
  colon?: boolean | ReactNode;
  /** 是否显示 label（默认 true） */
  label?: boolean;
  /** 表单布局方向 */
  displayType?: 'row' | 'column' | 'inline';
  /** 整个表单只读，所有字段以文本展示 */
  readOnly?: boolean;
  /** 表单每行显示多少列 */
  column?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

interface NexusContextValue {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
}

const NexusContext = createContext<NexusContextValue | null>(null);

// 子项未显式设置 colSpan 时使用此默认值
export interface GridContextValue {
  /** 当前 grid 的列数（tailwind colSpan 基准） */
  column: number;
}
export const GridContext = createContext<GridContextValue | null>(null);

interface LayoutConfigContextValue {
  removeHidden?: boolean;
}
export const LayoutConfigContext = createContext<LayoutConfigContextValue>({});

function useNexusContext(): NexusContextValue {
  const ctx = useContext(NexusContext);
  if (!ctx) {
    throw new Error('[NexusField] Must be used within <NexusFormProvider>');
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────────────

interface NexusFormProviderProps {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
  children: ReactNode;
}

export function NexusFormProvider({
  engine,
  config,
  form,
  children,
}: NexusFormProviderProps) {
  const value = useMemo(
    () => ({ engine, config, form }),
    [engine, config, form],
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// resolveColSpan — 统一解析子项在父 Grid 中的跨列数
// ────────────────────────────────────────────────────────────────────────────
function resolveColSpan(
  colSpan: number | undefined,
  gridCtx: GridContextValue | null,
): number | undefined {
  if (colSpan !== undefined) {
    return colSpan;
  }

  // 在 grid 容器内：把 24 栅格语义缩放到当前 column
  if (gridCtx && gridCtx.column > 0) {
    return Math.max(1, Math.round(gridCtx.column / 24));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// useFieldState — 精准订阅单个字段
// ────────────────────────────────────────────────────────────────────────────

export function useFieldState(path: string): FieldState | undefined {
  const { engine } = useNexusContext();

  // 按路径精准订阅：只在该字段版本变化时触发重渲染，避免全局订阅拖垮表单
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => engine.getFieldVersion(path),
  );

  return engine.getFieldState(path);
}

// ────────────────────────────────────────────────────────────────────────────
// useFormConfig — 获取表单布局配置
// ────────────────────────────────────────────────────────────────────────────

export function useFormConfig(): NexusFormConfig {
  const { config } = useNexusContext();
  return config;
}

// ────────────────────────────────────────────────────────────────────────────
// NexusField — 单个字段渲染器
// ────────────────────────────────────────────────────────────────────────────

interface NexusFieldProps {
  dataPath: string;
  layoutKey: string;
}

export function NexusField({
  dataPath,
  layoutKey,
}: NexusFieldProps & { node?: RenderTreeNode }) {
  const { engine, config, form } = useNexusContext();
  // 按路径精准订阅：仅该字段版本变化时重渲染（reaction 影响其他字段不会触发本组件）
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(dataPath, onStoreChange),
    () => engine.getFieldVersion(dataPath),
  );
  const state = engine.getFieldState(dataPath);
  // GridContext 必须在所有 early return 之前调用，否则会破坏 Hooks 调用顺序
  const gridCtx = useContext(GridContext);
  const layoutConfig = useContext(LayoutConfigContext);

  const handleChange = useCallback(
    (value: unknown) => {
      engine.setFieldValue(dataPath, value);
    },
    [engine, dataPath],
  );

  // 失焦触发 blur 规则校验（trigger: 'blur'）：
  // React onBlur 冒泡（focusout 语义），包裹层统一处理内部控件失焦；
  // 焦点仍在字段内部（如 dateRange 双输入框间切换）时跳过。
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      engine.validateField(dataPath, { trigger: 'blur' });
    },
    [engine, dataPath],
  );

  if (!state) {
    // 仅当引擎已初始化（version > 0）但字段仍未找到时才发出警告
    // 初始化过程中的短暂空状态不应报警
    if (engine.getSnapshot() > 0) {
      console.warn(`[NexusField] Field not found: ${dataPath}`);
    }
    return null;
  }

  if (!state.visible) {
    // 如果父布局节点配置了 removeHidden，则不渲染占位符（移除以防止栅格塌陷）
    if (layoutConfig.removeHidden === true) {
      return null;
    }
    // 默认行为：渲染 display:none 占位符以保持布局
    return <div style={{ display: 'none' }} data-nexus-hidden={dataPath} />;
  }

  /** 获取UI组件库 进行渲染 **/
  const Widget = engine.getWidget(state.meta.widget);

  if (!Widget) {
    return (
      <div style={{ color: 'red', fontSize: 12 }} data-nexus-field={dataPath}>
        ⚠️ Widget "{state.meta.widget}" 未注册 (path: {dataPath})
      </div>
    );
  }

  // 从 enum + enumNames 构建选项（x-render 对齐）
  const options = state.meta.enum
    ? state.meta.enum.map((value, index) => ({
        value,
        label: state.meta.enumNames?.[index] ?? String(value),
      }))
    : (state.props.options as
        | Array<{ label: string; value: unknown } | string | number>
        | undefined);

  // 表单级 readOnly 与字段级 readOnly 合并
  const readOnly = config.readOnly || state.readOnly;

  // 字段级配置优先于表单级配置
  const fieldDisplayType = state.meta.displayType ?? config.displayType;
  const fieldLabelWidth = state.meta.labelWidth ?? config.labelWidth;
  const fieldColumn = state.meta.column ?? config.column;

  // 布局属性作用于 NexusField 包装层而非 DOM 控件
  // - column（fieldColumn）：字段内部子元素分列数（如 checkboxes/radio），传给 Widget
  // - colSpan：在父 Grid 中横跨多少列（tailwind 风格：gridColumn: span N）
  // - width：在父 Flex 布局中自身宽度（百分比或固定值），flexShrink:0 防压缩
  const effectiveColSpan = resolveColSpan(state.meta.colSpan, gridCtx);
  const wrapperStyle: CSSProperties = {
    ...(state.meta.width ? { width: state.meta.width, flexShrink: 0 } : {}),
    ...(effectiveColSpan ? { gridColumn: `span ${effectiveColSpan}` } : {}),
  };

  // 从 reactions 依赖构建 dependValues，供 widget 获取关联字段值
  const dependValues: Record<string, unknown> = {};
  if (state.reactions) {
    for (const reaction of state.reactions) {
      if (reaction.dependencies) {
        for (const dep of reaction.dependencies) {
          dependValues[dep] = engine.getFieldValue(dep);
        }
      }
    }
  }

  return (
    <div
      data-nexus-field={dataPath}
      onBlur={handleBlur}
      style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
    >
      <Widget
        key={layoutKey}
        value={state.value}
        onChange={handleChange}
        disabled={state.disabled}
        readOnly={readOnly}
        loading={state.loading}
        required={state.required}
        title={state.meta.title}
        description={state.meta.description}
        placeholder={state.meta.placeholder}
        options={options}
        errors={state.errors}
        extra={state.meta.extra}
        displayType={fieldDisplayType}
        labelWidth={fieldLabelWidth}
        column={fieldColumn}
        form={form}
        dependValues={dependValues}
        items={state.meta.items}
        {...state.props}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// renderTreeNode — 递归渲染
// ────────────────────────────────────────────────────────────────────────────

function renderTreeNode(node: RenderTreeNode, index: number): ReactElement {
  if (node.type === 'field') {
    return (
      <NexusField
        key={node.layoutKey || node.dataPath}
        dataPath={node.dataPath}
        layoutKey={node.layoutKey}
        node={node}
      />
    );
  }
  if (node.type === 'object') {
    return (
      <NexusObject key={`object-${node.layoutKey}-${index}`} node={node} />
    );
  }
  return <NexusLayout key={`layout-${node.type}-${index}`} node={node} />;
}

// ────────────────────────────────────────────────────────────────────────────
// NexusObject — 数据对象容器
// ────────────────────────────────────────────────────────────────────────────

interface NexusObjectProps {
  node: RenderObjectNode;
}

export function NexusObject({ node }: NexusObjectProps) {
  const { config } = useNexusContext();
  const column = config.column ?? 1;
  const gridStyle: CSSProperties =
    column > 1
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${column}, 1fr)`,
          gap: '0 16px',
        }
      : {};

  return (
    <div
      data-nexus-object={node.dataPath}
      style={{ marginBottom: 16, width: '100%', ...gridStyle }}
    >
      {node.title && (
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{node.title}</div>
      )}
      {node.children.map((child, index) => renderTreeNode(child, index))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NexusLayout — 布局容器渲染器
// ────────────────────────────────────────────────────────────────────────────

interface NexusLayoutProps {
  node: RenderLayoutNode;
}

export function NexusLayout({ node }: NexusLayoutProps) {
  const { engine } = useNexusContext();

  const LayoutComponent = engine.getLayout(node.type);

  const children = node.children.map((child, index) =>
    renderTreeNode(child, index),
  );

  // 布局容器在父 Grid/Flex 中的跨列/宽度（与 NexusField wrapper 一致）
  const gridCtx = useContext(GridContext);
  const effectiveColSpan = resolveColSpan(node.props.colSpan, gridCtx);
  const wrapperStyle: CSSProperties = {
    ...(effectiveColSpan ? { gridColumn: `span ${effectiveColSpan}` } : {}),
    ...(node.props.width ? { width: node.props.width, flexShrink: 0 } : {}),
  };

  const layoutConfigValue = useMemo<LayoutConfigContextValue>(
    () => ({ removeHidden: node.props.removeHidden }),
    [node.props.removeHidden],
  );

  if (!LayoutComponent) {
    return (
      <LayoutConfigContext.Provider value={layoutConfigValue}>
        <div
          data-nexus-layout={node.type}
          style={{ marginBottom: 16, ...wrapperStyle }}
        >
          {node.title && (
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {node.title}
            </div>
          )}
          {children}
        </div>
      </LayoutConfigContext.Provider>
    );
  }

  // 剥离布局配置属性（displayType / labelWidth / colSpan / width 是布局配置，
  // 不应透传到布局组件的 DOM 元素，否则触发 React unknown prop 警告）
  const {
    displayType: _dt,
    labelWidth: _lw,
    colSpan: _csp,
    width: _w,
    ...layoutProps
  } = node.props;

  return (
    <LayoutConfigContext.Provider value={layoutConfigValue}>
      <div
        style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
      >
        <LayoutComponent {...layoutProps} node={node} title={node.title}>
          {children}
        </LayoutComponent>
      </div>
    </LayoutConfigContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FormController — 包裹 Engine，暴露 Form 实例 API
// ────────────────────────────────────────────────────────────────────────────

export class FormController implements NexusFormInstance {
  private engine: NexusEngine;
  private formElementRef: RefObject<HTMLFormElement | null>;
  /** 稳定的 getter：每次 submit 执行时从外部 ref 读取最新的 onFinish/onFinishFailed 回调 */
  private getOnFinish: () => (
    data: Record<string, unknown>,
  ) => void | Promise<void>;
  private getOnFinishFailed: () => (errors: Map<string, string[]>) => void;
  private removeHiddenData: boolean = true;
  private watchers: Map<
    string,
    (value: unknown, allValues: Record<string, unknown>) => void
  > = new Map();
  private globalWatcher:
    | ((value: unknown, allValues: Record<string, unknown>) => void)
    | null = null;

  constructor(engine?: NexusEngine) {
    this.engine = engine ?? new NexusEngine();
    this.formElementRef = {
      current: null,
    } as RefObject<HTMLFormElement | null>;
    this.getOnFinish = () => () => {};
    this.getOnFinishFailed = () => () => {};
  }

  /** 内部：首次绑定表单 DOM + 回调 getter（由 NexusForm 在挂载时调用一次） */
  _bind(
    formEl: HTMLFormElement | null,
    getOnFinish: () => (data: Record<string, unknown>) => void | Promise<void>,
    getOnFinishFailed: () => (errors: Map<string, string[]>) => void,
  ): void {
    (this.formElementRef as { current: HTMLFormElement | null }).current =
      formEl;
    this.getOnFinish = getOnFinish;
    this.getOnFinishFailed = getOnFinishFailed;
    // 注册值变更回调到 Engine，只需一次（回调闭包引用了稳定的实例）
    this.engine.registerOnFieldValueChange((path, value) =>
      this._onFieldValueChange(path, value),
    );
  }

  /** 内部：同步 watch / removeHiddenData 配置（由 NexusForm 在它们变化时调用） */
  _syncConfig(config: {
    removeHiddenData?: boolean;
    watch?: {
      [path: string]: (
        value: unknown,
        allValues: Record<string, unknown>,
      ) => void;
    };
  }): void {
    if (config.removeHiddenData !== undefined) {
      this.removeHiddenData = config.removeHiddenData;
    }
    if (config.watch) {
      this.watchers.clear();
      this.globalWatcher = null;
      for (const [path, fn] of Object.entries(config.watch)) {
        if (path === '#') {
          this.globalWatcher = fn;
        } else {
          this.watchers.set(path, fn);
        }
      }
    }
  }

  /** 内部：值变更时调用（由 Engine 通知） */
  _onFieldValueChange(path: string, value: unknown): void {
    const allValues = this.engine.getFormData();
    const globalData = this.removeHiddenData
      ? allValues
      : this.engine.getAllFormData();

    // 全局 watcher（# 监听所有字段变化，value 即为全部表单值）
    if (this.globalWatcher) {
      this.globalWatcher(globalData, globalData);
    }
    // 路径匹配的 watcher
    const fn = this.watchers.get(path);
    if (fn) {
      fn(value, globalData);
    }
  }

  /** 内部：获取 Engine 实例 */
  _getEngine(): NexusEngine {
    return this.engine;
  }

  async submit(): Promise<void> {
    const errors = await this.engine.validate();
    if (errors.size > 0) {
      this.focusFirstError(errors);
      this.getOnFinishFailed()?.(errors);
      return;
    }
    const formData = this.removeHiddenData
      ? this.engine.getFormData()
      : this.engine.getAllFormData();
    await this.getOnFinish()?.(formData);
  }

  /**
   * 定位到第一个校验失败的字段：按 DOM 渲染顺序查找（保证视觉上的“第一个”），
   * 滚动入视并聚焦其内部可交互控件。
   */
  private focusFirstError(errors: Map<string, string[]>): void {
    const formEl = this.formElementRef.current;
    if (!formEl || errors.size === 0) {
      return;
    }

    const errorPaths = new Set(errors.keys());

    const focus = () => {
      const fieldEls =
        formEl.querySelectorAll<HTMLElement>('[data-nexus-field]');
      for (const el of Array.from(fieldEls)) {
        const path = el.getAttribute('data-nexus-field');
        if (!path || !errorPaths.has(path)) {
          continue;
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
        return;
      }
    };

    // 等待 React 将错误态刷到 DOM 后再定位，保证错误提示已可见
    requestAnimationFrame(focus);
  }

  resetFields(): void {
    this.engine.reset();
  }

  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void {
    this.engine.setErrorFields(errors);
  }

  setValues(values: Record<string, unknown>): void {
    this.engine.setFieldValues(values);
  }

  setValueByPath(path: string, value: unknown): void {
    this.engine.setFieldValue(path, value);
  }

  setSchemaByPath(path: string, patch: Record<string, unknown>): void {
    this.engine.setSchemaByPath(path, patch);
  }

  setSchema(schema: NexusSchema): void {
    this.engine.setSchema(schema);
  }

  getValues(paths?: string[]): Record<string, unknown> {
    return this.engine.getFormData(paths);
  }

  getHiddenValues(): Record<string, unknown> {
    return this.engine.getHiddenValues();
  }

  /** 获取所有字段值（含 hidden） */
  getAllValues(): Record<string, unknown> {
    return this.engine.getAllFormData();
  }

  getValueByPath(path: string): unknown {
    return this.engine.getFieldValue(path);
  }

  /**
   * 注册字段校验逻辑
   * @param path 字段路径（如 'username'）
   * @param validator 校验函数，返回错误消息数组（空数组表示通过）
   */
  registerValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void {
    // 注册到 Engine（validate 与 实时校验 统一由 Engine 执行）
    this.engine.registerFieldValidator(path, validator);
  }

  getSchema(): NexusSchema | null {
    return this.engine.getSchema();
  }

  removeErrorField(path: string): void {
    this.engine.removeErrorField(path);
  }

  scrollToPath(path: string): void {
    const el = this.formElementRef.current?.querySelector(
      `[data-nexus-field="${path}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getFieldError(path: string): string[] {
    return this.engine.getFieldError(path);
  }

  getFieldsError(): Map<string, string[]> {
    return this.engine.getFieldsError();
  }

  validateFields(paths?: string[]): Promise<Map<string, string[]>> {
    return this.engine.validate(paths);
  }

  getFieldState(path: string): FieldState | undefined {
    return this.engine.getFieldState(path);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// useForm — 创建 Form 实例
// ────────────────────────────────────────────────────────────────────────────

export function useForm(engine?: NexusEngine): [FormController] {
  const formRef = useRef<FormController | null>(null);
  if (!formRef.current) {
    formRef.current = new FormController(engine);
  }
  return [formRef.current];
}

// ────────────────────────────────────────────────────────────────────────────
// NexusForm — 顶层表单组件
// ────────────────────────────────────────────────────────────────────────────

interface NexusFormProps {
  /** Form 实例，由 useForm() 创建 */
  form: FormController;
  /** Schema 定义 */
  schema?: NexusSchema;
  /** 初始值 */
  initialValues?: Record<string, unknown>;
  /** 额外注册的 widget（与已注册的合并） */
  widgets?: Record<string, (props: any) => ReactNode>;
  /** 额外注册的 layout */
  layouts?: Record<string, (props: any) => ReactNode>;
  /** 提交成功回调 */
  onFinish?: (formData: Record<string, unknown>) => void | Promise<void>;
  /** 校验失败回调 */
  onFinishFailed?: (errors: Map<string, string[]>) => void;
  /** 是否显示默认 footer（提交/重置按钮），或自定义 footer */
  footer?: boolean | ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 子节点 */
  children?: ReactNode;
  /**
   * 表单值变化监听
   * - key 为字段路径（如 'username'），值为回调函数
   * - 使用 '#' 作为 key 可监听所有字段变化
   * - 回调参数为 (value, allValues)
   */
  watch?: {
    [path: string]: (
      value: unknown,
      allValues: Record<string, unknown>,
    ) => void;
  };
  /**
   * 提交时是否移除 hidden 字段数据，默认 true
   * - true: submit/getValues 不包含 hidden 字段
   * - false: submit/getValues 包含所有字段（含 hidden）
   */
  removeHiddenData?: boolean;

  // ── 表单布局配置 ──────────────────────────────────────────────────────
  /** label 列配置（由 ui 层 Form.Item 消费） */
  labelCol?: Record<string, unknown>;
  /** label 宽度（px 或 %），快捷方式 — 映射到 labelCol.style.width */
  labelWidth?: number | string;
  /** 是否显示冒号 */
  colon?: boolean | ReactNode;
  /** 是否显示 label（默认 true） */
  label?: boolean;
  /** 表单布局方向：'row' = horizontal, 'column' = vertical, 'inline' = inline */
  displayType?: 'row' | 'column' | 'inline';
  /** 整个表单只读，所有字段以文本展示 */
  readOnly?: boolean;
  /** 表单每行显示多少列 */
  column?: number;
}

function noop() {}

export function NexusForm({
  form,
  schema,
  initialValues,
  widgets,
  layouts,
  onFinish,
  onFinishFailed,
  footer = false,
  className,
  style,
  children,
  labelCol,
  labelWidth,
  colon,
  label,
  displayType,
  readOnly,
  column,
  watch,
  removeHiddenData = true,
}: NexusFormProps) {
  const engine = form._getEngine();
  const formElRef = useRef<HTMLFormElement | null>(null);

  // Schema 顶层配置作为默认值，props 优先级更高
  const finalDisplayType = displayType ?? schema?.displayType ?? 'row';
  const finalLabel = label ?? schema?.label ?? true;
  const finalColon = colon ?? schema?.colon;
  const finalLabelWidth = labelWidth ?? schema?.labelWidth;
  const finalReadOnly = readOnly ?? schema?.readOnly ?? false;
  const finalColumn = column ?? schema?.column;

  // 注册额外 widgets / layouts（仅首次或引用变化时）
  useEffect(() => {
    if (widgets) {
      engine.registerWidgets(widgets);
    }
    if (layouts) {
      engine.registerLayouts(layouts);
    }
  }, [engine, widgets, layouts]);

  // schema 变化时重新初始化
  // 注意：initialValues 仅在首次挂载时使用，避免每次渲染都 re-init 导致
  // 已有的 errors / 用户输入被重置。后续需要更新值请使用 form.setValues()。
  const isFirstInitRef = useRef(true);
  const initialValuesRef = useRef(initialValues);
  useEffect(() => {
    if (!schema) {
      return;
    }
    if (isFirstInitRef.current) {
      engine.init(schema, initialValuesRef.current);
      isFirstInitRef.current = false;
    } else {
      // schema 变化：保留当前已填数据，而非重置为 initialValues
      engine.init(schema, engine.getFormData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, schema]);

  // 绑定 form controller
  // 使用 ref 持有 onFinish / onFinishFailed，避免每次 re-render 都造成绑定逻辑重复执行
  const onFinishRef =
    useRef<(data: Record<string, unknown>) => void | Promise<void>>(noop);
  const onFinishFailedRef =
    useRef<(errors: Map<string, string[]>) => void>(noop);
  onFinishRef.current = onFinish ?? noop;
  onFinishFailedRef.current = onFinishFailed ?? noop;

  // 只在挂载时绑定一次：传入「稳定的 getter」，让 FormController 在 submit 时读取最新回调
  useEffect(() => {
    form._bind(
      formElRef.current,
      () => onFinishRef.current,
      () => onFinishFailedRef.current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // watch / removeHiddenData 变化时单独同步（不重置其他绑定）
  useEffect(() => {
    form._syncConfig({ removeHiddenData, watch });
  }, [form, removeHiddenData, watch]);

  const _version = useSyncExternalStore(
    engine.subscribeStore,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  // 依赖 _version：engine.init() / setSchema() 会 bump version，
  // 需要在此后重新读取 renderTree（首次渲染时 engine 尚未 init，renderTree 为空）
  const renderTree = useMemo(() => engine.getRenderTree(), [engine, _version]);

  const handleSubmit = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      await form.submit();
    },
    [form],
  );

  const handleReset = useCallback(() => {
    form.resetFields();
  }, [form]);

  // footer 渲染
  let footerNode: ReactNode = null;
  if (footer === true) {
    footerNode = (
      <div style={{ marginTop: 16 }}>
        <button type='submit'>提交</button>{' '}
        <button type='button' onClick={handleReset}>
          重置
        </button>
      </div>
    );
  } else if (footer) {
    footerNode = footer;
  }

  // labelCol: 合并 labelWidth 快捷方式
  const mergedLabelCol = useMemo(() => {
    if (labelCol) {
      return labelCol;
    }
    if (finalLabelWidth) {
      return {
        style: {
          width:
            typeof finalLabelWidth === 'number'
              ? `${finalLabelWidth}px`
              : finalLabelWidth,
        },
      };
    }
    return undefined;
  }, [labelCol, finalLabelWidth]);

  // NexusFormConfig 传递给 Context（由 ui 层消费，自行实现布局）
  const formConfig = useMemo<NexusFormConfig>(
    () => ({
      labelCol: mergedLabelCol,
      labelWidth: finalLabelWidth,
      colon: finalColon,
      label: finalLabel,
      displayType: finalDisplayType,
      readOnly: finalReadOnly,
      column: finalColumn,
    }),
    [
      mergedLabelCol,
      finalLabelWidth,
      finalColon,
      finalLabel,
      finalDisplayType,
      finalReadOnly,
      finalColumn,
    ],
  );

  return (
    <NexusFormProvider engine={engine} config={formConfig} form={form}>
      <form
        ref={formElRef}
        onSubmit={handleSubmit}
        className={className}
        style={{
          ...style,
          // 当配置了 column 时，使用 CSS Grid 布局
          ...(finalColumn && finalColumn > 1
            ? {
                display: 'grid',
                gridTemplateColumns: `repeat(${finalColumn}, 1fr)`,
                gap: '0 16px',
              }
            : {}),
        }}
        noValidate
      >
        {renderTree.map((node, index) => renderTreeNode(node, index))}
        {!readOnly && footerNode}
        {children}
      </form>
    </NexusFormProvider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hooks 导出
// ────────────────────────────────────────────────────────────────────────────

export function useEngine(): NexusEngine {
  const { engine } = useNexusContext();
  return engine;
}

export function useFormData(): Record<string, unknown> {
  const engine = useEngine();
  // 用 version 作为快照依赖，避免 getFormData() 每次返回新对象引用导致的无谓重渲染
  const _version = useSyncExternalStore(
    engine.subscribeStore,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  return useMemo(() => engine.getFormData(), [engine, _version]);
}

export function useFieldValue<T = unknown>(path: string): T | undefined {
  const engine = useEngine();
  // 按路径精准订阅：仅该字段版本变化时重渲染
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => engine.getFieldVersion(path),
  );
  return engine.getFieldValue(path) as T | undefined;
}

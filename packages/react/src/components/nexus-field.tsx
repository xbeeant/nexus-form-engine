import type { FieldHooks } from '@xbeeant/form-engine';
import type { CSSProperties, FocusEvent, ReactElement, ReactNode } from 'react';
import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { FieldInheritContext } from '../contexts/field-inherit-context';
import { GridContext } from '../contexts/grid-context';
import { LayoutConfigContext } from '../contexts/layout-config-context';
import { useNexusContext } from '../contexts/nexus-context';
import { buildWidgetProps } from '../utils/build-widget-props';
import { reactNodeFromString } from '../utils/react-node-from-string';
import { resolveGridSpan } from '../utils/resolve-grid-span';

interface NexusFieldProps {
  dataPath: string;
  layoutKey: string;
}

// ────────────────────────────────────────────────────────────────────────────
// NexusAddons — x-render addons 对齐
// 为 widget 组件提供统一的表单数据访问、校验、Schema 操作入口，
// 对齐 x-render 自定义组件的 addons API
// ────────────────────────────────────────────────────────────────────────────

export interface NexusAddons {
  /** 表单全部可见数据 */
  formData: Record<string, unknown>;
  /** 根级表单数据（与 formData 等价，x-render 对齐） */
  rootValue: Record<string, unknown>;
  /** 当前字段值 */
  value: unknown;
  /** 当前字段路径 */
  dataPath: string;
  /** 当前字段路径（dataPath 别名） */
  path: string;
  /** 数组项索引（字段在数组内时有值） */
  index?: number;
  /** 父级值（数组项→父数组，对象字段→父对象） */
  parentValues?: unknown;
  /** 依赖字段的实时值映射（key 为字段路径，value 为字段值），x-render dependValues 对齐 */
  dependValues?: Record<string, unknown>;
  /** 按路径取值 */
  getValue(path: string): unknown;

  /** 按路径列表取值（getValues 别名，x-render getFieldsValue 对齐） */
  getFieldsValue(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown>;
  /** 获取 hidden 字段的值 */
  getHiddenValues(): Record<string, unknown>;
  /** 按路径列表取值 */
  getValues(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown>;
  /** 按路径设值 */
  setValue(path: string, value: unknown): void;
  /** 按路径设值（x-render 别名） */
  onItemChange(path: string, value: unknown): void;
  /** 校验单个/全部字段 */
  validate(path?: string): Promise<void>;
  /** 校验多个字段 */
  validateFields(paths?: string[]): Promise<void>;
  /** 触发提交 */
  submit(): Promise<void>;
  /** 重置表单 */
  resetFields(): void;
  /** 替换 Schema */
  setSchema(schema: Record<string, unknown>): void;
  /** 按路径更新 Schema */
  setSchemaByPath(path: string, patch: Record<string, unknown>): void;
  /** 获取 Schema */
  getSchema(): Record<string, unknown> | null;
}

/**
 * 构建字段级事件钩子的执行上下文（P2-D）
 *
 * 复用 FormController 的公开 API（getValues / setValueByPath / validate 等），
 * 与 addons 保持一致；setValue 一律走引擎 setFieldValue（含实时重校验 + 联动传播）。
 */
function useFieldHookRunner(
  hooks: FieldHooks | undefined,
  form: any,
  engine: any,
  dataPath: string,
) {
  return useCallback(
    (event: keyof FieldHooks, value: unknown, oldValue?: unknown) => {
      const hook = hooks?.[event];
      if (typeof hook !== 'function') {
        return;
      }
      const engineRef = engine;
      hook({
        dataPath,
        value,
        oldValue,
        formData: form.getValues(),
        getValue: (path: string) => form.getValueByPath(path),
        setValue: (path: string, v: unknown) =>
          engineRef.setFieldValue(path, v),
        setState: (path: string, patch: Record<string, unknown>) =>
          engineRef.setFieldState(path, patch),
        form: {
          ...engineRef,
          setFieldValue: (path: string, v: unknown) =>
            engineRef.setFieldValue(path, v),
          setFieldState: (path: string, patch: Record<string, unknown>) =>
            engineRef.setFieldState(path, patch),
        },
      });
    },
    [hooks, form, engine, dataPath],
  );
}

/**
 * NexusField — 单个字段渲染器
 */
export function NexusField({ dataPath, layoutKey }: NexusFieldProps) {
  const { engine, config, form } = useNexusContext();
  // 按路径精准订阅：仅该字段版本变化时重渲染（reaction 影响其他字段不会触发本组件）
  // 第三个参数 getServerSnapshot 与 getSnapshot 一致（引擎状态同步，SSR 必需）
  const fieldVersion = useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(dataPath, onStoreChange),
    () => engine.getFieldVersion(dataPath),
    () => engine.getFieldVersion(dataPath),
  );
  const state = engine.getFieldState(dataPath);
  // GridContext 必须在所有 early return 之前调用，否则会破坏 Hooks 调用顺序
  const gridCtx = useContext(GridContext);
  const layoutConfig = useContext(LayoutConfigContext);
  // 祖先对象容器（NexusObject）下发的继承属性：visible=false 时子树整体隐藏
  const inherit = useContext(FieldInheritContext);

  // 字段级事件钩子（P2-D）：onChange / onBlur / onFocus，仅在对应事件触发时执行
  const runFieldHook = useFieldHookRunner(
    state?.meta.hooks,
    form,
    engine,
    dataPath,
  );

  const handleChange = useCallback(
    (value: unknown) => {
      // 变更前旧值（钩子接收；setFieldValue 会覆盖 state.value）
      const oldValue = engine.getFieldValue(dataPath);
      engine.setFieldValue(dataPath, value);
      runFieldHook('onChange', value, oldValue);
    },
    [engine, dataPath, runFieldHook],
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
      runFieldHook('onBlur', engine.getFieldValue(dataPath));
    },
    [engine, dataPath, runFieldHook],
  );

  // 字段聚焦时触发 onFocus 钩子（冒泡语义：内部控件聚焦即触发）
  const handleFocus = useCallback(() => {
    runFieldHook('onFocus', engine.getFieldValue(dataPath));
  }, [engine, dataPath, runFieldHook]);

  // 从 enum + enumNames 构建选项（x-render 对齐）。
  // meta/props 引用在状态更新时保持稳定，useMemo 避免每次渲染重建数组（破坏子组件 memo）。
  // 必须在所有 early return 之前调用（Hooks 顺序规则），state 未定义时安全降级。
  // enum/enumNames 可为 ExpressionOr（{{ }} 表达式，P2-C），此处归一为数组安全构建；
  // props.options 仅接受数组（表达式/原始值防泄漏：core 层已求值，此处兜底剔除异常值）。
  const options = useMemo(() => {
    const enumValues = Array.isArray(state?.meta.enum)
      ? (state?.meta.enum as Array<string | number>)
      : undefined;
    if (enumValues) {
      return enumValues.map((value, index) => ({
        value,
        label: Array.isArray(state?.meta.enumNames)
          ? (state.meta.enumNames[index] ?? String(value))
          : String(value),
      }));
    }
    const propsOptions = state?.props.options;
    return Array.isArray(propsOptions)
      ? (propsOptions as
          | Array<{ label: string; value: unknown } | string | number>
          | undefined)
      : undefined;
  }, [state?.meta.enum, state?.meta.enumNames, state?.props.options]);

  // 从 reactions 依赖构建 dependValues，供 widget 获取关联字段值。
  // reactions 引用稳定，值在 memo 执行时读取；避免每次渲染新建对象。
  // fieldVersion 作为依赖：依赖字段更新触发本字段 reaction（notifyField → 版本+1）
  // 后重算，保证 widget 拿到的是依赖字段的最新（已计算）值，而非首次渲染的旧快照。
  const dependValues = useMemo(() => {
    // 显式消费 fieldVersion：字段版本变化时强制重算 getFieldValue 快照。
    // reaction 数组引用稳定，deps 无法捕获依赖字段值的更新；不依赖版本号将返回
    // 首次渲染的旧 dependValues（staleness）。void 使该依赖被显式声明。
    void fieldVersion;
    const values: Record<string, unknown> = {};
    if (state?.reactions) {
      for (const reaction of state.reactions) {
        if (reaction.dependencies) {
          for (const dep of reaction.dependencies) {
            values[dep] = engine.getFieldValue(dep);
          }
        }
      }
    }
    return values;
  }, [state?.reactions, engine, fieldVersion]);

  // x-render addons 由 buildWidgetProps 统一构造，此处仅需计算 addon 依赖的值
  const arrayPath = state?.meta.itemOf;
  const isItemField = !!arrayPath;
  const indexMatch = isItemField ? dataPath.match(/\[(\d+)\]/) : undefined;
  const index = indexMatch ? Number(indexMatch[1]) : undefined;

  if (!state) {
    // 仅当引擎已初始化（version > 0）但字段仍未找到时才发出警告
    // 初始化过程中的短暂空状态不应报警
    if (engine.getSnapshot() > 0) {
      console.warn(`[NexusField] Field not found: ${dataPath}`);
    }
    return null;
  }

  // formily display 三态：'none' 不渲染（无占位符），但值仍参与收集与提交
  if (state.display === 'none') {
    return null;
  }

  // 祖先对象容器隐藏 → 子树整体不可见（与字段自身 visible 合并判断）
  if (inherit.visible === false || !state.visible) {
    // 如果父布局节点配置了 removeHidden，则不渲染占位符（移除以防止栅格塌陷）
    if (layoutConfig.removeHidden === true) {
      return null;
    }
    // 默认行为：渲染 display:none 占位符以保持布局
    return <div className='hidden' data-nexus-hidden={dataPath} />;
  }

  const readOnly =
    config.readOnly || inherit.readOnly === true || state.readOnly;
  // 对象容器继承 disabled（父级激活时优先），与字段级 disabled 合并
  const disabled = inherit.disabled === true || state.disabled;

  // readOnlyWidget：指定 readOnly 生效时切换使用的渲染 widget（x-render readOnlyWidget 对齐）。
  // - 配置了 readOnlyWidget 且字段为只读时，切换渲染该 widget（readOnly 一并透传，
  //   widget 按自身逻辑决定只读展示形态，如 treeSelect 的 readOnly 回显）；
  // - 未配置时 readOnly 原样透传给 widget，由 widget 自身决定只读形态
  //   （antd 原生 readOnly，或内置 widget 的 ReadOnlyDisplay 文本回退）。
  // - type:"string" 未显式声明 widget 时，readOnly 模式降级为 html 渲染
  //   （支持富文本/HTML 内容展示，避免 input 只读态的纯文本局限）。
  const wantReadOnlyWidget =
    readOnly &&
    (!!state.meta.readOnlyWidget ||
      (state.meta.widget === 'input' &&
        (state.meta.schema as Record<string, unknown> | undefined)?.type ===
          'string' &&
        !(state.meta.schema as Record<string, unknown> | undefined)?.widget));
  const widgetName = wantReadOnlyWidget
    ? (state.meta.readOnlyWidget ?? 'html')
    : state.meta.widget;
  /** 获取已注册的 UI 组件库进行渲染 */
  let Widget = engine.getWidget(widgetName);
  // readOnlyWidget 未注册时优雅降级：退回原 widget，沿用现有只读渲染方式
  if (!Widget && wantReadOnlyWidget) {
    Widget = engine.getWidget(state.meta.widget);
  }

  if (!Widget) {
    return (
      <div className='text-xs text-red-500' data-nexus-field={dataPath}>
        ⚠️ Widget "{state.meta.widget}" 未注册 (path: {dataPath})
      </div>
    );
  }

  // 字段级配置优先于表单级配置
  const fieldDisplayType = state.meta.displayType ?? config.displayType;
  const fieldLabelWidth = state.meta.labelWidth ?? config.labelWidth;
  const fieldColumn = state.meta.column ?? config.column;

  // 布局属性作用于 NexusField 包装层而非 DOM 控件：
  // - width（state.meta.width）：字段在整个表单 24 栅格中的宽度占比（如 '50%'）
  //   - 在 24 栅格容器内换算为 gridColumn: span（见 resolveGridSpan）
  //   - 在 Flex 等非栅格容器中字面生效（width + flexShrink:0 防压缩）
  // - colSpan：在父 Grid 中横跨多少 24 栅格（gridColumn: span N，优先级高于 width）
  // - column（fieldColumn）：字段内部子元素分列数（如 checkboxes/radio），传给 Widget
  // 嵌入方（如设计器画布）通过 LayoutConfigContext.suppressFieldItemLayout
  // 声明布局项样式由其外层容器承接时，包装层不再重复应用（避免二次收缩）
  const effectiveSpan = resolveGridSpan(
    state.meta.width,
    state.meta.colSpan,
    gridCtx,
  );
  const wrapperStyle: CSSProperties = layoutConfig.suppressFieldItemLayout
    ? {}
    : {
        // 栅格容器内 width 已换算为 span，避免字面 width 与 track 双重收缩；
        // 非栅格（如 Flex / inline 流式）场景回到字面 width 生效
        ...(state.meta.width && effectiveSpan === undefined
          ? { width: state.meta.width, flexShrink: 0 }
          : {}),
        ...(effectiveSpan ? { gridColumn: `span ${effectiveSpan}` } : {}),
      };

  // 默认包裹：所有 widget 统一由 FieldWrapper 包裹（引擎注册，UI 层提供），
  // 仅当 label === false（字段级或表单级）时 FieldWrapper 不包裹 Form.Item。
  // 未注册 FieldWrapper（纯 react 无 ui 层）时直接渲染裸 widget。
  const FieldWrapper = engine.getFieldWrapper();

  // Form.Item 消费的元数据 props 剥离给 FieldWrapper，避免透传到底层 antd 控件：
  // - required: 会让 <input required> 触发浏览器原生校验
  // - errors/title/description/label/extra/width/displayType/labelWidth/column:
  //   作为未知属性透传到 DOM 会产生 React 警告
  // width / colSpan / displayType / labelWidth / column 是布局属性，
  // 由 NexusField 外层 <div> 的 wrapperStyle 统一消费，不透传给 FieldWrapper（Form.Item），
  // 避免外层 div 与 Form.Item 重复设置 width。

  let extra: ReactNode = state.meta.extra;
  // 异常判断，历史数据中存在 { extra: { tableOrder : 0 }} 的数据，需要进行过滤
  if (typeof extra !== 'string') {
    extra = undefined;
  }
  // extra 字符串可能携带 HTML 标签（如链接/加粗/着色），处理成 ReactNode
  // 传递到下层（FieldWrapper / Form.Item），否则 HTML 会以纯文本原样展示
  if (typeof extra === 'string') {
    extra = reactNodeFromString(extra);
  }

  const fieldWrapperProps = {
    label: state.meta.label,
    title: state.meta.title,
    description: state.meta.description,
    tooltip: state.meta.tooltip,
    errors: state.errors,
    required: state.required,
    extra: extra,
    displayType: fieldDisplayType,
    labelWidth: fieldLabelWidth,
    column: fieldColumn,
    // 附带编辑器/点击动作：FieldWrapper 渲染「编辑」入口（sideEffects meta 对齐）
    sideEffects: state.meta.sideEffects,
    value: state.value,
    onChange: handleChange,
    dataPath,
  };

  // widget 仅接收控件相关 props（value/onChange/状态/选项/表单引用/自有 props）
  const widgetProps = {
    // ...state.props 在构建后展开，避免 props 中的键覆盖 meta 值
    ...buildWidgetProps(
      {
        schema: state.meta.schema,
        disabled,
        readOnly,
        required: state.required,
        loading: state.loading,
        hidden: !state.visible,
        placeholder: state.meta.placeholder,
        options,
        dependValues,
        items: state.meta.items,
        remoteVersion: engine.getRemoteDataVersion(dataPath),
        addonsValue: state?.value,
        addonsIndex: index,
        addonsItemOf: arrayPath,
      },
      {
        dataPath,
        path: dataPath,
        value: state.value,
        onChange: handleChange,
        form,
      },
    ),
    ...state.props,
  };

  let control: ReactElement;
  if (FieldWrapper) {
    control = (
      <FieldWrapper key={layoutKey} {...fieldWrapperProps}>
        <Widget {...widgetProps} />
      </FieldWrapper>
    );
  } else {
    control = <Widget key={layoutKey} {...widgetProps} />;
  }

  return (
    <div
      data-nexus-field={dataPath}
      className={readOnly ? 'nexus-field-readonly' : undefined}
      onBlur={handleBlur}
      onFocusCapture={handleFocus}
      style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
    >
      {control}
    </div>
  );
}

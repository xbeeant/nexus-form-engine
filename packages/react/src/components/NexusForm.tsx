import type { NexusSchema } from '@xbeeant/form-engine';
import type { CSSProperties, ReactNode, SubmitEvent } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { renderTreeNode } from '../utils/renderTreeNode';
import type { FormController } from './FormController';
import { NexusFormProvider } from './NexusFormProvider';

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

export interface NexusFormProps {
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
  /**
   * 表单首次加载回调：非空 schema 首次传入并完成渲染后执行一次
   * - undefined / null / {}（无 properties）均视为「空」schema，不触发
   * - schema 由空变为非空时，于首个非空渲染提交后触发
   * - 后续 schema 变更不重复触发
   */
  onMount?: () => void;
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
   * - 回调参数为 (value, allValues)；全局（'#'）监听额外提供第三参 changedPath，
   *   即本次实际变更的字段路径（用于区分「未触碰的默认空值」与「用户主动清空」）
   */
  watch?: {
    [path: string]: (
      value: unknown,
      allValues: Record<string, unknown>,
      changedPath?: string,
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

/**
 * NexusForm — 顶层表单组件
 */
export function NexusForm({
  form,
  schema,
  initialValues,
  widgets,
  layouts,
  onFinish,
  onFinishFailed,
  onMount,
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

  // onMount：首次传入「非空」schema 并完成渲染后执行一次
  // undefined / null / {}（无任何键）均视为空 schema，不触发；
  // schema 由空变为非空时，于首个非空渲染提交（useEffect）后触发。
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;
  const onMountFiredRef = useRef(false);
  const isSchemaEmpty =
    !schema || (typeof schema === 'object' && Object.keys(schema).length === 0);
  useEffect(() => {
    if (onMountFiredRef.current || isSchemaEmpty) {
      return;
    }
    onMountFiredRef.current = true;
    onMountRef.current?.();
  }, [isSchemaEmpty]);

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: _version 是 renderTree 失效信号（engine 内部状态，静态分析不可见）
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
      <div className='mt-4'>
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

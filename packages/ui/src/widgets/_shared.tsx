import type {
  DataFieldSchema,
  DataObjectSchema,
  NexusFormInstance,
} from '@xbeeant/form-engine';
import { toBoolean } from '@xbeeant/form-engine/utils/schema-helper';
import { useFormConfig } from '@xbeeant/form-engine-react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import React from 'react';

// 支持按 format 模板解析（如 'YYYY年MM月DD日'），默认解析无法识别此类自定义格式
dayjs.extend(customParseFormat);

export interface WidgetProps<T = Record<string, any>> {
  /** 字段数据路径（供 widget 组件内注册校验规则 / 读取自身状态） */
  dataPath?: string;
  /** 字段数据路径（dataPath 别名，x-render 风格） */
  path?: string;
  value?: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  required?: boolean;
  title?: string;
  description?: string;
  errors?: string[];
  /** 是否显示 label（默认 true；字段级覆盖表单级，见 FieldState.meta.label） */
  label?: boolean;
  options?: Array<{ label: string; value: unknown } | string | number>;
  /** 额外说明信息，展示在元素下方（x-render 对齐） */
  extra?: string;
  /** 单元素展示宽度，如 '20%'（x-render 对齐） */
  width?: string;
  /** 字段级布局方向，覆盖表单级 displayType */
  displayType?: 'row' | 'column' | 'inline';
  /** 字段级 label 宽度，覆盖表单级 labelWidth */
  labelWidth?: number | string;
  /** 字段级列数，覆盖表单级 column */
  column?: number;
  /** 表单实例，可调用表单方法（如 getValues/setValueByPath 等） */
  form?: NexusFormInstance;
  /** 依赖字段的值映射（key 为字段路径，value 为字段值） */
  dependValues?: Record<string, unknown>;
  /** 数组节点的 items 定义（DataArraySchema.items），供 list/simpleList/tableList widget 渲染每一项 */
  items?: DataFieldSchema | DataObjectSchema;
  [key: string]: unknown;
  props: T;
}

// ────────────────────────────────────────────────────────────────────────────
// useFormItemProps — 从 NexusFormConfig 派生 Form.Item 布局 props
// core 不依赖 antd Form Context，由 ui 层自行实现 labelCol / colon / layout
// 支持字段级 override：displayType / labelWidth 优先使用字段值
// ────────────────────────────────────────────────────────────────────────────

export function useFormItemProps(overrides?: {
  displayType?: 'row' | 'column' | 'inline';
  labelWidth?: number | string;
}) {
  const config = useFormConfig();
  const displayType = overrides?.displayType ?? config.displayType;
  const labelWidth = overrides?.labelWidth ?? config.labelWidth;
  const isVertical = displayType === 'column';
  const isInline = displayType === 'inline';

  // 字段级 labelWidth 优先
  const effectiveLabelCol = isVertical
    ? { span: 24 }
    : labelWidth
      ? {
          style: {
            width:
              typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth,
          },
        }
      : config.labelCol;

  return {
    labelCol: effectiveLabelCol,
    wrapperCol: isVertical ? { span: 24 } : undefined,
    colon: typeof config.colon === 'boolean' ? config.colon : undefined,
    style: isInline
      ? { display: 'inline-block', marginRight: 8 }
      : { width: '100%' },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// toDayjs — 控件值回显为 dayjs 的安全转换
// 控件值以字符串存储（onChange 的第二参 dateString 按 format 格式化），
// 回显时优先按 format 解析，失败回退默认解析，仍无效返回 null——
// 绝不向 antd 传入 Invalid Date 对象（会导致输入框显示 "Invalid Date"）
// ────────────────────────────────────────────────────────────────────────────

export function toDayjs(value: unknown, format?: string): dayjs.Dayjs | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof dayjs) {
    return value as dayjs.Dayjs;
  }

  const str = String(value);
  const withFormat = (format && dayjs(str, format)) || null;
  if (withFormat?.isValid()) {
    return withFormat;
  }
  const plain = dayjs(str);
  return plain.isValid() ? plain : null;
}

// ────────────────────────────────────────────────────────────────────────────
// ReadOnlyDisplay — 只读模式下将值渲染为纯文本 / 结构化键值块
// 支持基础值（字符串/数字/布尔/options 枚举）与结构化值（object / array）：
// simpleList / tableList / list / object 等复杂组件的值在 readOnly 时
// 递归渲染为键值块，避免直接 String(value) 输出 "[object Object]"。
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_PLACEHOLDER = <span style={{ color: '#bfbfbf' }}>-</span>;

const isPrimitive = (v: unknown): boolean =>
  v === null || typeof v !== 'object';

const renderScalarLabel = (
  v: unknown,
  mapped: ReturnType<typeof mapOptions>,
): string => {
  if (typeof v === 'boolean') {
    return v ? '是' : '否';
  }
  const hit = mapped.find((o) => o.value === v);
  return hit ? hit.label : String(v);
};

/** 递归渲染只读值（depth 限制嵌套深度，防止极端 schema 导致布局失控） */
function renderReadOnlyValue(
  value: unknown,
  mapped: ReturnType<typeof mapOptions>,
  depth = 0,
): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return EMPTY_PLACEHOLDER;
  }

  // 数组值
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return EMPTY_PLACEHOLDER;
    }
    // 基础值数组（multiSelect / checkboxes / simpleList 字符串项）：顿号拼接
    if (value.every((item) => isPrimitive(item))) {
      return (
        <>{value.map((item) => renderScalarLabel(item, mapped)).join('、')}</>
      );
    }
    // 对象数组（tableList / list）：逐项渲染为键值块
    return (
      <div className='flex flex-col gap-1'>
        {value.map((item, index) => (
          <div key={index}>{renderReadOnlyValue(item, mapped, depth + 1)}</div>
        ))}
      </div>
    );
  }

  // 普通对象
  if (typeof value === 'object') {
    if (value instanceof Date || dayjs.isDayjs(value)) {
      return <>{String(value)}</>;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return EMPTY_PLACEHOLDER;
    }
    if (depth >= 3) {
      return <>{JSON.stringify(value)}</>;
    }
    return (
      <div className='overflow-hidden rounded-md border border-black/5'>
        {entries.map(([key, entryValue]) => (
          <div
            key={key}
            className='flex items-start gap-2 border-b border-black/5 px-2.5 py-1'
          >
            <span className='w-28 shrink-0 truncate text-[13px] text-black/45'>
              {key}
            </span>
            <span className='flex-1 text-right text-[13px] text-black/85'>
              {renderReadOnlyValue(entryValue, mapped, depth + 1)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 基础值（含 options 枚举映射）
  return <>{renderScalarLabel(value, mapped)}</>;
}

export function ReadOnlyDisplay({
  value,
  options,
}: {
  value: unknown;
  options?: WidgetProps['options'];
}) {
  return <>{renderReadOnlyValue(value, mapOptions(options))}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// useFormItem — 公共 Form.Item 包裹 Hook（所有 widget 默认使用）
// 约束：
// - 默认包裹 Form.Item（label/错误/必填/布局）
// - 字段级 label === false 或表单级 label === false 时：不包裹 Form.Item，
//   直接裸渲染控件（用于无 label 场景，如 html / 纯控件布局）
// ────────────────────────────────────────────────────────────────────────────

export interface UseFormItemResult {
  /** 是否显示 label（字段级 label !== false 且 表单级 label !== false） */
  showLabel: boolean;
  /**
   * 条件包裹函数：showLabel 为 true 时渲染 Form.Item，否则裸渲染控件
   * @param children - 控件内容
   */
  wrap: (children: React.ReactNode) => React.ReactElement;
}

export function useFormItem(props: WidgetProps): UseFormItemResult {
  // 字段级 label（meta.label，Parser 默认 true）与表单级 label 同时生效，
  // 任一为 false 即不显示该字段 label（且不包裹 Form.Item）
  const configLabel = useFormConfig().label;
  const showLabel = props.label !== false && configLabel !== false;

  const formItemProps = useFormItemProps({
    displayType: props.displayType,
    labelWidth: props.labelWidth,
  });

  // 合并 inline 布局样式与 width
  const mergedStyle: Record<string, unknown> = {
    width: '100%',
    ...formItemProps.style,
    ...(props.width ? { width: props.width } : {}),
  };

  const wrap = (children: React.ReactNode): React.ReactElement => {
    if (!showLabel) {
      // label=false：不使用 Form.Item 包裹，裸渲染控件
      return <React.Fragment>{children}</React.Fragment>;
    }

    const formItemHelp = props.errors?.length
      ? props.errors[0]
      : props.description;
    const formItemStatus = props.errors?.length ? 'error' : '';

    return (
      <Form.Item
        label={props.title}
        required={toBoolean(props.required)}
        help={formItemHelp}
        validateStatus={formItemStatus}
        extra={props.extra}
        style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
        labelCol={formItemProps.labelCol}
        wrapperCol={formItemProps.wrapperCol}
        colon={formItemProps.colon}
      >
        {children}
      </Form.Item>
    );
  };

  return { showLabel, wrap };
}

// ────────────────────────────────────────────────────────────────────────────
// FieldMetaContext — 字段元数据透传上下文
// NexusField（渲染层）剥离 title/description 等元数据 props 后，通过
// FieldWrapper 以 Context 提供给 widget 消费（如 voidTitle 自身渲染标题）。
// ────────────────────────────────────────────────────────────────────────────

export const FieldMetaContext = React.createContext<
  | {
      title?: string;
      description?: string;
    }
  | undefined
>(undefined);

// ────────────────────────────────────────────────────────────────────────────
// FieldWrapper — 字段包裹组件（NexusForm 渲染层默认包裹所有 widget）
// 约束：
// - 默认包裹 Form.Item（label/错误/必填/布局）
// - 字段级 label === false 或表单级 label === false 时：不包裹 Form.Item，
//   直接裸渲染控件（用于无 label 场景，如 html / 纯控件布局）
// - 以 Context 向 widget 透传 title/description（供需要自身渲染标题的 widget）
// ────────────────────────────────────────────────────────────────────────────

export interface FieldWrapperProps {
  label?: boolean;
  title?: string;
  description?: string;
  errors?: string[];
  required?: boolean;
  extra?: string;
  width?: string;
  displayType?: 'row' | 'column' | 'inline';
  labelWidth?: number | string;
  column?: number;
  children: React.ReactNode;
}

export function FieldWrapper(props: FieldWrapperProps) {
  const { children, ...rest } = props;
  const { wrap } = useFormItem(rest as WidgetProps);
  return wrap(
    <FieldMetaContext.Provider
      value={{ title: rest.title, description: rest.description }}
    >
      {children}
    </FieldMetaContext.Provider>,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// withFormItem — 公共包裹方法：给裸 widget 组件套上默认 Form.Item
// 注意：NexusForm 渲染时默认已通过 FieldWrapper 包裹所有 widget，
// 仅在渲染于 NexusForm 之外（或自行控制包裹）时使用本方法；
// 已注册的 widget 无需再包（label=false 时同样不包裹 Form.Item）
// ────────────────────────────────────────────────────────────────────────────

export function withFormItem(render: (props: WidgetProps) => React.ReactNode) {
  return (props: WidgetProps) => {
    const { wrap } = useFormItem(props);
    // Form.Item 消费的元数据需从 rest 中剥离，避免透传到底层 antd 控件：
    //  - required: 会让 <input required> 触发浏览器原生校验，拦截 submit 导致自定义校验不执行
    //  - errors / title / description: 作为未知属性渲染到 DOM，产生 React 警告
    //  - dependValues / dataPath / path: 引擎内部 props，透传到 antd 控件会
    //    渲染到 DOM 触发 "React does not recognize" 警告（剥除后显式传给 render，
    //    自定义 widget 仍可通过 props.dataPath / props.dependValues 访问）
    //  - readOnly 不做拦截，原样透传给 widget：多数 antd 组件原生支持 readOnly，
    //    由 widget 自身决定只读展示形态；无法原生实现的组件内置回退为 ReadOnlyDisplay。
    const {
      extra,
      width,
      readOnly,
      label: _label,
      options,
      required,
      errors,
      title,
      description,
      value,
      onChange,
      disabled,
      loading,
      placeholder,
      displayType,
      labelWidth,
      column,
      form,
      items,
      dependValues,
      dataPath,
      path,
      ...rest
    } = props;

    return wrap(
      render({
        value,
        onChange,
        disabled,
        readOnly,
        loading,
        placeholder,
        options,
        form,
        items,
        dependValues,
        dataPath,
        path,
        ...rest,
      }),
    );
  };
}

export function mapOptions(
  options?: Record<string, unknown>[] | WidgetProps['options'],
): Array<{ value: string | number | null | undefined; label: string }> {
  return (options ?? []).map((opt) => {
    const v =
      typeof opt === 'object' && opt !== null ? (opt as any).value : opt;
    const l =
      typeof opt === 'object' && opt !== null
        ? (opt as any).label
        : String(opt);
    // 转换为 string | number 类型
    const numericValue = Number(v);
    const finalValue = !Number.isNaN(numericValue)
      ? numericValue
      : (v as string);
    return { value: finalValue, label: l };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// RemoteDataConfig — 远程数据源配置（对齐 x-render AsyncData API）
// ────────────────────────────────────────────────────────────────────────────

export interface RemoteDataConfig {
  url: string;
  method?: 'GET' | 'POST';
  responseField: {
    data: string;
    value: string;
    label: string;
  };
  params?:
    | Record<string, unknown>
    | ((formData: Record<string, unknown>) => Record<string, unknown>);
  headers?: Record<string, string>;
  cacheKey?: string;
  timeout?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// getNestedValue — 按点号路径从对象中取值
// ────────────────────────────────────────────────────────────────────────────

export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// useRemoteOptions — 远程数据加载 Hook（支持缓存与动态 params）
// ────────────────────────────────────────────────────────────────────────────

export function useRemoteOptions(
  path: string,
  config: RemoteDataConfig | undefined,
  getFormData?: () => Record<string, unknown>,
): { options: ReturnType<typeof mapOptions>; loading: boolean } {
  const cache = React.useRef<
    Map<string, { data: unknown[]; timestamp: number }>
  >(new Map());
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState<ReturnType<typeof mapOptions>>(
    [],
  );

  const fetchOptions = React.useCallback(async () => {
    if (!config) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const cacheKey = config.cacheKey || path;
    const cached = cache.current.get(cacheKey);
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 缓存 5 分钟

    if (cached && now - cached.timestamp < cacheExpiry) {
      const arr = Array.isArray(cached.data) ? cached.data : [];
      const mapped = mapOptions(arr as Record<string, unknown>[]);
      setOptions(mapped);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const formData = getFormData?.() || {};
      const params =
        typeof config.params === 'function'
          ? config.params(formData)
          : config.params;

      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: config.method === 'POST' ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const data = getNestedValue(json, config.responseField.data);
      const items = Array.isArray(data) ? data : [];

      const mapped = mapOptions(items);
      cache.current.set(cacheKey, { data: items, timestamp: now });
      setOptions(mapped);
    } catch (error) {
      console.error(`[remoteData] fetch error for ${path}:`, error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [config, path, getFormData]);

  React.useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading };
}

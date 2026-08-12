import type {
  DataFieldSchema,
  DataObjectSchema,
  NexusFormInstance,
} from '@nexus/form-engine';
import { toBoolean } from '@nexus/form-engine/utils/schema-helper.ts';
import { useFormConfig } from '@nexus/form-engine-react';
import { Form, Typography } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type React from 'react';

// 支持按 format 模板解析（如 'YYYY年MM月DD日'），默认解析无法识别此类自定义格式
dayjs.extend(customParseFormat);

export interface WidgetProps<T = Record<string, any>> {
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
  const str = String(value);
  const withFormat = (format && dayjs(str, format)) || null;
  if (withFormat?.isValid()) {
    return withFormat;
  }
  const plain = dayjs(str);
  return plain.isValid() ? plain : null;
}

// ────────────────────────────────────────────────────────────────────────────
// ReadOnlyDisplay — 只读模式下将值渲染为纯文本
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_PLACEHOLDER = <span style={{ color: '#bfbfbf' }}>-</span>;

export function ReadOnlyDisplay({
  value,
  options,
}: {
  value: unknown;
  options?: WidgetProps['options'];
}) {
  // 空值
  if (value === undefined || value === null || value === '') {
    return EMPTY_PLACEHOLDER;
  }

  const mapped = mapOptions(options);

  // 数组值（multiSelect / checkboxes）
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return EMPTY_PLACEHOLDER;
    }
    const labels = value.map((v) => {
      const hit = mapped.find((o) => o.value === v);
      return hit ? hit.label : String(v);
    });
    return <>{labels.join('、')}</>;
  }

  // 布尔值
  if (typeof value === 'boolean') {
    return <>{value ? '是' : '否'}</>;
  }

  // 有 options 的单选值
  if (mapped.length > 0) {
    const hit = mapped.find((o) => o.value === value);
    if (hit) {
      return <>{hit.label}</>;
    }
  }

  return <>{String(value)}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// withFormItem — 包裹 widget，统一处理 Form.Item 布局 + readOnly
// ────────────────────────────────────────────────────────────────────────────

export function withFormItem(render: (props: WidgetProps) => React.ReactNode) {
  return (props: WidgetProps) => {
    const { label } = useFormConfig();
    const showLabel = label !== false;
    // Form.Item 消费的元数据需从 rest 中剥离，避免透传到底层 antd 控件：
    //  - required: 会让 <input required> 触发浏览器原生校验，拦截 submit 导致自定义校验不执行
    //  - errors / title / description: 作为未知属性渲染到 DOM，产生 React 警告
    const {
      extra,
      width,
      readOnly,
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
      ...rest
    } = props;

    const formItemProps = useFormItemProps({ displayType, labelWidth });

    // 合并 inline 布局样式与 width
    const mergedStyle: Record<string, unknown> = {
      width: '100%',
      ...formItemProps.style,
      ...(width ? { width } : {}),
    };

    const formItemHelp = errors?.length ? errors[0] : description;
    const formItemStatus = errors?.length ? 'error' : '';

    return (
      <Form.Item
        label={showLabel ? title : null}
        required={toBoolean(required)}
        help={formItemHelp}
        validateStatus={formItemStatus}
        extra={extra}
        style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
        labelCol={formItemProps.labelCol}
        wrapperCol={formItemProps.wrapperCol}
        colon={formItemProps.colon}
      >
        {readOnly ? (
          <Typography.Text>
            <ReadOnlyDisplay value={value} options={options} />
          </Typography.Text>
        ) : (
          render({
            value,
            onChange,
            disabled,
            loading,
            placeholder,
            options,
            form,
            items,
            ...rest,
          })
        )}
      </Form.Item>
    );
  };
}

export function mapOptions(
  options?: WidgetProps['options'],
): Array<{ value: unknown; label: string }> {
  return (options ?? []).map((opt) => {
    const v =
      typeof opt === 'object' && opt !== null ? (opt as any).value : opt;
    const l =
      typeof opt === 'object' && opt !== null
        ? (opt as any).label
        : String(opt);
    return { value: v, label: l };
  });
}

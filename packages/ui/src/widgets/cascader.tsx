import { Cascader, Spin } from 'antd';
import type { DefaultOptionType } from 'antd/es/cascader';
import {
  mapOptions,
  ReadOnlyDisplay,
  useRemoteOptions,
  type WidgetProps,
} from './_shared';

type CascaderValue = unknown[];

/** 扁平 enum 转级联叶子节点（无 children，一级选择） */
function leafOptions(
  options?: Record<string, unknown>[] | WidgetProps['options'],
): DefaultOptionType[] {
  return mapOptions(options).map((o) => ({
    value: o.value as string | number,
    label: o.label,
  }));
}

/** 递归匹配 value 路径 → label 文案（用于只读回显与校验提示） */
function findPathLabels(
  options: DefaultOptionType[],
  path: unknown[],
): string[] {
  if (!Array.isArray(path) || path.length === 0) {
    return [];
  }
  const [head, ...tail] = path;
  const node = options.find((o) => o.value === head);
  if (!node) {
    return [String(head), ...findPathLabels(options, tail)];
  }
  return [
    String(node.label ?? head),
    ...(node.children ? findPathLabels(node.children, tail) : []),
  ];
}

// 本地数据版本（支持 cascaderData + 嵌套 options + 扁平 enum 叶子）
export const cascaderWidget = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  readOnly,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  allowClear,
  changeOnSelect,
  multiple,
  showSearch,
  expandTrigger,
  required: _required,
  title: _title,
  description: _desc,
  errors: _errors,
  label: _label,
  extra: _extra,
  width: _width,
  displayType: _displayType,
  labelWidth: _labelWidth,
  column: _column,
  items: _items,
  props: _props,
  ...rest
}: WidgetProps) => {
  // 数据源优先级：cascaderData（嵌套 JSON）> 嵌套 options > 扁平 enum 叶子
  let dataSource: DefaultOptionType[] = [];

  if (typeof options === 'string' && (options as string).trim()) {
    try {
      const parsed = JSON.parse(options as string) as unknown;
      if (Array.isArray(parsed)) {
        dataSource = parsed as DefaultOptionType[];
      }
    } catch {
      // JSON 解析失败，options 可能是选项数组
    }
  }

  if (
    Array.isArray(options) &&
    options.some((o) => Array.isArray((o as DefaultOptionType).children))
  ) {
    // 嵌套 options
    dataSource = options as DefaultOptionType[];
  } else {
    // 扁平 enum 叶子
    dataSource = leafOptions(options as Record<string, unknown>[] | undefined);
  }

  const currentValue = (
    Array.isArray(value)
      ? value
      : value !== undefined && value !== null
        ? [value]
        : []
  ) as CascaderValue;

  if (readOnly) {
    const labels = findPathLabels(dataSource, currentValue);
    return <ReadOnlyDisplay value={labels.length ? labels.join(' / ') : ''} />;
  }

  const cascaderProps: Record<string, unknown> = {
    ...rest,
    value: currentValue,
    onChange: (values: CascaderValue) => onChange(values),
    options: dataSource,
    placeholder: placeholder ?? '请选择...',
    disabled: disabled || loading,
    allowClear: allowClear === undefined ? true : allowClear,
    changeOnSelect,
    multiple,
    showSearch,
    expandTrigger,
  };
  return <Cascader {...cascaderProps} />;
};

// 远程数据版本
export const remoteCascaderWidget = ({
  value,
  onChange,
  options,
  remoteData,
  placeholder,
  disabled,
  loading: _loading,
  readOnly,
  form: _form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  allowClear,
  changeOnSelect,
  multiple,
  showSearch,
  expandTrigger,
  required: _required,
  title: _title,
  description: _desc,
  errors: _errors,
  label: _label,
  extra: _extra,
  width: _width,
  displayType,
  labelWidth,
  column: _column,
  items: _items,
  props: _props,
  ...rest
}: WidgetProps & { remoteData?: any }) => {
  const { options: remoteOptions, loading } = useRemoteOptions(
    _p || 'cascader',
    remoteData,
    undefined,
    rest.remoteVersion as number | undefined,
  );

  let dataSource: DefaultOptionType[] = [];
  const isLoading = false;

  if (loading) {
    return <Spin spinning={true} />;
  }

  if (remoteData && remoteOptions) {
    dataSource = remoteOptions;
  } else {
    // 本地数据模式
    if (typeof options === 'string' && (options as string).trim()) {
      try {
        const parsed = JSON.parse(options as string) as unknown;
        if (Array.isArray(parsed)) {
          dataSource = parsed as DefaultOptionType[];
        }
      } catch {
        // JSON 解析失败，options 可能是选项数组
      }
    }

    if (
      Array.isArray(options) &&
      options.some((o) => Array.isArray((o as DefaultOptionType).children))
    ) {
      // 嵌套 options
      dataSource = options as DefaultOptionType[];
    } else {
      // 扁平 enum 叶子
      dataSource = leafOptions(
        options as Record<string, unknown>[] | undefined,
      );
    }
  }

  const currentValue = (
    Array.isArray(value)
      ? value
      : value !== undefined && value !== null
        ? [value]
        : []
  ) as CascaderValue;

  if (readOnly) {
    const labels = findPathLabels(dataSource, currentValue);
    return <ReadOnlyDisplay value={labels.length ? labels.join(' / ') : ''} />;
  }

  const cascaderProps: Record<string, unknown> = {
    ...rest,
    value: currentValue,
    onChange: (values: CascaderValue) => onChange(values),
    options: dataSource,
    placeholder: placeholder ?? '请选择...',
    disabled: disabled || isLoading,
    allowClear: allowClear === undefined ? true : allowClear,
    changeOnSelect,
    multiple,
    showSearch,
    expandTrigger,
  };
  return <Cascader {...cascaderProps} />;
};

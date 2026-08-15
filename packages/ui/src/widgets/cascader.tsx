import { Cascader } from 'antd';
import type { DefaultOptionType } from 'antd/es/cascader';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

type CascaderValue = unknown[];

/** 扁平 enum 转级联叶子节点（无 children，一级选择） */
function leafOptions(options?: WidgetProps['options']): DefaultOptionType[] {
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

export const cascaderWidget = withFormItem(
  ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    loading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    allowClear,
    changeOnSelect,
    multiple,
    showSearch,
    expandTrigger,
    cascaderData,
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
    let nested: DefaultOptionType[] = [];
    if (typeof cascaderData === 'string' && cascaderData.trim()) {
      try {
        const parsed = JSON.parse(cascaderData) as unknown;
        if (Array.isArray(parsed)) {
          nested = parsed as DefaultOptionType[];
        }
      } catch {
        nested = [];
      }
    }
    const cascaderOptions = (options ?? []) as DefaultOptionType[];
    const dataSource =
      nested.length > 0
        ? nested
        : cascaderOptions.length > 0 &&
            cascaderOptions.some((o) => Array.isArray(o.children))
          ? cascaderOptions
          : leafOptions(options);

    const currentValue = (Array.isArray(value)
      ? value
      : value !== undefined && value !== null
        ? [value]
        : []) as CascaderValue;

    if (readOnly) {
      const labels = findPathLabels(dataSource, currentValue);
      return <ReadOnlyDisplay value={labels.length ? labels.join(' / ') : ''} />;
    }

    // antd v6 Cascader props 为 union 分支（multiple 字面量决定泛型），
    // 动态 multiple 无法命中任一分支，故属性集合统一收进 Record 后展开
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
  },
);

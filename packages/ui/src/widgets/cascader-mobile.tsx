import { Cascader as AmdCascader, type CascaderOption } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

/** 递归匹配 value 路径 → label 文案（用于只读回显） */
function findPathLabels(options: CascaderOption[], path: unknown[]): string[] {
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
    ...(node.children ? findPathLabels(node.children as any, tail) : []),
  ];
}

/** 数据源归一化：cascaderData(JSON) > 嵌套 options > 扁平 enum */
function normalizeDataSource(
  options: WidgetProps['options'],
): CascaderOption[] {
  // 1. cascaderData 字段（JSON 字符串）
  if (typeof options === 'string' && (options as string).trim()) {
    try {
      const parsed = JSON.parse(options) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as any;
      }
    } catch {
      // fall through
    }
  }

  // 2. 嵌套 options（含 children 数组）
  if (
    Array.isArray(options) &&
    options.some((o) => Array.isArray((o as any).children))
  ) {
    return (options as Array<any>).map((o) => ({
      label: o.label,
      value: o.value,
      children: (o.children || [])
        .map((c: any) => ({ label: c.label, value: c.value }))
        .filter((c: any) => c.label != null),
    }));
  }

  // 3. 扁平 enum 叶子
  if (Array.isArray(options)) {
    return options.map((o) => {
      const v = typeof o === 'object' && o !== null ? (o as any).value : o;
      const l =
        typeof o === 'object' && o !== null ? (o as any).label : String(o);
      return { label: l, value: v };
    });
  }

  return [];
}

export const cascaderMobileWidget = ({
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
  remoteVersion: _rv,
  props: _props,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    const dataSource = normalizeDataSource(options);
    const currentValue = Array.isArray(value)
      ? value
      : value != null
        ? [value]
        : [];
    const labels = findPathLabels(dataSource, currentValue);
    if (labels.length) {
      return <SimpleDisplay value={labels.join(' / ')} />;
    }
    return <SimpleDisplay value={undefined} />;
  }

  const dataSource = normalizeDataSource(options);
  const currentValue: unknown[] = Array.isArray(value)
    ? value
    : value != null
      ? [value]
      : [];

  const handleOnChange = (vals: unknown[] | unknown) => {
    const restoreValue = (raw: unknown): unknown => {
      if (raw === 'undefined' || raw === 'null') {
        return raw;
      }
      if (typeof raw === 'string' && raw !== '') {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return raw;
    };
    let values: unknown[] = [];
    if (Array.isArray(vals)) {
      values = vals.map(restoreValue);
    } else if (vals !== undefined && vals !== null && vals !== '') {
      values = [restoreValue(vals)];
    }
    onChange(values);
  };

  return (
    <AmdCascader
      title={_title ?? ''}
      options={dataSource}
      value={currentValue.map((v) => String(v ?? ''))}
      onConfirm={handleOnChange}
      placeholder={placeholder ?? '请选择'}
      {...rest}
    />
  );
};

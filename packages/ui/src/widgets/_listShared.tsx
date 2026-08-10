// ============================================================================
// _listShared — list / simpleList / tableList 共享的工具函数
// 提供数组操作、空值生成、单项字段渲染（轻量内联渲染器，不依赖引擎 widget 注册表）
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@nexus/form-engine';
import {
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
} from 'antd';
import type React from 'react';

// ────────────────────────────────────────────────────────────────────────────
// 数组操作工具
// ────────────────────────────────────────────────────────────────────────────

export function arrayAdd<T>(arr: T[], item: T): T[] {
  return [...arr, item];
}

export function arrayRemove<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) {
    return arr;
  }
  const newArr = [...arr];
  const [item] = newArr.splice(from, 1);
  newArr.splice(to, 0, item);
  return newArr;
}

export function arrayCopy<T>(arr: T[], index: number): T[] {
  const item = arr[index];
  if (item === undefined) {
    return arr;
  }
  // 深拷贝对象类型，避免引用共享导致编辑互相影响
  const copy =
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? (JSON.parse(JSON.stringify(item)) as T)
      : item;
  return [...arr.slice(0, index + 1), copy, ...arr.slice(index + 1)];
}

// ────────────────────────────────────────────────────────────────────────────
// 空值生成
// ────────────────────────────────────────────────────────────────────────────

/** 根据基础类型生成默认空值 */
export function getEmptyValue(type?: string): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return undefined;
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

/** 根据 DataFieldSchema 生成空值（优先 default，其次按 type 推断） */
export function getEmptyField(field: DataFieldSchema): unknown {
  if (field.default !== undefined) {
    return field.default;
  }
  return getEmptyValue(field.type);
}

/** 根据 DataObjectSchema 生成空对象（遍历 properties 取默认值） */
export function getEmptyObject(
  itemSchema: DataObjectSchema,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(itemSchema.properties)) {
    if (node && typeof node === 'object' && 'widget' in node) {
      obj[key] = getEmptyField(node as DataFieldSchema);
    } else if (node && typeof node === 'object' && 'type' in node) {
      obj[key] = getEmptyValue((node as { type: string }).type);
    }
  }
  return obj;
}

/** 根据 items schema 生成空值 */
export function getEmptyItem(
  items?: DataFieldSchema | DataObjectSchema,
): unknown {
  if (!items) {
    return '';
  }
  if (items.type === 'object') {
    return getEmptyObject(items);
  }
  return getEmptyField(items as DataFieldSchema);
}

// ────────────────────────────────────────────────────────────────────────────
// 单项字段渲染 — 轻量内联渲染器
// 不使用 withFormItem 包裹，由调用方控制 label / layout
// ────────────────────────────────────────────────────────────────────────────

export interface ItemFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

/**
 * 当 widget 字段缺失时，从 type / format 推断 widget 名（对齐 x-render）
 * - type: number/integer → number
 * - type: boolean → switch
 * - type: string + format: date → date
 * - type: string + format: textarea → textarea
 * - type: string（默认）→ input
 */
export function inferWidget(field: {
  type?: string;
  format?: string;
  widget?: string;
}): string {
  if (field.widget) {
    return field.widget;
  }
  switch (field.type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'switch';
    default:
      if (field.format === 'date' || field.format === 'date-time') {
        return 'date';
      }
      if (field.format === 'textarea') {
        return 'textarea';
      }
      return 'input';
  }
}

/**
 * 根据 widget 名渲染单项输入控件
 * 仅支持基础 widget（input / number / select / textarea / date / switch / checkbox / radio）
 * 复杂 widget 回退为 Input
 */
export function renderInputControl(
  widgetName: string | undefined,
  fieldSchema: DataFieldSchema,
  props: ItemFieldProps,
): React.ReactNode {
  // widget 名缺失时从 type/format 推断（x-render schema 中 items 子字段常无 widget）
  const effectiveWidget = inferWidget({
    type: fieldSchema.type,
    format: (fieldSchema as { format?: string }).format,
    widget: widgetName,
  });

  const { value, onChange, disabled, readOnly, placeholder } = props;

  // 选项类 widget 共用 options 构建
  const options = fieldSchema.enum
    ? fieldSchema.enum.map((v, i) => ({
        value: v,
        label: fieldSchema.enumNames?.[i] ?? String(v),
      }))
    : undefined;

  const commonProps = {
    value: value as never,
    onChange,
    disabled: disabled || readOnly,
    placeholder,
    style: { width: '100%' },
  };

  switch (effectiveWidget) {
    case 'number':
      return (
        <InputNumber
          {...commonProps}
          value={value as number | undefined}
          onChange={(v) => onChange(v ?? undefined)}
        />
      );
    case 'textarea':
      return (
        <Input.TextArea
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
      );
    case 'select':
      return (
        <Select
          {...commonProps}
          value={value as never}
          options={options}
          allowClear
        />
      );
    case 'multiSelect':
      return (
        <Select
          {...commonProps}
          mode='multiple'
          value={(value as unknown[]) ?? []}
          options={options}
          allowClear
        />
      );
    case 'date':
      return <DatePicker {...commonProps} style={{ width: '100%' }} />;
    case 'switch':
      return (
        <Switch
          checked={value as boolean}
          onChange={(checked) => onChange(checked)}
          disabled={disabled || readOnly}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled || readOnly}
        >
          {fieldSchema.title ?? ''}
        </Checkbox>
      );
    case 'radio':
      return (
        <Radio.Group
          value={value as never}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || readOnly}
          options={options}
        />
      );
    case 'password':
      return (
        <Input.Password
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          {...commonProps}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 只读值格式化
// ────────────────────────────────────────────────────────────────────────────

/** 将单项值格式化为展示文本 */
export function formatFieldValue(
  value: unknown,
  fieldSchema?: DataFieldSchema,
): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (fieldSchema?.enum && fieldSchema.enumNames) {
    const idx = fieldSchema.enum.indexOf(value as string | number);
    if (idx >= 0 && fieldSchema.enumNames[idx]) {
      return fieldSchema.enumNames[idx];
    }
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

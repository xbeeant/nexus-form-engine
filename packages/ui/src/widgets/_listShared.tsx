// ============================================================================
// _listShared — list / simpleList / tableList 共享的工具函数
// 提供数组操作、空值生成、单项字段渲染（按引擎 widget 注册表解析，与 NexusField 一致）
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';
import { useNexusContext } from '@xbeeant/form-engine-react/contexts/NexusContext';
import { useSyncExternalStore } from 'react';

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
  // 深拷贝对象类型，避免引用共享导致编辑互相影响（structuredClone 优于 JSON 序列化：
  // 保留 undefined/Date/Map 等类型，且速度更快）
  const copy =
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? (structuredClone(item) as T)
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
// 单项字段渲染 — 获取 widget 方式与 NexusField 保持一致
// 优先按 widgetName 从引擎 widget 注册表（engine.getWidget）解析并渲染，
// 支持全部内置 widget 与自定义 widget；未注册时回退为轻量内联基础控件。
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

/** 从 enum / enumNames 构建选项（与 NexusField 一致） */
function buildItemOptions(
  enumValues?: Array<string | number>,
  enumNames?: Array<string>,
) {
  return enumValues
    ? enumValues.map((v, i) => ({
        value: v,
        label: enumNames?.[i] ?? String(v),
      }))
    : undefined;
}

/**
 * 单项输入控件渲染组件
 * 字段属性能力与 NexusField 保持一致：
 * - 通过引擎 widget 注册表按 widgetName 解析并渲染（engine.getWidget）；
 * - 按项字段完整路径（如 "items[0].name"）读取引擎维护的 FieldState，
 *   readOnly / disabled / required / props 等与 NexusField 同源解析
 *   （含表达式联动按项生效），并按路径精准订阅、状态变化实时重渲染；
 * - widget 未注册时优雅回退为基础 antd 控件内联渲染。
 * 注意：title / description / extra 属于列表容器的结构信息（列头 / 行内标签由
 * 列表自行渲染），此处不透传给 widget，避免表单单元格出现重复 label。
 */
export function RenderItemControl({
  widget,
  fieldSchema,
  path,
  value,
  onChange,
  disabled,
  readOnly,
  placeholder,
}: ItemFieldProps & {
  widget?: string;
  fieldSchema: DataFieldSchema;
  /** 该项子字段在引擎中的完整路径（如 "items[0].name"），缺省时无引擎状态 */
  path?: string;
}) {
  const { engine, form } = useNexusContext();

  // 与 NexusField 一致：按项字段路径精准订阅，readOnly/disabled 等状态变化实时重渲染
  useSyncExternalStore(
    (onStoreChange) =>
      path ? engine.subscribeField(path, onStoreChange) : () => {},
    () => (path ? engine.getFieldVersion(path) : 0),
    () => (path ? engine.getFieldVersion(path) : 0),
  );

  // 读取引擎维护的字段状态（含表达式联动解析后的 readOnly/disabled/required 等）
  const fieldState = path ? engine.getFieldState(path) : undefined;

  // widget 名：优先引擎解析结果，其次显式声明 / type / format 推断
  // （x-render schema 中 items 子字段常无 widget）
  const effectiveWidget =
    fieldState?.meta.widget ??
    inferWidget({
      type: fieldSchema.type,
      format: fieldSchema.format,
      widget,
    });

  const Widget = engine.getWidget(effectiveWidget);

  // readOnly / disabled：列表容器传入（列表级只读/禁用）与项字段引擎状态（含联动）取并集
  const finalReadOnly = readOnly || fieldState?.readOnly || false;
  const finalDisabled = disabled || fieldState?.disabled || false;
  const finalRequired = fieldState?.required ?? false;
  const finalPlaceholder =
    fieldState?.meta.placeholder ?? placeholder ?? fieldSchema.placeholder;
  const finalProps = fieldState?.props ?? fieldSchema.props ?? {};
  const finalOptions = buildItemOptions(
    fieldState?.meta.enum ?? fieldSchema.enum,
    fieldState?.meta.enumNames ?? fieldSchema.enumNames,
  );

  if (Widget) {
    return (
      <Widget
        dataPath={path}
        path={path}
        value={value}
        onChange={onChange}
        disabled={finalDisabled}
        readOnly={finalReadOnly}
        required={finalRequired}
        loading={fieldState?.loading}
        placeholder={finalPlaceholder}
        options={finalOptions}
        errors={fieldState?.errors}
        form={form}
        {...finalProps}
      />
    );
  }

  // 未注册 widget：回退为轻量内联基础控件
  return (
    <div className='text-xs text-red-500' data-nexus-field={path}>
      ⚠️ Widget "{widget}" 未注册 (path: {path})
    </div>
  );
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

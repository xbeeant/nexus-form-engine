// ============================================================================
// _listShared — list / simpleList / tableList 共享的工具函数
// 提供数组操作、空值生成、单项字段渲染（按引擎 widget 注册表解析，与 NexusField 一致）
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';

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
  // enum/enumNames 可为 ExpressionOr（{{ }} 表达式），静态展示时仅用数组形态查找文案
  const enumValues = Array.isArray(fieldSchema?.enum)
    ? (fieldSchema.enum as Array<string | number>)
    : undefined;
  const enumNames = Array.isArray(fieldSchema?.enumNames)
    ? (fieldSchema.enumNames as Array<string>)
    : undefined;
  if (enumValues && enumNames) {
    const idx = enumValues.indexOf(value as string | number);
    if (idx >= 0 && enumNames[idx]) {
      return enumNames[idx];
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

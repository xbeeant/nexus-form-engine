// ────────────────────────────────────────────────────────────────────────────
// 12. 工具函数 & 类型守卫
// ────────────────────────────────────────────────────────────────────────────

import type {
  DataArraySchema,
  DataFieldSchema,
  DataNode,
  DataObjectSchema,
  LayoutContainerType,
  LayoutNode,
  LayoutPaneType,
  LayoutType,
  SchemaNode,
} from '../types/schema.ts';

/**
 * readonly set containing all valid layout container type identifiers
 * Defines the supported structural components for organizing content within a layout system
 *
 * @type {ReadonlySet<LayoutContainerType>}
 */
export const LAYOUT_CONTAINER_TYPES: ReadonlySet<LayoutContainerType> = new Set(
  ['card', 'tabs', 'grid', 'flex', 'steps', 'collapse', 'divider', 'void'],
);

/**
 * All valid layout pane type identifiers
 *
 * @type {ReadonlySet<LayoutPaneType>}
 */
export const LAYOUT_PANE_TYPES: ReadonlySet<LayoutPaneType> = new Set([
  'tabPane',
  'step',
  'collapsePanel',
]);

/**
 * All valid layout type identifiers
 *
 * @type {ReadonlySet<LayoutType>}
 */
export const LAYOUT_TYPES: ReadonlySet<LayoutType> = new Set([
  ...LAYOUT_CONTAINER_TYPES,
  ...LAYOUT_PANE_TYPES,
]);

/**
 * 判断给定的 schema 节点是否为数据字段
 *
 * 数据字段特征：
 * - 没有 items 属性（排除 DataArraySchema）
 * - 没有 properties 属性（排除 DataObjectSchema 和 LayoutNode）
 * - 有 widget 属性，或 type 为基础类型
 *
 * @param node - Schema 节点
 * @returns 如果是 DataFieldSchema 返回 true
 */
export function isDataField(node: SchemaNode): node is DataFieldSchema {
  // DataArraySchema 也可能有 widget，需排除
  if ('items' in node) {
    return false;
  }
  // DataObjectSchema / LayoutNode 有 properties，需排除
  if ('properties' in node) {
    return false;
  }
  // 有 widget 的字段（但非 array/object/layout）
  if ('widget' in node) {
    return true;
  }
  // 无 widget 但 type 为基础类型（x-render schema 中常见）
  const t = (node as { type?: string }).type;
  return t === 'string' || t === 'number' || t === 'integer' || t === 'boolean';
}

/**
 * Determines whether the given schema node represents a data object.
 * A node is considered a data object if its type is 'object', it does not contain a 'widget' property, and it includes a 'properties' property.
 * @param node - The schema node to evaluate.
 * @return True if the node is a DataObjectSchema, false otherwise.
 */
export function isDataObject(node: SchemaNode): node is DataObjectSchema {
  return node.type === 'object' && !('widget' in node) && 'properties' in node;
}

/**
 * Determines whether the given schema node represents a data array.
 * A node is considered a data array if its type is 'array' and it includes an 'items' property.
 *
 * @param node - The schema node to evaluate.
 * @return True if the node is a DataArraySchema, false otherwise.
 */
export function isDataArray(node: SchemaNode): node is DataArraySchema {
  return node.type === 'array' && 'items' in node;
}

/**
 * 判断给定的 schema 节点是否为任意数据节点（字段/对象/数组）
 *
 * @param node - Schema 节点
 * @returns 如果是 DataNode 返回 true
 */
export function isDataNode(node: SchemaNode): node is DataNode {
  return isDataField(node) || isDataObject(node) || isDataArray(node);
}

/**
 * 判断给定的 schema 节点是否为布局节点
 *
 * 布局节点特征：
 * - 不是数据节点
 * - 有 properties 属性
 *
 * @param node - Schema 节点
 * @returns 如果是 LayoutNode 返回 true
 */
export function isLayoutNode(node: SchemaNode): node is LayoutNode {
  return !isDataNode(node) && 'properties' in node;
}

// ============================================================================
// 共享工具函数（Engine / SchemaParser 共用）
// ============================================================================

/**
 * 判断值是否为空
 *
 * 空值条件：
 * - undefined
 * - null
 * - 空字符串 ''
 * - 空数组 []
 *
 * @param value - 待判断的值
 * @returns 如果是空值返回 true
 */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Retrieves a nested value from an object using a dot-separated path string.
 * Returns undefined if the source object is falsy, or if any segment along the path
 * resolves to null, undefined, or a non-object type before reaching the final key.
 *
 * @param obj - The source object to traverse, or undefined.
 * @param path - A dot-separated string representing the property path to access.
 * @return The value found at the specified path, or undefined if the path cannot be fully resolved.
 */
export function getNestedValue(
  obj: Record<string, unknown> | undefined,
  path: string,
): unknown {
  if (!obj) {
    return undefined;
  }
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Sets a nested value in an object using a dot-separated path string.
 *
 * 步骤：
 * 1. 将路径字符串按 '.' 分割为数组
 * 2. 遍历路径数组，逐层创建对象（如果不存在）
 * 3. 设置最终 key 的值
 *
 * @param obj - The target object.
 * @param path - A dot-separated string representing the property path to set.
 * @param value - The value to set.
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !(key in current) ||
      typeof current[key] !== 'object' ||
      current[key] === null
    ) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 判断值是否为 thenable（Promise 或具有 then 方法的对象）
 *
 * @param value - 待判断的值
 * @returns 如果是 thenable 返回 true
 */
export function isThenable<T>(
  value: unknown,
): value is Promise<T> | { then: (...args: unknown[]) => unknown } {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * 将任意值强制转换为 boolean
 *
 * 转换规则：
 * - 已是 boolean：直接返回
 * - 字符串：非空字符串且不为 'false'/'0' 时返回 true
 * - 其他类型：使用 Boolean() 转换
 *
 * 用途：避免表达式返回字符串/undefined 等导致 UI 异常
 *
 * @param value - 待转换的值
 * @returns 转换后的 boolean 值
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value !== '' && value !== 'false' && value !== '0';
  }
  return Boolean(value);
}

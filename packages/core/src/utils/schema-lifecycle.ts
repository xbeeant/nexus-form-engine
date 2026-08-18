// ============================================================================
// schema-lifecycle — Schema 生命周期工具
//
// 1. getSchemaFieldPaths：收集全部数据字段路径（布局节点 Key 不进入路径）
// 2. getInitialValues：从任意数据对象提取 schema 声明的初始值
// 3. diffSchemas：对比两版 Schema，输出 added / removed / modified 变更
// 4. migrateValues：Schema 变更后迁移已有值（丢弃已删除字段的值）
//
// 路径计算与 SchemaParser.walkProperties 完全一致：
// - 数据节点（数组/字段/对象）：currentPath = parent ? parent.key : key
// - 布局节点（card/tabs/grid...）：透传父路径，Key 被丢弃
// - 数组 items 子字段：属于数组项作用域，不参与收集（数组整体是一个字段）
// ============================================================================

import {
  isDataArray,
  isDataField,
  isDataObject,
  isLayoutNode,
} from './schema-helper';
import type { SchemaNode } from '../types/schema';

/** 数据字段路径（含 path 与字段节点） */
export interface SchemaFieldEntry {
  /** 完整数据路径（点分隔，不含布局节点 key） */
  path: string;
  /** 字段节点引用 */
  node: SchemaNode;
}

/** Schema 变更类型 */
export type SchemaDiffKind = 'added' | 'removed' | 'modified';

/** 单条 Schema 变更 */
export interface SchemaDiff {
  /** 字段路径（点分隔） */
  path: string;
  kind: SchemaDiffKind;
  /** modified 时：发生变化的属性名列表 */
  changedProps?: string[];
}

/** 深路径取值 */
export function getPathValue(
  source: Record<string, unknown>,
  path: string,
): unknown {
  if (path === '') {
    return source;
  }
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !(segment in (current as Record<string, unknown>))
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** 深路径写值（不存在的中间对象自动创建） */
export function setPathValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split('.');
  let current = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const existing = current[segment];
    if (
      existing === null ||
      typeof existing !== 'object' ||
      Array.isArray(existing)
    ) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * 遍历 Schema 收集全部数据字段（数组整体计为字段，数组 items 子字段不收集）
 *
 * @param schema - Schema 定义（object 根或任意节点）
 * @param parentPath - 父路径（根为 ''）
 * @param entries - 收集器
 */
function collectFieldPaths(
  node: SchemaNode,
  parentPath: string,
  entries: SchemaFieldEntry[],
): void {
  if (!node || typeof node !== 'object') {
    return;
  }
  // 布局节点：自身 Key 不进路径，子字段在布局的父路径下按自身 Key 拼接
  if (isLayoutNode(node)) {
    for (const [key, child] of Object.entries(
      (node as { properties?: Record<string, SchemaNode> }).properties ?? {},
    )) {
      const childPath = parentPath ? `${parentPath}.${key}` : key;
      collectFieldPaths(child as SchemaNode, childPath, entries);
    }
    return;
  }
  // 数组 items 子字段：属于数组项作用域，不参与收集
  if (isDataArray(node)) {
    entries.push({ path: parentPath, node });
    return;
  }
  if (isDataField(node)) {
    entries.push({ path: parentPath, node });
    return;
  }
  if (isDataObject(node)) {
    // 数据对象自身也是字段（可整体取值），但继续下钻收集子字段
    if (parentPath !== '') {
      entries.push({ path: parentPath, node });
    }
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      // 布局节点子字段透传父路径（Key 不进路径）
      const childPath = isLayoutNode(child as SchemaNode)
        ? parentPath
        : parentPath
          ? `${parentPath}.${key}`
          : key;
      collectFieldPaths(child as SchemaNode, childPath, entries);
    }
    return;
  }
  // 未识别节点按对象处理（顶层根对象）
  const properties = (node as { properties?: Record<string, SchemaNode> })
    .properties;
  for (const [key, child] of Object.entries(properties ?? {})) {
    const childPath = isLayoutNode(child as SchemaNode)
      ? parentPath
      : parentPath
        ? `${parentPath}.${key}`
        : key;
    collectFieldPaths(child as SchemaNode, childPath, entries);
  }
}

/**
 * 获取 Schema 声明的全部数据字段（含嵌套对象与数组，不含布局节点）
 *
 * @param schema - Schema 定义
 * @returns 字段路径列表
 */
export function getSchemaFieldPaths(schema: SchemaNode): string[] {
  const entries: SchemaFieldEntry[] = [];
  collectFieldPaths(schema, '', entries);
  return entries.map((e) => e.path);
}

/**
 * 从数据对象中提取 Schema 声明的初始值（过滤未知键，布局 Key 天然不出现）
 *
 * 典型场景：后端返回的数据含多余字段，用 schema 白名单过滤后交给
 * engine.init / form.setValues，避免脏数据进入表单状态。
 *
 * @param schema - Schema 定义
 * @param values - 原始数据对象
 * @returns 仅含 Schema 声明字段的初始值对象
 */
export function getInitialValues(
  schema: SchemaNode,
  values: Record<string, unknown> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const path of getSchemaFieldPaths(schema)) {
    const value = getPathValue(values, path);
    if (value !== undefined) {
      setPathValue(result, path, value);
    }
  }
  return result;
}

/** 顶层属性差异（JSON 序列化比较） */
function diffTopLevelProps(
  prev: SchemaNode,
  next: SchemaNode,
): string[] | undefined {
  const changed: string[] = [];
  const allKeys = new Set([
    ...Object.keys(prev),
    ...Object.keys(next),
  ]);
  for (const key of allKeys) {
    const a = (prev as Record<string, unknown>)[key];
    const b = (next as Record<string, unknown>)[key];
    // properties/items 内部变化由递归 diff 报告，此处仅对比内容是否一致
    if (key === 'properties' || key === 'items') {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        changed.push(key);
      }
      continue;
    }
    let equal = a === b;
    if (!equal && typeof a === 'object' && typeof b === 'object') {
      equal = JSON.stringify(a) === JSON.stringify(b);
    }
    if (!equal) {
      changed.push(key);
    }
  }
  return changed.length > 0 ? changed : undefined;
}

/**
 * 对比两版 Schema，输出字段级变更（added / removed / modified）
 *
 * 布局结构变化（如 card → tabs）不会改变数据路径，因此不会产生
 * added/removed；仅当数据字段本身增删或属性变化时报告。
 *
 * @param prevSchema - 旧 Schema
 * @param nextSchema - 新 Schema
 * @returns 变更列表
 */
export function diffSchemas(
  prevSchema: SchemaNode,
  nextSchema: SchemaNode,
): SchemaDiff[] {
  const prevEntries: SchemaFieldEntry[] = [];
  const nextEntries: SchemaFieldEntry[] = [];
  collectFieldPaths(prevSchema, '', prevEntries);
  collectFieldPaths(nextSchema, '', nextEntries);

  const diffs: SchemaDiff[] = [];
  const prevByPath = new Map(prevEntries.map((e) => [e.path, e]));
  const nextByPath = new Map(nextEntries.map((e) => [e.path, e]));

  for (const [path, entry] of prevByPath) {
    const nextEntry = nextByPath.get(path);
    if (!nextEntry) {
      diffs.push({ path, kind: 'removed' });
      continue;
    }
    const changedProps = diffTopLevelProps(entry.node, nextEntry.node);
    if (changedProps) {
      diffs.push({ path, kind: 'modified', changedProps });
    }
  }
  for (const [path] of nextByPath) {
    if (!prevByPath.has(path)) {
      diffs.push({ path, kind: 'added' });
    }
  }
  return diffs;
}

/**
 * Schema 变更后迁移已有表单值：仅保留仍存在于新 Schema 的字段值
 *
 * 使用场景：动态表单（Schema 随业务切换）复用引擎时，旧数据中的
 * 已删除字段值不应残留；值结构不因布局调整变化（布局 Key 不进路径）。
 *
 * @param prevSchema - 旧 Schema
 * @param nextSchema - 新 Schema
 * @param values - 旧表单值
 * @returns 迁移后的值（仅含新 Schema 声明的字段）
 */
export function migrateValues(
  prevSchema: SchemaNode,
  nextSchema: SchemaNode,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const prevPaths = getSchemaFieldPaths(prevSchema);
  const nextPaths = new Set(getSchemaFieldPaths(nextSchema));
  // 对象容器路径不直接拷贝整体值（其子字段已分别迁移，避免带入已删除子字段）
  const containerPaths = new Set(
    prevPaths.filter(
      (p) => p !== '' && prevPaths.some((other) => other.startsWith(`${p}.`)),
    ),
  );
  const result: Record<string, unknown> = {};
  for (const path of prevPaths) {
    if (!nextPaths.has(path) || containerPaths.has(path)) {
      continue;
    }
    const value = getPathValue(values, path);
    if (value !== undefined) {
      setPathValue(result, path, value);
    }
  }
  return result;
}
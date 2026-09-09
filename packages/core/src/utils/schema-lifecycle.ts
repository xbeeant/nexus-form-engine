// ============================================================================
// schema-lifecycle — Schema 节点语义 + 生命周期工具
//
// 1. LAYOUT_*_TYPES：布局类型常量集合
// 2. isDataField / isDataObject / isDataArray / isDataNode / isBranchNode / isLayoutNode
//    → 节点类型守卫（Type Guard）
// 3. resolveNodePath：计算节点在 Schema 树中的数据路径
// 4. walkSchemaTree：通用 Schema 树遍历器（Visitor 模式）
// 5. getSchemaFieldPaths：收集全部数据字段路径（布局节点 Key 不进入路径）
// 6. getInitialValues：从任意数据对象提取 schema 声明的初始值
// 7. diffSchemas：对比两版 Schema，输出 added / removed / modified 变更
// 8. migrateValues：Schema 变更后迁移已有值（丢弃已删除字段的值）
//
// 路径计算与 SchemaParser.walkProperties 完全一致：
// - 数据节点（数组/字段/对象）：currentPath = parent ? parent.key : key
// - 布局节点（card/tabs/grid...）：透传父路径，Key 被丢弃
// - 数组 items 子字段：属于数组项作用域，不参与收集（数组整体是一个字段）
// ============================================================================

import type {
  BranchSchema,
  DataArraySchema,
  DataFieldSchema,
  DataNode,
  DataObjectSchema,
  LayoutContainerType,
  LayoutNode,
  LayoutPaneType,
  LayoutType,
  SchemaNode,
} from '../types/schema';
import { getPathValue, setPathValue } from './value-utils';

// ============================================================================
// 布局类型常量
// ============================================================================

/**
 * 所有有效的布局容器类型标识集合
 * 定义了在布局系统中用于组织内容的结构组件类型
 *
 * @type {ReadonlySet<LayoutContainerType>}
 */
export const LAYOUT_CONTAINER_TYPES: ReadonlySet<LayoutContainerType> = new Set([
  'card',
  'tabs',
  'grid',
  'flex',
  'space',
  'steps',
  'collapse',
  'divider',
  'void',
  'passThrough',
]);

/**
 * 所有有效的布局面板类型标识集合
 *
 * @type {ReadonlySet<LayoutPaneType>}
 */
export const LAYOUT_PANE_TYPES: ReadonlySet<LayoutPaneType> = new Set([
  'tabPane',
  'step',
  'collapsePanel',
]);

/**
 * 所有有效的布局类型标识集合（容器 + 面板）
 *
 * @type {ReadonlySet<LayoutType>}
 */
export const LAYOUT_TYPES: ReadonlySet<LayoutType> = new Set([
  ...LAYOUT_CONTAINER_TYPES,
  ...LAYOUT_PANE_TYPES,
]);

// ============================================================================
// 节点类型守卫（Type Guard）
// ============================================================================

/**
 * 判断给定的 schema 节点是否为数据字段
 *
 * 数据字段特征：
 * - 没有 items 属性（排除 DataArraySchema）
 * - 没有 properties 属性（排除 DataObjectSchema 和 LayoutNode）
 * - 有 widget 属性，或 type 为基础类型
 *
 * 特例：带 widget 的 object 节点（如子表单组件）视为数据字段——
 * 子表单组件的 Key 应进入数据路径（value 为对象，由组件内部维护），
 * 而非当作布局容器（Key 丢弃）或数据对象容器（无值）。
 *
 * @param node - Schema 节点
 * @returns 如果是 DataFieldSchema 返回 true
 */
export function isDataField(node: SchemaNode): node is DataFieldSchema {
  // 条件分支容器（oneOf/anyOf）先排除：本身可能是 object + properties 形态，
  // 但应视为「布局透明」节点（Key 不进路径），而非数据字段
  if (isBranchNode(node)) {
    return false;
  }
  // DataArraySchema 也可能有 widget，需排除
  if ('items' in node) {
    return false;
  }
  // 子表单特例：带非空 widget 的 object 节点视为数据字段
  // （对齐 x-render：自定义组件为子表单时，其 Key 需进入数据路径）
  // 注意：widget 为空串视为「未指定」，走数据对象容器分支（防止设计器生成的空 widget 误判）
  if (
    'properties' in node &&
    'widget' in node &&
    typeof node.widget === 'string' &&
    node.widget.length > 0 &&
    node.type === 'object'
  ) {
    return true;
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
 * 判断给定的 schema 节点是否为数据对象容器
 *
 * 数据对象特征：type 为 'object'、不含 widget 属性、含 properties 属性。
 * 数据对象自身的 Key 会进入数据路径（可整体取值），其子字段继续下钻收集。
 *
 * @param node - Schema 节点
 * @returns 如果是 DataObjectSchema 返回 true
 */
export function isDataObject(node: SchemaNode): node is DataObjectSchema {
  // 条件分支容器（oneOf/anyOf）不视为数据对象容器（布局透明，Key 不进路径）
  if (isBranchNode(node)) {
    return false;
  }
  // 带非空 widget 的 object 节点视为数据字段（子表单特例），不走此分支
  const hasWidget = (n: SchemaNode) =>
    'widget' in n && typeof n.widget === 'string' && n.widget.length > 0;
  return node.type === 'object' && !hasWidget(node) && 'properties' in node;
}

/**
 * 判断给定的 schema 节点是否为数据数组
 *
 * 数据数组特征：type 为 'array' 且含 items 属性。
 * 数组整体计为一个字段（数组 items 子字段属于项作用域，不参与字段收集）。
 *
 * @param node - Schema 节点
 * @returns 如果是 DataArraySchema 返回 true
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
  // 条件分支容器先排除（布局透明，不视为数据节点）
  if (isBranchNode(node)) {
    return false;
  }
  return isDataField(node) || isDataObject(node) || isDataArray(node);
}

/**
 * 判断给定的 schema 节点是否为条件分支容器（oneOf / anyOf）
 *
 * 分支容器特征：存在 `oneOf` / `anyOf` / `branches` 键，且值为非空数组，
 * 数组中每个元素均包含 properties 对象。
 *
 * 分支容器是「布局透明」节点：Key 不进数据路径，由引擎决定活动分支渲染。
 *
 * @param node - Schema 节点
 * @returns 如果是分支容器返回 true
 */
export function isBranchNode(node: SchemaNode): node is BranchSchema {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return false;
  }
  const oneOf = (node as { oneOf?: unknown }).oneOf;
  const anyOf = (node as { anyOf?: unknown }).anyOf;
  // branches 优先，兼容 oneOf / anyOf 别名
  const branches = (node as { branches?: unknown }).branches ?? oneOf ?? anyOf;
  // 分支数组必须非空，且每个元素都包含有效的 properties 对象
  return (
    Array.isArray(branches) &&
    branches.length > 0 &&
    branches.every(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        typeof (b as { properties?: unknown }).properties === 'object' &&
        (b as { properties?: unknown }).properties !== null,
    )
  );
}

/**
 * 判断给定的 schema 节点是否为布局节点
 *
 * 布局节点特征：
 * - 不是数据节点
 * - 有 properties 属性（布局容器/面板），或是条件分支容器（oneOf/anyOf）
 *
 * @param node - Schema 节点
 * @returns 如果是 LayoutNode 返回 true
 */
export function isLayoutNode(node: SchemaNode): node is LayoutNode {
  return isBranchNode(node) || (!isDataNode(node) && 'properties' in node);
}

// ============================================================================
// 路径计算
// ============================================================================

/**
 * 计算节点在 Schema 树中的数据路径
 *
 * 路径规则（与 SchemaParser.walkProperties 一致）：
 * - 布局节点（card/tabs/grid...）：Key 不进入路径，透传父路径
 * - 数据节点（数组/字段/对象）：parentPath.key
 *
 * @param parentPath - 父级数据路径
 * @param key - 当前节点在 properties 中的键名
 * @param node - Schema 节点
 * @returns 该节点的数据路径
 */
export function resolveNodePath(
  parentPath: string,
  key: string,
  node: SchemaNode,
): string {
  return isLayoutNode(node)
    ? parentPath
    : parentPath
      ? `${parentPath}.${key}`
      : key;
}

// ============================================================================
// Schema 树通用遍历器
// ============================================================================

/**
 * Schema 树节点遍历回调
 *
 * 所有回调均为可选，未提供的回调对应的节点类型将被跳过（但仍会递归子节点）。
 */
export interface SchemaTreeVisitor {
  /** 条件分支容器（oneOf/anyOf）：遍历各分支的 properties 递归 */
  onBranch?: (
    branches: Array<{ properties?: Record<string, SchemaNode> }>,
    parentPath: string,
  ) => void;
  /** 布局节点（card/tabs/grid...）：递归其 properties（Key 不进入路径） */
  onLayout?: (
    node: SchemaNode,
    properties: Record<string, SchemaNode>,
    parentPath: string,
  ) => void;
  /** 数据数组（type: array + items）：已到达叶节点，不再递归 */
  onDataArray?: (node: SchemaNode, path: string) => void;
  /** 数据字段（叶子节点）：已到达叶节点，不再递归 */
  onDataField?: (node: SchemaNode, path: string) => void;
  /** 数据对象（type: object + properties）：递归其 properties */
  onDataObject?: (
    node: SchemaNode,
    properties: Record<string, SchemaNode>,
    path: string,
  ) => void;
  /** 未识别节点（无 properties 的非数据节点）：作为对象处理，递归其 properties */
  onUnknown?: (
    node: SchemaNode,
    properties: Record<string, SchemaNode>,
    nodePath: string,
  ) => void;
}

/**
 * 通用 Schema 树遍历器
 *
 * 封装节点类型判定与路径计算逻辑，调用方通过 visitor 回调按需处理各节点类型。
 * 路径规则与 SchemaParser.walkProperties 完全一致：
 * - 数据节点：path = parentPath.key
 * - 布局节点/分支容器：path = parentPath（Key 被丢弃）
 *
 * @param node - Schema 根节点
 * @param parentPath - 父级数据路径（根为 ''）
 * @param visitor - 节点遍历回调
 */
export function walkSchemaTree(
  node: SchemaNode | undefined | null,
  parentPath: string,
  visitor: SchemaTreeVisitor,
): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (isBranchNode(node)) {
    const bnode = node as BranchSchema & {
      oneOf?: unknown;
      anyOf?: unknown;
      branches?: unknown;
    };
    const list = bnode.branches ?? bnode.oneOf ?? bnode.anyOf;
    const all = Array.isArray(list)
      ? (list as Array<{ properties?: Record<string, SchemaNode> }>)
      : [];
    if (visitor.onBranch) {
      visitor.onBranch(all, parentPath);
    } else {
      // 默认：递归各分支 properties
      for (const branch of all) {
        for (const [key, child] of Object.entries(branch.properties ?? {})) {
          const childPath = resolveNodePath(parentPath, key, child);
          walkSchemaTree(child, childPath, visitor);
        }
      }
    }
    return;
  }

  if (isLayoutNode(node)) {
    const properties =
      (node as { properties?: Record<string, SchemaNode> }).properties ?? {};
    if (visitor.onLayout) {
      visitor.onLayout(node, properties, parentPath);
    } else {
      // 默认：递归 properties（Key 不进路径）
      for (const [key, child] of Object.entries(properties)) {
        const childPath = resolveNodePath(parentPath, key, child);
        walkSchemaTree(child, childPath, visitor);
      }
    }
    return;
  }

  if (isDataArray(node)) {
    if (visitor.onDataArray) {
      visitor.onDataArray(node, parentPath);
    }
    return;
  }

  if (isDataField(node)) {
    if (visitor.onDataField) {
      visitor.onDataField(node, parentPath);
    }
    return;
  }

  if (isDataObject(node)) {
    // 数据对象的路径在递归进入时已由 resolveNodePath 计算（即 parentPath）
    const nodePath = parentPath;
    const properties =
      (node as { properties?: Record<string, SchemaNode> }).properties ?? {};
    if (visitor.onDataObject) {
      visitor.onDataObject(node, properties, nodePath);
    } else {
      // 默认：递归 properties
      for (const [key, child] of Object.entries(properties)) {
        const childPath = resolveNodePath(nodePath, key, child);
        walkSchemaTree(child, childPath, visitor);
      }
    }
    return;
  }

  // 未识别节点（如顶层根对象）：按对象处理
  const properties = (node as { properties?: Record<string, SchemaNode> })
    .properties;
  if (properties) {
    if (visitor.onUnknown) {
      visitor.onUnknown(node, properties, parentPath);
    } else {
      for (const [key, child] of Object.entries(properties)) {
        const childPath = resolveNodePath(parentPath, key, child);
        walkSchemaTree(child, childPath, visitor);
      }
    }
  }
}

// ============================================================================
// Schema 生命周期工具（字段收集 / 初始值提取 / 变更对比 / 值迁移）
// ============================================================================

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

/**
 * 遍历 Schema 收集全部数据字段（数组整体计为字段，数组 items 子字段不收集）
 *
 * 委托 walkSchemaTree 处理节点类型判定与路径计算，自身仅定义「收集」语义。
 *
 * @param node
 * @param parentPath - 父路径（根为 ''）
 * @param entries - 收集器
 */
function collectFieldPaths(
  node: SchemaNode,
  parentPath: string,
  entries: SchemaFieldEntry[],
): void {
  walkSchemaTree(node, parentPath, {
    onBranch(branches, branchParentPath) {
      for (const branch of branches) {
        for (const [key, child] of Object.entries(branch.properties ?? {})) {
          // 分支子字段可能是布局节点（Key 需丢弃），统一用 resolveNodePath 计算
          const childPath = resolveNodePath(
            branchParentPath,
            key,
            child as SchemaNode,
          );
          collectFieldPaths(child as SchemaNode, childPath, entries);
        }
      }
    },
    onDataArray(_node, path) {
      entries.push({ path, node: _node });
    },
    onDataField(_node, path) {
      entries.push({ path, node: _node });
    },
    onDataObject(objNode, properties, objectPath) {
      // 数据对象自身也是字段（可整体取值），但继续下钻收集子字段
      if (objectPath !== '') {
        entries.push({ path: objectPath, node: objNode });
      }
      for (const [key, child] of Object.entries(properties)) {
        const childPath = resolveNodePath(objectPath, key, child as SchemaNode);
        collectFieldPaths(child as SchemaNode, childPath, entries);
      }
    },
  });
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
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
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

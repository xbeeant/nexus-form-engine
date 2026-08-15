// ============================================================================
// @nexus/form-engine-designer — Schema 树操作工具（不可变）
// ============================================================================
// 路径 path 为 property key 的数组，例如 ['card1', 'username']
// 表示 schema.properties.card1.properties.username

import {
  isDataArray,
  isDataField,
  isDataObject,
  isDeepEqual,
  isLayoutNode,
  type NexusSchema,
  type SchemaNode,
} from '@nexus/form-engine';

// ────────────────────────────────────────────────────────────────────────────
// 深拷贝
// Schema 通常是纯 JSON，但 rules.pattern 可能为 RegExp（JSON 序列化会丢失），
// 因此优先使用 structuredClone（保留 RegExp/Date/Map/Set），环境不支持时回退到序列化。
// ────────────────────────────────────────────────────────────────────────────

const _hasStructuredClone = typeof structuredClone === 'function';

function clone<T>(value: T): T {
  if (_hasStructuredClone) {
    return structuredClone(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

// ────────────────────────────────────────────────────────────────────────────
// 节点访问
// ────────────────────────────────────────────────────────────────────────────

/**
 * 从一个 properties 记录按路径段遍历，返回路径终点的节点
 */
export function getNodeAtProperties(
  props: Record<string, SchemaNode>,
  path: string[],
): SchemaNode | undefined {
  if (path.length === 0) {
    return undefined;
  }
  let current: SchemaNode | undefined = props[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!current) {
      return undefined;
    }
    const childProps = getPropertiesOf(current);
    if (!childProps) {
      return undefined;
    }
    current = childProps[path[i]];
  }
  return current;
}

/**
 * 获取一个节点的子 properties：
 * - object / layout / pane：返回 node.properties
 * - array：items 为 object 时返回 items.properties
 */
export function getPropertiesOf(
  node: SchemaNode,
): Record<string, SchemaNode> | undefined {
  if ('properties' in node) {
    return node.properties;
  }
  if ('items' in node && node.items.type === 'object') {
    return node.items.properties;
  }
  return undefined;
}

/**
 * 是否为容器节点（拥有 properties 或 items）
 */
export function isContainerNode(node: SchemaNode): boolean {
  return 'properties' in node || 'items' in node;
}

/**
 * 收集 schema 中所有会进入 formData 数据路径的字段路径（供变量选择器 / 依赖选择使用）
 * 遵循 §2 路径计算规则：
 * - 数据节点：Key 进入路径（对象/数组透传子字段，数组项子字段以 `key[0].sub` 表示）
 * - 布局节点：Key 被丢弃，路径透传父级
 * - 带 widget 的 object（子表单）视为叶子字段
 */
export function collectDataFieldPaths(schema: NexusSchema): string[] {
  return collectDataFieldOptions(schema).map((o) => o.value);
}

/**
 * 收集 schema 中所有会进入 formData 数据路径的字段（供变量选择器 / 依赖选择使用）
 * 返回「路径 + 字段标题」对：依赖字段（dependencies）等选择器显示字段名称
 * （title || key），提交/存储时使用路径 key
 */
export function collectDataFieldOptions(
  schema: NexusSchema,
): Array<{ value: string; label: string }> {
  const result: Array<{ value: string; label: string }> = [];
  const walk = (node: SchemaNode, parentPath: string, key: string): void => {
    // 数据节点路径 = 父路径 + 自身 key；布局节点不计算（Key 被丢弃）
    const ownPath = parentPath ? `${parentPath}.${key}` : key;
    const title = node.title || key;
    if (isDataArray(node)) {
      result.push({ value: ownPath, label: title });
      const items = node.items;
      if (items && typeof items === 'object') {
        if (isDataObject(items)) {
          walkProperties(items.properties, `${ownPath}[0]`);
        } else if (isDataField(items)) {
          result.push({ value: `${ownPath}[0]`, label: items.title || '项' });
        }
      }
      return;
    }
    if (isDataField(node)) {
      result.push({ value: ownPath, label: title });
      return;
    }
    if (isDataObject(node)) {
      walkProperties(node.properties, ownPath);
      return;
    }
    if (isLayoutNode(node)) {
      // 布局节点 Key 不进入路径：子节点沿用父路径
      walkProperties(node.properties, parentPath);
    }
  };

  const walkProperties = (
    props: Record<string, SchemaNode> | undefined,
    parentPath: string,
  ): void => {
    if (!props) {
      return;
    }
    for (const [key, child] of Object.entries(props)) {
      walk(child, parentPath, key);
    }
  };

  walkProperties(schema.properties, '');
  return result;
}

// 获取指定父路径下的 properties 记录（用于增删改）
function getPropertiesAt(
  schema: NexusSchema,
  parentPath: string[],
): Record<string, SchemaNode> | undefined {
  if (parentPath.length === 0) {
    return schema.properties;
  }
  const parent = getNodeAtProperties(schema.properties, parentPath);
  if (!parent) {
    return undefined;
  }
  return getPropertiesOf(parent);
}

// ────────────────────────────────────────────────────────────────────────────
// 增删改
// ────────────────────────────────────────────────────────────────────────────

/**
 * 在 parentPath 下新增一个子节点（深拷贝后写入）
 * parentPath 为空时添加到根 properties
 */
export function addChildToSchema(
  schema: NexusSchema,
  parentPath: string[],
  key: string,
  node: SchemaNode,
): NexusSchema {
  const next = clone(schema);
  const props = getPropertiesAt(next, parentPath);
  if (props) {
    props[key] = node;
  }
  return next;
}

/**
 * 移除路径终点节点
 */
export function removeNodeFromSchema(
  schema: NexusSchema,
  path: string[],
): NexusSchema {
  if (path.length === 0) {
    return schema;
  }
  const next = clone(schema);
  const parentPath = path.slice(0, -1);
  const key = path[path.length - 1];
  const props = getPropertiesAt(next, parentPath);
  if (props) {
    delete props[key];
  }
  return next;
}

/**
 * 将 patch 浅合并到路径终点节点
 */
export function updateNodeInSchema(
  schema: NexusSchema,
  path: string[],
  patch: Record<string, unknown>,
): NexusSchema {
  if (path.length === 0) {
    return schema;
  }
  const next = clone(schema);
  const node = getNodeAtProperties(next.properties, path);
  if (node) {
    Object.assign(node, patch);
  }
  return next;
}

/**
 * 将 fromPath 节点移动到 toParentPath 下
 * insertIndex 指定在目标父级中的最终位置（基于最终顺序），省略则追加到末尾
 */
export function moveNodeInSchema(
  schema: NexusSchema,
  fromPath: string[],
  toParentPath: string[],
  insertIndex?: number,
): NexusSchema {
  if (fromPath.length === 0) {
    return schema;
  }
  const next = clone(schema);
  const fromKey = fromPath[fromPath.length - 1];
  const fromParentPath = fromPath.slice(0, -1);

  const fromProps = getPropertiesAt(next, fromParentPath);
  if (!fromProps || !(fromKey in fromProps)) {
    return next;
  }
  const node = fromProps[fromKey];

  const toProps = getPropertiesAt(next, toParentPath);
  if (!toProps) {
    return next;
  }

  const sameParent = fromProps === toProps;
  // 目标父级删除前的快照
  const toEntries = Object.entries(toProps);

  // 从原父级移除
  delete fromProps[fromKey];

  let finalIndex = insertIndex;
  if (finalIndex === undefined) {
    finalIndex = toEntries.filter(([k]) => k !== fromKey).length;
  } else if (sameParent) {
    // 同一父级内移动：删除会让 fromKey 之后项索引前移
    const fromIndexInTo = toEntries.findIndex(([k]) => k === fromKey);
    if (fromIndexInTo !== -1 && fromIndexInTo < finalIndex) {
      finalIndex -= 1;
    }
  }

  const updatedEntries = toEntries.filter(([k]) => k !== fromKey);
  const clamped =
    finalIndex < 0
      ? 0
      : finalIndex > updatedEntries.length
        ? updatedEntries.length
        : finalIndex;
  updatedEntries.splice(clamped, 0, [fromKey, node]);

  // 重建目标 properties，保留插入顺序
  for (const k of Object.keys(toProps)) {
    delete toProps[k];
  }
  for (const [k, v] of updatedEntries) {
    toProps[k] = v;
  }
  return next;
}

/**
 * 重命名节点的 key（schema 结构级操作：删除旧 key + 添加新 key）
 * - newKey 已存在时返回原 schema，不覆盖
 * - 重命名后自动更新选中路径
 */
export function renameNodeInSchema(
  schema: NexusSchema,
  path: string[],
  newKey: string,
): { schema: NexusSchema; newPath: string[] } {
  if (path.length === 0) {
    return { schema, newPath: path };
  }
  const oldKey = path[path.length - 1];
  if (oldKey === newKey) {
    return { schema, newPath: path };
  }
  const parentPath = path.slice(0, -1);
  const next = clone(schema);
  const props = getPropertiesAt(next, parentPath);
  if (!props || !(oldKey in props)) {
    return { schema, newPath: path };
  }
  // 新 key 已存在则放弃，不覆盖
  if (newKey in props) {
    return { schema, newPath: path };
  }
  const entries = Object.entries(props);
  const oldIndex = entries.findIndex(([k]) => k === oldKey);

  // 重建：删除旧 key，在原位置插入新 key
  for (const k of Object.keys(props)) {
    delete props[k];
  }
  const updated: Array<[string, SchemaNode]> = [];
  for (let i = 0; i < entries.length; i++) {
    const [k, v] = entries[i];
    if (i === oldIndex) {
      updated.push([newKey, v]);
    } else {
      updated.push([k, v]);
    }
  }
  for (const [k, v] of updated) {
    props[k] = v;
  }

  const newPath = [...parentPath, newKey];
  return { schema: next, newPath };
}

// ────────────────────────────────────────────────────────────────────────────
// 工具
// ────────────────────────────────────────────────────────────────────────────

/**
 * Schema 节点的顶层关键字段（非 UI 组件属性）。
 * 这些属性直接写在 schema node 上，而非嵌套在 props 对象内。
 */
const SCHEMA_LEVEL_KEYS = new Set([
  // BaseSchemaNode
  'title',
  'description',
  'required',
  'rules',
  'reactions',
  'bind',
  'validate',
  'dependencies',
  'default',
  'props',
  'className',
  'style',
  'disabled',
  'readOnly',
  'readOnlyWidget',
  'hidden',
  'width',
  'order',
  'extra',
  'colSpan',
  'displayType',
  'labelWidth',
  'column',
  // DataFieldSchema
  'type',
  'widget',
  'enum',
  'enumNames',
  'placeholder',
  // 远程数据配置（远程数据组件的顶层扩展属性）
  'remoteData',
  // 注意：'format' 不在 schema 级列表中——
  // 属性面板编辑的 format 是 antd 控件的「显示格式」（date/time 系列），
  // 必须写入 node.props 才能经 state.props 透传到 widget；
  // JSON Schema 的校验语义（format: 'email' | 'url'）由 Parser 直接读 node.format，
  // 与属性面板写回路径互不干扰。
  // 字段级校验约束
  'pattern',
  'min',
  'max',
  // DataObjectSchema
  'properties',
  // DataArraySchema
  'items',
  // LayoutBaseProps extras
  'gap',
  'bordered',
  'span',
  'direction',
  'align',
  'justify',
  'wrap',
  // Designer internals
  '_lockedKey',
]);

/**
 * 读取节点用于属性面板的初始值：
 * - 直接保留 schema 级属性
 * - 扁平化 props 与 schema 级属性同一平面暴露给表单，
 * - 当节点使用 enum/enumNames（canonical 选项格式）而未显式配置 props.options 时，
 *   合成 options 供 value/label 编辑器回显
 */
export function flattenNodeForPropertyEditor(
  node: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...node };
  // 再展开 props（新统一格式）高优先级
  if (node.props && typeof node.props === 'object') {
    Object.assign(result, node.props as Record<string, unknown>);
  }
  if (
    result.options === undefined &&
    Array.isArray(node.enum) &&
    node.enum.length > 0
  ) {
    const names = Array.isArray(node.enumNames)
      ? (node.enumNames as unknown[])
      : [];
    result.options = (node.enum as unknown[]).map((value, index) => ({
      value,
      label: names[index] == null ? String(value) : String(names[index]),
    }));
  }
  return result;
}

/**
 * 将属性面板返回的 flat patch 拆分：
 * - schema 级属性 → 直接写在节点上
 * - 其余（UI 组件属性）→ 合并写入 node.props 对象（统一入口）
 */
export function nestPatchForNode(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const schemaPatch: Record<string, unknown> = {};
  let propsPatch: Record<string, unknown> | null = null;

  for (const [key, value] of Object.entries(patch)) {
    if (SCHEMA_LEVEL_KEYS.has(key)) {
      schemaPatch[key] = value;
    } else {
      if (!propsPatch) {
        propsPatch = {};
      }
      propsPatch[key] = value;
    }
  }

  if (propsPatch) {
    // UI 组件属性统一写入 props
    schemaPatch.props = propsPatch;
  }

  return schemaPatch;
}

/**
 * 从 NexusSchema 顶层提取表单级配置（供属性面板 form-level 编辑器作为 initialValues）
 *
 * 只提取 schema 顶层可配置键（displayType/labelWidth/colon/label/readOnly/column 等），
 * 而非整个 schema 对象——整个 schema 含 properties 与嵌套字段定义，
 * 不属于表单级配置的取值来源，直接作为 initialValues 是错误的。
 *
 * @param schema 被编辑的 NexusSchema
 * @param keys 表单级可编辑键集合（对应属性面板 formLevelProps 的 key）
 * @returns 仅包含 schema 中存在的表单级配置
 */
export function extractFormLevelConfig(
  schema: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in schema) {
      result[key] = schema[key];
    }
  }
  return result;
}

/**
 * 计算属性表单 allValues → 节点 patch 的差异：
 * - 空字符串（undefined / null / ''）默认视为「未赋值」，不写回 Schema——
 *   属性表单会把未触碰的字符串字段初始化为 ''，若写回会污染 Schema
 *   （如 bind:'' 被引擎当作 bind 路径导致数据 key 丢失、hidden:''/required:''
 *   被当作空表达式联动），因此空值统一跳过
 * - 但当字段被用户实际改动过（changedFields 包含该 key，即用户主动清空）时，
 *   空值以 undefined 写回，由 updateNodeWithNesting 执行删除（清空属性）
 * - 跳过与初始值深相等的字段（未触碰的字段不重复写回）
 *
 * @param initialValues 节点当前的扁平值（flattenNodeForPropertyEditor 输出）
 * @param allValues 属性表单当前全部值
 * @param changedFields 本表单实例中用户实际改动过的字段集合（'#' watcher 第三参累计）
 * @returns 需要写回节点的 patch（未改动字段不含任何空值；主动清空的字段值为 undefined）
 */
export function diffPropertyPatch(
  initialValues: Record<string, unknown>,
  allValues: Record<string, unknown>,
  changedFields?: ReadonlySet<string>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(allValues)) {
    if (value === undefined || value === null || value === '') {
      if (changedFields?.has(key)) {
        patch[key] = undefined;
      }
      continue;
    }
    if (isDeepEqual(initialValues[key], value)) {
      continue;
    }
    patch[key] = value;
  }
  return patch;
}

/**
 * 合并 props patch 到已存在的 props 中（UI 组件属性统一入口），
 * 而不是整体覆盖，避免修改一个属性时丢失其它属性。
 */
export function updateNodeWithNesting(
  schema: NexusSchema,
  path: string[],
  flatPatch: Record<string, unknown>,
): NexusSchema {
  if (path.length === 0) {
    return schema;
  }
  const next = clone(schema);
  const node = getNodeAtProperties(next.properties, path);
  if (!node) {
    return next;
  }
  const nodeRec = node as unknown as Record<string, unknown>;

  // value/label 选项编辑器：同步写出 canonical 的 enum + enumNames，
  // 使选项同时作用于控件展示、校验（enum 规则）与只读回显
  if (Array.isArray(flatPatch.options)) {
    const enumValues: unknown[] = [];
    const enumLabels: string[] = [];
    for (const item of flatPatch.options as unknown[]) {
      if (item && typeof item === 'object') {
        const rec = item as { value?: unknown; label?: unknown };
        enumValues.push(rec.value);
        enumLabels.push(
          rec.label == null ? String(rec.value ?? '') : String(rec.label),
        );
      } else {
        enumValues.push(item);
        enumLabels.push(String(item));
      }
    }
    nodeRec.enum = enumValues;
    nodeRec.enumNames = enumLabels;
  }

  // schema 级属性直接覆盖（undefined 视为清空，删除该 key）
  for (const [key, value] of Object.entries(flatPatch)) {
    if (SCHEMA_LEVEL_KEYS.has(key)) {
      if (value === undefined) {
        delete (nodeRec as Record<string, unknown>)[key];
      } else {
        (nodeRec as Record<string, unknown>)[key] = value;
      }
    }
  }

  // UI 组件属性：只合并进 props（统一入口）；
  const uiProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flatPatch)) {
    if (!SCHEMA_LEVEL_KEYS.has(key)) {
      uiProps[key] = value;
    }
  }
  if (Object.keys(uiProps).length > 0) {
    const oldProps =
      nodeRec.props && typeof nodeRec.props === 'object'
        ? (nodeRec.props as Record<string, unknown>)
        : {};
    const mergedProps = { ...oldProps, ...uiProps };
    // undefined 视为清空：从 props 中删除该属性，而非写入 undefined 残留
    for (const key of Object.keys(uiProps)) {
      if (uiProps[key] === undefined) {
        delete mergedProps[key];
      }
    }
    nodeRec.props = mergedProps;
  }
  return next;
}

/**
 * 生成唯一 property key：8 位随机字符 [a-z0-9]，确保不与已有 key 冲突
 */
export function generateKey(
  _props: Record<string, SchemaNode>,
  _base: string,
): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  do {
    key = '';
    for (let i = 0; i < 8; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (key in _props);
  return key;
}

/**
 * 节点显示标签：title || key || type
 */
export function getNodeLabel(node: SchemaNode, key: string): string {
  return node.title || key || node.type || '';
}

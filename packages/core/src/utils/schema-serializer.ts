// ============================================================================
// Schema Serializer - Schema序列化/反序列化工具
// 目标：支持设计器场景下的Schema序列化/反序列化
// ============================================================================

import type { NexusSchema } from '../types/schema';

/**
 * 序列化选项
 */
export interface SerializeOptions {
  /** 是否保留空值 */
  keepEmpty: boolean;

  /** 是否保留注释 */
  keepComments: boolean;

  /** 是否压缩输出 */
  compress: boolean;

  /** 是否保留字段顺序 */
  preserveOrder: boolean;

  /** 自定义序列化回调 */
  customSerializer?: (key: string, value: any) => any;

  /** 自定义反序列化回调 */
  customDeserializer?: (key: string, value: any) => any;
}

/**
 * 反序列化选项
 */
export interface DeserializeOptions {
  /** 是否自动填充缺失字段 */
  fillMissing: boolean;

  /** 是否严格模式（遇到未知字段报错） */
  strict: boolean;

  /** 是否支持base64压缩 */
  supportCompression: boolean;

  /** 自定义反序列化回调 */
  customDeserializer?: (key: string, value: any) => any;

  /** 自定义序列化回调 */
  customSerializer?: (key: string, value: any) => any;
}

/**
 * Schema差异结果
 */
export interface DiffResult {
  /** 新增的字段 */
  added: Array<{ path: string; value: any }>;

  /** 修改的字段 */
  changed: Array<{ path: string; old: any; new: any }>;

  /** 删除的字段 */
  removed: Array<{ path: string; value: any }>;

  /** 未变化的字段 */
  unchanged: Array<{ path: string; value: any }>;

  /** 总差异数 */
  totalChanges: number;
}

/**
 * Schema深度比较
 *
 * @param oldSchema - 旧Schema
 * @param newSchema - 新Schema
 * @returns 差异数组
 */
function diffSchema(
  oldSchema: any,
  newSchema: any,
): Array<{ key: string; old: any; new: any }> {
  const diff: Array<{ key: string; old: any; new: any }> = [];

  const allKeys = new Set<string>([
    ...Object.keys(oldSchema || {}),
    ...Object.keys(newSchema || {}),
  ]);

  for (const key of allKeys) {
    const oldValue = oldSchema?.[key];
    const newValue = newSchema?.[key];

    if (oldValue === undefined && newValue !== undefined) {
      diff.push({ key, old: undefined, new: newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      diff.push({ key, old: oldValue, new: undefined });
    } else if (oldValue !== newValue) {
      diff.push({ key, old: oldValue, new: newValue });
    }
  }

  return diff;
}

/**
 * 序列化Schema对象
 *
 * @param schema - NexusSchema
 * @param options - 序列化选项
 * @returns 序列化后的对象
 */
function serializeSchema(schema: NexusSchema, options: SerializeOptions): any {
  const serialized: any = {
    type: schema.type,
  };

  // 序列化properties
  if (schema.properties) {
    serialized.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      serialized.properties[key] = serializeSchemaNode(value, options);
    }
  }

  // 序列化顶层属性（displayType, labelWidth等）
  if (schema.displayType) {
    serialized.displayType = schema.displayType;
  }
  if (schema.labelWidth) {
    serialized.labelWidth = schema.labelWidth;
  }
  if (schema.colon !== undefined) {
    serialized.colon = schema.colon;
  }
  if (schema.label !== undefined) {
    serialized.label = schema.label;
  }
  if (schema.readOnly !== undefined) {
    serialized.readOnly = schema.readOnly;
  }
  if (schema.column !== undefined) {
    serialized.column = schema.column;
  }

  return serialized;
}

/**
 * 序列化Schema节点
 *
 * @param node - SchemaNode
 * @param options - 序列化选项
 * @returns 序列化后的节点
 */
function serializeSchemaNode(node: any, options: SerializeOptions): any {
  if (!node) {
    return null;
  }

  const serialized: any = {};

  // 保留注释（用于设计器）
  if (options.keepComments && node.description) {
    serialized._comment = node.description;
  }

  // 序列化type
  if (node.type) {
    serialized.type = node.type;
  }

  // 序列化widget
  if (node.widget) {
    serialized.widget = node.widget;
  }

  // 序列化required
  if (node.required !== undefined) {
    serialized.required = node.required;
  }

  // 序列化title
  if (node.title) {
    serialized.title = node.title;
  }

  // 序列化description
  if (node.description) {
    serialized.description = node.description;
  }

  // 序列化properties（对象/布局节点）
  if (node.properties) {
    serialized.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      serialized.properties[key] = serializeSchemaNode(value, options);
    }
  }

  // 序列化items（数组节点）
  if (node.items) {
    serialized.items = serializeSchemaNode(node.items, options);
  }

  // 序列化rules（校验规则）
  if (node.rules) {
    serialized.rules = node.rules.map((rule: any) => ({
      message: rule.message,
      type: rule.type,
      validator: rule.validator,
      trigger: rule.trigger,
    }));
  }

  // 序列化reactions（联动规则）
  if (node.reactions) {
    serialized.reactions = node.reactions.map((reaction: any) => ({
      dependencies: reaction.dependencies,
      when: reaction.when,
      fulfill: reaction.fulfill,
      otherwise: reaction.otherwise,
    }));
  }

  // 序列化其他属性（排除空值）
  for (const key of Object.keys(node)) {
    if (
      ['type', 'widget', 'properties', 'items', 'rules', 'reactions'].includes(
        key,
      )
    ) {
      continue;
    }

    const value = node[key];

    // 跳过空值（除非keepEmpty为true）
    if (value === undefined || value === null || value === '') {
      if (options.keepEmpty) {
        serialized[key] = value;
      }
      continue;
    }

    // 序列化enum和enumNames（转换为字符串）
    if (key === 'enum' || key === 'enumNames') {
      serialized[key] = Array.isArray(value) ? value : [value];
      continue;
    }

    // 序列化其他属性
    if (options.customSerializer) {
      const serializedValue = options.customSerializer(key, value);
      if (serializedValue !== undefined) {
        serialized[key] = serializedValue;
      }
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * 序列化Schema（压缩空值、注释）
 *
 * @param schema - NexusSchema
 * @param options - 序列化选项
 * @returns 序列化后的JSON字符串
 */
export function serialize(
  schema: NexusSchema,
  options?: Partial<SerializeOptions>,
): string {
  const opts = {
    keepEmpty: false,
    keepComments: false,
    compress: true,
    preserveOrder: true,
    ...options,
  };

  const serialized = serializeSchema(schema, opts);

  if (opts.compress) {
    return compress(JSON.stringify(serialized));
  }

  return JSON.stringify(serialized, null, 2);
}

/**
 * 反序列化Schema（支持base64压缩）
 *
 * @param serialized - 序列化后的字符串
 * @param options - 反序列化选项
 * @returns NexusSchema
 */
export function deserialize(
  serialized: string,
  options?: Partial<DeserializeOptions>,
): NexusSchema {
  const opts = {
    fillMissing: true,
    strict: false,
    supportCompression: true,
    ...options,
  };

  let data = serialized;

  // 尝试base64解码
  if (opts.supportCompression) {
    try {
      const decoded = atob(data);
      data = decoded;
    } catch (_e) {
      // 不是base64格式，使用原字符串
    }
  }

  const parsed = JSON.parse(data, opts.customDeserializer);

  return parsed;
}

/**
 * Schema差异检测（用于diff对比）
 *
 * @param oldSchema - 旧Schema
 * @param newSchema - 新Schema
 * @returns DiffResult
 */
export function diff(
  oldSchema: NexusSchema,
  newSchema: NexusSchema,
): DiffResult {
  const oldProps = oldSchema.properties || {};
  const newProps = newSchema.properties || {};

  const added: Array<{ path: string; value: any }> = [];
  const changed: Array<{ path: string; old: any; new: any }> = [];
  const removed: Array<{ path: string; value: any }> = [];
  const unchanged: Array<{ path: string; value: any }> = [];

  const allPaths = new Set<string>([
    ...Object.keys(oldProps),
    ...Object.keys(newProps),
  ]);

  for (const path of allPaths) {
    const oldValue = oldProps[path];
    const newValue = newProps[path];

    if (!oldValue && newValue) {
      // 新增
      added.push({ path, value: newValue });
    } else if (oldValue && !newValue) {
      // 删除
      removed.push({ path, value: oldValue });
    } else if (oldValue && newValue) {
      // 检查是否变化
      const schemaDiff = diffSchema(oldValue, newValue);
      if (schemaDiff.length > 0) {
        changed.push({ path, old: oldValue, new: newValue });
      } else {
        unchanged.push({ path, value: oldValue });
      }
    }
  }

  return {
    added,
    changed,
    removed,
    unchanged,
    totalChanges: added.length + changed.length + removed.length,
  };
}

/**
 * 压缩JSON字符串
 *
 * @param json - JSON字符串
 * @returns 压缩后的字符串
 */
export function compress(json: string): string {
  return json
    .replace(/\s+/g, ' ') // 合并空白
    .replace(/,\s*/g, ',') // 移除逗号后的空格
    .replace(/:\s*/g, ':'); // 移除冒号后的空格
}

/**
 * 基于base64压缩Schema
 *
 * @param schema - NexusSchema
 * @returns Base64编码的字符串
 */
export function compressToBase64(schema: NexusSchema): string {
  const serialized = serialize(schema);
  return btoa(encodeURIComponent(serialized));
}

/**
 * 从base64解压Schema
 *
 * @param base64 - Base64编码的字符串
 * @returns NexusSchema
 */
export function decompressFromBase64(base64: string): NexusSchema {
  const serialized = decodeURIComponent(atob(base64));
  return deserialize(serialized);
}

/**
 * 计算Schema大小
 *
 * @param schema - NexusSchema
 * @returns Schema大小（字节）
 */
export function sizeOf(schema: NexusSchema): number {
  const serialized = serialize(schema);
  return new Blob([serialized]).size;
}

/**
 * 计算Schema压缩率
 *
 * @param schema - NexusSchema
 * @returns 压缩率（百分比）
 */
export function compressionRate(schema: NexusSchema): number {
  const original = JSON.stringify(schema);
  const compressed = compressToBase64(schema);
  const originalSize = new Blob([original]).size;
  const compressedSize = new Blob([compressed]).size;

  return ((originalSize - compressedSize) / originalSize) * 100;
}

/**
 * @deprecated 兼容旧 API：类转换为纯函数后，请直接使用 serialize/deserialize/diff/compress 等导出函数
 */
export const SchemaSerializer = {
  serialize,
  deserialize,
  diff,
  compress,
  compressToBase64,
  decompressFromBase64,
  sizeOf,
  compressionRate,
};

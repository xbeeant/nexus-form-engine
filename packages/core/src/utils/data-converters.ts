// ============================================================================
// DataConverters - 数据格式转换工具
// 目标：支持多种数据格式的自动转换（JSON/FormData/Multipart）
// ============================================================================

import type { NexusSchema } from '../types/schema';

/**
 * 格式化选项
 */
export interface FormatOptions {
  /** 是否保留隐藏字段（hidden字段） */
  includeHidden?: boolean;
  /** 自定义格式化回调（按字段） */
  formatField?: (value: unknown, format?: string) => unknown;
  /** 格式化失败时的默认值 */
  defaultValue?: unknown;
}

/**
 * 检查字段是否为隐藏字段
 *
 * @param schema - 表单Schema定义
 * @param path - 字段路径
 * @returns 是否隐藏
 */
function isHiddenField(schema: NexusSchema, path: string): boolean {
  const segments = path.split('.');

  // 递归检查字段是否为hidden
  const checkHidden = (node: any, currentSegments: string[]): boolean => {
    if (currentSegments.length === 0) {
      return false;
    }

    const key = currentSegments[0];
    const nextSegments = currentSegments.slice(1);

    if (!node[key]) {
      return false;
    }

    const field = node[key];
    const isField =
      field.type === 'string' ||
      field.type === 'number' ||
      field.type === 'boolean' ||
      field.type === 'integer';

    if (isField && currentSegments.length === 1) {
      // 检查hidden属性
      return field.hidden === true;
    }

    if (field.properties) {
      return checkHidden(field.properties, nextSegments);
    }

    return false;
  };

  return checkHidden(schema.properties, segments);
}

/**
 * 检查是否为日期格式
 *
 * @param format - 格式字符串
 * @returns 是否为日期格式
 */
function isDateFormat(format: string): boolean {
  return /YYYY|MM|DD|HH|mm|ss/i.test(format);
}

/**
 * 检查是否为金额格式
 *
 * @param format - 格式字符串
 * @returns 是否为金额格式
 */
function isCurrencyFormat(format: string): boolean {
  return /￥|\$|¥|USD|CNY|RMB/i.test(format);
}

/**
 * 检查是否为数字格式
 *
 * @param format - 格式字符串
 * @returns 是否为数字格式
 */
function isNumberFormat(format: string): boolean {
  return /#[,]?\d+\.\d+|#,/i.test(format);
}

/**
 * 格式化日期
 *
 * @param value - 值
 * @param format - 格式字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(value: unknown, format: string): string {
  if (value instanceof Date) {
    const map = {
      YYYY: value.getFullYear().toString(),
      MM: String(value.getMonth() + 1).padStart(2, '0'),
      DD: String(value.getDate()).padStart(2, '0'),
      HH: String(value.getHours()).padStart(2, '0'),
      mm: String(value.getMinutes()).padStart(2, '0'),
      ss: String(value.getSeconds()).padStart(2, '0'),
    };

    let formatted = format;
    for (const [key, val] of Object.entries(map)) {
      formatted = formatted.replace(new RegExp(key, 'gi'), val);
    }

    return formatted;
  }

  return String(value ?? '');
}

/**
 * 格式化金额
 *
 * @param value - 值
 * @param format - 格式字符串
 * @returns 格式化后的金额字符串
 */
function formatCurrency(value: unknown, format: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value ?? '');
  }

  const currency = /￥|\$|¥/.test(format) ? /￥|\$|¥/.exec(format)![0] : '￥';
  return `${currency}${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * 格式化数字
 *
 * @param value - 值
 * @param format - 格式字符串
 * @returns 格式化后的数字字符串
 */
function formatNumber(value: unknown, _format: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value ?? '');
  }

  // 替换#,##0.00等格式
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 根据字段的format格式化值
 *
 * 支持的格式：
 * - 日期格式：YYYY-MM-DD, YYYY/MM/DD等
 * - 金额格式：￥1,000.00, $1,000.00等
 * - 数字格式：#,##0.00等
 * - 自定义格式
 *
 * @param value - 原始值
 * @param format - 格式字符串
 * @returns 格式化后的值
 */
export function formatField(value: unknown, format?: string): unknown {
  if (format === undefined) {
    return value;
  }

  // 日期格式化
  if (isDateFormat(format)) {
    return formatDate(value, format);
  }

  // 金额格式化
  if (isCurrencyFormat(format)) {
    return formatCurrency(value, format);
  }

  // 数字格式化
  if (isNumberFormat(format)) {
    return formatNumber(value, format);
  }

  // 默认返回原始值
  return value;
}

/**
 * 将JSON数据转换为FormData（multipart/form-data）
 *
 * @param schema - 表单Schema定义
 * @param formData - JSON格式的表单数据
 * @param options - 转换选项
 * @returns FormData对象
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * const schema = { /* ... *\/ };
 * const data = { name: 'John', email: 'john@example.com' };
 *
 * toFormData(schema, data);
 * formData.get('name'); // 'John'
 * ```
 */
export function toFormData(
  schema: NexusSchema,
  formData: Record<string, unknown>,
  options?: FormatOptions,
): FormData {
  const fd = new FormData();
  const {
    includeHidden = false,
    formatField: formatFieldFn,
    defaultValue = '',
  } = options || {};

  for (const [key, value] of Object.entries(formData)) {
    // 检查字段是否可见
    if (!includeHidden && isHiddenField(schema, key)) {
      continue;
    }

    // 格式化字段值
    let formattedValue = value;
    if (formatFieldFn) {
      formattedValue = formatFieldFn(value);
    } else if (typeof value === 'object' && value !== null) {
      // 处理嵌套对象
      formattedValue = JSON.stringify(value);
    }

    fd.append(key, String(formattedValue ?? defaultValue));
  }

  return fd;
}

/**
 * 将JSON数据转换为Multipart格式（Map<string, File | string>）
 *
 * @param schema - 表单Schema定义
 * @param formData - JSON格式的表单数据
 * @param options - 转换选项
 * @returns Multipart数据Map
 *
 * @example
 * ```typescript
 * const data = { name: 'John', avatar: fileObject };
 * const multipart = toMultipart(schema, data);
 * multipart.get('avatar'); // File对象
 * ```
 */
export function toMultipart(
  schema: NexusSchema,
  formData: Record<string, unknown>,
  options?: FormatOptions,
): Map<string, File | string> {
  const map = new Map<string, File | string>();
  const {
    includeHidden = false,
    formatField: formatFieldFn,
    defaultValue = '',
  } = options || {};

  for (const [key, value] of Object.entries(formData)) {
    // 检查字段是否可见
    if (!includeHidden && isHiddenField(schema, key)) {
      continue;
    }

    // 格式化字段值
    let formattedValue: string | File;
    if (formatFieldFn) {
      formattedValue = formatFieldFn(value) as string | File;
    } else if (value instanceof File) {
      formattedValue = value;
    } else if (typeof value === 'object' && value !== null) {
      // 处理嵌套对象
      formattedValue = JSON.stringify(value);
    } else {
      formattedValue = String(value);
    }

    map.set(key, formattedValue ?? String(defaultValue));
  }

  return map;
}

/**
 * 将JSON数据转换为URLSearchParams格式
 *
 * @param schema - 表单Schema定义
 * @param formData - JSON格式的表单数据
 * @param options - 转换选项
 * @returns URLSearchParams对象
 *
 * @example
 * ```typescript
 * const data = { name: 'John', email: 'john@example.com' };
 * const params = toSearchParams(schema, data);
 * params.toString(); // 'name=John&email=john%40example.com'
 * ```
 */
export function toSearchParams(
  schema: NexusSchema,
  formData: Record<string, unknown>,
  options?: FormatOptions,
): URLSearchParams {
  const params = new URLSearchParams();
  const {
    includeHidden = false,
    formatField: formatFieldFn,
    defaultValue = '',
  } = options || {};

  for (const [key, value] of Object.entries(formData)) {
    // 检查字段是否可见
    if (!includeHidden && isHiddenField(schema, key)) {
      continue;
    }

    // 格式化字段值
    let formattedValue = value;
    if (formatFieldFn) {
      formattedValue = formatFieldFn(value);
    } else if (typeof value === 'object' && value !== null) {
      // 处理嵌套对象
      formattedValue = JSON.stringify(value);
    }

    params.set(key, String(formattedValue ?? defaultValue));
  }

  return params;
}

/**
 * @deprecated 兼容旧 API：类转换为纯函数后，请直接使用 toFormData/toMultipart/toSearchParams/formatField
 */
export const DataConverter = {
  toFormData,
  toMultipart,
  toSearchParams,
  formatField,
};

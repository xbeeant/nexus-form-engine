/**
 * omitNilDeep — 递归移除空值（undefined / null / ''）
 *
 * ProForm omitNil 对齐：提交/取值时过滤掉未填写的空值字段。
 * - 对象：移除值为空的键（递归处理嵌套对象）
 * - 数组：逐项递归处理（保留数组结构与长度）
 * - 0 / false / NaN 等非空值保留
 */
export function omitNilDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => omitNilDeep(item));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || item === null || item === '') {
        continue;
      }
      result[key] = omitNilDeep(item);
    }
    return result;
  }
  return value;
}
// ============================================================================
// value-utils — 通用值操作工具函数（与 Schema 无关）
//
// 纯 JavaScript 工具，不依赖任何 Schema 类型。
// 路径操作、深比较、类型转换、空值过滤等。
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
 * 使用点分隔路径从对象中读取嵌套值
 *
 * 若源对象为空值，或路径中任一中间段为 null / undefined / 非对象类型，
 * 均返回 undefined（安全取值，不抛错）。
 *
 * @param obj - 待遍历的源对象
 * @param path - 点分隔的属性路径（如 "user.address.city"）
 * @returns 指定路径处的值；路径无法解析时返回 undefined
 */
export function getPathValue(
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
 * 使用点分隔路径向对象写入嵌套值
 *
 * 步骤：
 * 1. 将路径字符串按 '.' 分割为数组
 * 2. 遍历路径数组，逐层创建对象（如果不存在）
 * 3. 设置最终 key 的值
 *
 * @param obj - 目标对象
 * @param path - 点分隔的属性路径（如 "user.address.city"）
 * @param value - 要写入的值
 */
export function setPathValue(
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
 * 深度比较两个值是否相等
 *
 * 支持：原始值 / 对象 / 数组 / 嵌套结构（Date 按时间戳比较）
 * 用于 FieldState.dirty 判定（值写入时调用，非订阅路径，无性能顾虑）
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 深比较相等返回 true
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (a === null || b === null) {
    return false;
  }
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (typeof a !== 'object') {
    return false;
  }
  if (Array.isArray(a)) {
    const arrB = b as unknown[];
    if (a.length !== arrB.length) {
      return false;
    }
    return a.every((item, i) => isDeepEqual(item, arrB[i]));
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => isDeepEqual(objA[key], objB[key]));
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

/**
 * 判断字符串是否为完整的 `{{ }}` 模板表达式
 *
 * 与 Engine.evaluateExpression 提取语义一致（完全包裹的表达式才会被求值）：
 * - `"{{ formData.a * 2 }}"` → true（表达式，运行期求值）
 * - `"静态文本"` / `"前缀 {{ formData.a }}"` → false（原样透传）
 *
 * 渲染层/解析器用它识别「表达式字符串」，确保表达式的值在到达 UI 前已被求值，
 * 而非把 `{{ }}` 字面量直接传给 widget。
 *
 * @param value - 待判定值
 * @returns 是完整模板表达式字符串返回 true
 */
export function isExpressionString(value: unknown): value is string {
  return typeof value === 'string' && /^\{\{[\s\S]+\}\}$/.test(value);
}

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

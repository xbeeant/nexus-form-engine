// ============================================================================
// validator-response — 校验器返回值归一化工具
//
// 校验函数的返回值历史上只有 `string[]`（空数组 = 通过）一种形式，但
// 业务侧常以 `{ status: boolean; message: string }` 等「接口响应」风格
// 写校验逻辑。本工具提供统一归一化入口，把以下形式全部折叠为
// `string[]`（空数组 = 通过 / null = 通过）:
//
//   1. string[]                       — 错误消息数组（推荐，规范形式）
//   2. string                         — 单条错误消息
//   3. { status: boolean; message: string | string[] } — 接口响应风格
//   4. null | undefined               — 通过
//   5. Promise<...>                   — 由调用方在 await 之后再次归一化
//   6. 其它未知值                      — 静默忽略（视为通过，避免把异常抛到调用栈）
//
// 调用前请先用 `isThenable` 判断是否异步；异步结果需在 await 之后再次调用本工具。
// ============================================================================

/**
 * 标准「接口响应」风格校验结果。
 *
 * 用于在 widget 内部直接复用业务后端 `validXxx()` 这类「返回 `{ status, message }`」
 * 的接口返回值，无需在 widget 端再二次拆箱。
 */
export interface ValidatorStatusResponse {
  /** 校验是否通过：true = 通过（message 会被忽略），false = 失败 */
  status: boolean;
  /** 错误消息：失败时为 string 或 string[]；通过时建议省略/置空 */
  message?: string | string[];
}

/**
 * 校验函数支持的全部返回形式。
 *
 * - `string[]`：规范形式，空数组 = 通过
 * - `string`：单条错误消息（视为 `[message]`）
 * - `ValidatorStatusResponse`：业务接口风格
 * - `null` / `undefined`：通过
 * - `Promise<...>`：异步，由调用方在 await 后再次归一化
 */
export type ValidatorResponse =
  | string[]
  | string
  | ValidatorStatusResponse
  | null
  | undefined;

/**
 * 归一化结果：
 * - `null` 表示校验通过（errors.length === 0 的语义），避免调用方在循环中 push `[]`
 * - `string[]` 表示错误消息列表（已去重 / 过滤空字符串 / 强转 string）
 */
export type NormalizedValidatorResult = string[] | null;

/**
 * 判断值是否为「接口响应」风格校验结果
 *
 * 仅匹配 `{ status: boolean, message?: string | string[] }` 形态，
 * 避免与普通 `string[]` / `string` 误判。
 */
function isStatusResponse(value: unknown): value is ValidatorStatusResponse {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const obj = value as { status?: unknown; message?: unknown };
  // 必须是 plain object（无 then 方法），避免与 Promise 误判
  if (typeof (obj as { then?: unknown }).then === 'function') {
    return false;
  }
  return typeof obj.status === 'boolean';
}

/**
 * 把 message 字段归一化为 string[]，过滤空字符串
 */
function normalizeMessage(message: string | string[] | undefined): string[] {
  if (message === undefined || message === null) {
    return [];
  }
  if (Array.isArray(message)) {
    return message.filter(
      (m): m is string => typeof m === 'string' && m.length > 0,
    );
  }
  if (typeof message === 'string' && message.length > 0) {
    return [message];
  }
  return [];
}

/**
 * 归一化校验器的同步返回值
 *
 * 返回 `null` 表示校验通过；返回 `string[]`（已过滤空值）表示错误列表。
 * 对于 Thenable（Promise）调用方应先 await 再传入本函数。
 */
export function normalizeValidatorResponse(
  result: unknown,
): NormalizedValidatorResult {
  // null / undefined：通过
  if (result === null || result === undefined) {
    return null;
  }

  // string[]：直接过滤空串
  if (Array.isArray(result)) {
    const errors = result.filter(
      (m): m is string => typeof m === 'string' && m.length > 0,
    );
    return errors.length > 0 ? errors : null;
  }

  // string：单条错误
  if (typeof result === 'string') {
    return result.length > 0 ? [result] : null;
  }

  // { status, message }：接口响应风格
  if (isStatusResponse(result)) {
    if (result.status) {
      return null;
    }
    const errors = normalizeMessage(result.message);
    return errors.length > 0 ? errors : null;
  }

  // 其它未知值（number / boolean / 异常 object）：静默忽略
  // —— 不抛错，保证一个写错返回类型的 validator 不会拖垮整次校验链
  return null;
}

// ============================================================================
// ExpressionSandbox — 表达式安全求值沙箱
// 目标：确保 {{ }} 表达式求值的安全性，防止恶意代码执行
// ============================================================================

import type { ReactionContext } from './types/schema';

/**
 * 黑名单：禁止访问的属性和API
 * 包括：window, document, eval, Function构造函数等
 */
const BLACKLIST = new Set([
  // 全局对象
  'window',
  'self',
  'global',
  'globalThis',

  // DOM API
  'document',
  'documentElement',
  'body',
  'head',
  'location',
  'history',
  'navigator',
  'screen',
  'frames',
  'parent',
  'top',

  // 构造函数
  'eval',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'IndexedDB',
  'localStorage',
  'sessionStorage',

  // 危险方法
  'constructor',
  'prototype',
  '__proto__',
  'apply',
  'call',
  'bind',

  // 其他危险API
  'importScripts',
  'BroadcastChannel',
  'Worker',
  'import',
  'require',
]);

/**
 * 白名单：允许访问的上下文变量
 * 这些变量由调用方注入，不包含任何危险API
 */
const CONTEXT_WHITELIST = new Set([
  '$deps',
  '$self',
  '$form',
  '$index',
  'formData',
  'rootValue',
]);

/**
 * 错误处理策略
 * - strict: 抛出错误（开发环境推荐）
 * - default: 返回默认值（生产环境推荐）
 * - silent: 不处理（不推荐）
 */
export const ErrorHandlerStrategy = {
  STRICT: 'strict',
  DEFAULT: 'default',
  SILENT: 'silent',
} as const;
export type ErrorHandlerStrategy =
  (typeof ErrorHandlerStrategy)[keyof typeof ErrorHandlerStrategy];

export interface EvaluateOptions {
  /** 错误处理策略 */
  errorHandler?: ErrorHandlerStrategy;

  /** 默认返回值（当表达式求值失败时） */
  defaultValue?: unknown;

  /** 是否允许访问__proto__（仅用于调试） */
  allowPrototypeAccess?: boolean;

  /** 性能统计回调 */
  onEvaluate?: (expression: string, duration: number) => void;
}

/**
 * ExpressionSandbox — 表达式安全求值沙箱
 *
 * 核心职责：
 * - 黑名单检查：防止访问dangerous properties
 * - 白名单限制：只允许指定上下文变量
 * - 错误隔离：单个表达式失败不影响其他表达式
 * - 性能监控：统计求值耗时
 */
export class ExpressionSandbox {
  private errorHandler: ErrorHandlerStrategy;
  private defaultValue: unknown;
  private allowPrototypeAccess: boolean;
  private evaluationCount: number = 0;
  private errorCount: number = 0;
  private evaluationTimes: number[] = [];

  constructor(options?: EvaluateOptions) {
    this.errorHandler = options?.errorHandler ?? ErrorHandlerStrategy.DEFAULT;
    this.defaultValue = options?.defaultValue ?? undefined;
    this.allowPrototypeAccess = options?.allowPrototypeAccess ?? false;
  }

  /**
   * 创建安全的求值上下文
   *
   * @param context - ReactionContext
   * @returns 暴露给表达式的上下文对象（白名单过滤）
   */
  createContext(context: ReactionContext): Record<string, unknown> {
    const safeContext: Record<string, unknown> = {};

    for (const key of CONTEXT_WHITELIST) {
      safeContext[key] = (context as unknown as Record<string, unknown>)[key];
    }

    return safeContext;
  }

  /**
   * 安全求值单个表达式
   *
   * @param expression - 表达式字符串（不含 {{ }}）
   * @param context - 表达式上下文
   * @param options - 可选的求值配置
   * @returns 求值结果，失败时根据errorHandler策略返回默认值或抛出错误
   */
  evaluate(
    expression: string,
    context: ReactionContext,
    options?: EvaluateOptions,
  ): unknown {
    const startTime = performance.now();
    this.evaluationCount++;

    try {
      // 1. 清理并检查表达式
      const sanitized = this.sanitizeExpression(expression);
      this.lastExpression = sanitized;

      // 2. 构建安全上下文
      const safeContext = this.createContext(context);

      // 3. 安全求值
      const keys = Object.keys(safeContext);
      const values = Object.values(safeContext);
      const fn = new Function(...keys, `return (${sanitized});`);
      const result = fn(...values);

      // 4. 额外的安全检查（防止绕过白名单）
      if (this.isDangerousValue(result)) {
        console.warn(`[ExpressionSandbox] Dangerous value returned:`, result);
        throw new Error(
          `Return value contains dangerous data: ${typeof result}`,
        );
      }

      // 5. 记录性能
      const duration = performance.now() - startTime;
      if (options?.onEvaluate) {
        options.onEvaluate(expression, duration);
      }
      this.recordEvaluationTime(duration);

      return result;
    } catch (error) {
      this.errorCount++;
      this.recordError(error);

      switch (this.errorHandler) {
        case ErrorHandlerStrategy.STRICT:
          throw error;

        case ErrorHandlerStrategy.DEFAULT:
          return this.defaultValue;

        case ErrorHandlerStrategy.SILENT:
          return this.defaultValue;
      }
    }
  }

  /**
   * 批量求值多个表达式（性能优化）
   *
   * @param expressions - 表达式映射表 { key: expression }
   * @param context - 表达式上下文
   * @param options - 可选的求值配置
   * @returns 求值结果映射表 { key: result }
   */
  evaluateBatch(
    expressions: Record<string, string>,
    context: ReactionContext,
    options?: EvaluateOptions,
  ): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    const startTime = performance.now();

    for (const [key, expr] of Object.entries(expressions)) {
      try {
        results[key] = this.evaluate(expr, context, options);
      } catch (error) {
        console.warn(
          `[ExpressionSandbox] Batch evaluate failed for key "${key}":`,
          error,
        );
        results[key] = this.defaultValue;
      }
    }

    const duration = performance.now() - startTime;
    this.recordEvaluationTime(duration);

    return results;
  }

  /**
   * 清理和验证表达式
   *
   * @param expression - 原始表达式
   * @returns 清理后的安全表达式
   */
  private sanitizeExpression(expression: string): string {
    const trimmed = expression.trim();

    // 1. 检查是否为空
    if (!trimmed) {
      return 'false';
    }

    // 2. 检查是否包含{{}}包裹的子表达式（暂不支持嵌套）
    if (trimmed.includes('{{')) {
      throw new Error(
        'Nested expressions are not supported. Use evaluate for nested expressions.',
      );
    }

    // 3. 检查是否包含危险标识符（token 级黑名单检查）
    // 使用 token 匹配而非 substring，避免误伤 $self / $deps / formData 等上下文变量
    const tokens = trimmed.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) ?? [];
    for (const token of tokens) {
      if (BLACKLIST.has(token)) {
        throw new Error(`Expression contains blocked keyword: ${token}`);
      }
    }

    // 4. 检查是否包含危险的方法调用
    const dangerousPatterns = [
      /new\s+\w+\s*\(/, // new Object()
      /Function\s*\(/, // Function()
      /Array\.from\s*\(/, // Array.from()
      /Array\s*\(\s*\)\s*\{/, // Array()
      /eval\s*\(/, // eval()
      /\$\(([^)]+)\)\s*\(/, // $1(expression)
      /\.constructor\s*\(/, // .constructor()
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        throw new Error(
          `Expression contains dangerous method call: ${pattern}`,
        );
      }
    }

    return trimmed;
  }

  /**
   * 检查返回值是否危险
   *
   * 沙箱上下文只暴露白名单变量，返回值只能来源于这些变量或表达式计算结果，
   * 因此仅拦截原型污染相关的自有键，允许正常的对象/数组返回值
   *
   * @param value - 待检查的值
   * @returns 如果危险返回 true
   */
  private isDangerousValue(value: unknown): boolean {
    if (this.allowPrototypeAccess) {
      return false;
    }
    if (value === null || typeof value !== 'object') {
      return false;
    }
    const object = value as Record<string, unknown>;
    return (
      Object.hasOwn(object, '__proto__') || Object.hasOwn(object, 'constructor')
    );
  }

  /**
   * 记录错误日志
   *
   * @param error - 捕获的错误对象
   */
  private recordError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    if (this.errorHandler === ErrorHandlerStrategy.STRICT) {
      console.error(
        `[ExpressionSandbox] Evaluation failed:`,
        message,
        '\nExpression:',
        this.lastExpression,
        '\nContext keys:',
        Array.from(CONTEXT_WHITELIST),
      );
    } else {
      console.warn(
        `[ExpressionSandbox] Evaluation failed (fallback to default):`,
        message,
      );
    }
  }

  /**
   * 记录求值时间
   *
   * @param duration - 求值耗时（毫秒）
   */
  private recordEvaluationTime(duration: number): void {
    this.evaluationTimes.push(duration);
    // 保留最近100次求值时间
    if (this.evaluationTimes.length > 100) {
      this.evaluationTimes.shift();
    }
  }

  // =========================================================================
  // 统计信息
  // =========================================================================

  /**
   * 获取求值统计信息
   *
   * @returns 统计信息对象
   */
  getStats(): {
    evaluationCount: number;
    errorCount: number;
    avgEvaluationTime: number;
    maxEvaluationTime: number;
    minEvaluationTime: number;
  } {
    const count = this.evaluationCount;
    if (count === 0) {
      return {
        evaluationCount: 0,
        errorCount: 0,
        avgEvaluationTime: 0,
        maxEvaluationTime: 0,
        minEvaluationTime: 0,
      };
    }

    const total = this.evaluationTimes.reduce((a, b) => a + b, 0);
    const avg = total / count;
    const max = Math.max(...this.evaluationTimes);
    const min = Math.min(...this.evaluationTimes);

    return {
      evaluationCount: count,
      errorCount: this.errorCount,
      avgEvaluationTime: avg,
      maxEvaluationTime: max,
      minEvaluationTime: min,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.evaluationCount = 0;
    this.errorCount = 0;
    this.evaluationTimes = [];
  }

  /**
   * 获取最后执行的表达式（用于调试）
   *
   * @returns 最后执行的表达式，未执行返回null
   */
  getLastExpression(): string | null {
    return this.lastExpression;
  }

  private lastExpression: string | null = null;
}

// ============================================================================
// 工具函数：创建默认沙箱实例
// ============================================================================

/**
 * 创建默认的ExpressionSandbox实例
 *
 * @param options - 可选的配置
 * @returns 沙箱实例
 */
export function createExpressionSandbox(
  options?: EvaluateOptions,
): ExpressionSandbox {
  return new ExpressionSandbox(options);
}

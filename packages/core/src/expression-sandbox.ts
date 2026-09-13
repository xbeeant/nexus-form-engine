// ============================================================================
// ExpressionSandbox — 表达式安全求值沙箱
// 目标：确保 {{ }} 表达式求值的安全性，防止恶意代码执行
// 性能优化：编译函数缓存，避免每次求值都 new Function
// ============================================================================

import type { ReactionContext } from './types/schema';

/**
 * 全局标识符黑名单：仅在作为「独立标识符」出现时拦截
 * 包括：window, document, eval 等全局对象/API。
 * 注意：当这些名字作为白名单上下文变量（formData/rootValue/$self...）的
 * 属性名出现时（如表单里恰好有名为 window / parent / self 的字段，
 * 表达式写 `formData.window`），属于合法数据访问，**不**拦截误伤。
 */
const GLOBAL_BLACKLIST = new Set([
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

  // 全局 API / 构造函数
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

  // 其他危险全局 API
  'importScripts',
  'BroadcastChannel',
  'Worker',
  'import',
  'require',
]);

/**
 * 属性级黑名单：无论作为独立标识符还是属性名出现都拦截。
 * 这些名字参与原型链操纵，即使通过白名单对象（formData / $self）的
 * 属性访问也能发起原型污染 / 沙箱逃逸，因此不做位置豁免。
 */
const PROPERTY_BLACKLIST = new Set([
  'constructor',
  'prototype',
  '__proto__',
  'apply',
  'call',
  'bind',
]);

/**
 * 白名单：允许访问的上下文变量
 * 这些变量由调用方注入，不包含任何危险API。
 * 表达式只能读取以下受限成员，任何其他全局标识符都会被黑名单拦截：
 * - $deps    依赖字段的值数组（reaction 的 dependencies 按序取值）
 * - $self    目标字段自身的 FieldState（联动的当前状态）
 * - $form    表单引擎实例（仅供调用受控方法，如 getFieldValue / getFieldState）
 * - $index   数组项索引（数组项子字段联动时可用）
 * - formData 当前表单数据快照（值联动 / 条件判断）
 * - rootValue 根级表单数据（与 formData 等价，兼容不同协议命名）
 */
const CONTEXT_WHITELIST = new Set([
  '$deps',
  '$self',
  '$form',
  '$index',
  'formData',
  'rootValue',
]);

/** 白名单键数组（编译函数参数顺序固定） */
const CONTEXT_KEYS = Array.from(CONTEXT_WHITELIST);

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
  /** 编译函数缓存：sanitized expression → Function */
  private functionCache = new Map<string, (...args: unknown[]) => unknown>();

  constructor(options?: EvaluateOptions) {
    this.errorHandler = options?.errorHandler ?? ErrorHandlerStrategy.DEFAULT;
    this.defaultValue = options?.defaultValue ?? undefined;
    this.allowPrototypeAccess = options?.allowPrototypeAccess ?? false;
  }

  /**
   * 创建安全的求值上下文
   *
   * 仅从原始 context 中摘取白名单内的键，其余字段一律丢弃：
   * 即使调用方传入携带危险引用（如 window / document 的字段），
   * 传给编译函数的安全上下文也不会包含它们，从源头避免泄漏。
   *
   * @param context - ReactionContext（调用方注入的完整上下文）
   * @returns 暴露给表达式的上下文对象（白名单过滤）
   */
  createContext(context: ReactionContext): Record<string, unknown> {
    const safeContext: Record<string, unknown> = {};
    for (const key of CONTEXT_KEYS) {
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
      // 先记录原始表达式：sanitize 阶段抛错时 lastExpression 仍能还原现场
      this.lastExpression = expression;
      const sanitized = this.sanitizeExpression(expression);
      this.lastExpression = sanitized;

      // 从缓存获取编译函数，若不存在则创建并缓存
      let fn = this.functionCache.get(sanitized);
      if (!fn) {
        fn = new Function(...CONTEXT_KEYS, `return (${sanitized});`) as (
          ...args: unknown[]
        ) => unknown;
        this.functionCache.set(sanitized, fn);
      }
      // 2. 构建安全上下文
      const safeContext = this.createContext(context);

      // 3. 安全求值
      const values = CONTEXT_KEYS.map((key) => safeContext[key]);
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
    // 使用 token 匹配而非 substring，避免误伤 $self / $deps / formData 等上下文变量。
    // 判定规则：
    // - 作为「独立全局标识符」出现 → 命中 GLOBAL_BLACKLIST 拦截
    //   （如 window.location / document.body / localStorage.getItem）
    // - 作为属性名出现（如 formData.window / rootValue.parent / $self.value）
    //   → 仅 PROPERTY_BLACKLIST 中的原型链危险名拦截，全局名豁免，
    //     避免把表单纯粹以 window/parent/self 命名的字段误判为危险代码
    const tokenRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;
    let tokenMatch = tokenRegex.exec(trimmed);
    while (tokenMatch !== null) {
      const token = tokenMatch[0];
      const prefix = trimmed.slice(0, tokenMatch.index).trim();
      const isPropertyAccess = prefix.endsWith('.') || prefix.endsWith('?.');
      if (
        PROPERTY_BLACKLIST.has(token) ||
        (!isPropertyAccess && GLOBAL_BLACKLIST.has(token))
      ) {
        throw new Error(`Expression contains blocked keyword: ${token}`);
      }
      tokenMatch = tokenRegex.exec(trimmed);
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
   * 日志职责按策略划分，避免「抛出 + 打日志」多重报告：
   * - strict: 错误已 throw 给调用方，由调用方决定如何处理，沙箱不再落日志
   * - default: 静默降级为默认值，打 warn 提示求值失败
   * - silent: 完全不处理、不打日志
   *
   * @param error - 捕获的错误对象
   */
  private recordError(error: unknown): void {
    if (this.errorHandler !== ErrorHandlerStrategy.DEFAULT) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[ExpressionSandbox] Evaluation failed (fallback to default):`,
      message,
    );
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

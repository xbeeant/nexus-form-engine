// ============================================================================
// async-validator - 异步校验器插件
// 目标：通过 engine.use() 注入，承载字段级异步校验的防抖/超时/并行调度
// 严禁在 Core 主类中硬编码异步校验调度逻辑
// ============================================================================

import type { NexusEngine } from './Engine';
import type { NexusPlugin } from './types/schema';

/**
 * 字段级校验函数
 * @param value - 字段值
 * @param formData - 整个表单数据
 * @returns 错误消息数组（空数组表示校验通过）
 */
export type FieldValidator = (
  value: unknown,
  formData: Record<string, unknown>,
) => string[] | Promise<string[]>;

/**
 * 异步校验器配置选项
 */
export interface AsyncValidatorOptions {
  /** 异步校验超时时间（毫秒），默认 5000ms */
  timeout?: number;
  /** 防抖时间（毫秒），默认 300ms */
  debounce?: number;
  /** 是否支持并行校验，默认 true */
  parallel?: boolean;
}

/**
 * AsyncValidatorPlugin — 异步校验器插件
 *
 * 通过 `engine.use(new AsyncValidatorPlugin(engine))` 注入。
 * 钩子 `onValidateField` 在字段实时同步校验完成后触发，
 * 插件对注册到该字段的异步校验器执行防抖调度、超时控制与并行执行，
 * 结果通过 `engine.setFieldState(path, { errors })` 写回。
 *
 * 功能：
 * - 字段级异步校验器注册（registerValidator / registerValidators）
 * - 防抖机制（避免频繁触发网络请求）
 * - 超时控制
 * - 并行校验支持
 * - 取消 pending 校验
 */
export class AsyncValidatorPlugin implements NexusPlugin {
  name = 'async-validator';

  private engine: NexusEngine;
  private options: Required<AsyncValidatorOptions>;
  /** 防抖定时器，key 为字段路径 */
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** 正在执行的校验，key 为字段路径 */
  private pending: Set<string> = new Set();

  constructor(engine: NexusEngine, options?: AsyncValidatorOptions) {
    this.engine = engine;
    this.options = {
      timeout: options?.timeout ?? 5000,
      debounce: options?.debounce ?? 300,
      parallel: options?.parallel ?? true,
    };
  }

  hooks = {
    onInit: (engine: NexusEngine) => {
      this.engine = engine;
    },
    onValidateField: (path: string) => {
      this.schedule(path);
    },
  };

  /**
   * 注册单个字段的异步校验器
   *
   * @param path - 字段路径
   * @param validator - 校验函数
   */
  registerValidator(path: string, validator: FieldValidator): void {
    this.engine.registerFieldValidator(path, validator);
  }

  /**
   * 批量注册异步校验器（按字段路径）
   *
   * @param validators - 字段路径 → 校验器列表
   */
  registerValidators(
    validators: Map<string, FieldValidator[]> | Record<string, FieldValidator[]>,
  ): void {
    if (validators instanceof Map) {
      for (const [path, list] of validators) {
        for (const validator of list) {
          this.engine.registerFieldValidator(path, validator);
        }
      }
      return;
    }
    for (const [path, list] of Object.entries(validators)) {
      for (const validator of list) {
        this.engine.registerFieldValidator(path, validator);
      }
    }
  }

  /**
   * 获取已注册异步校验器的字段路径列表
   *
   * @returns 字段路径数组
   */
  getRegisteredValidators(): string[] {
    return Array.from(this.engine.getFieldValidators().keys());
  }

  /**
   * 取消指定字段的 pending 校验
   *
   * @param path - 字段路径
   */
  cancelValidation(path: string): void {
    const timer = this.timers.get(path);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(path);
    }
    this.pending.delete(path);
  }

  /**
   * 取消所有 pending 校验
   */
  cancelAllValidations(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pending.clear();
  }

  /**
   * 获取指定字段的 pending 校验状态
   *
   * @param path - 字段路径
   * @returns 如果正在校验返回 true
   */
  isPending(path: string): boolean {
    return this.pending.has(path);
  }

  /**
   * 获取统计信息
   *
   * @returns 统计信息对象
   */
  getStats(): { pendingCount: number; timerCount: number } {
    return {
      pendingCount: this.pending.size,
      timerCount: this.timers.size,
    };
  }

  /**
   * 重置插件状态
   */
  resetStats(): void {
    this.cancelAllValidations();
  }

  /**
   * 销毁插件，清理所有定时器
   */
  destroy(): void {
    this.cancelAllValidations();
  }

  /**
   * 防抖调度指定字段的异步校验
   *
   * 防抖窗口内同一字段再次变更会清除前一个定时器，以最后一次为准
   *
   * @param path - 字段路径
   */
  private schedule(path: string): void {
    const state = this.engine.getFieldState(path);
    if (!state) {
      return;
    }
    const validators = this.engine.getFieldValidators().get(path);
    if (!validators || validators.length === 0) {
      return;
    }

    // 防抖：清除已有的定时器
    const existing = this.timers.get(path);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      this.timers.delete(path);
      const latest = this.engine.getFieldState(path);
      if (!latest?.visible) {
        return;
      }

      const latestFormData = this.engine.getFormData();
      const asyncErrors: string[] = [];

      try {
        const run = async (validator: FieldValidator): Promise<void> => {
          const result = await this.withTimeout(validator, latest.value, latestFormData);
          if (Array.isArray(result) && result.length > 0) {
            asyncErrors.push(...result);
          }
        };

        if (this.options.parallel) {
          await Promise.all(validators.map(run));
        } else {
          for (const validator of validators) {
            await run(validator);
          }
        }
      } finally {
        this.pending.delete(path);
      }

      if (asyncErrors.length > 0) {
        // 与当前同步错误合并，使用 Set 去重避免重复累积
        this.engine.setFieldState(path, {
          errors: Array.from(new Set([...latest.errors, ...asyncErrors])),
        });
      }
    }, this.options.debounce);

    this.timers.set(path, timer);
  }

  /**
   * 执行异步校验并应用超时控制
   *
   * @param validator - 校验函数
   * @param value - 字段值
   * @param formData - 表单数据
   * @returns 校验结果
   */
  private async withTimeout(
    validator: FieldValidator,
    value: unknown,
    formData: Record<string, unknown>,
  ): Promise<string[]> {
    const timeoutPromise = new Promise<string[]>((resolve) => {
      setTimeout(() => resolve([]), this.options.timeout);
    });
    const resultPromise = Promise.resolve()
      .then(() => validator(value, formData))
      .catch(() => [] as string[]);
    return Promise.race([resultPromise, timeoutPromise]);
  }
}

/**
 * 创建异步校验器插件实例
 *
 * @param engine - 表单引擎实例
 * @param options - 配置选项
 * @returns AsyncValidatorPlugin 实例
 */
export function createAsyncValidatorPlugin(
  engine: NexusEngine,
  options?: AsyncValidatorOptions,
): AsyncValidatorPlugin {
  return new AsyncValidatorPlugin(engine, options);
}

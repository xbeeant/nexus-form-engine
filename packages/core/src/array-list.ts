// ============================================================================
// array-list - 数组字段操作插件
// 目标：通过 engine.use() 注入，承载数组字段的 push/pop/remove/update/insert/move
// 严禁在 Core 主类中硬编码数组变换逻辑
// ============================================================================

import type { NexusEngine } from './Engine';
import type { ArrayOperationOptions, NexusPlugin } from './types/schema';

/**
 * 数组操作类型定义
 */
export type ArrayOperation =
  | {
      operation: 'push';
      value: unknown;
    }
  | {
      operation: 'pop';
    }
  | {
      operation: 'remove';
      index: number;
    }
  | {
      operation: 'update';
      index: number;
      value: unknown;
    }
  | {
      operation: 'insert';
      index: number;
      value: unknown;
      /** 兼容旧签名，实际插入位置由 index 决定 */
      afterIndex?: number;
    }
  | {
      operation: 'move';
      index: number;
      toIndex: number;
    };

/**
 * ArrayOperationsPlugin — 数组字段操作插件
 *
 * 通过 `engine.use(new ArrayOperationsPlugin(engine))` 注入。
 * 通过 `onArrayOperation` 钩子承载 engine.arrayOperation 的变换逻辑，
 * 使用不可变方式计算新数组，并通过 engine.setFieldValue 写回
 * （自动触发实时校验、联动与订阅通知）。
 */
export class ArrayOperationsPlugin implements NexusPlugin {
  name = 'array-operations';

  private engine: NexusEngine;

  constructor(engine: NexusEngine) {
    this.engine = engine;
  }

  hooks = {
    onInit: (engine: NexusEngine) => {
      this.engine = engine;
    },
    onArrayOperation: (
      options: ArrayOperationOptions,
      engine: NexusEngine,
    ): Array<unknown> | undefined => {
      return this.applyWith(engine, options);
    },
  };

  /**
   * 执行数组操作
   *
   * @param path - 数组字段路径
   * @param operation - 操作配置
   * @returns 操作后的新数组
   *
   * @example
   * ```typescript
   * // 添加到数组末尾
   * plugin.push('items', { name: 'Item 1' });
   *
   * // 移除最后一项
   * plugin.pop('items');
   *
   * // 移除指定索引项
   * plugin.remove('items', 0);
   *
   * // 更新指定索引项
   * plugin.update('items', 0, { name: 'Updated' });
   *
   * // 在指定位置插入（index 为新项插入位置）
   * plugin.insert('items', 1, { name: 'Inserted' });
   *
   * // 移动数组项
   * plugin.move('items', 0, 2);
   * ```
   */
  apply(path: string, operation: ArrayOperation): Array<unknown> | undefined {
    return this.applyWith(this.engine, { path, ...operation });
  }

  /**
   * 添加到数组末尾
   *
   * @param path - 数组字段路径
   * @param value - 要添加的值
   * @returns 操作后的新数组
   */
  push(path: string, value: unknown): Array<unknown> | undefined {
    return this.apply(path, { operation: 'push', value });
  }

  /**
   * 移除最后一项
   *
   * @param path - 数组字段路径
   * @returns 操作后的新数组
   */
  pop(path: string): Array<unknown> | undefined {
    return this.apply(path, { operation: 'pop' });
  }

  /**
   * 移除指定索引项
   *
   * @param path - 数组字段路径
   * @param index - 要移除的索引
   * @returns 操作后的新数组
   */
  remove(path: string, index: number): Array<unknown> | undefined {
    return this.apply(path, { operation: 'remove', index });
  }

  /**
   * 更新指定索引项
   *
   * @param path - 数组字段路径
   * @param index - 要更新的索引
   * @param value - 新值
   * @returns 操作后的新数组
   */
  update(
    path: string,
    index: number,
    value: unknown,
  ): Array<unknown> | undefined {
    return this.apply(path, { operation: 'update', index, value });
  }

  /**
   * 在指定位置插入
   *
   * @param path - 数组字段路径
   * @param index - 插入位置（新项插入到当前 index 项之前）
   * @param value - 要插入的值
   * @returns 操作后的新数组
   */
  insert(path: string, index: number, value: unknown): Array<unknown> | undefined {
    return this.apply(path, { operation: 'insert', index, value });
  }

  /**
   * 移动数组项到新位置
   *
   * @param path - 数组字段路径
   * @param index - 当前索引
   * @param toIndex - 目标索引
   * @returns 操作后的新数组
   */
  move(
    path: string,
    index: number,
    toIndex: number,
  ): Array<unknown> | undefined {
    return this.apply(path, { operation: 'move', index, toIndex });
  }

  /**
   * 批量执行数组操作
   *
   * @param path - 数组字段路径
   * @param operations - 操作数组
   * @returns 所有操作后的最终数组
   */
  batch(
    path: string,
    operations: ArrayOperation[],
  ): Array<unknown> | undefined {
    let result: Array<unknown> | undefined;

    for (const op of operations) {
      result = this.apply(path, op);
    }

    return result;
  }

  /**
   * 批量执行 push 操作
   *
   * @param path - 数组字段路径
   * @param values - 要添加的值数组
   * @returns 操作后的新数组
   */
  pushAll(path: string, values: Array<unknown>): Array<unknown> | undefined {
    return this.batch(
      path,
      values.map((v) => ({ operation: 'push', value: v })),
    );
  }

  /**
   * 执行数组变换并写回字段值
   *
   * @param engine - 表单引擎实例
   * @param options - 操作配置
   * @returns 操作后的新数组
   */
  private applyWith(
    engine: NexusEngine,
    options: ArrayOperationOptions,
  ): Array<unknown> | undefined {
    const { path, operation } = options;

    const state = engine.getFieldState(path);
    if (!state) {
      console.warn(`[ArrayOperationsPlugin] Field not found: ${path}`);
      return undefined;
    }
    if (!Array.isArray(state.value)) {
      console.warn(`[ArrayOperationsPlugin] Field is not an array: ${path}`);
      return undefined;
    }

    const arr = state.value as unknown[];
    let result: Array<unknown>;

    switch (operation) {
      case 'push': {
        if (options.value === undefined) {
          console.warn(`[ArrayOperationsPlugin] push operation requires value`);
          return undefined;
        }
        result = [...arr, options.value];
        break;
      }
      case 'pop': {
        result = arr.slice(0, -1);
        break;
      }
      case 'remove': {
        const index = options.index;
        if (index === undefined || index < 0 || index >= arr.length) {
          console.warn(`[ArrayOperationsPlugin] Invalid index for remove: ${index}`);
          return undefined;
        }
        result = arr.filter((_, i) => i !== index);
        break;
      }
      case 'update': {
        const index = options.index;
        if (index === undefined || index < 0 || index >= arr.length) {
          console.warn(`[ArrayOperationsPlugin] Invalid index for update: ${index}`);
          return undefined;
        }
        if (options.value === undefined) {
          console.warn(`[ArrayOperationsPlugin] update operation requires value`);
          return undefined;
        }
        result = arr.map((item, i) => (i === index ? options.value : item));
        break;
      }
      case 'insert': {
        const index = options.index;
        if (index === undefined || index < 0 || index > arr.length) {
          console.warn(`[ArrayOperationsPlugin] Invalid index for insert: ${index}`);
          return undefined;
        }
        result = [
          ...arr.slice(0, index),
          options.value,
          ...arr.slice(index),
        ];
        break;
      }
      case 'move': {
        const index = options.index;
        const toIndex = options.toIndex;
        if (
          index === undefined ||
          toIndex === undefined ||
          index < 0 ||
          toIndex < 0 ||
          index >= arr.length ||
          toIndex >= arr.length
        ) {
          console.warn(`[ArrayOperationsPlugin] Invalid index/toIndex for move`);
          return undefined;
        }
        // 不可变移动：先拷贝，再 splice，避免原地修改 state.value
        const next = [...arr];
        const [moved] = next.splice(index, 1);
        next.splice(toIndex, 0, moved);
        result = next;
        break;
      }
      default: {
        console.warn(`[ArrayOperationsPlugin] Unknown operation: ${operation}`);
        return undefined;
      }
    }

    // 通过 setFieldValue 写回：自动触发实时校验、联动与订阅通知
    engine.setFieldValue(path, result);
    return result;
  }
}

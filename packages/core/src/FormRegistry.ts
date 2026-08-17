// ============================================================================
// FormRegistry — 多表单实例注册表（跨表单联动基础设施）
// 纯 TypeScript，无任何 UI 依赖
//
// 用途：
// - 一个页面挂载多个表单（多个 NexusEngine 实例）
// - 通过 formId 唯一标识每个表单实例
// - 跨表单联动：表单 A 的字段变化时，按 formId 找到表单 B 并触发其 reactions
// - 支持先注册表单 B（含跨表单联动声明）后注册表单 A 的乱序初始化场景
// ============================================================================

import type { NexusEngine } from './Engine';

/** 表单注册回调（表单注册到注册表时触发，用于延迟建立跨表单联动） */
export type FormRegisterCallback = (
  formId: string,
  engine: NexusEngine,
) => void;

/**
 * FormRegistry — 表单实例注册表
 *
 * 管理 formId → NexusEngine 的映射，并提供：
 * - register / unregister / get / has / getAll
 * - getFormData：跨表单读取数据快照
 * - onRegister：表单注册时回调（供「先声明联动、后注册源表单」的乱序场景）
 */
export class FormRegistry {
  private forms: Map<string, NexusEngine> = new Map();
  private registerCallbacks: Set<FormRegisterCallback> = new Set();

  /**
   * 注册表单实例
   *
   * 同一 formId 重复注册时覆盖旧实例（旧实例先注销），并触发 onRegister 回调。
   *
   * @param formId - 表单唯一标识
   * @param engine - 表单引擎实例
   */
  register(formId: string, engine: NexusEngine): void {
    const existing = this.forms.get(formId);
    if (existing && existing !== engine) {
      console.warn(
        `[FormRegistry] Form '${formId}' already registered, replacing previous instance.`,
      );
    }
    this.forms.set(formId, engine);
    for (const cb of this.registerCallbacks) {
      cb(formId, engine);
    }
  }

  /**
   * 注销表单实例
   *
   * @param formId - 表单唯一标识
   */
  unregister(formId: string): void {
    this.forms.delete(formId);
  }

  /**
   * 按 formId 获取表单引擎实例
   *
   * @param formId - 表单唯一标识
   * @returns 引擎实例；未注册时返回 undefined
   */
  get(formId: string): NexusEngine | undefined {
    return this.forms.get(formId);
  }

  /**
   * 指定 formId 是否已注册
   *
   * @param formId - 表单唯一标识
   */
  has(formId: string): boolean {
    return this.forms.has(formId);
  }

  /**
   * 获取全部已注册的表单实例（防御性拷贝）
   */
  getAll(): Map<string, NexusEngine> {
    return new Map(this.forms);
  }

  /**
   * 跨表单读取数据快照（可见字段，不含 hidden）
   *
   * @param formId - 源表单唯一标识
   * @returns 表单数据；表单未注册时返回 undefined
   */
  getFormData(formId: string): Record<string, unknown> | undefined {
    return this.forms.get(formId)?.getFormData();
  }

  /**
   * 订阅表单注册事件（供延迟建立跨表单联动）
   *
   * @param callback - 注册回调（formId, engine）
   * @returns 取消订阅函数
   */
  onRegister(callback: FormRegisterCallback): () => void {
    this.registerCallbacks.add(callback);
    return () => {
      this.registerCallbacks.delete(callback);
    };
  }

  /**
   * 清空注册表与订阅（主要用于测试隔离）
   */
  clear(): void {
    this.forms.clear();
    this.registerCallbacks.clear();
  }
}

// ============================================================================
// 工厂函数与默认实例
// ============================================================================

/**
 * 创建独立的表单注册表实例
 *
 * 测试/隔离场景建议使用独立实例；常规页面使用默认单例即可。
 */
export function createFormRegistry(): FormRegistry {
  return new FormRegistry();
}

/**
 * 默认表单注册表单例
 *
 * 页面级多表单联动默认使用该实例：引擎构造时配置 formId 即自动注册。
 */
export const defaultFormRegistry = createFormRegistry();

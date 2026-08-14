import type {
  FieldState,
  NexusFormInstance,
  NexusSchema,
} from '@nexus/form-engine';
import { AsyncValidatorPlugin, NexusEngine } from '@nexus/form-engine';
import type { RefObject } from 'react';

/**
 * FormController — 包裹 Engine，暴露 Form 实例 API
 */
export class FormController implements NexusFormInstance {
  private engine: NexusEngine;
  private formElementRef: RefObject<HTMLFormElement | null>;
  /** 稳定的 getter：每次 submit 执行时从外部 ref 读取最新的 onFinish/onFinishFailed 回调 */
  private getOnFinish: () => (
    data: Record<string, unknown>,
  ) => void | Promise<void>;
  private getOnFinishFailed: () => (errors: Map<string, string[]>) => void;
  private removeHiddenData: boolean = true;
  private watchers: Map<
    string,
    (value: unknown, allValues: Record<string, unknown>) => void
  > = new Map();
  private globalWatcher:
    | ((
        value: Record<string, unknown>,
        allValues: Record<string, unknown>,
        changedPath?: string,
      ) => void)
    | null = null;

  constructor(engine?: NexusEngine) {
    this.engine = engine ?? new NexusEngine();
    // 默认注入异步校验器插件：useFieldValidator / registerFieldValidator
    // 注册的异步校验器即可在字段值变化时被触发（防抖调度，与默认 'change' trigger 对齐）。
    // 外部已注入同名插件时不重复注入（hasPlugin 幂等）。
    if (!this.engine.hasPlugin('async-validator')) {
      this.engine.use(new AsyncValidatorPlugin(this.engine));
    }
    this.formElementRef = {
      current: null,
    } as RefObject<HTMLFormElement | null>;
    this.getOnFinish = () => () => {};
    this.getOnFinishFailed = () => () => {};
  }

  /** 内部：首次绑定表单 DOM + 回调 getter（由 NexusForm 在挂载时调用一次） */
  _bind(
    formEl: HTMLFormElement | null,
    getOnFinish: () => (data: Record<string, unknown>) => void | Promise<void>,
    getOnFinishFailed: () => (errors: Map<string, string[]>) => void,
  ): void {
    (this.formElementRef as { current: HTMLFormElement | null }).current =
      formEl;
    this.getOnFinish = getOnFinish;
    this.getOnFinishFailed = getOnFinishFailed;
    // 注册值变更回调到 Engine，只需一次（回调闭包引用了稳定的实例）
    this.engine.registerOnFieldValueChange((path, value) =>
      this._onFieldValueChange(path, value),
    );
  }

  /** 内部：同步 watch / removeHiddenData 配置（由 NexusForm 在它们变化时调用） */
  _syncConfig(config: {
    removeHiddenData?: boolean;
    watch?: {
      [path: string]: (
        value: unknown,
        allValues: Record<string, unknown>,
        changedPath?: string,
      ) => void;
    };
  }): void {
    if (config.removeHiddenData !== undefined) {
      this.removeHiddenData = config.removeHiddenData;
    }
    if (config.watch) {
      this.watchers.clear();
      this.globalWatcher = null;
      for (const [path, fn] of Object.entries(config.watch)) {
        if (path === '#') {
          this.globalWatcher = fn;
        } else {
          this.watchers.set(path, fn);
        }
      }
    }
  }

  /** 内部：值变更时调用（由 Engine 通知） */
  _onFieldValueChange(path: string, value: unknown): void {
    const allValues = this.engine.getFormData();
    const globalData = this.removeHiddenData
      ? allValues
      : this.engine.getAllFormData();

    // 全局 watcher（# 监听所有字段变化，value 即为全部表单值；
    // 第三参携带本次实际变更的字段路径，供清空值场景区分「未赋值默认值」与「用户主动清空」）
    if (this.globalWatcher) {
      this.globalWatcher(globalData, globalData, path);
    }
    // 路径匹配的 watcher
    const fn = this.watchers.get(path);
    if (fn) {
      fn(value, globalData);
    }
  }

  /** 内部：获取 Engine 实例 */
  _getEngine(): NexusEngine {
    return this.engine;
  }

  async submit(): Promise<void> {
    const errors = await this.engine.validate();
    if (errors.size > 0) {
      this.focusFirstError(errors);
      this.getOnFinishFailed()?.(errors);
      return;
    }
    const formData = this.removeHiddenData
      ? this.engine.getFormData()
      : this.engine.getAllFormData();
    await this.getOnFinish()?.(formData);
  }

  /**
   * 定位到第一个校验失败的字段：按 DOM 渲染顺序查找（保证视觉上的"第一个"），
   * 滚动入视并聚焦其内部可交互控件。
   */
  private focusFirstError(errors: Map<string, string[]>): void {
    const formEl = this.formElementRef.current;
    if (!formEl || errors.size === 0) {
      return;
    }

    const errorPaths = new Set(errors.keys());

    const focus = () => {
      const fieldEls =
        formEl.querySelectorAll<HTMLElement>('[data-nexus-field]');
      for (const el of Array.from(fieldEls)) {
        const path = el.getAttribute('data-nexus-field');
        if (!path || !errorPaths.has(path)) {
          continue;
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
        return;
      }
    };

    // 等待 React 将错误态刷到 DOM 后再定位，保证错误提示已可见
    requestAnimationFrame(focus);
  }

  resetFields(): void {
    this.engine.reset();
  }

  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void {
    this.engine.setErrorFields(errors);
  }

  setValues(values: Record<string, unknown>): void {
    this.engine.setFieldValues(values);
  }

  setValueByPath(path: string, value: unknown): void {
    this.engine.setFieldValue(path, value);
  }

  setSchemaByPath(path: string, patch: Record<string, unknown>): void {
    this.engine.setSchemaByPath(path, patch);
  }

  setSchema(schema: NexusSchema): void {
    this.engine.setSchema(schema);
  }

  getValues(paths?: string[]): Record<string, unknown> {
    return this.engine.getFormData(paths);
  }

  getHiddenValues(): Record<string, unknown> {
    return this.engine.getHiddenValues();
  }

  /** 获取所有字段值（含 hidden） */
  getAllValues(): Record<string, unknown> {
    return this.engine.getAllFormData();
  }

  getValueByPath(path: string): unknown {
    return this.engine.getFieldValue(path);
  }

  /**
   * 注册字段校验逻辑
   * @param path 字段路径（如 'username'）
   * @param validator 校验函数，返回错误消息数组（空数组表示通过）
   */
  registerValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void {
    // 注册到 Engine（validate 与 实时校验 统一由 Engine 执行）
    this.engine.registerFieldValidator(path, validator);
  }

  /**
   * 注销字段校验逻辑（按函数引用移除）
   * 与 registerValidator 配对；widget 组件卸载时清理，避免校验器累积
   */
  unregisterValidator(
    path: string,
    validator: (
      value: unknown,
      formData: Record<string, unknown>,
    ) => string[] | Promise<string[]>,
  ): void {
    this.engine.unregisterFieldValidator(path, validator);
  }

  /**
   * 实时重校验指定字段（同步）
   * 供 widget 组件内部状态变化（非字段值变化）时主动刷新错误态
   */
  revalidateField(path: string): void {
    this.engine.validateField(path, { trigger: 'change' });
  }

  getSchema(): NexusSchema | null {
    return this.engine.getSchema();
  }

  removeErrorField(path: string): void {
    this.engine.removeErrorField(path);
  }

  scrollToPath(path: string): void {
    const el = this.formElementRef.current?.querySelector(
      `[data-nexus-field="${path}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getFieldError(path: string): string[] {
    return this.engine.getFieldError(path);
  }

  getFieldsError(): Map<string, string[]> {
    return this.engine.getFieldsError();
  }

  validateFields(paths?: string[]): Promise<Map<string, string[]>> {
    return this.engine.validate(paths);
  }

  getFieldState(path: string): FieldState | undefined {
    return this.engine.getFieldState(path);
  }
}

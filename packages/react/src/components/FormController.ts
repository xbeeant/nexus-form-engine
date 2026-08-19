import type {
  FieldState,
  NexusFormInstance,
  NexusSchema,
} from '@xbeeant/form-engine';
import { AsyncValidatorPlugin, NexusEngine } from '@xbeeant/form-engine';

/**
 * FormController — 包裹 Engine，暴露 Form 实例 API
 */
export class FormController implements NexusFormInstance {
  private engine: NexusEngine;
  /** 实例标识 → 实例视图引擎（同一 form 可挂载多个不同 schema 的 NexusForm） */
  private views: Map<string, NexusEngine> = new Map();
  /** 未显式指定 instanceId 时自动分配序号（nexus-1/nexus-2/...） */
  private nextAutoInstanceId = 1;
  /** 实例标识 → 该实例的 DOM / 回调绑定（onFinish/onFinishFailed 按实例独立） */
  private instanceBindings: Map<
    string,
    {
      formEl: HTMLFormElement | null;
      getOnFinish: () => (
        data: Record<string, unknown>,
      ) => void | Promise<void>;
      getOnFinishFailed: () => (errors: Map<string, string[]>) => void;
    }
  > = new Map();
  /** 实例标识 → watch / removeHiddenData 配置（按实例独立） */
  private instanceConfigs: Map<
    string,
    {
      removeHiddenData: boolean;
      watchers: Map<
        string,
        (value: unknown, allValues: Record<string, unknown>) => void
      >;
      globalWatcher:
        | ((
            value: Record<string, unknown>,
            allValues: Record<string, unknown>,
            changedPath?: string,
          ) => void)
        | null;
    }
  > = new Map();

  constructor(engine?: NexusEngine) {
    this.engine = engine ?? new NexusEngine();
    // 默认注入异步校验器插件：useFieldValidator / registerFieldValidator
    // 注册的异步校验器即可在字段值变化时被触发（防抖调度，与默认 'change' trigger 对齐）。
    // 外部已注入同名插件时不重复注入（hasPlugin 幂等）。
    if (!this.engine.hasPlugin('async-validator')) {
      this.engine.use(new AsyncValidatorPlugin(this.engine));
    }
  }

  /**
   * 获取（或创建）指定实例的引擎视图
   *
   * 同一 form 挂载多个 NexusForm 时各自独立：schema/值/订阅互不影响。
   * - 显式 instanceId：使用指定实例
   * - 未指定：首个 NexusForm 使用 'default' 实例（与直接使用 engine 的场景兼容），
   *   其余自动分配 nexus-N
   *
   * @param instanceId - 可选实例标识
   * @returns 定向到该实例的引擎视图
   */
  _useInstance(instanceId?: string): NexusEngine {
    const resolvedId = this._acquireInstanceId(instanceId);
    let view = this.views.get(resolvedId);
    if (!view) {
      view = this.engine.instance(resolvedId);
      this.views.set(resolvedId, view);
      this.instanceConfigs.set(resolvedId, {
        removeHiddenData: true,
        watchers: new Map(),
        globalWatcher: null,
      });
    }
    return view;
  }

  /**
   * 解析实例标识（不创建视图，供 NexusForm 同步 engine 与绑定所用 id）
   * - 显式 instanceId 原样返回
   * - 未指定：首个 NexusForm 用 'default'，其余自动分配 nexus-N
   */
  _acquireInstanceId(instanceId?: string): string {
    if (instanceId !== undefined) {
      return instanceId;
    }
    if (this.views.size === 0) {
      return 'default';
    }
    return `nexus-${this.nextAutoInstanceId++}`;
  }

  /** 内部：解析方法作用的目标实例视图（未指定时作用于全部实例，无实例时回退根引擎） */
  private resolveViews(instanceId?: string): NexusEngine[] {
    if (instanceId !== undefined) {
      const view = this.views.get(instanceId);
      return view ? [view] : [];
    }
    const views = Array.from(this.views.values());
    return views.length > 0 ? views : [this.engine];
  }

  /** 内部：首次绑定的实例 DOM（兼容既有 scrollToPath/focusFirstError 单实例行为） */
  private getPrimaryFormEl(): HTMLFormElement | null {
    const first = this.instanceBindings.values().next().value;
    return first?.formEl ?? null;
  }

  /**
   * 内部：绑定实例 DOM + 回调 getter（由 NexusForm 在挂载时按实例调用）
   */
  _bind(
    instanceId: string,
    formEl: HTMLFormElement | null,
    getOnFinish: () => (data: Record<string, unknown>) => void | Promise<void>,
    getOnFinishFailed: () => (errors: Map<string, string[]>) => void,
  ): void {
    this.instanceBindings.set(instanceId, {
      formEl,
      getOnFinish,
      getOnFinishFailed,
    });
    // 注册值变更回调到该实例引擎（多实例各自独立，回调携带实例标识路由 watch）
    const view = this._useInstance(instanceId);
    view.registerOnFieldValueChange((path, value) =>
      this._onFieldValueChange(instanceId, path, value),
    );
  }

  /** 内部：同步 watch / removeHiddenData 配置（由 NexusForm 在它们变化时按实例调用） */
  _syncConfig(
    instanceId: string,
    config: {
      removeHiddenData?: boolean;
      watch?: {
        [path: string]: (
          value: unknown,
          allValues: Record<string, unknown>,
          changedPath?: string,
        ) => void;
      };
    },
  ): void {
    const cfg = this.instanceConfigs.get(instanceId) ?? {
      removeHiddenData: true,
      watchers: new Map(),
      globalWatcher: null,
    };
    if (config.removeHiddenData !== undefined) {
      cfg.removeHiddenData = config.removeHiddenData;
    }
    if (config.watch) {
      cfg.watchers.clear();
      cfg.globalWatcher = null;
      for (const [path, fn] of Object.entries(config.watch)) {
        if (path === '#') {
          cfg.globalWatcher = fn;
        } else {
          cfg.watchers.set(path, fn);
        }
      }
    }
    this.instanceConfigs.set(instanceId, cfg);
  }

  /** 内部：值变更时调用（由 Engine 通知，携带实例标识路由到对应实例的 watcher） */
  _onFieldValueChange(instanceId: string, path: string, value: unknown): void {
    const view = this.views.get(instanceId);
    const cfg = this.instanceConfigs.get(instanceId);
    if (!view || !cfg) {
      return;
    }
    const allValues = view.getFormData();
    const globalData = cfg.removeHiddenData ? allValues : view.getAllFormData();

    // 全局 watcher（# 监听所有字段变化，value 即为全部表单值；
    // 第三参携带本次实际变更的字段路径，供清空值场景区分「未赋值默认值」与「用户主动清空」）
    if (cfg.globalWatcher) {
      cfg.globalWatcher(globalData, globalData, path);
    }
    // 路径匹配的 watcher
    const fn = cfg.watchers.get(path);
    if (fn) {
      fn(value, globalData);
    }
  }

  /** 内部：获取 Engine 实例 */
  _getEngine(): NexusEngine {
    return this.engine;
  }

  /**
   * 获取底层 Engine 实例（用于跨表单联动：linkForm / setFormId 等）
   */
  getEngine(): NexusEngine {
    return this.engine;
  }

  async submit(instanceId?: string): Promise<void> {
    const views = this.resolveViews(instanceId);
    // 汇总校验：任一实例失败即阻止提交
    const allErrors = new Map<string, string[]>();
    let failedBinding:
      | {
          formEl: HTMLFormElement | null;
          getOnFinish: () => (
            data: Record<string, unknown>,
          ) => void | Promise<void>;
          getOnFinishFailed: () => (errors: Map<string, string[]>) => void;
        }
      | undefined;
    for (const view of views) {
      const errors = await view.validate();
      if (errors.size > 0) {
        for (const [path, messages] of errors) {
          allErrors.set(path, messages);
        }
        failedBinding ??= this.instanceBindings.get(this.findInstanceId(view));
      }
    }
    if (allErrors.size > 0) {
      this.focusFirstError(allErrors, failedBinding?.formEl ?? null);
      failedBinding?.getOnFinishFailed()?.(allErrors);
      return;
    }

    // 全部通过：逐实例提交（插件 onSubmit 拦截 + 各自 onFinish）
    for (const view of views) {
      const id = this.findInstanceId(view);
      const cfg = this.instanceConfigs.get(id) ?? {
        removeHiddenData: true,
        watchers: new Map(),
        globalWatcher: null,
      };
      const formData = cfg.removeHiddenData
        ? view.getFormData()
        : view.getAllFormData();
      const allowed = await view.submit(formData);
      if (!allowed) {
        continue;
      }
      await this.instanceBindings.get(id)?.getOnFinish()?.(formData);
    }
  }

  /** 内部：反查实例视图对应的实例标识 */
  private findInstanceId(view: NexusEngine): string {
    for (const [id, v] of this.views) {
      if (v === view) {
        return id;
      }
    }
    return 'default';
  }

  /**
   * 定位到第一个校验失败的字段：按 DOM 渲染顺序查找（保证视觉上的"第一个"），
   * 滚动入视并聚焦其内部可交互控件。
   */
  private focusFirstError(
    errors: Map<string, string[]>,
    formEl: HTMLFormElement | null,
  ): void {
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

        // jsdom 等无滚动实现的环境跳过滚动（仅聚焦）
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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

  resetFields(instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.reset();
    }
  }

  setErrorFields(
    errors: Array<{ path: string; errors: string[] }>,
    instanceId?: string,
  ): void {
    for (const view of this.resolveViews(instanceId)) {
      view.setErrorFields(errors);
    }
  }

  setValues(values: Record<string, unknown>, instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.setFieldValues(values);
    }
  }

  setValueByPath(path: string, value: unknown, instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.setFieldValue(path, value);
    }
  }

  setSchemaByPath(
    path: string,
    patch: Record<string, unknown>,
    instanceId?: string,
  ): void {
    for (const view of this.resolveViews(instanceId)) {
      view.setSchemaByPath(path, patch);
    }
  }

  setSchema(schema: NexusSchema, instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.setSchema(schema);
    }
  }

  getValues(paths?: string[], instanceId?: string): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews(instanceId)) {
      Object.assign(merged, view.getFormData(paths));
    }
    return merged;
  }

  getHiddenValues(instanceId?: string): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews(instanceId)) {
      Object.assign(merged, view.getHiddenValues());
    }
    return merged;
  }

  /** 获取所有字段值（含 hidden） */
  getAllValues(instanceId?: string): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews(instanceId)) {
      Object.assign(merged, view.getAllFormData());
    }
    return merged;
  }

  getValueByPath(path: string, instanceId?: string): unknown {
    return this.resolveViews(instanceId)[0]?.getFieldValue(path);
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
    instanceId?: string,
  ): void {
    // 注册到 Engine（validate 与 实时校验 统一由 Engine 执行）
    for (const view of this.resolveViews(instanceId)) {
      view.registerFieldValidator(path, validator);
    }
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
    instanceId?: string,
  ): void {
    for (const view of this.resolveViews(instanceId)) {
      view.unregisterFieldValidator(path, validator);
    }
  }

  /**
   * 实时重校验指定字段（同步）
   * 供 widget 组件内部状态变化（非字段值变化）时主动刷新错误态
   */
  revalidateField(path: string, instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.validateField(path, { trigger: 'change' });
    }
  }

  getSchema(instanceId?: string): NexusSchema | null {
    return this.resolveViews(instanceId)[0]?.getSchema() ?? null;
  }

  removeErrorField(path: string, instanceId?: string): void {
    for (const view of this.resolveViews(instanceId)) {
      view.removeErrorField(path);
    }
  }

  scrollToPath(path: string, instanceId?: string): void {
    const formEl = instanceId
      ? (this.instanceBindings.get(instanceId)?.formEl ?? null)
      : this.getPrimaryFormEl();
    const el = formEl?.querySelector(`[data-nexus-field="${path}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getFieldError(path: string, instanceId?: string): string[] {
    return this.resolveViews(instanceId)[0]?.getFieldError(path) ?? [];
  }

  getFieldsError(instanceId?: string): Map<string, string[]> {
    const merged = new Map<string, string[]>();
    for (const view of this.resolveViews(instanceId)) {
      for (const [path, messages] of view.getFieldsError()) {
        merged.set(path, messages);
      }
    }
    return merged;
  }

  validateFields(
    paths?: string[],
    instanceId?: string,
  ): Promise<Map<string, string[]>> {
    const views = this.resolveViews(instanceId);
    if (views.length === 1) {
      return views[0].validate(paths);
    }
    // 多实例：并行校验并合并错误
    return Promise.all(views.map((view) => view.validate(paths))).then(
      (results) => {
        const merged = new Map<string, string[]>();
        for (const result of results) {
          for (const [path, messages] of result) {
            merged.set(path, messages);
          }
        }
        return merged;
      },
    );
  }

  getFieldState(path: string, instanceId?: string): FieldState | undefined {
    return this.resolveViews(instanceId)[0]?.getFieldState(path);
  }
}

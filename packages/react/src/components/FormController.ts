import type {
  FieldState,
  NexusFormInstance,
  NexusSchema,
} from '@xbeeant/form-engine';
import { AsyncValidatorPlugin, NexusEngine } from '@xbeeant/form-engine';
import { omitNilDeep } from '../utils/omitNil';

/** 已被某个 FormController 占用为「首个挂载视图」的引擎宿主（防止多 form 共享宿主时抢占 default 实例） */
const claimedHosts = new WeakSet<NexusEngine>();

/**
 * FormController — 包裹引擎宿主，暴露 Form 实例 API
 *
 * 一个 form 可承载多个 NexusForm 挂载（每个挂载一份 schema，schema 与状态互相独立）。
 * 实例标识由 NexusForm 内部生成（React useId），用户侧不感知任何 instanceId：
 * - 同一 form 引用 = 同一引擎宿主：插件/组件注册/跨表单联动等引擎级能力共享
 * - 每个 NexusForm 挂载自动获得独立实例：schema/值/校验/订阅互不影响
 * - form 的 API（getValues/setValues/submit/resetFields...）聚合作用于全部实例
 * - 引擎本身是独立实体，可单独创建或跨 form 复用（useForm(formId, engine)）
 */
export class FormController implements NexusFormInstance {
  private engine: NexusEngine;
  /** 提交中状态（校验 + onFinish 全流程，formily submitting 对齐） */
  private submitting = false;
  /** 提交状态监听器（供 useSyncExternalStore 消费） */
  private submittingListeners = new Set<() => void>();
  /** 实例标识（内部）→ 实例视图引擎（同一 form 挂载的多个 NexusForm 各自独立） */
  private views: Map<string, NexusEngine> = new Map();
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
  /** 实例标识 → watch / removeHiddenData / onValuesChange / omitNil 配置（按实例独立） */
  private instanceConfigs: Map<
    string,
    {
      removeHiddenData: boolean;
      omitNil: boolean;
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
      /** x-render 对齐：值变更回调（changedValue, allValues, changedPath） */
      onValuesChange:
        | ((
            changedValue: unknown,
            allValues: Record<string, unknown>,
            changedPath: string,
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
   * 实例标识由 NexusForm 内部分配（React useId），用户不感知。
   *
   * @param instanceId - 实例标识（内部）
   * @returns 定向到该实例的引擎视图
   */
  _useInstance(instanceId: string): NexusEngine {
    let view = this.views.get(instanceId);
    if (!view) {
      // 首个挂载复用宿主引擎（default 实例）：渲染前对 form 的 API 调用
      // （setValues/setSchema 等）落在宿主，挂载后即可见。
      // 宿主被占用（其他 form 复用同一外部引擎）时不再抢占，改创建独立视图，
      // 保证不同 form 共享宿主时实例状态互不影响。
      if (this.views.size === 0 && !claimedHosts.has(this.engine)) {
        claimedHosts.add(this.engine);
        view = this.engine;
      } else {
        view = this.engine.instance(instanceId);
      }
      this.views.set(instanceId, view);
      this.instanceConfigs.set(instanceId, {
        removeHiddenData: true,
        omitNil: false,
        watchers: new Map(),
        globalWatcher: null,
        onValuesChange: null,
      });
    }
    return view;
  }

  /**
   * 内部：解析方法作用的目标实例视图（聚合全部实例，无实例时回退宿主引擎）
   */
  private resolveViews(): NexusEngine[] {
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
   * 回调以 getter 传入：submit 时读取最新闭包，而非绑定时刻的快照
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

  /** 内部：同步 watch / removeHiddenData / onValuesChange 配置（由 NexusForm 在它们变化时按实例调用） */
_syncConfig(
    instanceId: string,
    config: {
      removeHiddenData?: boolean;
      /** 提交/取值时递归移除空值（undefined/null/''，ProForm omitNil 对齐） */
      omitNil?: boolean;
      watch?: {
        [path: string]: (
          value: unknown,
          allValues: Record<string, unknown>,
          changedPath?: string,
        ) => void;
      };
      onValuesChange?: (
        changedValue: unknown,
        allValues: Record<string, unknown>,
        changedPath: string,
      ) => void;
    },
  ): void {
    const cfg = this.instanceConfigs.get(instanceId) ?? {
      removeHiddenData: true,
      omitNil: false,
      watchers: new Map(),
      globalWatcher: null,
      onValuesChange: null,
    };
    if (config.removeHiddenData !== undefined) {
      cfg.removeHiddenData = config.removeHiddenData;
    }
    if (config.omitNil !== undefined) {
      cfg.omitNil = config.omitNil;
    }
    if (config.onValuesChange !== undefined) {
      cfg.onValuesChange = config.onValuesChange;
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
    // x-render 对齐：onValuesChange（changedValue, allValues, changedPath）
    if (cfg.onValuesChange) {
      cfg.onValuesChange(value, globalData, path);
    }
    // 路径匹配的 watcher
    const fn = cfg.watchers.get(path);
    if (fn) {
      fn(value, globalData);
    }
  }

  /** 内部：获取引擎宿主实例 */
  _getEngine(): NexusEngine {
    return this.engine;
  }

  /**
   * 获取底层引擎宿主实例（用于跨表单联动：linkForm / setFormId / registerAntdUI 等；
   * 宿主上的组件/插件注册对全部实例生效）
   */
  getEngine(): NexusEngine {
    return this.engine;
  }

  async submit(options?: {
    validateFirst?: boolean;
    omitNil?: boolean;
  }): Promise<void> {
    this.setSubmitting(true);
    try {
      await this.runSubmit(options);
    } finally {
      this.setSubmitting(false);
    }
  }

  /** 提交中状态（formily submitting 对齐，供提交按钮 loading） */
  getSubmitting(): boolean {
    return this.submitting;
  }

  /** 订阅提交状态变化（返回取消订阅函数，供 useSyncExternalStore 使用） */
  onSubmittingChange(callback: () => void): () => void {
    this.submittingListeners.add(callback);
    return () => {
      this.submittingListeners.delete(callback);
    };
  }

  private setSubmitting(value: boolean): void {
    if (this.submitting === value) {
      return;
    }
    this.submitting = value;
    for (const listener of this.submittingListeners) {
      listener();
    }
  }

  private async runSubmit(options?: {
    validateFirst?: boolean;
    omitNil?: boolean;
  }): Promise<void> {
    const views = this.resolveViews();
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
      const errors = await view.validate(undefined, {
        validateFirst: options?.validateFirst,
      });
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
        omitNil: false,
        watchers: new Map(),
        globalWatcher: null,
        onValuesChange: null,
      };
      const formData = cfg.removeHiddenData
        ? view.getFormData()
        : view.getAllFormData();
      // omitNil（ProForm 对齐）：提交前递归移除空值
      const shouldOmitNil = options?.omitNil ?? cfg.omitNil ?? false;
      const finalData = (
        shouldOmitNil ? omitNilDeep(formData) : formData
      ) as Record<string, unknown>;
      const allowed = await view.submit(finalData);
      if (!allowed) {
        continue;
      }
      await this.instanceBindings.get(id)?.getOnFinish()?.(finalData);
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

  resetFields(): void {
    for (const view of this.resolveViews()) {
      view.reset();
    }
  }

  setErrorFields(errors: Array<{ path: string; errors: string[] }>): void {
    for (const view of this.resolveViews()) {
      view.setErrorFields(errors);
    }
  }

  setValues(values: Record<string, unknown>): void {
    for (const view of this.resolveViews()) {
      view.setFieldValues(values);
    }
  }

  setValueByPath(path: string, value: unknown): void {
    for (const view of this.resolveViews()) {
      view.setFieldValue(path, value);
    }
  }

  setSchemaByPath(path: string, patch: Record<string, unknown>): void {
    for (const view of this.resolveViews()) {
      view.setSchemaByPath(path, patch);
    }
  }

  setSchema(schema: NexusSchema): void {
    for (const view of this.resolveViews()) {
      view.setSchema(schema);
    }
  }

  getValues(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews()) {
      const data = view.getFormData(paths);
      // omitNil（ProForm 对齐）：递归移除空值
      if (options?.omitNil) {
        Object.assign(merged, omitNilDeep(data) as Record<string, unknown>);
      } else {
        Object.assign(merged, data);
      }
    }
    return merged;
  }

  getHiddenValues(): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews()) {
      Object.assign(merged, view.getHiddenValues());
    }
    return merged;
  }

  /** 获取所有字段值（含 hidden） */
  getAllValues(): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const view of this.resolveViews()) {
      Object.assign(merged, view.getAllFormData());
    }
    return merged;
  }

  getValueByPath(path: string): unknown {
    for (const view of this.resolveViews()) {
      const value = view.getFieldValue(path);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
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
    // 注册到各实例引擎（validate 与 实时校验 统一由 Engine 执行）
    for (const view of this.resolveViews()) {
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
  ): void {
    for (const view of this.resolveViews()) {
      view.unregisterFieldValidator(path, validator);
    }
  }

  /**
   * 实时重校验指定字段（同步）
   * 供 widget 组件内部状态变化（非字段值变化）时主动刷新错误态
   */
  revalidateField(path: string): void {
    for (const view of this.resolveViews()) {
      view.validateField(path, { trigger: 'change' });
    }
  }

  getSchema(): NexusSchema | null {
    return this.resolveViews()[0]?.getSchema() ?? null;
  }

  removeErrorField(path: string): void {
    for (const view of this.resolveViews()) {
      view.removeErrorField(path);
    }
  }

  scrollToPath(path: string): void {
    const formEl = this.getPrimaryFormEl();
    const el = formEl?.querySelector(`[data-nexus-field="${path}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getFieldError(path: string): string[] {
    for (const view of this.resolveViews()) {
      const errors = view.getFieldError(path);
      if (errors.length > 0) {
        return errors;
      }
    }
    return [];
  }

  getFieldsError(): Map<string, string[]> {
    const merged = new Map<string, string[]>();
    for (const view of this.resolveViews()) {
      for (const [path, messages] of view.getFieldsError()) {
        merged.set(path, messages);
      }
    }
    return merged;
  }

  validateFields(
    paths?: string[],
    options?: { validateFirst?: boolean },
  ): Promise<Map<string, string[]>> {
    const views = this.resolveViews();
    if (views.length === 1) {
      return views[0].validate(paths, options);
    }
    // 多实例：并行校验并合并错误
    return Promise.all(
      views.map((view) => view.validate(paths, options)),
    ).then((results) => {
      const merged = new Map<string, string[]>();
      for (const result of results) {
        for (const [path, messages] of result) {
          merged.set(path, messages);
        }
      }
      return merged;
    });
  }

  getFieldState(path: string): FieldState | undefined {
    for (const view of this.resolveViews()) {
      const state = view.getFieldState(path);
      if (state) {
        return state;
      }
    }
    return undefined;
  }

  /**
   * 重载远程选项数据（x-render reloadRemoteData 对齐）
   * 传入 path 仅重载该字段的远程数据；缺省时重载全部远程数据字段。
   * 作用于全部实例视图。
   */
  reloadRemoteData(path?: string): void {
    for (const view of this.resolveViews()) {
      view.reloadRemoteData(path);
    }
  }
}
// ============================================================================
// DevToolsEventPlugin — 事件时间线采集插件
// 通过插件系统 Hook 捕获引擎生命周期事件（值变更/校验/数组操作/初始化），
// 供 DevTools 时间线面板消费。纯逻辑、无 UI 依赖，可独立测试。
// ============================================================================

import type {
  EngineHooks,
  NexusEngine,
  NexusPlugin,
} from '@xbeeant/form-engine';

/** 时间线事件类型 */
export type DevToolsEventType =
  | 'init'
  | 'value'
  | 'validate-field'
  | 'validate'
  | 'validate-done'
  | 'array'
  | 'submit';

/** 时间线事件 */
export interface DevToolsEvent {
  /** 自增序号 */
  id: number;
  /** 事件时间戳（performance.now 语义） */
  time: number;
  type: DevToolsEventType;
  /** 关联字段路径 */
  path?: string;
  /** 附加详情（值/操作名/数量等） */
  detail?: unknown;
}

export interface DevToolsEventPluginOptions {
  /** 单条事件回调（同步 push 语义） */
  onEvent: (event: DevToolsEvent) => void;
  /** 暂停时返回 true，跳过事件采集 */
  isPaused?: () => boolean;
  /** 事件上限，超出后丢弃最旧事件 */
  maxEvents?: number;
}

const EVENT_ORDER: DevToolsEventType[] = [
  'init',
  'value',
  'validate-field',
  'validate',
  'validate-done',
  'array',
  'submit',
];

/** 插件名（幂等保护：重复挂载同一插件实例时按名字去重） */
export const DEVTOOLS_PLUGIN_NAME = 'nexus-devtools-events';

/**
 * 时间线采集插件：挂载于 `engine.use(new DevToolsEventPlugin(...))`。
 * 仅消费 Hook 入参、不参与任何逻辑决策（不返回 false / 不返回数组操作结果），
 * 因此对表单行为零影响。
 */
export class DevToolsEventPlugin implements NexusPlugin {
  name = DEVTOOLS_PLUGIN_NAME;

  private options: DevToolsEventPluginOptions;
  private events: DevToolsEvent[] = [];
  private nextId = 1;

  readonly hooks: EngineHooks;

  constructor(options: DevToolsEventPluginOptions) {
    this.options = options;
    this.hooks = {
      onInit: (engine: NexusEngine) => {
        this.push('init', undefined, {
          fields: engine.getAllFieldStates().size,
        });
      },
      onFieldValueChange: (path, value) => {
        this.push('value', path, value);
      },
      onValidateField: (path) => {
        this.push('validate-field', path);
      },
      onBeforeValidate: (paths) => {
        this.push('validate', undefined, { fields: paths?.length ?? 0 });
      },
      onValidate: (results) => {
        let errorCount = 0;
        results.forEach((messages) => {
          errorCount += messages.length;
        });
        this.push('validate-done', undefined, { errorCount });
      },
      onArrayOperation: (options) => {
        this.push('array', options.path, options.operation);
        return undefined;
      },
      onSubmit: (formData) => {
        this.push('submit', undefined, {
          keys: Object.keys(formData ?? {}).length,
        });
        return undefined;
      },
    };
  }

  /** 读取当前全部事件（按时间正序） */
  getEvents(): readonly DevToolsEvent[] {
    return this.events;
  }

  /** 清空时间线 */
  clear(): void {
    this.events = [];
  }

  private push(type: DevToolsEventType, path?: string, detail?: unknown): void {
    if (this.options.isPaused?.()) {
      return;
    }
    this.events.push({
      id: this.nextId++,
      time: Date.now(),
      type,
      path,
      detail,
    });
    const max = this.options.maxEvents ?? 500;
    if (this.events.length > max) {
      this.events.splice(0, this.events.length - max);
    }
    this.options.onEvent(this.events[this.events.length - 1]);
  }
}

/** 事件类型 → 展示名 */
export const EVENT_LABELS: Record<DevToolsEventType, string> = {
  init: '初始化',
  value: '值变更',
  'validate-field': '字段校验',
  validate: '校验开始',
  'validate-done': '校验完成',
  array: '数组操作',
  submit: '提交',
};

/** 事件类型 → 展示色（antd Tag 语义色） */
export const EVENT_COLORS: Record<DevToolsEventType, string> = {
  init: 'geekblue',
  value: 'green',
  'validate-field': 'orange',
  validate: 'purple',
  'validate-done': 'purple',
  array: 'cyan',
  submit: 'gold',
};

export { EVENT_ORDER };

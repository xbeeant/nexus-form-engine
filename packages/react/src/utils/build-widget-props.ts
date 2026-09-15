import type {
  DataFieldSchema,
  DataObjectSchema,
  NexusFormInstance,
  NexusSchema,
  SchemaNode,
} from '@xbeeant/form-engine';

/**
 * x-render addons — 为 widget 组件提供统一的表单数据访问、校验、Schema 操作入口
 * （定义与 NexusAddons 完全一致，避免与 nexus-field.tsx 产生循环依赖）
 */
interface WidgetAddons {
  formData: Record<string, unknown>;
  rootValue: Record<string, unknown>;
  value: unknown;
  dataPath: string;
  path: string;
  index?: number;
  parentValues?: unknown;
  dependValues?: unknown[];
  getValue(path: string): unknown;
  getFieldsValue(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown>;
  getHiddenValues(): Record<string, unknown>;
  getValues(
    paths?: string[],
    options?: { omitNil?: boolean },
  ): Record<string, unknown>;
  setValue(path: string, value: unknown): void;
  onItemChange(path: string, value: unknown): void;
  validate(path?: string): Promise<void>;
  validateFields(paths?: string[]): Promise<void>;
  submit(): Promise<void>;
  resetFields(): void;
  setSchema(schema: Record<string, unknown>): void;
  setSchemaByPath(path: string, patch: Record<string, unknown>): void;
  getSchema(): NexusSchema | null;
}

/**
 * 将实时（已求值）的状态键覆盖到 widget 收到的 schema 副本上。
 *
 * 背景：schema 中的 hidden/required 等可声明为 `{{ }}` 表达式，Parser 已将其转为
 * `_autoExpr` reaction 并求值为 FieldState.hidden/required。若自定义 widget 直接读
 * `props.schema.hidden` 会拿到原始 `{{ }}` 字符串（truthy）→ 误判隐藏。
 * 因此统一在 buildWidgetProps 出口把「声明为表达式、或静态值与实时状态不一致」的
 * 状态键替换为已求值的布尔。
 *
 * 未声明（undefined）的键不写入，保持 schema 引用稳定（避免无谓重建）。
 */
const EVALUATED_SCHEMA_KEYS = [
  'hidden',
  'required',
  'disabled',
  'readOnly',
] as const;

/**
 * 仅附加 dataPath 的 schema 副本缓存：widget 不直接接收 dataPath 顶层 prop，
 * 而是通过 `props.schema.dataPath` 读取字段数据路径。原始 schema 节点是稳定
 * 引用，直接合并会破坏引用稳定；按 (schema 节点, dataPath) 缓存合并副本。
 */
const schemaDataPathCache = new WeakMap<SchemaNode, Map<string, SchemaNode>>();

function resolveEvaluatedSchema(
  schema: SchemaNode | undefined,
  state: {
    hidden?: boolean;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
  },
  dataPath?: string,
): SchemaNode {
  if (!schema) {
    return dataPath !== undefined ? ({ dataPath } as SchemaNode) : {};
  }
  const raw = schema as Record<string, unknown>;

  let copy: Record<string, unknown> | undefined;
  for (const key of EVALUATED_SCHEMA_KEYS) {
    const declared = raw[key];
    const live = state[key];
    const isExpression =
      typeof declared === 'string' && declared.includes('{{');
    if (
      isExpression ||
      (declared !== undefined && live !== undefined && declared !== live)
    ) {
      copy ??= { ...raw };
      copy[key] = live;
    }
  }

  if (copy) {
    // 求值覆盖需要新副本：dataPath 一并附加
    if (dataPath !== undefined && copy.dataPath !== dataPath) {
      copy.dataPath = dataPath;
    }
    return copy as SchemaNode;
  }

  // 无求值覆盖：仅需附加 dataPath 时走缓存，保持 schema 引用稳定
  if (dataPath !== undefined && raw.dataPath !== dataPath) {
    let byPath = schemaDataPathCache.get(schema);
    if (!byPath) {
      byPath = new Map<string, SchemaNode>();
      schemaDataPathCache.set(schema, byPath);
    }
    const cached = byPath.get(dataPath);
    if (cached) {
      return cached;
    }
    const merged = { ...raw, dataPath } as SchemaNode;
    byPath.set(dataPath, merged);
    return merged;
  }

  return schema;
}

/**
 * 构建 Widget 所需的全部 props（统一入口，防止新增属性遗漏透传）
 *
 * `NexusField`（主渲染器）与 `RenderItemControl`（列表项子字段渲染器）共用此函数，
 * 新增 widget prop 只需在此处添加一行，两处自动同步。
 *
 * addons 统一在此构造，调用方只需提供 addons 依赖的值（value/index/itemOf）。
 *
 * @param opts - 扩展项（schema/options/disabled/readOnly/loading/placeholder/dependValues/items/remoteVersion 可选）
 * @param base - 公共 props（必传 form）
 */
export function buildWidgetProps(
  opts: {
    schema?: SchemaNode;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    loading?: boolean;
    hidden?: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: unknown } | string | number>;
    dependValues?: unknown[];
    items?: DataFieldSchema | DataObjectSchema;
    remoteVersion?: number;
    /** addons 的 value（默认取 base.value） */
    addonsValue?: unknown;
    /** addons 的 index（数组项索引，仅在数组内字段有值） */
    addonsIndex?: number;
    /** addons 的 itemOf（所属数组路径，如 "items"，用于 parentValues） */
    addonsItemOf?: string;
  },
  base: {
    dataPath?: string;
    path?: string;
    value?: unknown;
    onChange: (value: unknown) => void;
    form: NexusFormInstance;
  },
): Record<string, unknown> {
  const { form, dataPath, path, value: baseValue } = base;
  const addonsDataPath = dataPath ?? path ?? '';
  const addonsPath = path ?? addonsDataPath;

  // 统一构造 addons（含 getters 动态取值，响应 form 状态变化）
  const addons: WidgetAddons = {
    get formData() {
      return form.getValues();
    },
    get rootValue() {
      return form.getValues();
    },
    value: opts.addonsValue ?? baseValue,
    dataPath: addonsDataPath,
    path: addonsPath,
    index: opts.addonsIndex,
    parentValues: opts.addonsItemOf
      ? form.getValueByPath(opts.addonsItemOf)
      : undefined,
    dependValues: opts.dependValues,
    getValue: (p: string) => form.getValueByPath(p),
    setValue: (p: string, v: unknown) => form.setValueByPath(p, v),
    onItemChange: (p: string, v: unknown) => form.setValueByPath(p, v),
    validate: async (p?: string) => {
      if (p) {
        await form.validateFields([p]);
      } else {
        await form.validateFields([addonsDataPath]);
      }
    },
    validateFields: async (paths?: string[]) => {
      await form.validateFields(paths);
    },
    getFieldsValue: (paths?: string[], options?: { omitNil?: boolean }) => {
      return form.getValues(paths, options);
    },
    getValues: (paths?: string[], options?: { omitNil?: boolean }) => {
      return form.getValues(paths, options);
    },
    getHiddenValues: () => {
      return form.getHiddenValues();
    },
    submit: () => form.submit(),
    resetFields: () => form.resetFields(),
    setSchema: (s: Record<string, unknown>) => form.setSchema(s as any),
    setSchemaByPath: (p: string, patch: Record<string, unknown>) =>
      form.setSchemaByPath(p, patch),
    getSchema: () => form.getSchema(),
  };

  return {
    schema: resolveEvaluatedSchema(
      opts.schema,
      {
        hidden: opts.hidden,
        required: opts.required,
        disabled: opts.disabled,
        readOnly: opts.readOnly,
      },
      addonsDataPath,
    ),
    disabled: opts.disabled,
    readOnly: opts.readOnly,
    required: opts.required,
    loading: opts.loading,
    hidden: opts.hidden,
    placeholder: opts.placeholder,
    options: opts.options,
    dependValues: opts.dependValues,
    items: opts.items,
    remoteVersion: opts.remoteVersion,
    // dataPath 不直接透传给 widget：组件通过 props.schema.dataPath 读取
    // （数据路径已合并入 schema；addons.dataPath 仍保留供表单 API 使用）
    path: addonsPath,
    value: base.value,
    onChange: base.onChange,
    form,
    addons,
  };
}

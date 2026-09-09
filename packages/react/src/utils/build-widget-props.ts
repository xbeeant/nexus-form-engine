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
    dependValues?: Record<string, unknown>;
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
    form?: NexusFormInstance;
  },
): Record<string, unknown> {
  const { form, dataPath, path, value: baseValue } = base;
  const addonsDataPath = dataPath ?? path ?? '';
  const addonsPath = path ?? addonsDataPath;

  // 统一构造 addons（含 getters 动态取值，响应 form 状态变化）
  const addons: WidgetAddons | undefined = form
    ? {
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
      }
    : undefined;

  return {
    schema: opts.schema,
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
    ...base,
    addons,
  };
}

// ============================================================================
// @xbeeant/form-engine — 公共 API 入口
// 导出所有核心类、类型定义和工具函数
// ============================================================================

/** 数组字段操作插件 */
export { ArrayOperationsPlugin } from './array-list';
export type { AsyncValidatorOptions, FieldValidator } from './async-validator';
/** 异步校验器插件（防抖/超时/并行调度，engine.use 注入） */
export {
  AsyncValidatorPlugin,
  createAsyncValidatorPlugin,
} from './async-validator';
/** 显式依赖图（静态构建，O(1) 查询） */
export { DependencyGraph } from './dependency-graph';
// Core
/** 表单引擎核心类 */
export { NexusEngine } from './engine';
export type { EvaluateOptions } from './expression-sandbox';
/** 表达式安全求值沙箱 */
export {
  createExpressionSandbox,
  ErrorHandlerStrategy,
  ExpressionSandbox,
} from './expression-sandbox';
export type { FormRegisterCallback } from './form-registry';
/** 多表单实例注册表（跨表单联动基础设施） */
export {
  createFormRegistry,
  defaultFormRegistry,
  FormRegistry,
} from './form-registry';
/** Schema 解析器（命名空间对象：SchemaParser.parse / SchemaParser.createArrayItemState 等） */
export * from './schema-parser';
// 类型定义
export type {
  BindSchema,
  BranchSchema,
  CrossFormLinkOptions,
  DataArraySchema,
  DataFieldSchema,
  DataNode,
  DataObjectSchema,
  DataPrimitiveType,
  DataType,
  DefaultRuleMessages,
  EngineHooks,
  Expression,
  ExpressionOr,
  FieldFormat,
  FieldHookContext,
  FieldHooks,
  FieldState,
  FieldStatePatch,
  FormEngine,
  LayoutBaseProps,
  LayoutContainerSchema,
  LayoutContainerType,
  LayoutNode,
  LayoutPaneSchema,
  LayoutPaneType,
  LayoutType,
  NexusComponent,
  NexusEngineOptions,
  NexusFormInstance,
  NexusFormValidator,
  NexusPlugin,
  NexusSchema,
  OneOfBranchOption,
  OneOfMeta,
  Reaction,
  ReactionContext,
  ReactionFnContext,
  ReactionSchemaPatch,
  ReactionStatePatch,
  ReadonlyFormEngine,
  RenderBranchNode,
  RenderFieldNode,
  RenderLayoutNode,
  RenderObjectNode,
  RenderTreeNode,
  RuleType,
  SchemaNode,
  SideEffectsConfig,
  TypedFieldSchema,
  TypedSchemaNode,
  ValidateSchema,
  ValidationRule,
  ValidationTrigger,
  WidgetDescriptors,
  WidgetPropsMap,
  WidgetSpecificProps,
  WidgetValidationDescriptor,
} from './types/schema';
export {
  formatField,
  toFormData,
  toMultipart,
  toSearchParams,
} from './utils/data-converters';
export {
  getNestedValue,
  isBranchNode,
  isDataArray,
  isDataField,
  isDataNode,
  isDataObject,
  isDeepEqual,
  isEmptyValue,
  isExpressionString,
  isLayoutNode,
  isThenable,
  LAYOUT_CONTAINER_TYPES,
  LAYOUT_PANE_TYPES,
  LAYOUT_TYPES,
  setNestedValue,
  toBoolean,
} from './utils/schema-helper';
/** Schema 生命周期工具（字段收集 / 初始值提取 / 变更对比 / 值迁移） */
export {
  diffSchemas,
  getInitialValues,
  getPathValue,
  getSchemaFieldPaths,
  migrateValues,
  type SchemaDiff,
  type SchemaDiffKind,
  type SchemaFieldEntry,
  setPathValue,
} from './utils/schema-lifecycle';
/** Schema序列化/反序列化工具 */
export {
  compress,
  compressionRate,
  compressToBase64,
  decompressFromBase64,
  deserialize,
  diff,
  serialize,
  sizeOf,
} from './utils/schema-serializer';

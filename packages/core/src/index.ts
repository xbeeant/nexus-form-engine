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
export { DependencyGraph } from './DependencyGraph';
// Core
/** 表单引擎核心类 */
export { NexusEngine } from './Engine';
export type { EvaluateOptions } from './ExpressionSandbox';
/** 表达式安全求值沙箱 */
export {
  createExpressionSandbox,
  ErrorHandlerStrategy,
  ExpressionSandbox,
} from './ExpressionSandbox';
export type { FormRegisterCallback } from './FormRegistry';
/** 多表单实例注册表（跨表单联动基础设施） */
export {
  createFormRegistry,
  defaultFormRegistry,
  FormRegistry,
} from './FormRegistry';
/** Schema 解析器（命名空间对象：SchemaParser.parse / SchemaParser.createArrayItemState 等） */
export * from './SchemaParser';
// 类型定义
export type {
  BindSchema,
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
  Reaction,
  ReactionContext,
  ReactionSchemaPatch,
  ReactionStatePatch,
  ReadonlyFormEngine,
  RenderFieldNode,
  RenderLayoutNode,
  RenderObjectNode,
  RenderTreeNode,
  RuleType,
  SchemaNode,
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
  isDataArray,
  isDataField,
  isDataNode,
  isDataObject,
  isDeepEqual,
  isEmptyValue,
  isLayoutNode,
  isThenable,
  LAYOUT_CONTAINER_TYPES,
  LAYOUT_PANE_TYPES,
  LAYOUT_TYPES,
  setNestedValue,
  toBoolean,
} from './utils/schema-helper';
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
/** Schema 生命周期工具（字段收集 / 初始值提取 / 变更对比 / 值迁移） */
export {
  diffSchemas,
  getInitialValues,
  getPathValue,
  getSchemaFieldPaths,
  migrateValues,
  setPathValue,
  type SchemaDiff,
  type SchemaDiffKind,
  type SchemaFieldEntry,
} from './utils/schema-lifecycle';

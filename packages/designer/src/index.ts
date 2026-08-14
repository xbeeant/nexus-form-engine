// ============================================================================
// @nexus/form-engine-designer — 公共 API
// ============================================================================

export { layoutCatalog, widgetCatalog } from './catalog';
export type { DesignerProps } from './Designer';
export { Designer } from './Designer';
export type { DesignerContextValue } from './DesignerContext';
export { DesignerProvider, useDesigner } from './DesignerContext';
export {
  addChildToSchema,
  collectDataFieldPaths,
  collectDataFieldOptions,
  flattenNodeForPropertyEditor,
  getNodeAtProperties,
  removeNodeFromSchema,
  updateNodeInSchema,
  updateNodeWithNesting,
} from './schemaUtils';
export type {
  CatalogItem,
  DesignerMode,
  FieldDef,
  SchemaPath,
} from './types';

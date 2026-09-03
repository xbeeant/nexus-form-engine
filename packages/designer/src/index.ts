// ============================================================================
// @xbeeant/form-engine-designer — 公共 API
// ============================================================================

export { layoutCatalog, widgetCatalog } from './catalog';
export type { DesignerProps } from './designer';
export { Designer } from './designer';
export type { DesignerContextValue } from './designer-context';
export { DesignerProvider, useDesigner } from './designer-context';
export {
  addChildToSchema,
  collectDataFieldOptions,
  collectDataFieldPaths,
  flattenNodeForPropertyEditor,
  getNodeAtProperties,
  removeNodeFromSchema,
  updateNodeInSchema,
  updateNodeWithNesting,
} from './schema-utils';
export type {
  CatalogItem,
  DesignerMode,
  FieldDef,
  SchemaPath,
} from './types';

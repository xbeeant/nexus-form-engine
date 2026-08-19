// ============================================================================
// @xbeeant/form-engine-designer — 设计器状态上下文
// ============================================================================

import type {
  NexusEngine,
  NexusSchema,
  SchemaNode,
} from '@xbeeant/form-engine';
import type { PropertySchemaMap } from '@xbeeant/form-engine-ui';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SchemaHistory } from './history';
import {
  addChildToSchema,
  moveNodeInSchema,
  removeNodeFromSchema,
  renameNodeInSchema,
  updateNodeWithNesting,
} from './schemaUtils';
import type { CatalogItem, DesignerMode, FieldDef } from './types';

/** 设计器内部状态 */
export interface DesignerState {
  schema: NexusSchema;
  selectedPath: string[] | null;
  mode: DesignerMode;
}

export interface DesignerContextValue {
  schema: NexusSchema;
  propertySchemaMap: PropertySchemaMap;
  selectedPath: string[] | null;
  mode: DesignerMode;
  /** UI 注册函数，向引擎注册 widgets/layouts */
  registerUI?: (engine: NexusEngine) => void;
  /** 外部字段列表 */
  fields?: FieldDef[];
  /** 合并后的 widget 目录（内置 + 外部传入） */
  widgetCatalog: CatalogItem[];
  /** 合并后的 layout 目录（内置 + 外部传入） */
  layoutCatalog: CatalogItem[];
  setSchema: (schema: NexusSchema) => void;
  selectNode: (path: string[] | null) => void;
  setMode: (mode: DesignerMode) => void;
  addNode: (parentPath: string[], key: string, node: SchemaNode) => void;
  removeNode: (path: string[]) => void;
  updateNode: (path: string[], patch: Record<string, unknown>) => void;
  moveNode: (fromPath: string[], toParentPath: string[]) => void;
  /** 重命名节点 key（schema 结构级操作，保留节点在父级中的位置） */
  renameNode: (path: string[], newKey: string) => void;
  /** 撤销：恢复最近一次结构/属性变更 */
  undo: () => void;
  /** 重做：恢复最近一次撤销 */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface DesignerProviderProps {
  initialSchema: NexusSchema;
  propertySchemaMap: PropertySchemaMap;
  onSchemaChange?: (schema: NexusSchema) => void;
  registerUI?: (engine: NexusEngine) => void;
  fields?: FieldDef[];
  widgetCatalog: CatalogItem[];
  layoutCatalog: CatalogItem[];
  children: ReactNode;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function DesignerProvider({
  initialSchema,
  propertySchemaMap,
  onSchemaChange,
  registerUI,
  fields,
  widgetCatalog,
  layoutCatalog,
  children,
}: DesignerProviderProps) {
  const [schema, setSchemaState] = useState<NexusSchema>(initialSchema);
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  const [mode, setMode] = useState<DesignerMode>('design');
  const historyRef = useRef(new SchemaHistory());
  // 历史栈版本：驱动 canUndo/canRedo 的消费方重渲染
  const [_historyVersion, setHistoryVersion] = useState(0);

  // 写入 schema 并同步通知外部；历史记录由 SchemaHistory 统一管理
  const emit = useCallback(
    (
      next: NexusSchema,
      kind: 'edit' | 'replace' = 'replace',
      path: string | null = null,
    ) => {
      historyRef.current.push(schema, kind, path);
      setHistoryVersion((v) => v + 1);
      setSchemaState(next);
      onSchemaChange?.(next);
    },
    [schema, onSchemaChange],
  );

  const undo = useCallback(() => {
    const restored = historyRef.current.undo(schema);
    if (restored === null) {
      return;
    }
    setHistoryVersion((v) => v + 1);
    setSchemaState(restored);
    onSchemaChange?.(restored);
  }, [schema, onSchemaChange]);

  const redo = useCallback(() => {
    const restored = historyRef.current.redo();
    if (restored === null) {
      return;
    }
    setHistoryVersion((v) => v + 1);
    setSchemaState(restored);
    onSchemaChange?.(restored);
  }, [onSchemaChange]);

  const setSchema = useCallback((next: NexusSchema) => emit(next), [emit]);

  const selectNode = useCallback((path: string[] | null) => {
    setSelectedPath(path);
  }, []);

  // setMode 直接复用 useState 的 setter（稳定引用，无需额外包裹）

  const addNode = useCallback(
    (parentPath: string[], key: string, node: SchemaNode) => {
      emit(addChildToSchema(schema, parentPath, key, node), 'edit');
    },
    [schema, emit],
  );

  const removeNode = useCallback(
    (path: string[]) => {
      emit(removeNodeFromSchema(schema, path), 'edit');
      setSelectedPath(null);
    },
    [schema, emit],
  );

  const updateNode = useCallback(
    (path: string[], patch: Record<string, unknown>) => {
      // 同路径的连续属性编辑由 SchemaHistory 合并（COALESCE_MS 窗口）
      emit(updateNodeWithNesting(schema, path, patch), 'edit', path.join('.'));
    },
    [schema, emit],
  );

  const moveNode = useCallback(
    (fromPath: string[], toParentPath: string[]) => {
      emit(moveNodeInSchema(schema, fromPath, toParentPath), 'edit');
    },
    [schema, emit],
  );

  const renameNode = useCallback(
    (path: string[], newKey: string) => {
      const result = renameNodeInSchema(schema, path, newKey);
      emit(result.schema, 'edit');
      setSelectedPath(result.newPath);
    },
    [schema, emit],
  );

  const value = useMemo<DesignerContextValue>(
    () => ({
      schema,
      selectedPath,
      mode,
      registerUI,
      fields,
      widgetCatalog,
      layoutCatalog,
      propertySchemaMap,
      setSchema,
      selectNode,
      setMode,
      addNode,
      removeNode,
      updateNode,
      moveNode,
      renameNode,
      undo,
      redo,
      canUndo: historyRef.current.canUndo,
      canRedo: historyRef.current.canRedo,
    }),
    [
      schema,
      propertySchemaMap,
      selectedPath,
      mode,
      registerUI,
      fields,
      widgetCatalog,
      layoutCatalog,
      setSchema,
      addNode,
      removeNode,
      updateNode,
      moveNode,
      renameNode,
      undo,
      redo,
      selectNode,
    ],
  );

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner(): DesignerContextValue {
  const ctx = useContext(DesignerContext);
  if (!ctx) {
    throw new Error('useDesigner 必须在 <DesignerProvider> 内使用');
  }
  return ctx;
}

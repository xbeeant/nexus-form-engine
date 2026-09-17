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
} from './schema-utils';
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
  // 与 schema state 同步的引用：让 emit/undo/redo 读取「最新」schema，
  // 又无需把 schema 放入依赖数组 → 所有操作回调保持引用稳定，
  // 避免每次属性编辑都重建 Context value、级联重渲染整棵设计器树
  const schemaRef = useRef(schema);
  // 历史栈版本：驱动 canUndo/canRedo 的消费方重渲染
  const [_historyVersion, setHistoryVersion] = useState(0);

  // 写入 schema 并同步通知外部；历史记录由 SchemaHistory 统一管理
  // 不依赖 schema（从 schemaRef 读取最新值），引用稳定
  const emit = useCallback(
    (
      next: NexusSchema,
      kind: 'edit' | 'replace' = 'replace',
      path: string | null = null,
    ) => {
      historyRef.current.push(schemaRef.current, kind, path);
      schemaRef.current = next;
      setHistoryVersion((v) => v + 1);
      setSchemaState(next);
      onSchemaChange?.(next);
    },
    [onSchemaChange],
  );

  const undo = useCallback(() => {
    const restored = historyRef.current.undo(schemaRef.current);
    if (restored === null) {
      return;
    }
    schemaRef.current = restored;
    setHistoryVersion((v) => v + 1);
    setSchemaState(restored);
    onSchemaChange?.(restored);
  }, [onSchemaChange]);

  const redo = useCallback(() => {
    const restored = historyRef.current.redo();
    if (restored === null) {
      return;
    }
    schemaRef.current = restored;
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
      emit(addChildToSchema(schemaRef.current, parentPath, key, node), 'edit');
    },
    [emit],
  );

  const removeNode = useCallback(
    (path: string[]) => {
      emit(removeNodeFromSchema(schemaRef.current, path), 'edit');
      setSelectedPath(null);
    },
    [emit],
  );

  const updateNode = useCallback(
    (path: string[], patch: Record<string, unknown>) => {
      // 同路径的连续属性编辑由 SchemaHistory 合并（COALESCE_MS 窗口）
      // updateNodeWithNesting 为 Copy-on-Write 路径更新，不再整棵深拷贝
      emit(
        updateNodeWithNesting(schemaRef.current, path, patch),
        'edit',
        path.join('.'),
      );
    },
    [emit],
  );

  const moveNode = useCallback(
    (fromPath: string[], toParentPath: string[]) => {
      emit(moveNodeInSchema(schemaRef.current, fromPath, toParentPath), 'edit');
    },
    [emit],
  );

  const renameNode = useCallback(
    (path: string[], newKey: string) => {
      const result = renameNodeInSchema(schemaRef.current, path, newKey);
      emit(result.schema, 'edit');
      setSelectedPath(result.newPath);
    },
    [emit],
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

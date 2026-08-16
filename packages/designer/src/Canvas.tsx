// ============================================================================
// @nexus/form-engine-designer — 中间画布面板
// ============================================================================

import type { NexusSchema, SchemaNode } from '@nexus/form-engine';
import { isDataField, isLayoutNode } from '@nexus/form-engine';
import {
  GridContext,
  NexusField,
  NexusForm,
  type NexusFormConfig,
  NexusFormProvider,
  useForm,
} from '@nexus/form-engine-react';
import { Button, Empty, Modal, Space, Tag, Typography } from 'antd';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDesigner } from './DesignerContext';
import {
  generateKey,
  getNodeAtProperties,
  getNodeLabel,
  getPropertiesOf,
  moveNodeInSchema,
  removeNodeFromSchema,
} from './schemaUtils';
import type { CatalogItem, FieldDef } from './types';

// ── 拖拽数据载荷 ────────────────────────────────────────────────────────────
interface PaletteDragPayload {
  source: 'palette';
  catalogItem: CatalogItem;
}
interface FieldDefDragPayload {
  source: 'fieldDef';
  fieldDef: FieldDef;
}
interface CanvasDragPayload {
  source: 'canvas';
  fromPath: string[];
}
type DragPayload = PaletteDragPayload | FieldDefDragPayload | CanvasDragPayload;

const DRAG_MIME = 'application/json';

// ── Drop 目标类型 ───────────────────────────────────────────────────────────
type DropTarget =
  | { type: 'inside'; path: string[] } // 拖入容器内部（追加到末尾）
  | { type: 'before'; path: string[] } // 插入到某节点之前
  | { type: 'after'; path: string[] } // 插入到某节点之后
  | null;

function pathEquals(a: string[] | null, b: string[]): boolean {
  if (!a) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((seg, i) => seg === b[i]);
}

function dropTargetEquals(a: DropTarget, b: DropTarget): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.type === b.type && pathEquals(a.path, b.path);
}

// ────────────────────────────────────────────────────────────────────────────
// 面板节点（tabPane / collapsePanel / step）与容器类型的映射
// 面板只能放入对应的 tabs / collapse / steps 容器（否则渲染结构非法）；
// 普通节点直接拖入这些容器时自动包裹成新面板，保证运行时渲染结构合法。
// ────────────────────────────────────────────────────────────────────────────

/** 面板类型 → 唯一允许的父容器类型 */
const PANE_PARENT_TYPE: Record<string, string> = {
  tabPane: 'tabs',
  collapsePanel: 'collapse',
  step: 'steps',
};

/** 容器类型 → 默认面板类型 */
const CONTAINER_PANE_TYPE: Record<string, string> = {
  tabs: 'tabPane',
  collapse: 'collapsePanel',
  steps: 'step',
};

/** 面板默认标题 */
const PANE_DEFAULT_TITLE: Record<string, string> = {
  tabPane: '标签页',
  collapsePanel: '折叠面板',
  step: '步骤',
};

/** 获取路径终点节点的容器类型（根路径返回 undefined） */
function getContainerTypeAt(
  schema: NexusSchema,
  path: string[],
): string | undefined {
  if (path.length === 0) {
    return undefined;
  }
  const node = getNodeAtProperties(schema.properties, path);
  return node ? (node.type as string) : undefined;
}

/**
 * 解析一次「新增节点」插入所需的节点构造器：
 * - 面板节点（tabPane/collapsePanel/step）：仅当目标父级是对应容器时放行，否则拒绝
 * - 普通节点拖入 tabs/collapse/steps 容器：自动包裹成新面板
 * - 其余情况：原样返回
 *
 * @param innerKey 外部字段拖入时使用的固定 key（作为包裹面板内部字段的 key）
 * @returns 插入用构造器；返回 null 表示本次插入被拒绝
 */
function resolveInsertFactory(
  schema: NexusSchema,
  toParentPath: string[],
  createNode: () => SchemaNode,
  nodeType: string,
  innerKey?: string,
): (() => SchemaNode) | null {
  const parentType = getContainerTypeAt(schema, toParentPath);

  const requiredParent = PANE_PARENT_TYPE[nodeType];
  if (requiredParent) {
    return parentType === requiredParent ? createNode : null;
  }

  const paneType = parentType ? CONTAINER_PANE_TYPE[parentType] : undefined;
  if (paneType) {
    return () =>
      ({
        type: paneType,
        title: PANE_DEFAULT_TITLE[paneType],
        properties: {
          [innerKey ?? generateKey({}, nodeType)]: createNode(),
        },
      }) as unknown as SchemaNode;
  }

  return createNode;
}

/**
 * 解析一次「移动已有节点」的落点：
 * - 移动面板节点：仅允许放入对应容器（否则返回 null）
 * - 普通节点移入 tabs/collapse/steps 容器：包裹成新面板
 *
 * @returns wrapped 为 true 时 node 是新建的包裹面板，需删除原节点
 */
function resolveMoveNode(
  schema: NexusSchema,
  fromPath: string[],
  toParentPath: string[],
): { node: SchemaNode; wrapped: boolean } | null {
  const node = getNodeAtProperties(schema.properties, fromPath);
  if (!node) {
    return null;
  }
  const parentType = getContainerTypeAt(schema, toParentPath);
  const nodeType = node.type as string;

  const requiredParent = PANE_PARENT_TYPE[nodeType];
  if (requiredParent) {
    return parentType === requiredParent ? { node, wrapped: false } : null;
  }

  const paneType = parentType ? CONTAINER_PANE_TYPE[parentType] : undefined;
  if (paneType) {
    return {
      wrapped: true,
      node: {
        type: paneType,
        title: PANE_DEFAULT_TITLE[paneType],
        properties: {
          [fromPath[fromPath.length - 1]]: node,
        },
      } as unknown as SchemaNode,
    };
  }

  return { node, wrapped: false };
}

// 判断 targetPath 是否是 fromPath 自身或其后代
function isDescendantOrSelf(fromPath: string[], targetPath: string[]): boolean {
  if (fromPath.length <= targetPath.length) {
    return targetPath
      .slice(0, fromPath.length)
      .every((seg, i) => seg === fromPath[i]);
  }
  return false;
}

// 判断是否允许拖入（纯函数：不依赖组件作用域）
function canDrop(fromPath: string[], targetPath: string[]): boolean {
  if (isDescendantOrSelf(fromPath, targetPath)) {
    return false;
  }
  const fromParent = fromPath.slice(0, -1);
  return !(
    fromParent.length === targetPath.length &&
    fromParent.every((seg, i) => seg === targetPath[i])
  );
}

// 计算 insertIndex：将节点移动/新增到目标位置（纯函数：不依赖组件作用域）
function computeInsertIndex(
  target: DropTarget,
  schemaProps: Record<string, SchemaNode>,
): { toParentPath: string[]; insertIndex: number } | null {
  if (!target || target.type === 'inside') {
    return null;
  }

  const nodeIndex = getIndexInParent(schemaProps, target.path);
  if (nodeIndex === -1) {
    return null;
  }

  const toParentPath = target.path.slice(0, -1);

  if (target.type === 'before') {
    return { toParentPath, insertIndex: nodeIndex };
  } else {
    // after
    return { toParentPath, insertIndex: nodeIndex + 1 };
  }
}

function resolveCatalogItem(
  payload: CatalogItem,
  widgetCatalog: CatalogItem[],
  layoutCatalog: CatalogItem[],
): CatalogItem | undefined {
  if (payload.category === 'widget') {
    return widgetCatalog.find((c) => c.widget === payload.widget);
  }
  return layoutCatalog.find((c) => c.layoutType === payload.layoutType);
}

// 根据 widget 名推断 schema type（用于外部字段拖入时构造节点）
function inferSchemaType(widget: string): string {
  if (['checkbox', 'switch'].includes(widget)) {
    return 'boolean';
  }
  if (['number', 'slider'].includes(widget)) {
    return 'number';
  }
  if (['checkboxes', 'multiSelect'].includes(widget)) {
    return 'array';
  }
  if (widget === 'object') {
    return 'object';
  }
  return 'string';
}

// 获取节点在其父级中的 index
function getIndexInParent(
  schemaProps: Record<string, SchemaNode>,
  path: string[],
): number {
  const parentPath = path.slice(0, -1);
  const key = path[path.length - 1];
  const parentProps =
    parentPath.length === 0
      ? schemaProps
      : getNodeAtProperties(schemaProps, parentPath) &&
        getPropertiesOf(getNodeAtProperties(schemaProps, parentPath)!);
  if (!parentProps) {
    return -1;
  }
  return Object.keys(parentProps).indexOf(key);
}

// 与 getParentProps 相同，但作用于指定 schema（用于在副本上定位 properties）
function getPropsAtPath(
  targetSchema: NexusSchema,
  parentPath: string[],
): Record<string, SchemaNode> | undefined {
  if (parentPath.length === 0) {
    return targetSchema.properties;
  }
  const parent = getNodeAtProperties(targetSchema.properties, parentPath);
  return parent ? getPropertiesOf(parent) : undefined;
}

// 从事件中计算 drop 目标（避免状态延迟）
function computeDropTargetFromEvent(
  e: React.DragEvent,
  path: string[],
): DropTarget {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = e.clientY - rect.top;
  const type: 'before' | 'after' = y < rect.height / 2 ? 'before' : 'after';
  return { type, path };
}

/** 路径数组 → 稳定字符串 key（JSON 序列化，任意 key 内容均安全） */
function toPathKey(path: string[]): string {
  return JSON.stringify(path);
}

// ────────────────────────────────────────────────────────────────────────────
// CanvasActions — 下发给 CanvasNode 的回调集合
// 全部 useCallback 稳定化：schema/catalog 未变时引用不变，
// 配合 React.memo 让拖拽热路径（dragOver → setDropTarget）只重渲染受影响节点
// ────────────────────────────────────────────────────────────────────────────

interface CanvasActions {
  onSelect: (path: string[]) => void;
  onDelete: (path: string[]) => void;
  onReorder: (path: string[], direction: 'up' | 'down') => void;
  onDragStart: (e: React.DragEvent, path: string[]) => void;
  onDragOver: (e: React.DragEvent, path: string[]) => void;
  onNodeDrop: (e: React.DragEvent, path: string[]) => void;
  onContainerDragOver: (e: React.DragEvent) => void;
  onContainerDrop: (e: React.DragEvent, path: string[]) => void;
}

interface CanvasNodeProps {
  node: SchemaNode;
  /** 节点在 schema 中的路径 key（JSON 字符串，跨渲染引用稳定） */
  pathKey: string;
  depth: number;
  /** 祖先数据路径（布局节点 key 不进入，与 SchemaParser 对齐） */
  parentDataPath: string;
  /** 父级计算好的派生值：仅本节点相关（boolean/string，参与 memo 比较） */
  isSelected: boolean;
  dropTargetType: 'before' | 'after' | null;
  /** 原始状态透传（供本节点计算其子节点的派生值；不参与 memo 比较） */
  selectedPathKey: string | null;
  dropTarget: DropTarget;
  actions: CanvasActions;
}

// ────────────────────────────────────────────────────────────────────────────
// CanvasNode — 单个节点的递归渲染（memo 化，自定义比较器）
// 比较器只对比派生值（isSelected / dropTargetType）与稳定引用（node / pathKey /
// depth / parentDataPath / actions）：拖拽过程中只有 drop 目标节点与选中节点
// 的派生值变化 → 其余子树整体跳过重渲染，热路径从 O(N) 降为 O(1)
// ────────────────────────────────────────────────────────────────────────────

const CanvasNode = memo(
  function CanvasNode({
    node,
    pathKey,
    depth,
    parentDataPath,
    isSelected,
    dropTargetType,
    selectedPathKey,
    dropTarget,
    actions,
  }: CanvasNodeProps) {
    const path = useMemo(() => JSON.parse(pathKey) as string[], [pathKey]);
    const childProps = getPropertiesOf(node);
    const hasChildren = childProps !== undefined;
    const label = getNodeLabel(node, path[path.length - 1]);
    const badge = node.widget || node.type;
    // 计算数据路径：布局节点 key 不进入数据路径（与 SchemaParser 对齐）
    const isLayout = isLayoutNode(node);
    const dataPath = isLayout
      ? parentDataPath
      : parentDataPath
        ? `${parentDataPath}.${path[path.length - 1]}`
        : path[path.length - 1];
    const childEntries = childProps ? Object.entries(childProps) : [];
    const isField = isDataField(node);

    return (
      <div
        key={pathKey}
        className='mb-1.5 relative'
        style={{ marginLeft: depth }}
      >
        {/* before 插入指示线 — 显示在容器上方 */}
        {dropTargetType === 'before' && (
          <div className='drop-indicator-line relative h-1 pointer-events-none z-10 -mt-0.5' />
        )}

        {/* 统一包裹容器：header + 预览/子节点 */}
        <div
          className={`relative rounded border bg-white transition-all ${
            isSelected
              ? 'border-[#1677ff] bg-[#e6f4ff] shadow-[0_0_0_2px_rgba(22,119,255,0.1)]'
              : 'border-[#e8e8e8] hover:border-[#1677ff]'
          }`}
        >
          {/* header 行：拖拽 + 信息 + 操作 */}
          <div
            className='flex items-center gap-1.5 px-2 py-1.5 cursor-grab'
            draggable
            onDragStart={(e) => actions.onDragStart(e, path)}
            onDragOver={(e) => actions.onDragOver(e, path)}
            onDragLeave={(e) => {
              e.stopPropagation();
            }}
            onDrop={(e) => actions.onNodeDrop(e, path)}
            onClick={(e) => {
              e.stopPropagation();
              actions.onSelect(path);
            }}
          >
            <Tag
              color={hasChildren || isLayout ? 'blue' : undefined}
              className='m-0! shrink-0'
            >
              {badge}
            </Tag>
            <Typography.Text className='flex-1 overflow-hidden text-ellipsis whitespace-nowrap'>
              {label}
            </Typography.Text>
            <Typography.Text className='text-[#bfbfbf] text-[11px] font-mono shrink-0'>
              {path[path.length - 1]}
            </Typography.Text>
            {isSelected && (
              <span className='inline-flex gap-1'>
                <Button
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onReorder(path, 'up');
                  }}
                >
                  ↑
                </Button>
                <Button
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onReorder(path, 'down');
                  }}
                >
                  ↓
                </Button>
                <Button
                  size='small'
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onDelete(path);
                  }}
                >
                  ×
                </Button>
              </span>
            )}
          </div>

          {/* 字段节点：通过 NexusField 渲染，复用引擎 reaction/联动 */}
          {isField && (
            <div className='px-2 pb-2'>
              <NexusField
                dataPath={dataPath}
                layoutKey={path[path.length - 1]}
              />
            </div>
          )}

          {/* 有子节点的容器：显示子节点 */}
          {!isField &&
            hasChildren &&
            (() => {
              const isGridNode = node.type === 'grid';
              const isFlexNode = node.type === 'flex';

              // 根据布局类型构建容器 CSS 样式
              let containerStyle: React.CSSProperties | undefined;
              let gridContextValue: { column: number } | null = null;

              if (isGridNode) {
                const column = Math.max(1, (node as any).column ?? 2);
                const gap = (node as any).gap ?? 12;
                containerStyle = {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${column}, 1fr)`,
                  gap: `${gap}px`,
                };
                gridContextValue = { column };
              } else if (isFlexNode) {
                const gap = (node as any).gap ?? 8;
                const direction = (node as any).direction ?? 'row';
                const flexAlign = (node as any).align ?? 'flex-start';
                const flexJustify = (node as any).justify ?? 'flex-start';
                const flexWrap = (node as any).wrap ?? false;
                containerStyle = {
                  display: 'flex',
                  flexDirection: direction === 'column' ? 'column' : 'row',
                  alignItems: flexAlign,
                  justifyContent: flexJustify,
                  flexWrap: flexWrap ? 'wrap' : 'nowrap',
                  gap: `${gap}px`,
                };
              }

              const innerContent = (
                <>
                  {childEntries.map(([childKey, childNode]) => {
                    const childPathKey = toPathKey([...path, childKey]);
                    const childIsSelected = selectedPathKey === childPathKey;
                    const childDropTargetType =
                      dropTarget &&
                      (dropTarget.type === 'before' ||
                        dropTarget.type === 'after') &&
                      dropTargetPathKey(dropTarget) === childPathKey
                        ? dropTarget.type
                        : null;
                    return (
                      <CanvasNode
                        key={childPathKey}
                        node={childNode}
                        pathKey={childPathKey}
                        depth={depth + 1}
                        parentDataPath={dataPath}
                        isSelected={childIsSelected}
                        dropTargetType={childDropTargetType}
                        selectedPathKey={selectedPathKey}
                        dropTarget={dropTarget}
                        actions={actions}
                      />
                    );
                  })}
                  {childEntries.length === 0 && (
                    <div className='text-[#bfbfbf] text-xs text-center py-2'>
                      拖拽组件到此处
                    </div>
                  )}
                </>
              );

              const childDiv = (
                <div
                  className='mx-2 mb-2 p-2 border border-dashed rounded min-h-8 bg-[rgba(250,250,250,0.6)] border-[#d9d9d9]'
                  style={containerStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onDragOver={actions.onContainerDragOver}
                  onDrop={(e) => actions.onContainerDrop(e, path)}
                >
                  {innerContent}
                </div>
              );

              // grid 需要提供 GridContext 给子项中的 NexusField 解析 colSpan
              if (gridContextValue) {
                return (
                  <GridContext.Provider value={gridContextValue}>
                    {childDiv}
                  </GridContext.Provider>
                );
              }

              return childDiv;
            })()}
        </div>

        {/* after 插入指示线 */}
        {dropTargetType === 'after' && (
          <div className='drop-indicator-line relative h-1 pointer-events-none z-10 -mb-0.5' />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.node === next.node &&
    prev.pathKey === next.pathKey &&
    prev.depth === next.depth &&
    prev.parentDataPath === next.parentDataPath &&
    prev.isSelected === next.isSelected &&
    prev.dropTargetType === next.dropTargetType &&
    prev.actions === next.actions,
);

/** 取 before/after 类型 drop 目标的路径 key（inside 目标无节点级指示） */
function dropTargetPathKey(target: DropTarget): string | null {
  if (target === null || target.type === 'inside') {
    return null;
  }
  return toPathKey(target.path);
}

export function Canvas() {
  const {
    schema,
    selectedPath,
    mode,
    selectNode,
    addNode,
    removeNode,
    setSchema,
    registerUI,
    widgetCatalog,
    layoutCatalog,
  } = useDesigner();
  // 设计/预览各持有一个独立的 form 实例（engine）：
  // 设计态由下方 effect 手动 init，预览态由 <NexusForm> 内部 init，
  // 二者互不干扰，避免切换模式时 fieldState/data 相互污染。
  const [designForm] = useForm();
  const [previewForm] = useForm();
  const designEngine = designForm._getEngine();
  const previewEngine = previewForm._getEngine();
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [previewResult, setPreviewResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // 注册 widgets/layouts：仅供引擎消费一次，避免每次渲染重复注册
  // registerUI 由使用方传入（如 registerAntdUI），解耦对具体 UI 库的依赖
  useEffect(() => {
    registerUI?.(designEngine);
    registerUI?.(previewEngine);
  }, [registerUI, designEngine, previewEngine]);

  // 编辑模式下初始化引擎，使 NexusField 能读取 fieldState 并触发 reactions（联动）
  // 预览模式由 <NexusForm> 内部负责 engine.init
  useEffect(() => {
    if (mode === 'preview') {
      return;
    }
    const currentData = designEngine.getFormData();
    designEngine.init(
      schema,
      Object.keys(currentData).length > 0 ? currentData : undefined,
    );
  }, [designEngine, schema, mode]);

  const formConfig = useMemo<NexusFormConfig>(
    () => ({
      displayType: schema.displayType ?? 'row',
      labelWidth: schema.labelWidth,
      colon: schema.colon,
      label: schema.label ?? true,
      readOnly: schema.readOnly ?? false,
      column: schema.column,
    }),
    [schema],
  );

  useEffect(() => {
    const handleDragEnd = () => setDropTarget(null);
    window.addEventListener('dragend', handleDragEnd);
    return () => window.removeEventListener('dragend', handleDragEnd);
  }, []);

  const getParentProps = useCallback(
    (parentPath: string[]) => {
      if (parentPath.length === 0) {
        return schema.properties;
      }
      const parent = getNodeAtProperties(schema.properties, parentPath);
      return parent ? getPropertiesOf(parent) : undefined;
    },
    [schema],
  );

  // 统一处理 drop（依赖 schema，schema 变化时重建；拖拽过程中保持稳定）
  const handleDrop = useCallback(
    (e: React.DragEvent, target: DropTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      if (!target) {
        return;
      }

      const data = e.dataTransfer.getData(DRAG_MIME);
      if (!data) {
        return;
      }
      let payload: DragPayload;
      try {
        payload = JSON.parse(data) as DragPayload;
      } catch {
        return;
      }

      // ── 情况一：从画布拖动已有节点 ──
      if (payload.source === 'canvas') {
        const fromPath = payload.fromPath;

        if (target.type === 'inside') {
          // 拖入容器内部
          if (!canDrop(fromPath, target.path)) {
            return;
          }
          // 面板节点仅入对应容器；普通节点进 tabs/collapse/steps 时自动包裹
          const resolved = resolveMoveNode(schema, fromPath, target.path);
          if (!resolved) {
            return;
          }
          if (!resolved.wrapped) {
            setSchema(moveNodeInSchema(schema, fromPath, target.path));
          } else {
            let next = structuredClone(schema) as NexusSchema;
            const toProps = getPropsAtPath(next, target.path);
            if (!toProps) {
              return;
            }
            const paneKey = generateKey(toProps, 'panel');
            toProps[paneKey] = resolved.node;
            next = removeNodeFromSchema(next, fromPath);
            setSchema(next);
          }
          selectNode(null);
          return;
        }

        // before / after
        if (!canDrop(fromPath, target.path)) {
          return;
        }
        const result = computeInsertIndex(target, schema.properties);
        if (!result) {
          return;
        }

        // 同父级移动时调整 insertIndex
        const fromParent = fromPath.slice(0, -1);
        const sameParent =
          fromParent.length === result.toParentPath.length &&
          fromParent.every((seg, i) => seg === result.toParentPath[i]);

        let insertIndex = result.insertIndex;
        if (sameParent) {
          const fromIndex = getIndexInParent(schema.properties, fromPath);
          if (fromIndex !== -1 && fromIndex < insertIndex) {
            insertIndex -= 1;
          }
        }

        const resolved = resolveMoveNode(schema, fromPath, result.toParentPath);
        if (!resolved) {
          return;
        }
        if (!resolved.wrapped) {
          setSchema(
            moveNodeInSchema(
              schema,
              fromPath,
              result.toParentPath,
              insertIndex,
            ),
          );
        } else {
          let next = structuredClone(schema) as NexusSchema;
          const toProps = getPropsAtPath(next, result.toParentPath);
          if (!toProps) {
            return;
          }
          const paneKey = generateKey(toProps, 'panel');
          toProps[paneKey] = resolved.node;
          next = removeNodeFromSchema(next, fromPath);
          // 将包裹面板移动到目标插入位置
          setSchema(
            moveNodeInSchema(
              next,
              [...result.toParentPath, paneKey],
              result.toParentPath,
              insertIndex,
            ),
          );
        }
        selectNode(null);
        return;
      }

      // ── 情况二：从 palette 或 fieldDef 拖入新组件 ──
      let base: string;
      let createNode: () => SchemaNode;
      let fixedKey: string | undefined;

      if (payload.source === 'fieldDef') {
        // 外部字段：id 作为 key，name 作为 title，且不允许修改
        const fd = payload.fieldDef;
        base = fd.widget;
        fixedKey = fd.id;
        createNode = () =>
          ({
            type: inferSchemaType(fd.widget),
            widget: fd.widget,
            title: fd.name,
            // 锁定标记：禁止在设计器中修改 key 和 title
            _lockedKey: true,
            _lockedTitle: true,
          }) as unknown as SchemaNode;
      } else {
        // palette 组件目录
        const found = resolveCatalogItem(
          payload.catalogItem,
          widgetCatalog,
          layoutCatalog,
        );
        if (!found) {
          return;
        }
        base = found.widget || found.layoutType || 'field';
        createNode = () => found.createNode() as unknown as SchemaNode;
      }

      if (target.type === 'inside') {
        const parentProps = getParentProps(target.path);
        if (!parentProps) {
          return;
        }
        // 面板类型校验 / 普通节点进面板容器时自动包裹
        const factory = resolveInsertFactory(
          schema,
          target.path,
          createNode,
          base,
          fixedKey,
        );
        if (!factory) {
          return;
        }
        const key = fixedKey ?? generateKey(parentProps, base);
        // 若 fixedKey 已存在，则跳过
        if (fixedKey && key in parentProps) {
          return;
        }
        addNode(target.path, key, factory());
        return;
      }

      // before / after
      const result = computeInsertIndex(target, schema.properties);
      if (!result) {
        return;
      }
      // 面板类型校验 / 普通节点进面板容器时自动包裹
      const factory = resolveInsertFactory(
        schema,
        result.toParentPath,
        createNode,
        base,
        fixedKey,
      );
      if (!factory) {
        return;
      }

      // 在副本上操作：先 add 再 move
      const next = structuredClone(schema) as NexusSchema;
      const nextParentProps = getPropsAtPath(next, result.toParentPath);
      if (!nextParentProps) {
        return;
      }

      const newKey = fixedKey ?? generateKey(nextParentProps, base);
      if (fixedKey && newKey in nextParentProps) {
        return;
      }
      nextParentProps[newKey] = factory();

      const fullNewPath = [...result.toParentPath, newKey];
      setSchema(
        moveNodeInSchema(
          next,
          fullNewPath,
          result.toParentPath,
          result.insertIndex,
        ),
      );
    },
    [
      schema,
      widgetCatalog,
      layoutCatalog,
      addNode,
      getParentProps,
      setSchema,
      selectNode,
    ],
  );

  // 节点 header 拖拽源 + drop 目标（仅依赖 setDropTarget，拖拽过程中引用稳定）
  const handleNodeDragStart = useCallback(
    (e: React.DragEvent, path: string[]) => {
      e.stopPropagation();
      const payload: CanvasDragPayload = { source: 'canvas', fromPath: path };
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  // 基于鼠标 Y 坐标判断 before/after（仅依赖 setDropTarget，引用稳定）
  const handleNodeDragOver = useCallback(
    (e: React.DragEvent, path: string[]) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const type: 'before' | 'after' = y < rect.height / 2 ? 'before' : 'after';
      const newTarget: DropTarget = { type, path };
      // 根据 effectAllowed 设置 dropEffect，避免 palette(copy) 与 canvas(move) 互斥
      e.dataTransfer.dropEffect =
        e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
      setDropTarget((prev) => {
        if (dropTargetEquals(prev, newTarget)) {
          return prev;
        }
        return newTarget;
      });
    },
    [],
  );

  const handleNodeDrop = useCallback(
    (e: React.DragEvent, path: string[]) => {
      e.stopPropagation();
      const target = computeDropTargetFromEvent(e, path);
      handleDrop(e, target);
    },
    [handleDrop],
  );

  const handleDelete = useCallback(
    (path: string[]) => {
      removeNode(path);
    },
    [removeNode],
  );

  const handleSelect = useCallback(
    (path: string[]) => {
      selectNode(path);
    },
    [selectNode],
  );

  const handleReorder = useCallback(
    (path: string[], direction: 'up' | 'down') => {
      const parentPath = path.slice(0, -1);
      const key = path[path.length - 1];
      const parentProps = getParentProps(parentPath);
      if (!parentProps) {
        return;
      }
      const keys = Object.keys(parentProps);
      const idx = keys.indexOf(key);
      if (idx < 0) {
        return;
      }
      if (direction === 'up' && idx === 0) {
        return;
      }
      if (direction === 'down' && idx === keys.length - 1) {
        return;
      }
      const insertIndex = direction === 'up' ? idx - 1 : idx + 1;
      setSchema(moveNodeInSchema(schema, path, parentPath, insertIndex));
      selectNode(path);
    },
    [getParentProps, schema, setSchema, selectNode],
  );

  // 容器空白区 dragOver：清除节点上的 drop target 指示
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
    setDropTarget((prev) => {
      if (prev === null) {
        return prev;
      }
      return null;
    });
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent, path: string[]) => {
      e.stopPropagation();
      handleDrop(e, { type: 'inside', path });
    },
    [handleDrop],
  );

  // 下发给 CanvasNode 的稳定回调集合：
  // 拖拽过程（dropTarget 变化）中所有回调引用不变 → 子节点 memo 生效
  const actions = useMemo<CanvasActions>(
    () => ({
      onSelect: handleSelect,
      onDelete: handleDelete,
      onReorder: handleReorder,
      onDragStart: handleNodeDragStart,
      onDragOver: handleNodeDragOver,
      onNodeDrop: handleNodeDrop,
      onContainerDragOver: handleContainerDragOver,
      onContainerDrop: handleContainerDrop,
    }),
    [
      handleSelect,
      handleDelete,
      handleReorder,
      handleNodeDragStart,
      handleNodeDragOver,
      handleNodeDrop,
      handleContainerDragOver,
      handleContainerDrop,
    ],
  );

  if (mode === 'preview') {
    return (
      <div className='flex-1 overflow-y-auto p-4 bg-[#f5f5f5] min-h-full border border-transparent box-border'>
        <NexusForm form={previewForm} schema={schema} />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Space>
            <Button
              type='primary'
              onClick={async () => {
                try {
                  const errors = await previewForm.validateFields();
                  if (errors.size > 0) {
                    return;
                  }
                  const values = previewForm.getValues();
                  setPreviewResult(values);
                } catch {
                  // 校验失败，不弹窗
                }
              }}
            >
              提交
            </Button>
            <Button onClick={() => previewForm.resetFields()}>重置</Button>
          </Space>
        </div>
        <Modal
          title='表单数据'
          open={previewResult !== null}
          onCancel={() => setPreviewResult(null)}
          footer={[
            <Button key='close' onClick={() => setPreviewResult(null)}>
              关闭
            </Button>,
          ]}
          width={600}
        >
          <pre
            style={{
              maxHeight: 400,
              overflow: 'auto',
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              fontSize: 13,
              margin: 0,
            }}
          >
            {JSON.stringify(previewResult, null, 2)}
          </pre>
        </Modal>
      </div>
    );
  }

  const rootEntries = Object.entries(schema.properties);

  return (
    <NexusFormProvider
      form={designForm}
      engine={designEngine}
      config={formConfig}
    >
      <div
        className='flex-1 overflow-y-auto p-4 bg-[#f5f5f5] min-h-full border border-transparent box-border'
        onClick={() => selectNode(null)}
        onDragOver={handleContainerDragOver}
        onDrop={(e) => handleContainerDrop(e, [])}
      >
        <div>
          {rootEntries.map(([key, node]) => (
            <CanvasNode
              key={toPathKey([key])}
              node={node}
              pathKey={toPathKey([key])}
              depth={0}
              parentDataPath=''
              isSelected={pathEquals(selectedPath, [key])}
              dropTargetType={
                dropTarget &&
                (dropTarget.type === 'before' || dropTarget.type === 'after') &&
                pathEquals(dropTarget.path, [key])
                  ? dropTarget.type
                  : null
              }
              selectedPathKey={selectedPath ? toPathKey(selectedPath) : null}
              dropTarget={dropTarget}
              actions={actions}
            />
          ))}
          {rootEntries.length === 0 && (
            <Empty description='拖拽组件到此处开始设计' />
          )}
        </div>
      </div>
    </NexusFormProvider>
  );
}

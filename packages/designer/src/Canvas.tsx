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
import { useEffect, useMemo, useState } from 'react';
import { useDesigner } from './DesignerContext';
import {
  generateKey,
  getNodeAtProperties,
  getNodeLabel,
  getPropertiesOf,
  moveNodeInSchema,
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

// 判断 targetPath 是否是 fromPath 自身或其后代
function isDescendantOrSelf(fromPath: string[], targetPath: string[]): boolean {
  if (fromPath.length <= targetPath.length) {
    return targetPath
      .slice(0, fromPath.length)
      .every((seg, i) => seg === fromPath[i]);
  }
  return false;
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

  const getParentProps = (parentPath: string[]) => {
    if (parentPath.length === 0) {
      return schema.properties;
    }
    const parent = getNodeAtProperties(schema.properties, parentPath);
    return parent ? getPropertiesOf(parent) : undefined;
  };

  // 判断是否允许拖入
  const canDrop = (fromPath: string[], targetPath: string[]): boolean => {
    if (isDescendantOrSelf(fromPath, targetPath)) {
      return false;
    }
    const fromParent = fromPath.slice(0, -1);
    return !(
      fromParent.length === targetPath.length &&
      fromParent.every((seg, i) => seg === targetPath[i])
    );
  };

  // 计算 insertIndex：将节点移动/新增到目标位置
  const computeInsertIndex = (
    target: DropTarget,
    schemaProps: Record<string, SchemaNode>,
  ): { toParentPath: string[]; insertIndex: number } | null => {
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
  };

  // 统一处理 drop
  const handleDrop = (e: React.DragEvent, target: DropTarget) => {
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
        setSchema(moveNodeInSchema(schema, fromPath, target.path));
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
      setSchema(
        moveNodeInSchema(schema, fromPath, result.toParentPath, insertIndex),
      );
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
      const key = fixedKey ?? generateKey(parentProps, base);
      // 若 fixedKey 已存在，则跳过
      if (fixedKey && key in parentProps) {
        return;
      }
      addNode(target.path, key, createNode());
      return;
    }

    // before / after
    const result = computeInsertIndex(target, schema.properties);
    if (!result) {
      return;
    }

    // 在副本上操作：先 add 再 move
    const next = structuredClone(schema) as NexusSchema;
    let nextParentProps: Record<string, SchemaNode> | undefined;
    if (result.toParentPath.length === 0) {
      nextParentProps = next.properties;
    } else {
      const parentNode = getNodeAtProperties(
        next.properties,
        result.toParentPath,
      );
      nextParentProps = parentNode ? getPropertiesOf(parentNode) : undefined;
    }
    if (!nextParentProps) {
      return;
    }

    const newKey = fixedKey ?? generateKey(nextParentProps, base);
    if (fixedKey && newKey in nextParentProps) {
      return;
    }
    nextParentProps[newKey] = createNode();

    const fullNewPath = [...result.toParentPath, newKey];
    setSchema(
      moveNodeInSchema(
        next,
        fullNewPath,
        result.toParentPath,
        result.insertIndex,
      ),
    );
  };

  // 节点 header 拖拽源 + drop 目标
  const handleNodeDragStart = (e: React.DragEvent, path: string[]) => {
    e.stopPropagation();
    const payload: CanvasDragPayload = { source: 'canvas', fromPath: path };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 基于鼠标 Y 坐标判断 before/after
  const handleNodeDragOver = (e: React.DragEvent, path: string[]) => {
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
  };

  // 从事件中计算 drop 目标（避免状态延迟）
  const computeDropTargetFromEvent = (
    e: React.DragEvent,
    path: string[],
  ): DropTarget => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const type: 'before' | 'after' = y < rect.height / 2 ? 'before' : 'after';
    return { type, path };
  };

  const handleDelete = (e: React.MouseEvent, path: string[]) => {
    e.stopPropagation();
    removeNode(path);
  };

  const handleReorder = (
    e: React.MouseEvent,
    path: string[],
    direction: 'up' | 'down',
  ) => {
    e.stopPropagation();
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
  };

  const isDropInside = (path: string[]): boolean => {
    return (
      dropTarget !== null &&
      dropTarget.type === 'inside' &&
      pathEquals(dropTarget.path, path)
    );
  };

  const renderNode = (
    node: SchemaNode,
    key: string,
    path: string[],
    depth: number,
    parentDataPath: string,
  ): React.ReactElement => {
    const isSelected = pathEquals(selectedPath, path);
    const childProps = getPropertiesOf(node);
    const hasChildren = childProps !== undefined;
    const label = getNodeLabel(node, key);
    const badge = node.widget || node.type;
    // 计算数据路径：布局节点 key 不进入数据路径（与 SchemaParser 对齐）
    const isLayout = isLayoutNode(node);
    const dataPath = isLayout
      ? parentDataPath
      : parentDataPath
        ? `${parentDataPath}.${key}`
        : key;
    const childEntries = childProps ? Object.entries(childProps) : [];
    const dropInside = isDropInside(path);
    const isField = isDataField(node);

    // 判断当前节点是否是 drop target
    const isDropTargetForThis =
      dropTarget !== null &&
      (dropTarget.type === 'before' || dropTarget.type === 'after') &&
      pathEquals(dropTarget.path, path);
    const dropTargetType = isDropTargetForThis ? dropTarget?.type : null;

    return (
      <div key={key} className='mb-1.5 relative' style={{ marginLeft: depth }}>
        {/* before 插入指示线 — 显示在容器上方 */}
        {dropTargetType === 'before' && (
          <div className='drop-indicator-line relative h-1 pointer-events-none z-10 -mt-0.5' />
        )}

        {/* 统一包裹容器：header + 预览/子节点 */}
        <div
          className={`relative rounded border bg-white transition-all ${
            dropInside
              ? 'border-[#1677ff] bg-[#e6f4ff] shadow-[0_0_0_2px_rgba(22,119,255,0.2)]'
              : isSelected
                ? 'border-[#1677ff] bg-[#e6f4ff] shadow-[0_0_0_2px_rgba(22,119,255,0.1)]'
                : 'border-[#e8e8e8] hover:border-[#1677ff]'
          }`}
        >
          {/* header 行：拖拽 + 信息 + 操作 */}
          <div
            className='flex items-center gap-1.5 px-2 py-1.5 cursor-grab'
            draggable
            onDragStart={(e) => handleNodeDragStart(e, path)}
            onDragOver={(e) => handleNodeDragOver(e, path)}
            onDragLeave={(e) => {
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.stopPropagation();
              const target = computeDropTargetFromEvent(e, path);
              handleDrop(e, target);
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectNode(path);
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
              {key}
            </Typography.Text>
            {isSelected && (
              <span className='inline-flex gap-1'>
                <Button
                  size='small'
                  onClick={(e) => handleReorder(e, path, 'up')}
                >
                  ↑
                </Button>
                <Button
                  size='small'
                  onClick={(e) => handleReorder(e, path, 'down')}
                >
                  ↓
                </Button>
                <Button
                  size='small'
                  danger
                  onClick={(e) => handleDelete(e, path)}
                >
                  ×
                </Button>
              </span>
            )}
          </div>

          {/* 字段节点：通过 NexusField 渲染，复用引擎 reaction/联动 */}
          {isField && (
            <div className='px-2 pb-2'>
              <NexusField dataPath={dataPath} layoutKey={key} />
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
                  {childEntries.map(([childKey, childNode]) =>
                    renderNode(
                      childNode,
                      childKey,
                      [...path, childKey],
                      depth + 1,
                      dataPath,
                    ),
                  )}
                  {childEntries.length === 0 && (
                    <div className='text-[#bfbfbf] text-xs text-center py-2'>
                      拖拽组件到此处
                    </div>
                  )}
                </>
              );

              const childDiv = (
                <div
                  className={`mx-2 mb-2 p-2 border border-dashed rounded min-h-8 bg-[rgba(250,250,250,0.6)] transition-all ${dropInside ? 'border-[#1677ff] border-solid bg-[#e6f4ff] shadow-[inset_0_0_0_1px_#1677ff]' : 'border-[#d9d9d9]'}`}
                  style={containerStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    e.dataTransfer.dropEffect =
                      e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
                    setDropTarget((prev) => {
                      if (dropTargetEquals(prev, { type: 'inside', path })) {
                        return prev;
                      }
                      return { type: 'inside', path };
                    });
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop(e, { type: 'inside', path });
                  }}
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
  };

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
    <NexusFormProvider form={designForm} engine={designEngine} config={formConfig}>
      <div
        className={`flex-1 overflow-y-auto p-4 bg-[#f5f5f5] min-h-full border box-border ${
          dropTarget?.type === 'inside' && dropTarget.path.length === 0
            ? 'border-[#1677ff] border-solid bg-[#e6f4ff] shadow-[inset_0_0_0_1px_#1677ff]'
            : 'border-transparent'
        }`}
        onClick={() => selectNode(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect =
            e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
          setDropTarget((prev) => {
            if (dropTargetEquals(prev, { type: 'inside', path: [] })) {
              return prev;
            }
            return { type: 'inside', path: [] };
          });
        }}
        onDrop={(e) => handleDrop(e, { type: 'inside', path: [] })}
      >
        <div>
          {rootEntries.map(([key, node]) =>
            renderNode(node, key, [key], 0, ''),
          )}
          {rootEntries.length === 0 && (
            <Empty description='拖拽组件到此处开始设计' />
          )}
        </div>
      </div>
    </NexusFormProvider>
  );
}

// ============================================================================
// list — 常规列表 widget（x-render 对齐）
// 以卡片形式渲染数组每一项，支持新增 / 删除 / 上移 / 下移 / 复制
// items 为 DataObjectSchema，每项是一个对象，按 properties 渲染字段
//
// P2-E 增强（formily ArrayField 对齐）：
// - collapsible（默认 true）：每项卡片可折叠/展开（antd Collapse），
//   配合 collapse 头部按钮隐藏/展开字段，大项场景更紧凑
// - dragSort（默认 false）：HTML5 原生拖拽排序（拖动头部 ⇅ 手柄换序），
//   与上移/下移按钮并存（无障碍回退）
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';
import { Button, Collapse, Space, Typography } from 'antd';
import { useCallback, useRef, useState } from 'react';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  formatFieldValue,
  getEmptyObject,
  RenderItemControl,
} from './_list-shared';
import type { WidgetProps } from './_shared';

export const listWidget = ({
  value,
  onChange,
  title,
  disabled,
  readOnly,
  errors,
  description,
  extra,
  required,
  items,
  displayType,
  labelWidth,
  width,
  placeholder: _ph,
  loading: _ld,
  options: _opt,
  column: _col,
  form: _form,
  dependValues: _dv,
  dataPath,
  path: _p,
  addText: _addText,
  removeText: _removeText,
  copyText: _copyText,
  hideAdd: _hideAdd,
  hideDelete: _hideDelete,
  hideMove: _hideMove,
  hideCopy: _hideCopy,
  collapsible: _collapsible,
  dragSort: _dragSort,
  remoteVersion: _rv,
  ...rest
}: WidgetProps) => {
  const addText = _addText as string | undefined;
  const removeText = _removeText as string | undefined;
  const copyText = _copyText as string | undefined;
  const hideAdd = _hideAdd as boolean | undefined;
  const hideDelete = _hideDelete as boolean | undefined;
  const hideMove = _hideMove as boolean | undefined;
  const hideCopy = _hideCopy as boolean | undefined;
  // P2-E：卡片折叠（默认开启）与拖拽排序（默认关闭，opt-in）
  const collapsible = _collapsible !== false;
  const dragSort = _dragSort === true;
  const array = Array.isArray(value) ? value : [];
  const itemSchema = items as DataObjectSchema | undefined;
  const itemProperties = itemSchema?.properties ?? {};

  const handleAdd = () => {
    onChange(
      arrayAdd(
        array,
        getEmptyObject({
          type: 'object',
          widget: 'object',
          properties: itemProperties,
        }),
      ),
    );
  };

  const handleRemove = (index: number) => {
    onChange(arrayRemove(array, index));
  };

  const handleMoveUp = (index: number) => {
    onChange(arrayMove(array, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    onChange(arrayMove(array, index, index + 1));
  };

  const handleCopy = (index: number) => {
    onChange(arrayCopy(array, index));
  };

  const handleFieldChange = (
    index: number,
    fieldKey: string,
    fieldValue: unknown,
  ) => {
    const newArr = [...array];
    newArr[index] = { ...(newArr[index] as object), [fieldKey]: fieldValue };
    onChange(newArr);
  };

  // ── 拖拽排序（HTML5 原生，P2-E）──────────────────────────────────────
  // 拖动中仅高亮候选目标卡片（dragOverIndex），落定（drop）时执行 arrayMove 换序。
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 折叠面板受控状态：默认全部展开；用户可手动折叠/展开单项。
  // activeKeys 记录「展开」的索引；数组长度增长（add/copy/reset）时，
  // 新增索引自动补入展开态（用户已折叠的既有索引保持不变）。
  const [activeKeys, setActiveKeys] = useState<string[]>(() =>
    array.map((_, i) => String(i)),
  );
  const prevLengthRef = useRef(array.length);
  if (prevLengthRef.current !== array.length) {
    prevLengthRef.current = array.length;
    setActiveKeys((prev) => {
      const cur = new Set(prev);
      // 移除越界索引；补齐新索引（默认展开）
      const next = array
        .map((_, i) => String(i))
        .filter(
          (k) => cur.has(k) || Number(k) >= prev.length, // 新增项自动展开
        );
      return next;
    });
  }

  const handleCollapseChange = useCallback((keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? [...keys] : [keys]);
  }, []);

  const handleDragStart = useCallback(
    (index: number) => {
      if (disabled || readOnly) {
        return;
      }
      dragIndexRef.current = index;
    },
    [disabled, readOnly],
  );

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
      if (dragIndexRef.current === null || disabled || readOnly) {
        return;
      }
      // 阻止默认，允许放置；高亮当前悬停目标
      e.preventDefault();
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [disabled, readOnly, dragOverIndex],
  );

  const handleDrop = useCallback(
    (index: number) => () => {
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      setDragOverIndex(null);
      if (from === null || from === undefined || from === index) {
        return;
      }
      onChange(arrayMove(array, from, index));
    },
    [array, onChange],
  );

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  return (
    <div {...rest}>
      {array.length === 0 && (
        <div
          style={{ color: '#bfbfbf', textAlign: 'center', padding: '12px 0' }}
        >
          暂无数据
        </div>
      )}

      {/* 折叠模式：antd Collapse 每项一个可折叠卡片（默认全部展开） */}
      {collapsible ? (
        <Collapse
          bordered
          ghost
          activeKey={activeKeys}
          onChange={handleCollapseChange}
          items={array.map((item, index) => {
            const dragActive = dragSort && dragOverIndex === index;
            return {
              key: String(index),
              // 拖拽手柄 ⇅ 置于标题左侧；仅在可排序且非只读时 draggable
              label: (
                <Space size={4}>
                  {dragSort && !readOnly && (
                    <span
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver(index)}
                      onDrop={handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        cursor: 'grab',
                        fontSize: 13,
                        color: '#999',
                        padding: '0 4px',
                        ...(dragActive
                          ? { outline: '1px dashed #1677ff' }
                          : undefined),
                      }}
                      title='拖拽排序'
                    >
                      ⠿
                    </span>
                  )}
                  <Typography.Text type='secondary' style={{ fontSize: 13 }}>
                    #{index + 1}
                  </Typography.Text>
                </Space>
              ),
              extra: readOnly ? null : (
                <Space size='small' onClick={(e) => e.stopPropagation()}>
                  {!hideMove && (
                    <>
                      <Button
                        type='text'
                        size='small'
                        disabled={disabled || index === 0}
                        onClick={() => handleMoveUp(index)}
                      >
                        ↑
                      </Button>
                      <Button
                        type='text'
                        size='small'
                        disabled={disabled || index === array.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        ↓
                      </Button>
                    </>
                  )}
                  {!hideCopy && (
                    <Button
                      type='text'
                      size='small'
                      disabled={disabled}
                      onClick={() => handleCopy(index)}
                    >
                      {copyText ?? '复制'}
                    </Button>
                  )}
                  {!hideDelete && (
                    <Button
                      type='text'
                      size='small'
                      danger
                      disabled={disabled}
                      onClick={() => handleRemove(index)}
                    >
                      {removeText ?? '删除'}
                    </Button>
                  )}
                </Space>
              ),
              children: (
                <div
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                >
                  {Object.entries(itemProperties).map(([key, fieldNode]) => {
                    const fieldDef = fieldNode as DataFieldSchema;
                    const fieldValue = (item as Record<string, unknown>)?.[key];
                    const fieldLabel = fieldDef.title ?? key;

                    return (
                      <div
                        key={key}
                        data-testid={`list-item-${key}`}
                        style={{ display: 'flex', marginBottom: 8 }}
                      >
                        <Typography.Text
                          style={{ width: 80, flexShrink: 0 }}
                          type='secondary'
                        >
                          {fieldLabel}
                        </Typography.Text>
                        {readOnly ? (
                          <Typography.Text>
                            {formatFieldValue(fieldValue, fieldDef)}
                          </Typography.Text>
                        ) : (
                          <div style={{ flex: 1 }}>
                            <RenderItemControl
                              widget={fieldDef.widget}
                              fieldSchema={fieldDef}
                              path={`${dataPath}[${index}].${key}`}
                              value={fieldValue}
                              onChange={(v) => handleFieldChange(index, key, v)}
                              disabled={disabled}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ),
            };
          })}
        />
      ) : (
        /* 兼容模式（collapsible=false）：原卡片式渲染 */
        array.map((item, index) => (
          <div
            key={`list-item-${index}`}
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              marginBottom: 8,
              padding: '8px 12px',
              ...(dragSort && dragOverIndex === index
                ? { outline: '1px dashed #1677ff' }
                : undefined),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {dragSort && !readOnly && (
                <span
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={{ cursor: 'grab', fontSize: 13, color: '#999' }}
                  title='拖拽排序'
                >
                  ⠿
                </span>
              )}
              <Space size={4}>
                <Typography.Text type='secondary' style={{ fontSize: 13 }}>
                  #{index + 1}
                </Typography.Text>
              </Space>
              {!readOnly && (
                <Space size='small'>
                  {!hideMove && (
                    <>
                      <Button
                        type='text'
                        size='small'
                        disabled={disabled || index === 0}
                        onClick={() => handleMoveUp(index)}
                      >
                        ↑
                      </Button>
                      <Button
                        type='text'
                        size='small'
                        disabled={disabled || index === array.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        ↓
                      </Button>
                    </>
                  )}
                  {!hideCopy && (
                    <Button
                      type='text'
                      size='small'
                      disabled={disabled}
                      onClick={() => handleCopy(index)}
                    >
                      {copyText ?? '复制'}
                    </Button>
                  )}
                  {!hideDelete && (
                    <Button
                      type='text'
                      size='small'
                      danger
                      disabled={disabled}
                      onClick={() => handleRemove(index)}
                    >
                      {removeText ?? '删除'}
                    </Button>
                  )}
                </Space>
              )}
            </div>
            <div onDragOver={handleDragOver(index)} onDrop={handleDrop(index)}>
              {Object.entries(itemProperties).map(([key, fieldNode]) => {
                const fieldDef = fieldNode as DataFieldSchema;
                const fieldValue = (item as Record<string, unknown>)?.[key];
                const fieldLabel = fieldDef.title ?? key;

                return (
                  <div key={key} style={{ display: 'flex', marginBottom: 8 }}>
                    <Typography.Text
                      style={{ width: 80, flexShrink: 0 }}
                      type='secondary'
                    >
                      {fieldLabel}
                    </Typography.Text>
                    {readOnly ? (
                      <Typography.Text>
                        {formatFieldValue(fieldValue, fieldDef)}
                      </Typography.Text>
                    ) : (
                      <div style={{ flex: 1 }}>
                        <RenderItemControl
                          widget={fieldDef.widget}
                          fieldSchema={fieldDef}
                          path={`${dataPath}[${index}].${key}`}
                          value={fieldValue}
                          onChange={(v) => handleFieldChange(index, key, v)}
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {!readOnly && !hideAdd && (
        <Button type='dashed' onClick={handleAdd} disabled={disabled} block>
          + {addText ?? '添加'}
        </Button>
      )}
    </div>
  );
};

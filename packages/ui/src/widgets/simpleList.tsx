// ============================================================================
// simpleList — 简单列表 widget（x-render 对齐）
// 支持两种 items 类型：
//   1. 简单类型（string / number）：每项一行一个输入框
//   2. 对象类型（object）：每项一行多字段紧凑排列，字段可由设计器拖入
// 支持新增 / 删除 / 上移 / 下移 / 复制
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';
import { Button, Space, Typography } from 'antd';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  formatFieldValue,
  getEmptyField,
  getEmptyObject,
  RenderItemControl,
} from './_listShared';
import { type WidgetProps, withFormItem } from './_shared';

export const simpleListWidget = withFormItem(
  ({
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
    hideAddButton: _hideAddButton,
    hideDeleteButton: _hideDeleteButton,
    hideMoveButton: _hideMoveButton,
    hideCopyButton: _hideCopyButton,
    ...rest
  }: WidgetProps) => {
    const addText = _addText as string | undefined;
    const removeText = _removeText as string | undefined;
    const copyText = _copyText as string | undefined;
    const hideAddButton = _hideAddButton as boolean | undefined;
    const hideDeleteButton = _hideDeleteButton as boolean | undefined;
    const hideMoveButton = _hideMoveButton as boolean | undefined;
    const hideCopyButton = _hideCopyButton as boolean | undefined;
    const array = Array.isArray(value) ? value : [];

    // 判断 items 是对象还是简单类型
    const isObjectItems = items?.type === 'object';
    const objSchema = isObjectItems ? (items as DataObjectSchema) : undefined;
    const objProperties = objSchema?.properties ?? {};
    const simpleSchema = !isObjectItems
      ? (items as DataFieldSchema | undefined)
      : undefined;

    const handleAdd = () => {
      if (isObjectItems) {
        onChange(
          arrayAdd(
            array,
            getEmptyObject({
              type: 'object',
              widget: 'object',
              properties: objProperties,
            }),
          ),
        );
      } else {
        onChange(
          arrayAdd(
            array,
            getEmptyField(simpleSchema ?? { type: 'string', widget: 'input' }),
          ),
        );
      }
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

    // 简单类型：整个 item 值变更
    const handleSimpleItemChange = (index: number, itemValue: unknown) => {
      const newArr = [...array];
      newArr[index] = itemValue;
      onChange(newArr);
    };

    // 对象类型：某个字段变更
    const handleFieldChange = (
      index: number,
      fieldKey: string,
      fieldValue: unknown,
    ) => {
      const newArr = [...array];
      newArr[index] = { ...(newArr[index] as object), [fieldKey]: fieldValue };
      onChange(newArr);
    };

    // 渲染操作按钮组
    const renderActions = (index: number) => {
      if (readOnly) {
        return null;
      }
      return (
        <Space size='small' style={{ flexShrink: 0 }}>
          {!hideMoveButton && (
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
          {!hideCopyButton && (
            <Button
              type='text'
              size='small'
              disabled={disabled}
              onClick={() => handleCopy(index)}
            >
              {copyText ?? '复制'}
            </Button>
          )}
          {!hideDeleteButton && (
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
      );
    };

    return (
      <div {...rest}>
        {array.length === 0 && (
          <div
            style={{ color: '#bfbfbf', textAlign: 'center', padding: '12px 0' }}
          >
            暂无数据
          </div>
        )}
        {array.map((item, index) => (
          <div
            key={`simple-item-${index}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: 8,
              gap: 8,
            }}
          >
            <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isObjectItems ? (
                // 对象类型：渲染每个字段
                Object.entries(objProperties).map(([key, fieldNode]) => {
                  const fieldDef = fieldNode as DataFieldSchema;
                  const fieldValue = (item as Record<string, unknown>)?.[key];
                  const fieldLabel = fieldDef.title ?? key;
                  return (
                    <div key={key} style={{ minWidth: 120, flex: '1 1 auto' }}>
                      <div
                        style={{ fontSize: 12, color: '#666', marginBottom: 2 }}
                      >
                        {fieldLabel}
                      </div>
                      {readOnly ? (
                        <Typography.Text>
                          {formatFieldValue(fieldValue, fieldDef)}
                        </Typography.Text>
                      ) : (
                        <RenderItemControl
                          widget={fieldDef.widget}
                          fieldSchema={fieldDef}
                          path={`${dataPath}[${index}].${key}`}
                          value={fieldValue}
                          onChange={(v) => handleFieldChange(index, key, v)}
                          disabled={disabled}
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                // 简单类型：单个输入框
                <div style={{ flex: 1 }}>
                  {readOnly ? (
                    <span>{formatFieldValue(item, simpleSchema)}</span>
                  ) : (
                    <RenderItemControl
                      widget={simpleSchema?.widget}
                      fieldSchema={
                        simpleSchema ?? { type: 'string', widget: 'input' }
                      }
                      path={`${dataPath}[${index}]`}
                      value={item}
                      onChange={(v) => handleSimpleItemChange(index, v)}
                      disabled={disabled}
                      placeholder={simpleSchema?.placeholder}
                    />
                  )}
                </div>
              )}
            </div>
            {renderActions(index)}
          </div>
        ))}
        {!readOnly && !hideAddButton && (
          <Button type='dashed' onClick={handleAdd} disabled={disabled} block>
            + {addText ?? '添加'}
          </Button>
        )}
      </div>
    );
  },
);
